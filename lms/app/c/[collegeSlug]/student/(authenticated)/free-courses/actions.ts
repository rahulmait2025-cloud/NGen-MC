'use server';

import { revalidatePath } from 'next/cache';
import { revalidateStudentLearningCaches } from '@/lib/lms/revalidate-student-learning';
import { requireAuth } from '@/lib/auth/require-student-action';
import { createAdminClient } from '@/lib/supabase/admin';
import { grantEntitlement, hasActiveCourseEntitlement } from '@/lib/services/course-access-manager';

export interface ActionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function enrollFreeDbCourseAction(
  collegeSlug: string,
  courseId: string,
): Promise<ActionResponse> {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { ok: false, error: 'Unauthorized' };
    const isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(auth.tenant.slug.toLowerCase());
    const collegeId = isGlobal ? null : auth.tenant.id;

    const sb = createAdminClient();
    const { data: course } = await sb
      .from('master_courses')
      .select('id, is_free, pricing_model, publish_status')
      .eq('id', courseId)
      .eq('course_kind', 'free_course')
      .single();

    if (!course || course.publish_status !== 'published') {
      return { ok: false, error: 'This course is no longer available.' };
    }

    if (!(course.is_free || course.pricing_model === 'free')) {
      return { ok: false, error: 'This course is not free.' };
    }

    const alreadyEnrolled = await hasActiveCourseEntitlement(auth.studentId, courseId, isGlobal);
    if (alreadyEnrolled) {
      return { ok: true, data: { success: true, alreadyEnrolled: true } };
    }

    await grantEntitlement({
      student_id: auth.studentId,
      master_course_id: courseId,
      source_type: 'b2c_direct',
      college_id: collegeId ?? undefined,
      metadata: {
        enrollment_type: 'free_course',
        enrolled_at: new Date().toISOString(),
      },
    });

    revalidatePath(`/c/${collegeSlug}/student/free-courses`);
    revalidateStudentLearningCaches(collegeSlug, auth.studentId);

    return { ok: true, data: { success: true } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to enroll in free course';
    return { ok: false, error: message };
  }
}

export async function unenrollFreeDbCourseAction(
  collegeSlug: string,
  courseId: string,
): Promise<ActionResponse> {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { ok: false, error: 'Unauthorized' };

    const sb = createAdminClient();
    const { error } = await sb
      .from('student_entitlements')
      .delete()
      .eq('student_id', auth.studentId)
      .eq('master_course_id', courseId)
      .eq('source_type', 'b2c_direct');

    if (error) throw error;

    revalidatePath(`/c/${collegeSlug}/student/free-courses`);
    revalidateStudentLearningCaches(collegeSlug, auth.studentId);

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to unenroll from free course';
    return { ok: false, error: message };
  }
}
