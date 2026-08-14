'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth/require-superadmin-action';

interface ActionResponse<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
}

const THUMBNAIL_BUCKET = 'brand-assets';
const THUMBNAIL_PREFIX = 'course-thumbnails';
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

function isAllowedImageType(type: string): type is (typeof ALLOWED_TYPES)[number] {
  return (ALLOWED_TYPES as readonly string[]).includes(type);
}

export async function uploadCourseThumbnailAction(
  courseId: string,
  file: File,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  if (!courseId) return { ok: false, error: 'Course ID is required' };
  if (!file) return { ok: false, error: 'No file provided' };
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, error: 'Image must be under 2 MB' };
  }
  if (!isAllowedImageType(file.type)) {
    return { ok: false, error: 'Only JPG, PNG, and WebP images are allowed' };
  }

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
  const path = `${THUMBNAIL_PREFIX}/${courseId}/thumbnail.${ext}`;

  const admin = createAdminClient();

  // Remove any existing thumbnails for this course (different extensions)
  const extensions = ['jpg', 'png', 'webp'];
  const existingPaths = extensions.map((e) => `${THUMBNAIL_PREFIX}/${courseId}/thumbnail.${e}`);
  await admin.storage.from(THUMBNAIL_BUCKET).remove(existingPaths).catch(() => {});

  const { error: uploadError } = await admin.storage
    .from(THUMBNAIL_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}` };
  }

  const { data: urlData } = admin.storage.from(THUMBNAIL_BUCKET).getPublicUrl(path);
  const thumbnailUrl = urlData.publicUrl;

  // Persist URL in course metadata
  const { data: course, error: fetchError } = await admin
    .from('master_courses')
    .select('metadata')
    .eq('id', courseId)
    .maybeSingle();

  if (fetchError || !course) {
    return { ok: false, error: 'Course not found' };
  }

  const metadata = { ...(course.metadata as Record<string, unknown> || {}), thumbnail_url: thumbnailUrl };

  const { error: updateError } = await admin
    .from('master_courses')
    .update({ metadata })
    .eq('id', courseId);

  if (updateError) {
    return { ok: false, error: `Failed to save thumbnail URL: ${updateError.message}` };
  }

  revalidatePath('/master-courses');
  return { ok: true, data: { thumbnail_url: thumbnailUrl } };
}

export async function deleteCourseThumbnailAction(
  courseId: string,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  if (!courseId) return { ok: false, error: 'Course ID is required' };

  const admin = createAdminClient();

  // Remove all possible extensions
  const extensions = ['jpg', 'png', 'webp'];
  const paths = extensions.map((e) => `${THUMBNAIL_PREFIX}/${courseId}/thumbnail.${e}`);
  await admin.storage.from(THUMBNAIL_BUCKET).remove(paths).catch(() => {});

  // Clear thumbnail_url from metadata
  const { data: course } = await admin
    .from('master_courses')
    .select('metadata')
    .eq('id', courseId)
    .maybeSingle();

  if (course) {
    const metadata = { ...(course.metadata as Record<string, unknown> || {}) };
    delete metadata.thumbnail_url;
    await admin.from('master_courses').update({ metadata }).eq('id', courseId);
  }

  revalidatePath('/master-courses');
  return { ok: true };
}
