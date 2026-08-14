'use server';

/**
 * Resolved Content Server Actions (Phase 1A).
 *
 * Backend-only actions for resolving master courses, variants, and bundles
 * into fully hydrated read models with video metadata.
 *
 * NOT wired to any UI in Phase 1A.
 */

import { requireAuth } from '@/lib/auth/require-superadmin-action';
import {
  getResolvedVariant,
  getResolvedBundle,
  validateResolvedContentIntegrity,
  type ResolvedVariant,
  type ResolvedBundle,
  type ContentIntegrityReport,
} from '@/lib/services/resolved-content';

interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function resolveVariantAction(
  variantId: string,
): Promise<ActionResponse<ResolvedVariant>> {
  const auth = await requireAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const resolved = await getResolvedVariant(variantId);
    if (!resolved) return { success: false, error: 'Course variant not found' };
    return { success: true, data: resolved };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}

export async function resolveBundleAction(
  bundleId: string,
): Promise<ActionResponse<ResolvedBundle>> {
  const auth = await requireAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const resolved = await getResolvedBundle(bundleId);
    if (!resolved) return { success: false, error: 'Course bundle not found' };
    return { success: true, data: resolved };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}

export async function validateContentIntegrityAction(
  entityType: 'master_course' | 'variant' | 'bundle',
  entityId: string,
): Promise<ActionResponse<ContentIntegrityReport>> {
  const auth = await requireAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const report = await validateResolvedContentIntegrity(entityType, entityId);
    return { success: true, data: report };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}
