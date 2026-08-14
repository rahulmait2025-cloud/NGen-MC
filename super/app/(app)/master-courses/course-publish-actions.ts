'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { getMasterCourseById } from '@/lib/services/master-courses';
import {
  validateThenPublishMasterCourse,
  unpublishMasterCourse,
} from '@/lib/services/master-course-publish';
import { updateMasterCourse, type UpdateMasterCourseInput } from '@/lib/services/master-courses';
import { upsertGlobalVariantForCourse } from '@/lib/services/course-pricing';
import { consumeRateLimit } from '@/lib/security/rate-limit';

async function revalidateMasterCourseViews(courseId: string) {
  revalidatePath('/master-courses');
  revalidatePath(`/master-courses/${courseId}`);
  const course = await getMasterCourseById(courseId).catch(() => null);
  const pillarId = course?.pillar_id ?? null;
  if (pillarId) {
    revalidatePath(`/master-courses/pillars/${pillarId}`);
    revalidatePath(`/master-courses/pillars/${pillarId}/courses/${courseId}`);
  }
}

/** Update course pricing and visibility settings. */
async function _updateCoursePricingAction(courseId: string, input: UpdateMasterCourseInput) {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };

  const course = await updateMasterCourse(courseId, input);

  if (input.visible_to_global_students !== undefined || input.selling_price !== undefined ||
      input.pricing_model !== undefined || input.is_free !== undefined ||
      input.discounted_price !== undefined || input.currency !== undefined) {

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

    await revalidateMasterCourseViews(courseId);

    return {
      course,
      variantSync: variantResult,
    };
  }

  await revalidateMasterCourseViews(courseId);
  return { course };
}

/** Validate (syncs module videos into lessons) and publish in one pass. */
export async function validateThenPublishCourseAction(courseId: string) {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };
  const limited = await consumeRateLimit({ key: `publish-course:${authResult.user.id}`, limit: 20, windowMs: 5 * 60 * 1000 });
  if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` } as const;
  const out = await validateThenPublishMasterCourse(courseId);
  if (out.course) {
    await revalidateMasterCourseViews(courseId);
  }
  return out;
}

export async function unpublishCourseAction(courseId: string) {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };
  const limited = await consumeRateLimit({ key: `unpublish-course:${authResult.user.id}`, limit: 20, windowMs: 5 * 60 * 1000 });
  if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` } as const;
  const [result] = await Promise.all([
    unpublishMasterCourse(courseId),
    revalidateMasterCourseViews(courseId),
  ]);
  return result;
}
