'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BootcampCtaButton } from '../../pillars/[pillarSlug]/pillar-bootcamp-cta';
import type { BootcampCtaState } from '@/lib/utils/bootcamp-cta';
import {
  JobReadyBootcampPricingCta,
  type BootcampPricingLayout,
} from './bootcamp-pricing-cta';
import { BootcampCheckoutSection } from './bootcamp-checkout-section';
import { buildEnrolledBootcampHubHref } from '@/lib/student/bootcamp-routes';
import type { JobReadyBootcampProduct } from '@/lib/services/job-ready-bootcamp';

interface BootcampProgramCtaProps {
  collegeSlug: string;
  isCompleteBootcamp: boolean;
  isBootcampEnrolled?: boolean;
  bootcampProduct?: Pick<
    JobReadyBootcampProduct,
    'price_minor' | 'currency' | 'validity_days' | 'price_plan_id' | 'price_plans'
  > | null;
  accessExpired?: boolean;
  fallbackCta: BootcampCtaState;
  size?: 'default' | 'lg';
  className?: string;
  enrollLabel?: string;
  layout?: BootcampPricingLayout;
  isPending?: boolean;
}

export function BootcampProgramCta({
  collegeSlug,
  isCompleteBootcamp,
  isBootcampEnrolled = false,
  bootcampProduct,
  fallbackCta,
  size = 'lg',
  className,
  enrollLabel = 'Enroll Now',
  layout = 'hero',
  accessExpired = false,
  isPending = false,
}: BootcampProgramCtaProps) {
  if (isPending) {
    return (
      <div className={cn('h-12 w-44 animate-pulse rounded-full bg-muted/30', className)} />
    );
  }
  if (isCompleteBootcamp && isBootcampEnrolled) {
    return (
      <div className={className}>
        <Button
          asChild
          size={size}
          className="rounded-full bg-primary px-8 font-semibold text-primary-foreground shadow-[0_0_28px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
        >
          <Link href={buildEnrolledBootcampHubHref(collegeSlug)} className="inline-flex items-center gap-2">
            Continue Bootcamp
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  if (isCompleteBootcamp) {
    const plans = bootcampProduct?.price_plans ?? [];
    const useMultiPlan = plans.length > 0 || (bootcampProduct?.price_minor != null && bootcampProduct.price_minor > 0);

    if (useMultiPlan) {
      return (
        <BootcampCheckoutSection
          collegeSlug={collegeSlug}
          priceMinor={bootcampProduct?.price_minor ?? 0}
          pricePlanId={bootcampProduct?.price_plan_id}
          currency={bootcampProduct?.currency ?? 'INR'}
          plans={plans}
          accessExpired={accessExpired}
          showSectionHeader={layout !== 'hero'}
          compact={layout === 'hero'}
          className={className}
        />
      );
    }

    return (
      <JobReadyBootcampPricingCta
        collegeSlug={collegeSlug}
        priceMinor={bootcampProduct?.price_minor ?? null}
        currency={bootcampProduct?.currency ?? 'INR'}
        validityDays={bootcampProduct?.validity_days ?? null}
        label={enrollLabel}
        size={size}
        className={className}
        layout={layout}
      />
    );
  }

  return <BootcampCtaButton cta={fallbackCta} size={size} className={className} />;
}
