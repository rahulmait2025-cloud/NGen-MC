'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { getMasterCourseById, updateMasterCourse } from '@/lib/services/master-courses';
import { getVariantWithItems, updateVariant } from '@/lib/services/course-variants';
import {
  ensurePaidCourseLandingMetadata,
  ensurePaidCourseLandingMetadataForVariant,
  getPaidCourseLandingMetadata,
  upsertPaidCourseLandingMetadata,
  upsertPaidCourseLandingMetadataForVariant,
  type PaidCourseLandingMetadataRow,
  type UpsertPaidCourseLandingInput,
} from '@/lib/services/paid-course-landing-metadata';
import {
  isPaidProductMetadataComplete,
  validatePreviewVideoUrl,
} from '@/lib/services/paid-product-validation';

export type PaidProductSourceType = 'master_course' | 'course_variant';

function revalidatePaidProductPaths(input: {
  sourceType: PaidProductSourceType;
  sourceId: string;
  pillarId?: string | null;
  bootcampId?: string | null;
  masterCourseId?: string;
}): void {
  revalidatePath('/course-pricing');
  revalidatePath('/master-courses');
  revalidatePath('/variants');

  if (input.sourceType === 'master_course') {
    revalidatePath(`/master-courses/${input.sourceId}`);
    if (input.pillarId) {
      revalidatePath(`/master-courses/pillars/${input.pillarId}`);
      revalidatePath(`/master-courses/pillars/${input.pillarId}/courses/${input.sourceId}`);
    }
    if (input.bootcampId) {
      revalidatePath(`/bootcamps/${input.bootcampId}`);
      revalidatePath(`/bootcamps/${input.bootcampId}/courses/${input.sourceId}`);
    }
    revalidatePath('/bootcamps');
    revalidatePath('/paid-course-builder');
    return;
  }

  revalidatePath(`/variants/${input.sourceId}`);
  if (input.masterCourseId) {
    revalidatePath(`/master-courses/${input.masterCourseId}`);
  }
}

function validateUpsertPayload(input: UpsertPaidCourseLandingInput): string | null {
  if (input.preview_video_url !== undefined) {
    return validatePreviewVideoUrl(input.preview_video_url);
  }
  return null;
}

export async function getPaidProductMetadataAction(
  sourceType: PaidProductSourceType,
  sourceId: string,
): Promise<{ ok: true; data: PaidCourseLandingMetadataRow } | { ok: false; error: string }> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  try {
    if (sourceType === 'master_course') {
      const course = await getMasterCourseById(sourceId);
      if (!course) return { ok: false, error: 'Course not found' };
      const metadata = await ensurePaidCourseLandingMetadata(course);
      return { ok: true, data: metadata };
    }

    const variant = await getVariantWithItems(sourceId);
    if (!variant) return { ok: false, error: 'Variant not found' };
    const metadata = await ensurePaidCourseLandingMetadataForVariant(variant);
    return { ok: true, data: metadata };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load metadata' };
  }
}

export async function upsertPaidProductMetadataAction(
  sourceType: PaidProductSourceType,
  sourceId: string,
  input: UpsertPaidCourseLandingInput,
): Promise<{ ok: true; data: PaidCourseLandingMetadataRow } | { ok: false; error: string }> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  const previewError = validateUpsertPayload(input);
  if (previewError) return { ok: false, error: previewError };

  try {
    if (sourceType === 'master_course') {
      const course = await getMasterCourseById(sourceId);
      if (!course) return { ok: false, error: 'Course not found' };
      const saved = await upsertPaidCourseLandingMetadata(course, input);
      revalidatePaidProductPaths({
        sourceType,
        sourceId,
        pillarId: course.pillar_id,
        bootcampId: course.bootcamp_id,
      });
      return { ok: true, data: saved };
    }

    const variant = await getVariantWithItems(sourceId);
    if (!variant) return { ok: false, error: 'Variant not found' };
    const saved = await upsertPaidCourseLandingMetadataForVariant(variant, input);
    revalidatePaidProductPaths({
      sourceType,
      sourceId,
      masterCourseId: variant.master_course_id,
    });
    return { ok: true, data: saved };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to save metadata' };
  }
}

export async function enablePaidProductAction(
  sourceType: PaidProductSourceType,
  sourceId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  try {
    if (sourceType === 'master_course') {
      const course = await getMasterCourseById(sourceId);
      if (!course) return { ok: false, error: 'Course not found' };

      const metadata = await getPaidCourseLandingMetadata(sourceId);
      const completeness = isPaidProductMetadataComplete(metadata);
      if (!completeness.ok) {
        return {
          ok: false,
          error: `Complete paid course metadata first (missing: ${completeness.missing.join(', ')})`,
        };
      }

      await upsertPaidCourseLandingMetadata(course, {
        is_published: true,
        is_visible: true,
      });
      await updateMasterCourse(sourceId, { show_as_paid_course: true });
      revalidatePaidProductPaths({
        sourceType,
        sourceId,
        pillarId: course.pillar_id,
        bootcampId: course.bootcamp_id,
      });
      return { ok: true };
    }

    const variant = await getVariantWithItems(sourceId);
    if (!variant) return { ok: false, error: 'Variant not found' };

      const metadata = await getPaidCourseLandingMetadata(sourceId, 'course_variant');
    const completeness = isPaidProductMetadataComplete(metadata);
    if (!completeness.ok) {
      return {
        ok: false,
        error: `Complete paid course metadata first (missing: ${completeness.missing.join(', ')})`,
      };
    }

    await upsertPaidCourseLandingMetadataForVariant(variant, {
      is_published: true,
      is_visible: true,
    });
    await updateVariant(sourceId, { show_as_paid_course: true });
    revalidatePaidProductPaths({
      sourceType,
      sourceId,
      masterCourseId: variant.master_course_id,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to enable paid product' };
  }
}

export async function disablePaidProductAction(
  sourceType: PaidProductSourceType,
  sourceId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  try {
    if (sourceType === 'master_course') {
      const course = await getMasterCourseById(sourceId);
      if (!course) return { ok: false, error: 'Course not found' };
      await updateMasterCourse(sourceId, { show_as_paid_course: false });
      revalidatePaidProductPaths({
        sourceType,
        sourceId,
        pillarId: course.pillar_id,
        bootcampId: course.bootcamp_id,
      });
      return { ok: true };
    }

    const variant = await getVariantWithItems(sourceId);
    if (!variant) return { ok: false, error: 'Variant not found' };
    await updateVariant(sourceId, { show_as_paid_course: false });
    revalidatePaidProductPaths({
      sourceType,
      sourceId,
      masterCourseId: variant.master_course_id,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to disable paid product' };
  }
}
