'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import {
  removeTeamPageHeroImage,
  updateTeamPageSettings,
  uploadTeamPageHeroImage,
} from '@/lib/superadmin/team-page-settings/mutations';
import { teamPageSettingsFormSchema } from '@/lib/superadmin/team-page-settings/validators';
import type { ActionResponse } from '@/app/(app)/team/actions';

function revalidateTeamPageSettingsCaches() {
  revalidatePath('/team');
  revalidatePath('/team/settings');
  revalidateTag('team-page-settings', 'max');
}

export async function updateTeamPageSettingsAction(
  formData: FormData,
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const raw = {
    hero_title: (formData.get('hero_title') as string | null) ?? '',
    hero_description: (formData.get('hero_description') as string | null) ?? '',
    hero_annotation: (formData.get('hero_annotation') as string | null) ?? '',
    hero_image_alt_text: (formData.get('hero_image_alt_text') as string | null) ?? '',
  };

  const parsed = teamPageSettingsFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const hasHeroImage = formData.get('has_hero_image') === 'true';
  if (hasHeroImage && !parsed.data.hero_image_alt_text) {
    return { success: false, error: 'Alt text is required when a hero photo is set.' };
  }

  try {
    await updateTeamPageSettings(parsed.data, authCheck.user.id);
    revalidateTeamPageSettingsCaches();
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to save team page settings.',
    };
  }
}

export async function uploadTeamPageHeroImageAction(
  formData: FormData,
): Promise<ActionResponse<{ heroImagePath: string }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const file = formData.get('photo');
  if (!(file instanceof File)) {
    return { success: false, error: 'No file provided.' };
  }

  try {
    const result = await uploadTeamPageHeroImage(file, authCheck.user.id);
    revalidateTeamPageSettingsCaches();
    return { success: true, data: result };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to upload hero photo.',
    };
  }
}

export async function removeTeamPageHeroImageAction(): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const result = await removeTeamPageHeroImage(authCheck.user.id);
    revalidateTeamPageSettingsCaches();
    return { success: true, warning: result.storageWarning };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to remove hero photo.',
    };
  }
}
