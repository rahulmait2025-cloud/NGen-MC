import 'server-only';
import { cacheTag, cacheLife } from 'next/cache';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { createAdminClient } from '@/lib/supabase/admin';

export interface PlatformSettings {
  maintenance_mode: boolean;
  announcement_banner: boolean;
  force_2fa_admins: boolean;
  default_tenant_plan: 'starter' | 'growth' | 'enterprise';
  feature_placements: boolean;
  email_provider: string | null;
  invite_expiry_hours: number;
  dsa_readme_markdown: string | null;
  job_ready_bootcamp_enabled: boolean;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  maintenance_mode: false,
  announcement_banner: false,
  force_2fa_admins: true,
  default_tenant_plan: 'starter',
  feature_placements: true,
  email_provider: null,
  invite_expiry_hours: 24,
  dsa_readme_markdown: null,
  job_ready_bootcamp_enabled: false,
};

async function getPlatformSettingsCached(): Promise<PlatformSettings> {
  'use cache';
  cacheLife('halfMinute');
  cacheTag('platform-settings');
  const admin = createAdminClient();
  const { data, error } = await admin.from('platform_settings').select('id, maintenance_mode, announcement_banner, force_2fa_admins, default_tenant_plan, feature_placements, email_provider, invite_expiry_hours, dsa_readme_markdown, job_ready_bootcamp_enabled').eq('id', 'default').maybeSingle();

  if (error) {
    const isTableMissing =
      error.code === '42P01' ||
      error.code === 'PGRST204' ||
      error.message?.includes('schema cache');
    if (isTableMissing) {
      console.warn('[platform-settings] using defaults', { reason: 'error', code: error.code, message: error.message });
      return DEFAULT_SETTINGS;
    }
    throw new Error(error.message);
  }
  if (!data) {
    console.warn('[platform-settings] using defaults', { reason: 'no_row' });
    return DEFAULT_SETTINGS;
  }

  return {
    maintenance_mode: Boolean(data.maintenance_mode),
    announcement_banner: Boolean(data.announcement_banner),
    force_2fa_admins: Boolean(data.force_2fa_admins),
    default_tenant_plan: (data.default_tenant_plan as PlatformSettings['default_tenant_plan']) ?? 'starter',
    feature_placements: Boolean(data.feature_placements),
    email_provider: (data.email_provider as string | null) ?? null,
    invite_expiry_hours: typeof data.invite_expiry_hours === 'number' ? data.invite_expiry_hours : 24,
    dsa_readme_markdown: (data.dsa_readme_markdown as string | null) ?? null,
    job_ready_bootcamp_enabled: Boolean(
      (data as { job_ready_bootcamp_enabled?: boolean | null }).job_ready_bootcamp_enabled,
    ),
  };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  return getPlatformSettingsCached();
}

export async function savePlatformSettings(input: PlatformSettings): Promise<void> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const admin = createAdminClient();
  const { error } = await admin.from('platform_settings').upsert({
    id: 'default',
    ...input,
  });

  if (error) {
    const isColumnMissing =
      error.code === 'PGRST204' || error.message?.toLowerCase().includes('schema cache');
    if (isColumnMissing) {
      // job_ready_bootcamp_enabled column not migrated yet — persist the rest and warn.
      const { job_ready_bootcamp_enabled: _omit, ...rest } = input;
      const { error: retryError } = await admin.from('platform_settings').upsert({
        id: 'default',
        ...rest,
      });
      if (retryError) throw new Error(retryError.message);
      console.warn(
        '[platform-settings] job_ready_bootcamp_enabled column missing — run pending migration to persist this setting',
      );
      return;
    }
    throw new Error(error.message);
  }
}

/**
 * Internal, unauthenticated getter for the Job Ready Bootcamp feature flag.
 *
 * Unlike `getPlatformSettings`, this does not require a superadmin session.
 * It exists for internal super-app callers (e.g. background jobs, other
 * services within this app) that need the flag without a request session.
 * The LMS app must NOT import this — it has its own local reader that
 * queries `platform_settings` directly.
 */
export async function getJobReadyBootcampEnabledInternal(): Promise<boolean> {
  const settings = await getPlatformSettingsCached();
  return settings.job_ready_bootcamp_enabled;
}
