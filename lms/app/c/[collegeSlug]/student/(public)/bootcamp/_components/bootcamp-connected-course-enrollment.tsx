'use client';

import Link from 'next/link';
import { JobReadyBootcampPricingCta } from './bootcamp-pricing-cta';
import { buildBootcampLandingHref } from '@/lib/student/bootcamp-routes';

const BOOTCAMP_DISCLAIMER =
  'This course is already included in Job Ready Bootcamp. Enroll in Job Ready Bootcamp to unlock this course and all pillar courses.';

interface BootcampConnectedCourseEnrollmentProps {
  collegeSlug: string;
  priceMinor: number | null;
  currency: string;
  validityDays?: number | null;
}

export function BootcampConnectedCourseEnrollment({
  collegeSlug,
  priceMinor,
  currency,
  validityDays = null,
}: BootcampConnectedCourseEnrollmentProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
        <p className="text-sm font-semibold leading-relaxed text-foreground">{BOOTCAMP_DISCLAIMER}</p>
      </div>

      <JobReadyBootcampPricingCta
        collegeSlug={collegeSlug}
        priceMinor={priceMinor}
        currency={currency}
        validityDays={validityDays}
        label="Enroll in Job Ready Bootcamp"
        className="w-full items-stretch"
        layout="upsell"
      />

      <Link
        href={buildBootcampLandingHref(collegeSlug)}
        className="block text-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        View full bootcamp curriculum
      </Link>
    </div>
  );
}
