import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getOptionalStudentContext } from '@/lib/auth/get-optional-student-context';
import {
  getPublicBootcampCourseInPillar,
  getJobReadyBootcampProduct,
  isStudentEnrolledInJobReadyBootcamp,
} from '@/lib/services/job-ready-bootcamp';
import { isJobReadyBootcampFeatureEnabled } from '@/lib/services/job-ready-bootcamp-feature';
import { resolvePaidCourseLandingData } from '@/lib/services/paid-course-landing';
import { buildLearnHref } from '@/lib/utils/variant-learn-url';
import { PremiumCourseLandingClient } from '../../../../../pillars/[pillarSlug]/courses/[courseId]/_components/premium-course-landing-client';
import { BootcampConnectedCourseEnrollment } from '../../../../_components/bootcamp-connected-course-enrollment';

export default async function BootcampCoursePreviewPage({
  params,
}: {
  params: Promise<{ collegeSlug: string; pillarSlug: string; courseId: string }>;
}): Promise<ReactNode> {
  const { collegeSlug, pillarSlug, courseId } = await params;

  if (!(await isJobReadyBootcampFeatureEnabled())) notFound();

  const [ctx, match] = await Promise.all([
    getOptionalStudentContext(collegeSlug),
    getPublicBootcampCourseInPillar(collegeSlug, pillarSlug, courseId),
  ]);
  if (!match) notFound();

  const studentId = ctx?.studentId ?? null;
  const isGlobal = ctx?.isGlobal ?? ['direct-learners', 'direct-learner', 'unknown'].includes(collegeSlug.toLowerCase());
  const collegeId = ctx?.tenant?.id ?? null;

  const [bootcampEnrolled, product, landing] = await Promise.all([
    studentId
      ? isStudentEnrolledInJobReadyBootcamp(studentId, isGlobal ? null : collegeId)
      : Promise.resolve(false),
    getJobReadyBootcampProduct(),
    resolvePaidCourseLandingData({
      collegeSlug,
      pillarSlug: match.pillar.slug,
      courseId: match.course.id,
      studentId: studentId,
      isGlobal: isGlobal,
      collegeId: isGlobal ? null : collegeId,
    }),
  ]);

  if (!landing) notFound();

  const hasPlayerAccess = bootcampEnrolled || landing.hasLearningAccess;
  const learnHref = buildLearnHref(collegeSlug, landing.masterCourseId);

  if (hasPlayerAccess) {
    redirect(learnHref);
  }

  const landingDetail = {
    ...landing.landingDetail,
    entitled: false,
  };

  const enrollmentSlot = (
    <BootcampConnectedCourseEnrollment
      collegeSlug={collegeSlug}
      priceMinor={product?.price_minor ?? null}
      currency={product?.currency ?? 'INR'}
      validityDays={product?.validity_days ?? null}
    />
  );

  return (
    <PremiumCourseLandingClient
      collegeSlug={collegeSlug}
      pillarSlug={match.pillar.slug}
      courseId={landing.masterCourseId}
      detail={landingDetail}
      enrollmentSlot={enrollmentSlot}
      learnHref={learnHref}
      jobReadyBootcampMode={{
        heroBadgeLabel: 'JOB READY BOOTCAMP',
        enrollCtaLabel: 'Enroll in Job Ready Bootcamp',
      }}
    />
  );
}
