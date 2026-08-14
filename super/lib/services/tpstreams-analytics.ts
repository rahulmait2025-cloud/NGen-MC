import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * TPStreams Operational Analytics & Reliability Service (Phase 5C).
 * 
 * Manages audit logs for webhooks and sync jobs, and provides data for 
 * monitoring dashboards.
 */

// --- Webhook Logging ----------------------------------------------------------

export interface WebhookLogParams {
  event_type: string;
  tp_asset_id: string;
  payload: unknown;
  processed_success: boolean;
  error_message?: string;
}

/**
 * Log an incoming TPStreams webhook event for audit trail.
 */
export async function logTpWebhook(params: WebhookLogParams): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('tpstreams_webhook_logs')
    .insert({
      event_type: params.event_type,
      tp_asset_id: params.tp_asset_id,
      payload: params.payload,
      processed_success: params.processed_success,
      error_message: params.error_message ?? null,
      received_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[tpstreams-analytics] Failed to log webhook:', error.message);
  }
}

// --- Sync Logging -------------------------------------------------------------

export interface SyncLogParams {
  course_id?: string;
  sync_type: 'manual_folder' | 'manual_asset' | 'webhook_auto';
  triggered_by?: string;
  metadata?: unknown;
}

/**
 * Start a sync log entry. Returns the ID to be used for completion update.
 */
export async function startTpSyncLog(params: SyncLogParams): Promise<string> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('tpstreams_sync_logs')
    .insert({
      course_id: params.course_id,
      sync_type: params.sync_type,
      triggered_by: params.triggered_by,
      metadata: params.metadata ?? {},
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[tpstreams-analytics] Failed to start sync log:', error?.message);
    return '';
  }

  return data.id;
}

export interface SyncLogResult {
  inserted_count: number;
  updated_count: number;
  missing_count: number;
  failed_count: number;
}

/**
 * Complete a sync log entry with results.
 */
export async function completeTpSyncLog(id: string, results: SyncLogResult): Promise<void> {
  if (!id) return;
  const admin = createAdminClient();

  const { error } = await admin
    .from('tpstreams_sync_logs')
    .update({
      ...results,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[tpstreams-analytics] Failed to complete sync log:', error.message);
  }
}

// --- Analytics Queries --------------------------------------------------------

/**
 * Get summary stats for TPStreams dashboard.
 */
export async function getTpOperationalSummary() {
  const admin = createAdminClient();

  // Parallel queries for efficiency
  const [
    { count: totalAssets },
    { count: processingAssets },
    { count: failedAssets },
    { count: recentWebhooks },
    { count: webhookFailures }
  ] = await Promise.all([
    admin.from('video_assets').select('*', { count: 'exact', head: true }).eq('sync_status', 'active'),
    admin.from('video_assets').select('*', { count: 'exact', head: true }).eq('processing_status', 'processing'),
    admin.from('video_assets').select('*', { count: 'exact', head: true }).eq('processing_status', 'error'),
    admin.from('tpstreams_webhook_logs').select('*', { count: 'exact', head: true }).gt('received_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    admin.from('tpstreams_webhook_logs').select('*', { count: 'exact', head: true }).eq('processed_success', false).gt('received_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  ]);

  return {
    assets: {
      total: totalAssets ?? 0,
      processing: processingAssets ?? 0,
      failed: failedAssets ?? 0
    },
    webhooks: {
      recent_24h: recentWebhooks ?? 0,
      failures_24h: webhookFailures ?? 0
    }
  };
}

/**
 * Get recent sync logs.
 */
export async function getRecentSyncLogs(limit = 10) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('tpstreams_sync_logs')
    .select('*, triggered_by_profile:profiles!tpstreams_sync_logs_triggered_by_fkey(full_name), course:master_courses(title)')
    .order('started_at', { ascending: false })
    .limit(limit);

  return { data: data ?? [], error };
}

/**
 * Get problematic assets (failed or stuck).
 */
export async function getProblematicAssets() {
  const admin = createAdminClient();
  
  // Failed assets
  const { data: failed } = await admin
    .from('video_assets')
    .select('*, course:master_courses(title)')
    .eq('processing_status', 'error')
    .order('updated_at', { ascending: false });

  // Stuck assets (processing for more than 4 hours)
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const { data: stuck } = await admin
    .from('video_assets')
    .select('*, course:master_courses(title)')
    .eq('processing_status', 'processing')
    .lt('updated_at', fourHoursAgo)
    .order('updated_at', { ascending: false });

  return { failed: failed ?? [], stuck: stuck ?? [] };
}
