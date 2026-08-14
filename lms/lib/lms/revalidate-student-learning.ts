import { revalidatePath, revalidateTag } from 'next/cache';

/** Invalidate bootcamp landing/catalog after Super Admin pillar or course changes. */
export function revalidateBootcampCatalogCaches(collegeSlug?: string): void {
  revalidateTag('bootcamp-catalog', 'max');
  revalidateTag('bootcamp-pillar-courses', 'max');
  revalidateTag('pillars', 'max');
  revalidateTag('courses', 'max');
  if (collegeSlug) {
    revalidateTag(`college-bootcamp-catalog:${collegeSlug}`, 'max');
    revalidatePath(`/c/${collegeSlug}/student/bootcamp`, 'page');
  } else {
    revalidatePath('/c/direct-learners/student/bootcamp', 'page');
  }
}

/** Invalidate My Courses and related entitlement/progress caches after enrollment or purchase. */
export function revalidateStudentLearningCaches(
  collegeSlug: string,
  studentId: string,
): void {
  revalidatePath(`/c/${collegeSlug}/student/my-courses`, 'page');
  if (collegeSlug !== 'direct-learners') {
    revalidatePath('/c/direct-learners/student/my-courses', 'page');
  }
  revalidateTag('entitlements', 'max');
  revalidateTag('progress', 'max');
  revalidateTag(`student-purchases:${studentId}`, 'max');
  revalidateTag(`student-my-courses-${studentId}`, 'max');
  revalidateTag(`student-bootcamp-enrollment-${studentId}`, 'max');
  revalidateTag(`student-expiring-${studentId}`, 'max');
}
