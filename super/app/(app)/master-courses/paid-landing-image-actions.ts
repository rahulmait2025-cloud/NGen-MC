'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { getMasterCourseById } from '@/lib/services/master-courses';
import { getVariantWithItems } from '@/lib/services/course-variants';
import {
  upsertPaidCourseLandingMetadata,
  upsertPaidCourseLandingMetadataForVariant,
  type UpsertPaidCourseLandingInput,
} from '@/lib/services/paid-course-landing-metadata';

interface ActionResponse<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
}

const IMAGE_BUCKET = 'brand-assets';
const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type PaidCourseImageTarget = 'cover' | 'thumbnail' | 'both';
export type PaidProductImageSourceType = 'master_course' | 'course_variant' | 'paid_course_builder';

function fileExtension(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  return 'webp';
}

function isAllowedImageType(type: string): type is (typeof ALLOWED_TYPES)[number] {
  return (ALLOWED_TYPES as readonly string[]).includes(type);
}

function validateImage(file: File): string | null {
  if (!file) return 'No file provided';
  if (file.size > MAX_SIZE_BYTES) return 'Image must be under 2 MB';
  if (!isAllowedImageType(file.type)) return 'Only JPG, PNG, and WebP images are allowed';
  return null;
}

function storagePathForSource(
  sourceType: PaidProductImageSourceType,
  sourceId: string,
  kind: 'cover' | 'thumbnail',
): string {
  const extKind = kind;
  const timestamp = Date.now();
  if (sourceType === 'course_variant') {
    return `paid-products/course-variants/${sourceId}/${extKind}-${timestamp}`;
  }
  if (sourceType === 'paid_course_builder') {
    return `paid-courses/${sourceId}/${extKind}-${timestamp}`;
  }
  return `paid-products/master-courses/${sourceId}/${extKind}-${timestamp}`;
}

async function uploadPaidProductImageFile(
  sourceType: PaidProductImageSourceType,
  sourceId: string,
  kind: 'cover' | 'thumbnail',
  file: File,
): Promise<string> {
  const ext = fileExtension(file.type);
  const path = `${storagePathForSource(sourceType, sourceId, kind)}.${ext}`;
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = admin.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}

function revalidatePaidCoursePaths(courseId: string, bootcampId?: string | null): void {
  revalidatePath('/bootcamps');
  revalidatePath('/paid-course-builder');
  revalidatePath('/master-courses');
  revalidatePath('/course-pricing');
  revalidatePath(`/master-courses/${courseId}`);
  if (bootcampId) {
    revalidatePath(`/bootcamps/${bootcampId}`);
    revalidatePath(`/bootcamps/${bootcampId}/courses/${courseId}`);
  }
}

export async function uploadPaidProductImageAction(
  sourceType: PaidProductImageSourceType,
  sourceId: string,
  target: PaidCourseImageTarget,
  file: File,
): Promise<ActionResponse<{ cover_image_url?: string; thumbnail_url?: string }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const validationError = validateImage(file);
  if (validationError) return { ok: false, error: validationError };
  if (!sourceId) return { ok: false, error: 'Source ID is required' };

  try {
    const patch: UpsertPaidCourseLandingInput = {};
    const publicUrl = await uploadPaidProductImageFile(
      sourceType,
      sourceId,
      target === 'thumbnail' ? 'thumbnail' : 'cover',
      file,
    );

    if (target === 'cover' || target === 'both') {
      patch.cover_image_url = publicUrl;
    }
    if (target === 'thumbnail' || target === 'both') {
      patch.thumbnail_url = publicUrl;
    }

    if (target === 'both') {
      patch.cover_image_url = publicUrl;
      patch.thumbnail_url = publicUrl;
    }

    if (sourceType === 'course_variant') {
      const variant = await getVariantWithItems(sourceId);
      if (!variant) return { ok: false, error: 'Variant not found' };
      await upsertPaidCourseLandingMetadataForVariant(variant, patch);
      revalidatePath('/variants');
      revalidatePath(`/variants/${sourceId}`);
      revalidatePath('/course-pricing');
      return {
        ok: true,
        data: {
          cover_image_url: patch.cover_image_url ?? undefined,
          thumbnail_url: patch.thumbnail_url ?? undefined,
        },
      };
    }

    const course = await getMasterCourseById(sourceId);
    if (!course) return { ok: false, error: 'Course not found' };
    await upsertPaidCourseLandingMetadata(course, patch);
    revalidatePaidCoursePaths(sourceId, course.bootcamp_id);

    return {
      ok: true,
      data: {
        cover_image_url: patch.cover_image_url ?? undefined,
        thumbnail_url: patch.thumbnail_url ?? undefined,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Upload failed' };
  }
}

/** @deprecated Use uploadPaidProductImageAction */
export async function uploadPaidCourseLandingImageAction(
  courseId: string,
  target: PaidCourseImageTarget,
  file: File,
): Promise<ActionResponse<{ cover_image_url?: string; thumbnail_url?: string }>> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };
  return uploadPaidProductImageAction('master_course', courseId, target, file);
}
