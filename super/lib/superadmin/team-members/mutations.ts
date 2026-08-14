import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateItemSlug, slugifyText } from '@/lib/utils/slug';
import { getTeamMemberPhotoPublicUrl } from './photo-url';

export { getTeamMemberPhotoPublicUrl };
import { getExistingTeamMemberSlugs } from './queries';
import type { TeamMemberInput } from './types';

const TEAM_PHOTO_BUCKET = 'team-members';

export async function generateTeamMemberSlug(
  name: string,
  excludeId?: string,
): Promise<string> {
  const existing = await getExistingTeamMemberSlugs(excludeId);
  const slug = generateItemSlug(name, existing);
  if (!slug) {
    throw new Error('Could not generate a slug from the provided name.');
  }
  return slug;
}

export async function createTeamMember(
  input: TeamMemberInput,
  userId: string,
): Promise<{ id: string }> {
  const admin = createAdminClient();
  const slug = await generateTeamMemberSlug(input.name);

  const { data, error } = await admin
    .from('team_members')
    .insert({
      name: input.name,
      slug,
      role: input.role,
      short_role: input.short_role,
      short_bio: input.short_bio,
      full_bio: input.full_bio,
      photo_alt_text: input.photo_alt_text,
      email: input.email,
      linkedin_url: input.linkedin_url,
      twitter_url: input.twitter_url,
      github_url: input.github_url,
      instagram_url: input.instagram_url,
      youtube_url: input.youtube_url,
      personal_website_url: input.personal_website_url,
      location: input.location,
      is_founder: input.is_founder,
      is_featured: input.is_featured,
      is_published: input.is_published,
      display_order: input.display_order,
      created_by: userId,
      updated_by: userId,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function updateTeamMember(
  id: string,
  input: TeamMemberInput,
  userId: string,
): Promise<void> {
  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from('team_members')
    .select('name, slug')
    .eq('id', id)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error('Team member not found.');

  let slug = existing.slug;
  if (slugifyText(existing.name) !== slugifyText(input.name)) {
    slug = await generateTeamMemberSlug(input.name, id);
  }

  const { error } = await admin
    .from('team_members')
    .update({
      name: input.name,
      slug,
      role: input.role,
      short_role: input.short_role,
      short_bio: input.short_bio,
      full_bio: input.full_bio,
      photo_alt_text: input.photo_alt_text,
      email: input.email,
      linkedin_url: input.linkedin_url,
      twitter_url: input.twitter_url,
      github_url: input.github_url,
      instagram_url: input.instagram_url,
      youtube_url: input.youtube_url,
      personal_website_url: input.personal_website_url,
      location: input.location,
      is_founder: input.is_founder,
      is_featured: input.is_featured,
      is_published: input.is_published,
      display_order: input.display_order,
      updated_by: userId,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function setTeamMemberPublished(
  id: string,
  isPublished: boolean,
  userId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('team_members')
    .update({ is_published: isPublished, updated_by: userId })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function reorderTeamMembers(orderedIds: string[]): Promise<void> {
  const admin = createAdminClient();
  const updates = orderedIds.map((id, index) =>
    admin.from('team_members').update({ display_order: index }).eq('id', id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

export async function deleteTeamMember(id: string): Promise<{ storageWarning?: string }> {
  const admin = createAdminClient();

  const { data: member, error: fetchError } = await admin
    .from('team_members')
    .select('photo_path')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await admin.from('team_members').delete().eq('id', id);
  if (error) throw new Error(error.message);

  if (member?.photo_path) {
    const { error: storageError } = await admin.storage
      .from(TEAM_PHOTO_BUCKET)
      .remove([member.photo_path]);
    if (storageError) {
      return {
        storageWarning: `Member deleted, but photo cleanup failed: ${storageError.message}`,
      };
    }
  }

  return {};
}

export async function removeTeamMemberPhoto(id: string, userId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: member, error: fetchError } = await admin
    .from('team_members')
    .select('photo_path')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!member?.photo_path) return;

  const { error: storageError } = await admin.storage
    .from(TEAM_PHOTO_BUCKET)
    .remove([member.photo_path]);

  if (storageError) throw new Error(storageError.message);

  const { error: updateError } = await admin
    .from('team_members')
    .update({ photo_path: null, updated_by: userId })
    .eq('id', id);

  if (updateError) throw new Error(updateError.message);
}

export async function uploadTeamMemberPhoto(
  id: string,
  file: File,
  userId: string,
): Promise<{ photoPath: string }> {
  const admin = createAdminClient();

  const MAX_SIZE_BYTES = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

  if (!file || file.size === 0) throw new Error('No file provided.');
  if (file.size > MAX_SIZE_BYTES) throw new Error('Image must be under 5 MB.');
  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    throw new Error('Only JPG, PNG, and WebP images are allowed.');
  }

  const ext =
    file.type === 'image/jpeg'
      ? 'jpg'
      : file.type === 'image/png'
        ? 'png'
        : 'webp';

  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/\.+/g, '.')
    .slice(0, 80);

  const path = `${id}/${Date.now()}-${safeName || `photo.${ext}`}`;

  const { data: existing, error: fetchError } = await admin
    .from('team_members')
    .select('photo_path')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error('Team member not found.');

  const { error: uploadError } = await admin.storage
    .from(TEAM_PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { error: updateError } = await admin
    .from('team_members')
    .update({ photo_path: path, updated_by: userId })
    .eq('id', id);

  if (updateError) {
    await admin.storage.from(TEAM_PHOTO_BUCKET).remove([path]).catch(() => {});
    throw new Error(`Failed to save photo path: ${updateError.message}`);
  }

  if (existing.photo_path && existing.photo_path !== path) {
    await admin.storage.from(TEAM_PHOTO_BUCKET).remove([existing.photo_path]).catch(() => {});
  }

  return { photoPath: path };
}
