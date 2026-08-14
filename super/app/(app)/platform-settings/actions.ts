'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { getPlatformSettings, savePlatformSettings } from '@/lib/services/platform-settings';
import type { ActionResponse } from '@/app/(app)/team/actions';

/**
 * Persist-local cache invalidation always runs.
 * Cross-app LMS revalidation is best-effort and uses the pre-existing
 * INTERNAL_API_SECRET + LMS URL env vars (also used by mentorship session-completed).
 * Missing env does not fail the toggle — LMS converges via halfMinute TTL.
 */
async function revalidatePlatformSettingsCaches(): Promise<void> {
  revalidatePath('/platform-settings');
  revalidateTag('platform-settings', 'max');

  const lmsUrl = (
    process.env.NEXT_PUBLIC_LMS_URL ??
    process.env.NEXT_PUBLIC_STUDENT_APP_URL ??
    process.env.LMS_INTERNAL_URL ??
    ''
  ).replace(/\/$/, '');
  const apiSecret = process.env.INTERNAL_API_SECRET?.trim();

  if (!lmsUrl || !apiSecret) {
    console.info(
      '[platform-settings] LMS cross-app revalidation skipped — NEXT_PUBLIC_LMS_URL/LMS_INTERNAL_URL or INTERNAL_API_SECRET unset; LMS will converge via short cache TTL',
    );
    return;
  }

  try {
    const response = await fetch(`${lmsUrl}/api/internal/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiSecret}`,
      },
      body: JSON.stringify({ tags: ['platform-settings'] }),
    });
    if (!response.ok) {
      console.error('[platform-settings] LMS revalidation HTTP failure', {
        status: response.status,
        lmsUrlHost: (() => {
          try {
            return new URL(lmsUrl).host;
          } catch {
            return 'invalid_url';
          }
        })(),
      });
    }
  } catch (err) {
    console.error('[platform-settings] LMS revalidation request failed', {
      reason: err instanceof Error ? err.message : 'network_error',
    });
  }
}

export async function setJobReadyBootcampEnabledAction(
  enabled: boolean,
): Promise<ActionResponse<{ enabled: boolean }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const settings = await getPlatformSettings();
    settings.job_ready_bootcamp_enabled = enabled;
    await savePlatformSettings(settings);
    // DB write succeeded — report success even if cross-app revalidation fails.
    await revalidatePlatformSettingsCaches();
    return { success: true, data: { enabled } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to update Job Ready Bootcamp setting.',
    };
  }
}
