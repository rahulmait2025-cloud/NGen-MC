'use client';

import { Check, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { JobReadyBootcampCheckoutButton } from './job-ready-bootcamp-checkout-button';

const FEATURE_LABELS = [
  '6 Career Pillars',
  'Projects',
  'Profile Building',
  'Interview Readiness',
  'Certificate',
] as const;

function formatBootcampPrice(minor: number, currency: string): string {
  if (currency === 'INR') {
    return `₹${(minor / 100).toLocaleString('en-IN')}`;
  }
  return `${currency} ${(minor / 100).toLocaleString()}`;
}

function formatBootcampValidity(validityDays: number | null | undefined): string {
  if (validityDays == null) return 'Lifetime access';
  return `Valid for ${validityDays} days`;
}

function isBootcampPricingConfigured(
  priceMinor: number | null | undefined,
): boolean {
  return priceMinor != null && priceMinor > 0;
}

export type BootcampPricingLayout = 'hero' | 'strip' | 'upsell';

interface JobReadyBootcampPricingCtaProps {
  collegeSlug: string;
  priceMinor?: number | null;
  currency?: string;
  validityDays?: number | null;
  label?: string;
  size?: 'default' | 'lg';
  className?: string;
  layout?: BootcampPricingLayout;
}

export function JobReadyBootcampPricingCta({
  collegeSlug,
  priceMinor = null,
  currency = 'INR',
  validityDays = null,
  label = 'Enroll Now',
  size = 'lg',
  className,
  layout = 'hero',
}: JobReadyBootcampPricingCtaProps) {
  const hasPricing = isBootcampPricingConfigured(priceMinor);

  const checkoutButton = (
    <JobReadyBootcampCheckoutButton
      collegeSlug={collegeSlug}
      priceMinor={priceMinor}
      currency={currency}
      label={hasPricing ? label : 'Pricing not configured'}
      size={size}
      showMicrocopy={false}
      className={layout === 'strip' ? 'shrink-0' : 'w-full'}
    />
  );

  const microcopy = hasPricing ? (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <Lock className="size-3" />
      Secure Razorpay checkout
    </span>
  ) : null;

  if (!hasPricing) {
    return (
      <div className={cn('flex flex-col items-center gap-3', className)}>
        <p className="text-center text-sm font-medium text-amber-700 dark:text-amber-400">
          Pricing is not configured yet.
        </p>
        {checkoutButton}
      </div>
    );
  }

  if (layout === 'upsell') {
    return (
      <div className={cn('flex flex-col items-center gap-4', className)}>
        <p className="text-center text-sm text-muted-foreground">
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {formatBootcampPrice(priceMinor!, currency)}
          </span>
          <span className="mx-2 text-muted-foreground/60">·</span>
          <span>{formatBootcampValidity(validityDays)}</span>
        </p>
        {checkoutButton}
        {microcopy}
      </div>
    );
  }

  if (layout === 'strip') {
    return (
      <div className={cn('w-full max-w-2xl', className)}>
        <Card className="border-primary/20 bg-card/90 shadow-[0_0_32px_color-mix(in_oklab,var(--primary)_10%,transparent)]">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0 space-y-3">
              <Badge
                variant="outline"
                className="rounded-full border-primary/30 bg-primary/5 text-[10px] font-semibold uppercase tracking-wider text-primary"
              >
                Full Program Access
              </Badge>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  {formatBootcampPrice(priceMinor!, currency)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatBootcampValidity(validityDays)}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-muted-foreground">
                {FEATURE_LABELS.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1">
                    <Check className="size-3 text-primary" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-end">
              {checkoutButton}
              {microcopy}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="text-center">
        <p className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {formatBootcampPrice(priceMinor!, currency)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{formatBootcampValidity(validityDays)}</p>
      </div>
      <Separator className="w-12 bg-primary/30" />
      {checkoutButton}
      {microcopy}
    </div>
  );
}
