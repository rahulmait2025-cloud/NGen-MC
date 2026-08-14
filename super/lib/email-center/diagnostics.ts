import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailCenterNoStore } from './cache';

const OUTBOX_STATUSES = ['queued', 'processing', 'sent', 'failed', 'skipped', 'cancelled'] as const;
const DIAGNOSTICS_QUERY_TIMEOUT_MS = 8000;

export interface CampaignOperationalDiagnostics {
  campaignStatus: string;
  queuedCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  dbNow: string;
  earliestOutboxNextAttemptAt: string | null;
  outboxClaimable: boolean;
  outboxClaimReason: string;
  outboxByStatus: Record<string, number>;
  lastOutboxError: { email: string; error: string; status: string; attempts: number; at: string } | null;
  fetchedAt: string;
  loadErrors: string[];
  partial: boolean;
}

export function getEmptyCampaignDiagnostics(campaignId: string, reason?: string): CampaignOperationalDiagnostics {
  return {
    campaignStatus: 'unknown',
    queuedCount: 0,
    sentCount: 0,
    failedCount: 0,
    skippedCount: 0,
    dbNow: new Date().toISOString(),
    earliestOutboxNextAttemptAt: null,
    outboxClaimable: false,
    outboxClaimReason: 'unknown',
    outboxByStatus: {},
    lastOutboxError: null,
    fetchedAt: new Date().toISOString(),
    loadErrors: [reason ?? `campaign_fetch: unable to load campaign ${campaignId}`],
    partial: true,
  };
}

async function withTimeout<T>(
  label: string,
  promise: PromiseLike<T>,
  fallback: T
): Promise<{ value: T; error?: string }> {
  try {
    const value = await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${DIAGNOSTICS_QUERY_TIMEOUT_MS}ms`)), DIAGNOSTICS_QUERY_TIMEOUT_MS)
      ),
    ]);
    return { value };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'query failed';
    return { value: fallback, error: `${label}: ${message}` };
  }
}

async function getOutboxStatusCounts(
  campaignId: string
): Promise<{ counts: Record<string, number>; error?: string }> {
  const admin = createAdminClient();
  const counts: Record<string, number> = {};
  const errors: string[] = [];

  await Promise.all(
    OUTBOX_STATUSES.map(async (status) => {
      const { value, error } = await withTimeout(
        `outbox_count_${status}`,
        admin
          .from('email_outbox')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', campaignId)
          .eq('status', status)
          .then((r) => {
            if (r.error) throw new Error(r.error.message);
            return r.count ?? 0;
          }),
        0
      );
      counts[status] = value;
      if (error) errors.push(error);
    })
  );

  return { counts, error: errors[0] };
}

export async function getCampaignOperationalDiagnostics(
  campaignId: string
): Promise<CampaignOperationalDiagnostics> {
  emailCenterNoStore();

  const admin = createAdminClient();
  const loadErrors: string[] = [];

  const campaignResult = await withTimeout(
    'campaign_fetch',
    admin
      .from('email_campaigns')
      .select('status, queued_count, sent_count, failed_count, skipped_count')
      .eq('id', campaignId)
      .single()
      .then((r) => {
        if (r.error) throw new Error(r.error.message);
        return r.data;
      }),
    null
  );

  if (campaignResult.error) loadErrors.push(campaignResult.error);
  if (!campaignResult.value) {
    return getEmptyCampaignDiagnostics(campaignId);
  }

  const campaign = campaignResult.value;

  const dbNowResult = await withTimeout(
    'db_now',
    admin.rpc('get_db_now').then((r) => {
      if (r.error) throw new Error(r.error.message);
      return String(r.data ?? new Date().toISOString());
    }),
    new Date().toISOString()
  );

  const [outboxCounts, earliestNextAttemptResult, lastOutboxErrorResult] = await Promise.all([
    getOutboxStatusCounts(campaignId),
    withTimeout(
      'earliest_next_attempt',
      admin
        .from('email_outbox')
        .select('next_attempt_at')
        .eq('campaign_id', campaignId)
        .in('status', ['queued', 'pending', 'retry', 'failed'])
        .order('next_attempt_at', { ascending: true })
        .limit(1)
        .maybeSingle()
        .then((r) => {
          if (r.error) throw new Error(r.error.message);
          return r.data?.next_attempt_at ?? null;
        }),
      null
    ),
    withTimeout(
      'last_outbox_error',
      admin
        .from('email_outbox')
        .select('to_email, last_error, status, attempts, updated_at')
        .eq('campaign_id', campaignId)
        .not('last_error', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then((r) => {
          if (r.error) throw new Error(r.error.message);
          return r.data;
        }),
      null
    ),
  ]);

  const dbNow = dbNowResult.value;
  if (dbNowResult.error) loadErrors.push(dbNowResult.error);
  if (outboxCounts.error) loadErrors.push(outboxCounts.error);
  if (earliestNextAttemptResult.error) loadErrors.push(earliestNextAttemptResult.error);
  if (lastOutboxErrorResult.error) loadErrors.push(lastOutboxErrorResult.error);

  const lastOutbox = lastOutboxErrorResult.value;
  const pendingCount = (outboxCounts.counts.queued ?? 0) + (outboxCounts.counts.processing ?? 0);
  const claimable = campaign.status === 'sending' && pendingCount > 0;
  const claimReason = claimable
    ? `${pendingCount} outbox row(s) ready for manual continue`
    : campaign.status === 'sending'
      ? 'No pending outbox rows'
      : `Campaign status is ${campaign.status}`;

  return {
    campaignStatus: campaign.status,
    queuedCount: campaign.queued_count ?? 0,
    sentCount: campaign.sent_count ?? 0,
    failedCount: campaign.failed_count ?? 0,
    skippedCount: campaign.skipped_count ?? 0,
    dbNow,
    earliestOutboxNextAttemptAt: earliestNextAttemptResult.value,
    outboxClaimable: claimable,
    outboxClaimReason: claimReason,
    outboxByStatus: outboxCounts.counts,
    lastOutboxError: lastOutbox?.last_error
      ? {
          email: lastOutbox.to_email,
          error: lastOutbox.last_error,
          status: lastOutbox.status,
          attempts: lastOutbox.attempts ?? 0,
          at: lastOutbox.updated_at,
        }
      : null,
    fetchedAt: new Date().toISOString(),
    loadErrors,
    partial: loadErrors.length > 0,
  };
}
