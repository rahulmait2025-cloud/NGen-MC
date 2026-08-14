import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Reads the `job_ready_bootcamp_enabled` platform feature flag.
 *
 * This is a standalone LMS-local reader — the LMS must not import the
 * super-admin app's `platform-settings` service. Both apps read the same
 * `platform_settings` row directly from the shared database.
 *
 * Defaults to `false` (feature disabled) if the row or column is missing,
 * so an unmigrated database fails closed rather than silently enabling
 * paid enrollment surfaces.
 */
async function getJobReadyBootcampFeatureEnabledCached(): Promise<boolean> {
  'use cache';
  // Short TTL: SuperAdmin toggles write the shared DB but cannot revalidate LMS
  // Data Cache tags across deployments. Fail closed on missing column/row.
  cacheLife('halfMinute');
  cacheTag('platform-settings');

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('platform_settings')
    .select('job_ready_bootcamp_enabled')
    .eq('id', 'default')
    .maybeSingle();

  if (error) {
    const missing =
      error.code === '42P01' ||
      error.code === 'PGRST204' ||
      (error.message ?? '').toLowerCase().includes('schema cache');
    if (missing) return false;
    console.warn('[job-ready-bootcamp-feature] failed to read platform_settings', {
      code: error.code,
      message: error.message,
    });
    return false;
  }

  if (!data) return false;
  return Boolean((data as { job_ready_bootcamp_enabled?: boolean | null }).job_ready_bootcamp_enabled);
}

export async function isJobReadyBootcampFeatureEnabled(): Promise<boolean> {
  return getJobReadyBootcampFeatureEnabledCached();
}
