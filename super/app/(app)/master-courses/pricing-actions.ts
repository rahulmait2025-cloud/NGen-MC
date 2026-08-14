'use server';

/**
 * Server actions for course pricing panel.
 */

import { getCoursePricingStatus as getPricingStatus } from '@/lib/services/course-pricing';
import { upsertGlobalVariantForCourse } from '@/lib/services/course-pricing';
import type { UpdateMasterCourseInput } from '@/lib/services/master-courses';
import { updateMasterCourse } from '@/lib/services/master-courses';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { getMasterCourseById } from '@/lib/services/master-courses';

export async function getCoursePricingStatusAction(courseId: string) {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };
  return getPricingStatus(courseId);
}

export async function updateCoursePricingAction(
  courseId: string,
  input: UpdateMasterCourseInput,
) {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  const course = await updateMasterCourse(courseId, input);

  if (
    input.visible_to_global_students !== undefined ||
    input.selling_price !== undefined ||
    input.pricing_model !== undefined ||
    input.is_free !== undefined ||
    input.discounted_price !== undefined ||
    input.currency !== undefined
  ) {
    const variantResult = await upsertGlobalVariantForCourse({
      courseId,
      pricing_model: course.pricing_model ?? undefined,
      base_price: course.base_price ?? undefined,
      selling_price: course.selling_price ?? undefined,
      discounted_price: course.discounted_price ?? undefined,
      currency: course.currency ?? undefined,
      is_free: course.is_free ?? false,
      is_invite_only: course.is_invite_only ?? false,
      visible_to_global_students: course.visible_to_global_students ?? false,
    });

    await revalidate(courseId);

    return {
      course,
      variantSync: variantResult,
    };
  }

  await revalidate(courseId);
  return { course };
}

async function revalidate(courseId: string) {
  revalidatePath('/master-courses');
  revalidatePath(`/master-courses/${courseId}`);
  const course = await getMasterCourseById(courseId).catch(() => null);
  const pillarId = course?.pillar_id ?? null;
  if (pillarId) {
    revalidatePath(`/master-courses/pillars/${pillarId}`);
    revalidatePath(`/master-courses/pillars/${pillarId}/courses/${courseId}`);
  }
}