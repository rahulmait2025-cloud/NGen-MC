import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { listAssets } from '../tpstreams/assets';
import { listWebhooks } from '../tpstreams/webhooks';

/**
 * TPStreams Integration Health Checks (Phase 5C).
 */

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: string;
}

/**
 * Run a full suite of health checks for TPStreams integration.
 */
export async function runTpHealthChecks() {
  const checks: Record<string, HealthCheckResult> = {};

  // 1. API & Auth Check
  try {
    await listAssets({ limit: 1 });
    checks.api = { status: 'healthy', message: 'API reachable and token valid.' };
  } catch (error) {
    checks.api = { 
      status: 'error', 
      message: 'API unreachable or token invalid.', 
      details: error instanceof Error ? error.message : String(error) 
    };
  }

  // 2. Webhook Configuration Check
  try {
    const webhooks = await listWebhooks();
    if (webhooks.results.length > 0) {
      checks.webhooks_config = { status: 'healthy', message: `${webhooks.results.length} webhook(s) configured.` };
    } else {
      checks.webhooks_config = { status: 'warning', message: 'No webhooks configured. Background updates will fail.' };
    }
  } catch {
    checks.webhooks_config = { status: 'error', message: 'Failed to fetch webhook configuration.' };
  }

  // 3. Webhook Delivery Health
  const admin = createAdminClient();
  const { data: recentLogs } = await admin
    .from('tpstreams_webhook_logs')
    .select('processed_success')
    .gt('received_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (recentLogs && recentLogs.length > 0) {
    const failures = (recentLogs as { processed_success: boolean }[]).filter(l => !l.processed_success).length;
    if (failures === 0) {
      checks.webhook_delivery = { status: 'healthy', message: 'All recent webhooks processed successfully.' };
    } else {
      checks.webhook_delivery = { 
        status: 'warning', 
        message: `${failures} of ${recentLogs.length} webhooks failed in last 24h.` 
      };
    }
  } else {
    checks.webhook_delivery = { status: 'warning', message: 'No webhooks received in last 24h. Normal if no activity.' };
  }

  // 4. DB Drift Check (Sample)
  const { count: localCount } = await admin
    .from('video_assets')
    .select('*', { count: 'exact', head: true })
    .eq('sync_status', 'active');
  
  try {
    const remote = await listAssets({ limit: 1 });
    const remoteCount = remote.count;
    const diff = Math.abs((remoteCount ?? 0) - (localCount ?? 0));
    
    if (diff === 0) {
      checks.db_drift = { status: 'healthy', message: 'Local and remote asset counts match.' };
    } else if (diff < 5) {
      checks.db_drift = { status: 'healthy', message: `Minor drift detected (${diff} assets). Normal during processing.` };
    } else {
      checks.db_drift = { status: 'warning', message: `Significant drift detected (${diff} assets). Consider running a full sync.` };
    }
  } catch {
    checks.db_drift = { status: 'error', message: 'Could not verify remote asset count.' };
  }

  // 5. Folder Integrity
  const { count: missingFolders } = await admin
    .from('master_courses')
    .select('*', { count: 'exact', head: true })
    .is('tp_folder_uuid', null);

  if ((missingFolders ?? 0) === 0) {
    checks.folders = { status: 'healthy', message: 'All master courses have TP folders mapped.' };
  } else {
    checks.folders = { status: 'warning', message: `${missingFolders} course(s) missing TP folder mapping.` };
  }

  return checks;
}
