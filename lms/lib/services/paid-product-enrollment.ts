import 'server-only';

import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { normUuid } from '@/lib/utils';
import { isEntitlementActive } from '@/lib/services/access-helpers';
import { loadEntitledVariantIdsForStudent } from '@/lib/services/student-discoverable-catalog';
import type { PaidCourseSourceType } from '@/lib/services/paid-course-catalog';
import type { StudentAccessContext } from '@/lib/services/course-access-manager';

export type PaidProductCtaState =
  | 'not_purchased'
  | 'exact_enrolled'
  | 'included_via_bootcamp'
  | 'included_via_college_assignment'
  | 'unavailable';

export type PaidProductEnrollmentInput = {
  userId: string;
  sourceType: PaidCourseSourceType;
  sourceId: string;
  masterCourseId: string;
  context: StudentAccessContext;
};

const loadExactPaidMasterCourseIds = cache(async (userId: string): Promise<Set<string>> => {
  const sb = createAdminClient();
  const { data } = await sb
    .from('student_entitlements')
    .select('master_course_id, status, valid_until, source_type')
    .eq('student_id', userId)
    .in('source_type', ['b2c_direct', 'free_course']);

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (isEntitlementActive(row)) {
      ids.add(row.master_course_id as string);
    }
  }
  return ids;
});

/** True only when the student purchased or was granted the exact sellable product. */
export async function hasExactPaidProductEnrollment(
  input: PaidProductEnrollmentInput,
): Promise<boolean> {
  const { userId, sourceType, sourceId } = input;

  if (sourceType === 'course_variant') {
    const entitledVariants = await loadEntitledVariantIdsForStudent(userId);
    return entitledVariants.has(sourceId);
  }

  const paidMasterIds = await loadExactPaidMasterCourseIds(userId);
  return paidMasterIds.has(sourceId);
}

/** Paid variant products are sold separately — bootcamp/college do not grant access. */
function isStandalonePaidVariantProduct(sourceType: PaidCourseSourceType): boolean {
  return sourceType === 'course_variant';
}

/** Broad access used for lesson playback — bootcamp, college, bundles, etc. */
export async function hasPaidProductLearningAccess(
  input: PaidProductEnrollmentInput,
): Promise<boolean> {
  if (await hasExactPaidProductEnrollment(input)) return true;

  if (isStandalonePaidVariantProduct(input.sourceType)) return false;

  const { validateStudentCourseAccess } = await import('@/lib/services/course-access-manager');
  return !!(await validateStudentCourseAccess(
    input.userId,
    input.masterCourseId,
    input.context,
  ));
}

export type PaidProductCtaResolution = {
  state: PaidProductCtaState;
  isProductEnrolled: boolean;
  hasLearningAccess: boolean;
  primaryLabel: string;
  inclusionMessage?: string;
};

export async function getPaidProductCtaState(
  input: PaidProductEnrollmentInput,
): Promise<PaidProductCtaResolution> {
  const isProductEnrolled = await hasExactPaidProductEnrollment(input);

  if (isProductEnrolled) {
    return {
      state: 'exact_enrolled',
      isProductEnrolled: true,
      hasLearningAccess: true,
      primaryLabel: 'Continue',
    };
  }

  const { canAccessBootcampCourse, isStudentEnrolledInJobReadyBootcamp } = await import(
    '@/lib/services/job-ready-bootcamp'
  );
  const bootcampEnrolled = await isStudentEnrolledInJobReadyBootcamp(
    input.userId,
    input.context.collegeId,
  );
  const bootcampCourseAccess = bootcampEnrolled
    ? await canAccessBootcampCourse(input.userId, input.masterCourseId, input.context.collegeId)
    : false;

  // Bootcamp inclusion applies to master paid courses only — not separately sold variants.
  if (
    !isStandalonePaidVariantProduct(input.sourceType)
    && bootcampEnrolled
    && bootcampCourseAccess
  ) {
    return {
      state: 'included_via_bootcamp',
      isProductEnrolled: false,
      hasLearningAccess: true,
      primaryLabel: 'Continue',
      inclusionMessage: 'Included in your Job Ready Bootcamp',
    };
  }

  if (input.context.collegeId && !isStandalonePaidVariantProduct(input.sourceType)) {
    const { resolveCollegeAssignedCourseIds } = await import(
      '@/lib/services/course-access-manager'
    );
    const assigned = await resolveCollegeAssignedCourseIds(input.context.collegeId);
    const want = normUuid(input.masterCourseId);
    if (assigned.some((id) => normUuid(id) === want)) {
      return {
        state: 'included_via_college_assignment',
        isProductEnrolled: false,
        hasLearningAccess: true,
        primaryLabel: 'Continue',
        inclusionMessage: 'Included through your college program',
      };
    }
  }

  const hasLearningAccess = await hasPaidProductLearningAccess(input);

  if (hasLearningAccess) {
    return {
      state: 'not_purchased',
      isProductEnrolled: false,
      hasLearningAccess: true,
      primaryLabel: 'Continue',
    };
  }

  return {
    state: 'not_purchased',
    isProductEnrolled: false,
    hasLearningAccess: false,
    primaryLabel: 'Enroll Now',
  };
}

/** Checkout / order creation — block only on exact product purchase, not inherited access. */
export async function studentHasExactVariantProductEnrollment(
  studentId: string,
  variantId: string,
): Promise<boolean> {
  const entitledVariants = await loadEntitledVariantIdsForStudent(studentId);
  return entitledVariants.has(variantId);
}

/** True when the student had access that is now expired (re-purchase eligible). */
export async function hasExpiredPaidProductEnrollment(
  input: PaidProductEnrollmentInput,
): Promise<boolean> {
  if (await hasExactPaidProductEnrollment(input)) return false;

  const sb = createAdminClient();

  if (input.sourceType === 'course_variant') {
    const { data } = await sb
      .from('student_content_entitlements')
      .select('status, valid_from, valid_until')
      .eq('student_id', input.userId)
      .eq('assigned_entity_type', 'variant')
      .eq('assigned_entity_id', input.sourceId);

    return (data ?? []).some((row) => !isEntitlementActive(row));
  }

  const { data } = await sb
    .from('student_entitlements')
    .select('status, valid_from, valid_until, source_type')
    .eq('student_id', input.userId)
    .eq('master_course_id', input.sourceId)
    .eq('source_type', 'b2c_direct');

  return (data ?? []).some((row) => !isEntitlementActive(row));
}
