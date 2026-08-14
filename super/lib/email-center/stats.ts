import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailCenterNoStore } from './cache';
import {
  countCampaignOutboxDelivered,
  countUniqueCampaignEngagement,
} from '@/lib/email-center/tracking-record';
import {
  getSupabaseErrorMessage,
  isTransientSupabaseFetchError,
  logTransientSupabaseDegradation,
} from '@/lib/supabase/fetch-resilience';

export interface CampaignSendStats {
  totalRecipients: number;
  snapshotted: number;
  queued: number;
  /** Campaign aggregate sent_count (send pipeline); may differ from delivered. */
  sent: number;
  failed: number;
  skipped: number;
  suppressed: number;
  outboxQueued: number;
  outboxProcessing: number;
  outboxSent: number;
  outboxFailed: number;
  outboxSkipped: number;
  outboxCancelled: number;
  /** Outbox rows with status sent or delivered (source of truth for delivery). */
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
}

export async function getCampaignSendStats(campaignId: string): Promise<CampaignSendStats> {
  emailCenterNoStore();
  const admin = createAdminClient();

  const outboxStatuses = ['queued', 'processing', 'sent', 'failed', 'skipped', 'cancelled'] as const;

  const [recipientsResult, outboxCountResults, campaignResult, eventsResult, uniqueEngagement, deliveredOutbox] =
    await Promise.all([
    admin
      .from('email_campaign_recipients')
      .select('status')
      .eq('campaign_id', campaignId),
    Promise.all(
      outboxStatuses.map((status) =>
        admin
          .from('email_outbox')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', campaignId)
          .eq('status', status)
          .then((r) => ({ status, count: r.count ?? 0 }))
      )
    ),
    admin
      .from('email_campaigns')
      .select('recipient_count, queued_count, sent_count, failed_count, skipped_count')
      .eq('id', campaignId)
      .single(),
    admin
      .from('email_events')
      .select('event_type')
      .eq('campaign_id', campaignId),
    countUniqueCampaignEngagement(campaignId),
    countCampaignOutboxDelivered(campaignId),
  ]);

  const recipientCounts = { snapshotted: 0, queued: 0, sent: 0, failed: 0, skipped: 0, suppressed: 0 };
  for (const r of recipientsResult.data ?? []) {
    const s = r.status as keyof typeof recipientCounts;
    if (s in recipientCounts) recipientCounts[s]++;
  }

  const outboxCounts = { queued: 0, processing: 0, sent: 0, failed: 0, skipped: 0, cancelled: 0 };
  for (const row of outboxCountResults) {
    const s = row.status as keyof typeof outboxCounts;
    if (s in outboxCounts) outboxCounts[s] = row.count;
  }

  const eventCounts = { bounced: 0 };
  for (const e of eventsResult.data ?? []) {
    if (e.event_type === 'bounced') eventCounts.bounced++;
  }

  const campaign = campaignResult.data;

  return {
    totalRecipients: campaign?.recipient_count ?? 0,
    snapshotted: recipientCounts.snapshotted,
    queued: recipientCounts.queued,
    failed: campaign?.failed_count ?? recipientCounts.failed,
    skipped: campaign?.skipped_count ?? recipientCounts.skipped,
    suppressed: recipientCounts.suppressed,
    outboxQueued: outboxCounts.queued,
    outboxProcessing: outboxCounts.processing,
    outboxSent: outboxCounts.sent,
    outboxFailed: outboxCounts.failed,
    outboxSkipped: outboxCounts.skipped,
    outboxCancelled: outboxCounts.cancelled,
    delivered: deliveredOutbox,
    opened: uniqueEngagement.uniqueOpened,
    clicked: uniqueEngagement.uniqueClicked,
    bounced: eventCounts.bounced,
    sent: campaign?.sent_count ?? recipientCounts.sent,
  };
}

export interface EmailCenterDashboardStats {
  totalDrafts: number;
  testSent: number;
  totalTemplates: number;
  totalSuppressed: number;
  totalQueued: number;
  totalSent: number;
  totalFailed: number;
  totalSkipped: number;
}

export async function getPendingApprovalCount(): Promise<number> {
  emailCenterNoStore();
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from('email_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('approval_status', 'pending_review');
    if (error) {
      const message = error.message ?? getSupabaseErrorMessage(error);
      if (isTransientSupabaseFetchError(message)) {
        logTransientSupabaseDegradation('getPendingApprovalCount', error);
        return 0;
      }
      throw error;
    }
    return count ?? 0;
  } catch (err) {
    const message = getSupabaseErrorMessage(err);
    if (isTransientSupabaseFetchError(message)) {
      logTransientSupabaseDegradation('getPendingApprovalCount', err);
      return 0;
    }
    throw err;
  }
}

const EMPTY_DASHBOARD_STATS: EmailCenterDashboardStats = {
  totalDrafts: 0,
  testSent: 0,
  totalTemplates: 0,
  totalSuppressed: 0,
  totalQueued: 0,
  totalSent: 0,
  totalFailed: 0,
  totalSkipped: 0,
};

export async function getEmailCenterDashboardStats(): Promise<EmailCenterDashboardStats> {
  emailCenterNoStore();
  try {
    const admin = createAdminClient();

    const [drafts, testSent, templates, suppressed, queued, sent, failed, skipped] = await Promise.all([
      admin.from('email_campaigns').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      admin.from('email_campaigns').select('id', { count: 'exact', head: true }).eq('status', 'test_sent'),
      admin.from('email_templates').select('id', { count: 'exact', head: true }).eq('is_active', true),
      admin.from('email_suppressions').select('id', { count: 'exact', head: true }),
      admin.from('email_campaigns').select('queued_count').or('status.eq.sending,status.eq.sent'),
      admin.from('email_campaigns').select('sent_count').not('sent_count', 'eq', 0),
      admin.from('email_campaigns').select('failed_count').not('failed_count', 'eq', 0),
      admin.from('email_campaigns').select('skipped_count').not('skipped_count', 'eq', 0),
    ]);

    const firstError =
      drafts.error
      ?? testSent.error
      ?? templates.error
      ?? suppressed.error
      ?? queued.error
      ?? sent.error
      ?? failed.error
      ?? skipped.error;
    if (firstError) {
      const message = firstError.message ?? getSupabaseErrorMessage(firstError);
      if (isTransientSupabaseFetchError(message)) {
        logTransientSupabaseDegradation('getEmailCenterDashboardStats', firstError);
        return EMPTY_DASHBOARD_STATS;
      }
      throw firstError;
    }

    const sumProp = (items: { queued_count?: number; sent_count?: number; failed_count?: number; skipped_count?: number }[], key: 'queued_count' | 'sent_count' | 'failed_count' | 'skipped_count') =>
      items.reduce((acc, item) => acc + (item[key] ?? 0), 0);

    return {
      totalDrafts: (drafts.count ?? 0) + (testSent.count ?? 0),
      testSent: testSent.count ?? 0,
      totalTemplates: templates.count ?? 0,
      totalSuppressed: suppressed.count ?? 0,
      totalQueued: sumProp(queued.data ?? [], 'queued_count'),
      totalSent: sumProp(sent.data ?? [], 'sent_count'),
      totalFailed: sumProp(failed.data ?? [], 'failed_count'),
      totalSkipped: sumProp(skipped.data ?? [], 'skipped_count'),
    };
  } catch (err) {
    const message = getSupabaseErrorMessage(err);
    if (isTransientSupabaseFetchError(message)) {
      logTransientSupabaseDegradation('getEmailCenterDashboardStats', err);
      return EMPTY_DASHBOARD_STATS;
    }
    throw err;
  }
}