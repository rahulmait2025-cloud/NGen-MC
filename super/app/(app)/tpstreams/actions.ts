'use server';

import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { getUsage } from '@/lib/tpstreams/usage';
import { 
  listWebhooks, 
  createWebhook, 
  deleteWebhook 
} from '@/lib/tpstreams/webhooks';
import type { TpUsageParams, TpCreateWebhookRequest } from '@/lib/tpstreams/types';
import { revalidatePath } from 'next/cache';

interface ActionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

// ─── Usage Actions ────────────────────────────────────────────────────────────

export async function getTpUsageAction(params: TpUsageParams = {}): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const usage = await getUsage(params);
    return { ok: true, data: usage };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Webhook Actions ──────────────────────────────────────────────────────────

export async function listWebhooksAction(): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const webhooks = await listWebhooks();
    return { ok: true, data: webhooks };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function createWebhookAction(payload: TpCreateWebhookRequest): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const webhook = await createWebhook(payload);
    revalidatePath('/tpstreams/webhooks');
    return { ok: true, data: webhook };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteWebhookAction(webhookId: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    await deleteWebhook(webhookId);
    revalidatePath('/tpstreams/webhooks');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Operational Actions (Phase 5C) ───────────────────────────────────────────

export async function getTpOperationalSummaryAction(): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const { getTpOperationalSummary } = await import('@/lib/services/tpstreams-analytics');
    const summary = await getTpOperationalSummary();
    return { ok: true, data: summary };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function runTpHealthChecksAction(): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const { runTpHealthChecks } = await import('@/lib/services/tpstreams-health');
    const checks = await runTpHealthChecks();
    return { ok: true, data: checks };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getRecentSyncLogsAction(limit?: number): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const { getRecentSyncLogs } = await import('@/lib/services/tpstreams-analytics');
    const { data, error } = await getRecentSyncLogs(limit);
    if (error) throw error;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getProblematicAssetsAction(): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const { getProblematicAssets } = await import('@/lib/services/tpstreams-analytics');
    const data = await getProblematicAssets();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
