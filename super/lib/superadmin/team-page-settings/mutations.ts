import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTeamMemberPhotoPublicUrl } from '@/lib/superadmin/team-members/photo-url';
import type { TeamPageSettingsInput } from './types';

export { getTeamMemberPhotoPublicUrl as getTeamPageHeroPublicUrl };

const TEAM_PHOTO_BUCKET = 'team-members';
const HERO_PATH_PREFIX = 'team-page/hero';
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Update the editable hero content fields on the singleton settings row.
 * Never touches hero_image_path (managed by the upload/remove helpers).
 */
export async function updateTeamPageSettings(
  input: TeamPageSettingsInput,
  userId: string,
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.from('team_page_settings').upsert(
    {
      id: 1,
      hero_title: input.hero_title,
      hero_description: input.hero_description,
      hero_annotation: input.hero_annotation,
      hero_image_alt_text: input.hero_image_alt_text,
      updated_by: userId,
    },
    { onConflict: 'id' },
  );

  if (error) throw new Error(error.message);
}

/**
 * Upload a new hero group photo. Uploads the replacement first, updates the DB
 * second, then removes the previous image so the current image is never removed
 * before a successful replacement.
 */
export async function uploadTeamPageHeroImage(
  file: File,
  userId: string,
): Promise<{ heroImagePath: string }> {
  const admin = createAdminClient();

  if (!file || file.size === 0) throw new Error('No file provided.');
  if (file.size > MAX_SIZE_BYTES) throw new Error('Image must be under 5 MB.');
  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    throw new Error('Only JPG, PNG, and WebP images are allowed.');
  }

  const ext =
    file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';

  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/\.+/g, '.')
    .slice(0, 80);

  const path = `${HERO_PATH_PREFIX}/${Date.now()}-${safeName || `hero.${ext}`}`;

  const { data: existing, error: fetchError } = await admin
    .from('team_page_settings')
    .select('hero_image_path')
    .eq('id', 1)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  // 1) Upload replacement first.
  const { error: uploadError } = await admin.storage
    .from(TEAM_PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // 2) Persist the new path (upsert keeps the singleton row intact).
  const { error: updateError } = await admin.from('team_page_settings').upsert(
    { id: 1, hero_image_path: path, updated_by: userId },
    { onConflict: 'id' },
  );

  if (updateError) {
    await admin.storage.from(TEAM_PHOTO_BUCKET).remove([path]).catch(() => {});
    throw new Error(`Failed to save image path: ${updateError.message}`);
  }

  // 3) Remove the previous image only after the DB update succeeds.
  if (existing?.hero_image_path && existing.hero_image_path !== path) {
    await admin.storage
      .from(TEAM_PHOTO_BUCKET)
      .remove([existing.hero_image_path])
      .catch(() => {});
  }

  return { heroImagePath: path };
}

/**
 * Remove the hero group photo. Sets hero_image_path to NULL first (never deletes
 * the settings row), then best-effort removes the stored object.
 */
export async function removeTeamPageHeroImage(
  userId: string,
): Promise<{ storageWarning?: string }> {
  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from('team_page_settings')
    .select('hero_image_path')
    .eq('id', 1)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing?.hero_image_path) return {};

  const previousPath = existing.hero_image_path;

  const { error: updateError } = await admin.from('team_page_settings').upsert(
    { id: 1, hero_image_path: null, updated_by: userId },
    { onConflict: 'id' },
  );

  if (updateError) throw new Error(updateError.message);

  const { error: storageError } = await admin.storage
    .from(TEAM_PHOTO_BUCKET)
    .remove([previousPath]);

  if (storageError) {
    return {
      storageWarning: `Photo removed from the page, but storage cleanup failed: ${storageError.message}`,
    };
  }

  return {};
}
