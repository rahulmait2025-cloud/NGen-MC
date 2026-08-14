import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { inspectEmailConfig } from '@/lib/email/config';
import { sendCampaignCompletionNotification } from './admin-notifications';
import { isEmailSuppressedForLane } from '@/lib/email-center/tokens';
import { laneToProviderSendCategory, normalizeEmailCenterLane } from '@/lib/email-center/email-category';
import {
  formatEmailFromHeader,
  resolveCampaignSender,
} from '@/lib/email-center/sender-profiles';

/** Outbox rows still eligible for the send worker (matches claim_email_outbox_batch RPC). */
const PENDING_OUTBOX_STATUSES = ['queued', 'pending', 'retry', 'failed', 'processing'] as const;

interface OutboxRow {
  id: string;
  campaign_id: string;
  recipient_id: string;
  to_email: string;
  subject: string;
  html_body: string;
  text_body: string;
  category: string;
  attempts: number;
  max_attempts: number;
  sender_profile_id?: string | null;
  from_name?: string | null;
  from_email?: string | null;
  reply_to?: string | null;
}

type ResolvedSendFrom = { from?: string; replyTo?: string };

type CampaignSenderContext = {
  composer_state: unknown;
  content_mode: string | null;
};

function resolveSendFromForOutboxRow(
  row: OutboxRow,
  campaignById: Map<string, CampaignSenderContext>,
): ResolvedSendFrom {
  if (row.from_email && row.from_name) {
    return {
      from: formatEmailFromHeader(row.from_name, row.from_email),
      replyTo: row.reply_to ?? row.from_email,
    };
  }
  const campaign = campaignById.get(row.campaign_id);
  if (!campaign || campaign.content_mode !== 'custom_composer') {
    // Template / legacy keep provider EMAIL_FROM.
    return {};
  }
  const resolved = resolveCampaignSender(campaign.composer_state);
  if (!resolved.ok) return {};
  return {
    from: resolved.fromHeader,
    replyTo: resolved.snapshot.replyTo,
  };
}

async function loadCampaignComposerStates(
  admin: ReturnType<typeof createAdminClient>,
  campaignIds: string[],
): Promise<Map<string, CampaignSenderContext>> {
  const map = new Map<string, CampaignSenderContext>();
  if (campaignIds.length === 0) return map;
  const { data } = await admin
    .from('email_campaigns')
    .select('id, composer_state, content_mode')
    .in('id', campaignIds);
  for (const row of data ?? []) {
    map.set(row.id, {
      composer_state: row.composer_state,
      content_mode: row.content_mode ?? null,
    });
  }
  return map;
}

