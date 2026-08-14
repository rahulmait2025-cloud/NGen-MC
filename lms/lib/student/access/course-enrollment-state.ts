import 'server-only';

import { cache } from 'react';
import { validateStudentCourseAccess as getActiveEntitlementRow } from '@/lib/services/student-entitlements';

export type FreeCourseAvailabilityInput = {
  is_free?: boolean | null;
  pricing_model?: string | null;
  publish_status?: string | null;
};

/** Published course that is free to enroll (catalog visibility — not enrollment). */
export function isPubliclyAvailableFreeCourse(course: FreeCourseAvailabilityInput): boolean {
  return course.publish_status === 'published'
    && !!(course.is_free || course.pricing_model === 'free');
}

/**
 * Durable enrollment: active, non-expired `student_entitlements` row.
 * My Courses and "already enrolled" CTAs use this — not public free availability.
 */
export const hasActiveCourseEntitlement = cache(async function hasActiveCourseEntitlement(
  studentId: string,
  courseId: string,
  isGlobal: boolean,
): Promise<boolean> {
  const row = await getActiveEntitlementRow(studentId, courseId, isGlobal);
  return row !== null;
});
