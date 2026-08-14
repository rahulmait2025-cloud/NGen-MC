import 'server-only';
import { cache } from 'react';
import { cacheTag, cacheLife } from 'next/cache';

import { createPublicClient } from '@/lib/supabase/server';
import { describeSupabaseError, isSupabaseNetworkError } from '@/lib/supabase/network-error';
import type { ModuleAccessOverlay } from '@/lib/modules/module-access';
import type { ModuleId } from '@/lib/modules/module-registry';
import { getModuleRegistry } from '@/lib/modules/module-registry';

async function getTenantModuleOverlayCached(collegeId: string): Promise<ModuleAccessOverlay> {
  'use cache';
  cacheLife('minutes');
  cacheTag('tenant-module-overlay');
  const supabase = createPublicClient();
  const { data: rows, error } = await supabase
    .from('tenant_module_overrides')
    .select('module_key, college_admin_enabled, student_enabled')
    .eq('college_id', collegeId);

  if (error) {
    const log = isSupabaseNetworkError(error) ? console.warn : console.error;
    log('[module-overlay] tenant_module_overrides select failed', {
      collegeId,
      code: error.code,
      message: describeSupabaseError(error),
    });
    return {};
  }

  const registry = getModuleRegistry();
  const validModuleIds = new Set(Object.keys(registry)) as Set<ModuleId>;
  const overlay: ModuleAccessOverlay = {};

  for (const row of rows ?? []) {
    const moduleKey = row?.module_key;
    if (!moduleKey || !validModuleIds.has(moduleKey as ModuleId)) continue;

    const moduleId = moduleKey as ModuleId;
    overlay[moduleId] = {};

    overlay[moduleId].college_admin = row.college_admin_enabled ? 'allow' : 'deny';
    overlay[moduleId].student = row.student_enabled ? 'allow' : 'deny';
  }

  return overlay;
}

/**
 * Loads tenant-level module overrides from DB and returns ModuleAccessOverlay.
 * Only includes entries where an override exists; absence means inherit (plan-based).
 */
export const getTenantModuleOverlay = cache(async function getTenantModuleOverlay(collegeId: string): Promise<ModuleAccessOverlay> {
  return getTenantModuleOverlayCached(collegeId);
});
