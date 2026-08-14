import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCampaignById } from './campaigns';
import { queueCampaignOutbox } from './outbox';
import { processEmailOutboxBatchForCampaign } from './send-processor';
import type { EmailCampaign } from './types';

const OUTBOX_BATCH_SIZE = 25;
const REQUEST_DEADLINE_MS = 50_000;

const REQUIRE_APPROVAL =
  String(process.env.EMAIL_CENTER_REQUIRE_APPROVAL ?? '').trim().toLowerCase() === 'true';

const PENDING_OUTBOX_STATUSES = ['queued', 'pending', 'retry', 'failed', 'processing'] as const;

export interface SendCampaignNowResult {
  ok: boolean;
  sent?: number;
  failed?: number;
  skipped?: number;
  pending?: number;
  hasMore?: boolean;
  queuedCount?: number;
  suppressedCount?: number;
  error?: string;
}

function campaignCanSend(campaign: EmailCampaign): string | null {
  if (campaign.status === 'sent') {
    return 'Campaign already sent.';
  }
  if (campaign.status === 'cancelled') {
    return 'Campaign is cancelled.';
  }
  if (!campaign.subject?.trim()) {
    return 'Subject is required.';
  }
  if (!campaign.html_body?.trim()) {
    return 'Email body is required.';
  }
  if (!campaign.text_body?.trim()) {
    return 'Text body is required.';
  }

  const audienceConfig = campaign.audience_config as Record<string, unknown> | null;
  const hasAudienceConfig = Boolean(audienceConfig?.type);
  const hasRecipients = (campaign.recipient_count ?? 0) > 0;

  if (!hasAudienceConfig && !hasRecipients) {
    return 'Please save audience and snapshot recipients before sending.';
  }

  if (REQUIRE_APPROVAL && campaign.approval_status !== 'approved') {
    return 'Approval is required before sending.';
  }

  return null;
}

async function countPendingOutbox(campaignId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from('email_outbox')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .in('status', [...PENDING_OUTBOX_STATUSES]);

  return count ?? 0;
}

/**
 * Queue missing outbox rows (idempotent) and process batches until done or request deadline.
 */
export async function sendCampaignNow(campaignId: string): Promise<SendCampaignNowResult> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return { ok: false, error: 'Campaign not found.' };
  }

  const blocked = campaignCanSend(campaign);
  if (blocked) {
    return { ok: false, error: blocked };
  }

  let queuedCount = 0;
  let suppressedCount = 0;
  let pending = await countPendingOutbox(campaignId);

  if (campaign.status !== 'sending') {
    const queueResult = await queueCampaignOutbox(campaignId);
    if (!queueResult.ok) {
      return {
        ok: false,
        error: queueResult.error,
        suppressedCount: queueResult.suppressedCount,
      };
    }
    queuedCount = queueResult.queuedCount;
    suppressedCount = queueResult.suppressedCount;
    pending = await countPendingOutbox(campaignId);
  } else if (pending === 0) {
    const refreshed = await getCampaignById(campaignId);
    if (refreshed?.status === 'sent') {
      return { ok: true, sent: refreshed.sent_count ?? 0, pending: 0, hasMore: false };
    }
    if (pending === 0) {
      return { ok: true, sent: 0, pending: 0, hasMore: false };
    }
  }

  const admin = createAdminClient();
  if (campaign.status !== 'sending') {
    await admin.from('email_campaigns').update({ status: 'sending' }).eq('id', campaignId);
  }

  const deadline = Date.now() + REQUEST_DEADLINE_MS;
  const lockToken = `send-now:${campaignId}:${Date.now()}`;
  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  while (Date.now() < deadline) {
    const batch = await processEmailOutboxBatchForCampaign({
      campaignId,
      batchSize: OUTBOX_BATCH_SIZE,
      lockToken,
    });

    totalSent += batch.sent;
    totalFailed += batch.failed;
    totalSkipped += batch.skipped;

    if (batch.error) {
      const remaining = await countPendingOutbox(campaignId);
      return {
        ok: false,
        error: batch.error,
        sent: totalSent,
        failed: totalFailed,
        skipped: totalSkipped,
        pending: remaining,
        hasMore: remaining > 0,
        queuedCount,
        suppressedCount,
      };
    }

    if (batch.done || batch.processed === 0) {
      break;
    }
  }

  const remaining = await countPendingOutbox(campaignId);

  return {
    ok: true,
    sent: totalSent,
    failed: totalFailed,
    skipped: totalSkipped,
    pending: remaining,
    hasMore: remaining > 0,
    queuedCount,
    suppressedCount,
  };
}

/** Resume a partially sent campaign without re-queueing existing outbox rows. */
export async function continueSendingCampaign(campaignId: string): Promise<SendCampaignNowResult> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return { ok: false, error: 'Campaign not found.' };
  }

  if (campaign.status !== 'sending') {
    return { ok: false, error: `Continue sending only applies to campaigns in sending (current: ${campaign.status}).` };
  }

  const pending = await countPendingOutbox(campaignId);
  if (pending === 0) {
    return { ok: true, sent: 0, pending: 0, hasMore: false };
  }

  const deadline = Date.now() + REQUEST_DEADLINE_MS;
  const lockToken = `continue:${campaignId}:${Date.now()}`;
  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  while (Date.now() < deadline) {
    const batch = await processEmailOutboxBatchForCampaign({
      campaignId,
      batchSize: OUTBOX_BATCH_SIZE,
      lockToken,
    });

    totalSent += batch.sent;
    totalFailed += batch.failed;
    totalSkipped += batch.skipped;

    if (batch.error) {
      const remaining = await countPendingOutbox(campaignId);
      return {
        ok: false,
        error: batch.error,
        sent: totalSent,
        failed: totalFailed,
        skipped: totalSkipped,
        pending: remaining,
        hasMore: remaining > 0,
      };
    }

    if (batch.done || batch.processed === 0) {
      break;
    }
  }

  const remaining = await countPendingOutbox(campaignId);

  return {
    ok: true,
    sent: totalSent,
    failed: totalFailed,
    skipped: totalSkipped,
    pending: remaining,
    hasMore: remaining > 0,
  };
}

export async function repairStuckSendingCampaign(campaignId: string): Promise<SendCampaignNowResult> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return { ok: false, error: 'Campaign not found.' };
  }

  if (campaign.status !== 'sending') {
    return {
      ok: false,
      error: `Repair only applies to campaigns stuck in sending (current: ${campaign.status}).`,
    };
  }

  return continueSendingCampaign(campaignId);
}
