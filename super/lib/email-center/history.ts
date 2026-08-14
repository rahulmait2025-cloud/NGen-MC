import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AudienceConfig } from './audience';
import type { EmailCampaignStatus, EmailCampaignType } from './types';

export interface EmailSendHistoryRow {
  id: string;
  name: string;
  campaign_type: EmailCampaignType;
  status: EmailCampaignStatus;
  audience_summary: string;
  recipient_count: number;
  queued: number;
  sent: number;
  failed: number;
  skipped: number;
  opened: number;
  clicked: number;
  bounced: number;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

const HISTORY_STATUSES: EmailCampaignStatus[] = [
  'test_sent',
  'ready',
  'sending',
  'sent',
  'failed',
  'cancelled',
];

function summarizeAudience(config: Record<string, unknown> | null | undefined): string {
  const type = typeof config?.type === 'string' ? config.type : 'unknown';
  const labels: Record<string, string> = {
    manual_emails: 'Manual email list',
    all_students: 'All students',
    all_college_admins: 'All college admins',
    specific_college_students: 'College students',
    specific_college_admins: 'College admins',
    individual_students: 'Individual students',
    individual_college_admins: 'Individual college admins',
  };
  const base = labels[type] ?? type.replace(/_/g, ' ');

  const cfg = config as AudienceConfig | undefined;
  if (type === 'individual_students') {
    const n = cfg?.student_ids?.length ?? cfg?.selected_students?.length ?? 0;
    if (n > 0) return `${base} (${n})`;
  }
  if (type === 'individual_college_admins') {
    const n = cfg?.admin_ids?.length ?? cfg?.selected_admins?.length ?? 0;
    if (n > 0) return `${base} (${n})`;
  }
  if (type === 'specific_college_students' || type === 'specific_college_admins') {
    const n = cfg?.college_ids?.length ?? 0;
    if (n > 0) return `${base} (${n} colleges)`;
  }

  return base;
}

function campaignHasSendActivity(row: {
  status: string;
  sent_count: number | null;
  queued_count: number | null;
  recipient_count: number | null;
}): boolean {
  if (row.status === 'draft') return false;

  if (HISTORY_STATUSES.includes(row.status as EmailCampaignStatus)) {
    if (row.status === 'cancelled') {
      return (row.sent_count ?? 0) > 0 || (row.queued_count ?? 0) > 0 || (row.recipient_count ?? 0) > 0;
    }
    return true;
  }

  return (row.sent_count ?? 0) > 0 || (row.queued_count ?? 0) > 0 || (row.recipient_count ?? 0) > 0;
}

/**
 * Real send history from email_campaigns (+ counters on row; outbox/events used per-campaign on detail).
 */
export async function getEmailSendHistory(limit = 50, offset = 0): Promise<{ rows: EmailSendHistoryRow[]; hasMore: boolean }> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('email_campaigns')
    .select(
      'id, name, campaign_type, status, audience_config, recipient_count, queued_count, sent_count, failed_count, skipped_count, opened_count, clicked_count, bounced_count, sent_at, created_at, updated_at'
    )
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit * 2 - 1);

  if (error) {
    console.error('[email-center] getEmailSendHistory error:', error.message);
    throw new Error(`Failed to load send history: ${error.message}`);
  }

  const allRows = (data ?? []).filter(campaignHasSendActivity);
  const rows = allRows.slice(0, limit);
  const hasMore = allRows.length > limit;

  const missingOutboxStats = rows.filter(
    (r) =>
      (r.sent_count ?? 0) === 0
      && (r.queued_count ?? 0) === 0
      && (r.recipient_count ?? 0) > 0
      && ['sending', 'sent', 'ready'].includes(r.status)
  );

  const outboxByCampaign = new Map<
    string,
    { queued: number; sent: number; failed: number; skipped: number }
  >();

  if (missingOutboxStats.length > 0) {
    const ids = missingOutboxStats.map((r) => r.id);
    const { data: outboxRows } = await admin
      .from('email_outbox')
      .select('campaign_id, status')
      .in('campaign_id', ids);

    for (const row of outboxRows ?? []) {
      const cid = row.campaign_id as string;
      const bucket = outboxByCampaign.get(cid) ?? { queued: 0, sent: 0, failed: 0, skipped: 0 };
      const st = row.status as string;
      if (st === 'queued' || st === 'processing') bucket.queued++;
      else if (st === 'sent') bucket.sent++;
      else if (st === 'failed') bucket.failed++;
      else if (st === 'skipped') bucket.skipped++;
      outboxByCampaign.set(cid, bucket);
    }
  }

  return {
    rows: rows.map((row) => {
      const outbox = outboxByCampaign.get(row.id);
      const queued = row.queued_count ?? outbox?.queued ?? 0;
      const sent = row.sent_count ?? outbox?.sent ?? 0;
      const failed = row.failed_count ?? outbox?.failed ?? 0;
      const skipped = row.skipped_count ?? outbox?.skipped ?? 0;

      return {
        id: row.id,
        name: row.name,
        campaign_type: row.campaign_type as EmailCampaignType,
        status: row.status as EmailCampaignStatus,
        audience_summary: summarizeAudience(row.audience_config as Record<string, unknown>),
        recipient_count: row.recipient_count ?? 0,
        queued,
        sent,
        failed,
        skipped,
        opened: row.opened_count ?? 0,
        clicked: row.clicked_count ?? 0,
        bounced: row.bounced_count ?? 0,
        sent_at: row.sent_at ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    }),
    hasMore,
  };
}