export async function processEmailOutboxBatch(options: {
  batchSize?: number;
  lockToken: string;
}): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  done: boolean;
  error?: string;
}> {
  const admin = createAdminClient();
  const batchSize = Math.min(options.batchSize ?? 25, 100);
  const config = inspectEmailConfig();


  const { data: claimed, error: claimError } = await admin.rpc(
    'claim_email_outbox_batch',
    { p_limit: batchSize, p_lock_token: options.lockToken }
  );

  if (claimError) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0, done: false, error: claimError.message };
  }

  if (!claimed || claimed.length === 0) {
    const { count: remaining } = await admin
      .from('email_outbox')
      .select('id', { count: 'exact', head: true })
      .in('status', [...PENDING_OUTBOX_STATUSES]);

    return { processed: 0, sent: 0, failed: 0, skipped: 0, done: (remaining ?? 0) === 0 };
  }

  interface OutboxRowLocal {
  id: string;
  campaign_id: string;
  recipient_id: string;
  to_email: string;
  subject: string;
  html_body: string;
  text_body: string;
  category: string;
  attempts: number;
  max_attempts: number;
  sender_profile_id?: string | null;
  from_name?: string | null;
  from_email?: string | null;
  reply_to?: string | null;
}

  const rows = claimed as OutboxRowLocal[];
  const campaignIds = [...new Set(rows.map((r) => r.campaign_id))];
  const campaignId: string | undefined = campaignIds[0];

  if (!campaignId) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0, done: false, error: 'No campaign id found' };
  }

  const campaignComposerById = await loadCampaignComposerStates(admin, campaignIds);

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  type SendOutcome =
    | { kind: 'sent' }
    | { kind: 'failed' }
    | { kind: 'skipped' }
    | { kind: 'error'; row: OutboxRowLocal; message: string };

  async function processOneRow(row: OutboxRowLocal): Promise<SendOutcome> {
    try {
      const recipientId = row.recipient_id;
      const lane = normalizeEmailCenterLane(row.category);
      const suppressed = await isEmailSuppressedForLane(row.to_email, lane);
      if (suppressed.suppressed) {
        await admin
          .from('email_outbox')
          .update({
            status: 'skipped',
            last_error: suppressed.reason ?? 'Email is suppressed',
          })
          .eq('id', row.id);

        await admin
          .from('email_campaign_recipients')
          .update({
            status: 'suppressed',
            suppression_reason: suppressed.reason ?? 'preference_opt_out',
          })
          .eq('id', recipientId);

        return { kind: 'skipped' };
      }

      const sendFrom = resolveSendFromForOutboxRow(row, campaignComposerById);
      const result = await sendEmail({
        to: row.to_email,
        subject: row.subject,
        html: row.html_body,
        text: row.text_body,
        category: laneToProviderSendCategory(lane),
        ...(sendFrom.from ? { from: sendFrom.from } : {}),
        ...(sendFrom.replyTo ? { replyTo: sendFrom.replyTo } : {}),
      });

      if (result.ok) {
        await admin
          .from('email_outbox')
          .update({
            status: 'sent',
            provider: config.selectedProvider,
            provider_message_id: result.messageId ?? null,
            sent_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', row.id);

        await admin
          .from('email_campaign_recipients')
          .update({ status: 'sent' })
          .eq('id', recipientId);

        return { kind: 'sent' };
      } else {
        await admin
          .from('email_outbox')
          .update({
            status: 'failed',
            last_error: result.errorMessage ?? result.errorCode ?? 'Unknown',
            locked_at: null,
            locked_by: null,
            next_attempt_at: null,
          })
          .eq('id', row.id);

        await admin
          .from('email_campaign_recipients')
          .update({ status: 'failed' })
          .eq('id', recipientId);

        return { kind: 'failed' };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      await admin
        .from('email_outbox')
        .update({
          status: 'failed',
          last_error: msg,
          locked_at: null,
          locked_by: null,
          next_attempt_at: null,
        })
        .eq('id', row.id);
      return { kind: 'failed' };
    }
  }

  const CONCURRENCY = 5;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(chunk.map(processOneRow));
    for (const r of results) {
      if (r.status === 'fulfilled') {
        switch (r.value.kind) {
          case 'sent': sentCount++; break;
          case 'failed': failedCount++; break;
          case 'skipped': skippedCount++; break;
        }
      } else {
        failedCount++;
      }
    }
  }

  await admin.rpc('update_campaign_send_counts', {
    p_campaign_id: campaignId,
    p_sent: sentCount,
    p_failed: failedCount,
    p_skipped: skippedCount,
  });

const { count: remaining } = await admin
    .from('email_outbox')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .in('status', [...PENDING_OUTBOX_STATUSES]);

  const done = (remaining ?? 0) === 0;

if (done && campaignId) {
    await admin
      .from('email_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    try {
      await sendCampaignCompletionNotification(campaignId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'notification error';
      console.error('[email-center] completion notification failed:', msg);
    }
  }

  return {
    processed: sentCount + failedCount + skippedCount,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount,
    done,
  };
}

export async function processEmailOutboxBatchForCampaign(options: {
  campaignId: string;
  batchSize?: number;
  lockToken: string;
}): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  done: boolean;
  error?: string;
}> {
  const admin = createAdminClient();
  const batchSize = Math.min(options.batchSize ?? 25, 100);
  const config = inspectEmailConfig();
  const campaignId = options.campaignId;

  const { data: claimed, error: claimError } = await admin.rpc(
    'claim_email_outbox_batch_for_campaign',
    {
      p_campaign_id: campaignId,
      p_limit: batchSize,
      p_lock_token: options.lockToken,
    }
  );

  if (claimError) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0, done: false, error: claimError.message };
  }

  if (!claimed || claimed.length === 0) {
    const { count: remaining } = await admin
      .from('email_outbox')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .in('status', [...PENDING_OUTBOX_STATUSES]);

    return { processed: 0, sent: 0, failed: 0, skipped: 0, done: (remaining ?? 0) === 0 };
  }

  const campaignComposerById = await loadCampaignComposerStates(admin, [campaignId]);

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  type CampaignSendOutcome =
    | { kind: 'sent' }
    | { kind: 'failed' }
    | { kind: 'skipped' }
    | { kind: 'error'; row: OutboxRow; message: string };

  async function processOneCampaignRow(row: OutboxRow): Promise<CampaignSendOutcome> {
    try {
      const recipientId = row.recipient_id;
      const lane = normalizeEmailCenterLane(row.category);
      const suppressed = await isEmailSuppressedForLane(row.to_email, lane);
      if (suppressed.suppressed) {
        await admin
          .from('email_outbox')
          .update({
            status: 'skipped',
            last_error: suppressed.reason ?? 'Email is suppressed',
          })
          .eq('id', row.id);

        await admin
          .from('email_campaign_recipients')
          .update({
            status: 'suppressed',
            suppression_reason: suppressed.reason ?? 'preference_opt_out',
          })
          .eq('id', recipientId);

        return { kind: 'skipped' };
      }

      const sendFrom = resolveSendFromForOutboxRow(row, campaignComposerById);
      const result = await sendEmail({
        to: row.to_email,
        subject: row.subject,
        html: row.html_body,
        text: row.text_body,
        category: laneToProviderSendCategory(lane),
        ...(sendFrom.from ? { from: sendFrom.from } : {}),
        ...(sendFrom.replyTo ? { replyTo: sendFrom.replyTo } : {}),
      });

      if (result.ok) {
        await admin
          .from('email_outbox')
          .update({
            status: 'sent',
            provider: config.selectedProvider,
            provider_message_id: result.messageId ?? null,
            sent_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', row.id);

        await admin
          .from('email_campaign_recipients')
          .update({ status: 'sent' })
          .eq('id', recipientId);

        return { kind: 'sent' };
      } else {
        await admin
          .from('email_outbox')
          .update({
            status: 'failed',
            last_error: result.errorMessage ?? result.errorCode ?? 'Unknown',
            locked_at: null,
            locked_by: null,
            next_attempt_at: null,
          })
          .eq('id', row.id);

        await admin
          .from('email_campaign_recipients')
          .update({ status: 'failed' })
          .eq('id', recipientId);

        return { kind: 'failed' };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      await admin
        .from('email_outbox')
        .update({
          status: 'failed',
          last_error: msg,
          locked_at: null,
          locked_by: null,
          next_attempt_at: null,
        })
        .eq('id', row.id);
      return { kind: 'failed' };
    }
  }

  const CONCURRENCY = 5;
  const rows = claimed as OutboxRow[];
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(chunk.map(processOneCampaignRow));
    for (const r of results) {
      if (r.status === 'fulfilled') {
        switch (r.value.kind) {
          case 'sent': sentCount++; break;
          case 'failed': failedCount++; break;
          case 'skipped': skippedCount++; break;
        }
      } else {
        failedCount++;
      }
    }
  }

  await admin.rpc('update_campaign_send_counts', {
    p_campaign_id: campaignId,
    p_sent: sentCount,
    p_failed: failedCount,
    p_skipped: skippedCount,
  });

  const { count: remaining } = await admin
    .from('email_outbox')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .in('status', [...PENDING_OUTBOX_STATUSES]);

  const done = (remaining ?? 0) === 0;

  if (done) {
    await admin
      .from('email_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    try {
      await sendCampaignCompletionNotification(campaignId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'notification error';
      console.error('[email-center] completion notification failed:', msg);
    }
  }

  return {
    processed: sentCount + failedCount + skippedCount,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount,
    done,
  };
}
