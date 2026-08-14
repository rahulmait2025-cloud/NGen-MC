'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { CheckCircle2, CreditCard, Loader2, Lock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ProductPricingPlan, ProductPricingType } from '@/lib/pricing/types';
import {
  defaultCtaLabel,
  formatPlanPrice,
  formatPlanValidityAccess,
} from '@/lib/pricing/format';

export interface ProductPricingPlansProps {
  productType: ProductPricingType;
  productId: string;
  plans: ProductPricingPlan[];
  selectedPlanId?: string | null;
  hasActiveAccess?: boolean;
  accessExpired?: boolean;
  continueLearningHref?: string;
  ctaLabel?: string;
  onCheckout: (planId: string) => Promise<void>;
  couponSlot?: (selectedPlanId: string | null) => ReactNode;
  /** When a coupon is applied, use this amount on the CTA instead of the plan list price. */
  checkoutAmountMinor?: number | null;
  isCheckoutPending?: boolean;
  checkoutState?: 'opening' | 'verifying' | 'confirmed' | null;
  className?: string;
  showSectionHeader?: boolean;
  compact?: boolean;
}

function getDurationLabel(days: number | null | undefined): string {
  if (days == null) return 'Lifetime';
  if (days === 30) return '1 Month';
  if (days === 90) return '3 Months';
  if (days === 180) return '6 Months';
  if (days === 365) return '1 Year';
  if (days > 365) return `${Math.floor(days / 365)} Year${Math.floor(days / 365) > 1 ? 's' : ''}`;
  if (days > 30) return `${Math.floor(days / 30)} Months`;
  return `${days} Days`;
}

function getPerDayPrice(priceMinor: number, days: number | null | undefined): string | null {
  if (!days || days <= 0) return null;
  const totalRupees = priceMinor / 100;
  const perDay = totalRupees / days;
  if (perDay < 1) return `₹${perDay.toFixed(1)}/day`;
  return `₹${Math.round(perDay)}/day`;
}

export function ProductPricingPlans({
  productType,
  productId: _productId,
  plans,
  selectedPlanId: initialSelectedPlanId,
  hasActiveAccess = false,
  accessExpired = false,
  continueLearningHref,
  ctaLabel,
  onCheckout,
  couponSlot,
  checkoutAmountMinor = null,
  isCheckoutPending = false,
  checkoutState = null,
  className,
  showSectionHeader = true,
  compact = false,
}: ProductPricingPlansProps) {
  const activePlans = useMemo(
    () => plans.filter((p) => p.price_minor > 0),
    [plans],
  );

  const defaultPlanId =
    initialSelectedPlanId
    ?? activePlans.find((p) => p.is_default)?.id
    ?? activePlans[0]?.id
    ?? null;

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(defaultPlanId);
  const [localPending, setLocalPending] = useState(false);

  const selectedPlan = activePlans.find((p) => p.id === selectedPlanId) ?? null;
  const ctaAmountMinor =
    checkoutAmountMinor != null && checkoutAmountMinor >= 0
      ? checkoutAmountMinor
      : selectedPlan?.price_minor ?? null;
  const label = ctaLabel ?? defaultCtaLabel(productType);
  const pending = isCheckoutPending || localPending || checkoutState !== null;
  const pendingLabel = checkoutState === 'verifying'
    ? 'Verifying payment...'
    : checkoutState === 'confirmed'
      ? 'Enrollment confirmed'
      : 'Opening payment...';

  if (hasActiveAccess && continueLearningHref) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="font-semibold text-sm text-emerald-700 dark:text-emerald-300">You have active access</span>
        </div>
        <Button asChild size="lg" className="w-full rounded-xl font-bold h-12">
          <Link href={continueLearningHref}>Continue Learning</Link>
        </Button>
      </div>
    );
  }

  if (activePlans.length === 0) {
    return (
      <div className={cn('rounded-xl border border-border/60 bg-muted/20 p-6 text-center', className)}>
        <p className="text-sm font-medium text-muted-foreground">
          Pricing will be available soon.
        </p>
      </div>
    );
  }

  async function handleCheckout() {
    if (!selectedPlanId) return;
    setLocalPending(true);
    try {
      await onCheckout(selectedPlanId);
    } finally {
      setLocalPending(false);
    }
  }

  return (
    <div className={cn('space-y-5', className)}>
      {showSectionHeader && !compact ? (
        <div className="space-y-1.5">
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            Choose Your Plan
          </h3>
          <p className="text-sm text-muted-foreground">
            Select the access duration that works best for you.
          </p>
        </div>
      ) : null}

      {accessExpired ? (
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2">
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
            Your previous access has expired. Choose a plan to continue.
          </p>
        </div>
      ) : null}

      {/* Plan cards */}
      <div className="grid gap-3">
        {activePlans.map((plan) => {
          const isSelected = plan.id === selectedPlanId;
          const isRecommended = plan.is_default;
          const badgeText = plan.badge_label?.trim() || (isRecommended ? 'Best Value' : null);
          const duration = getDurationLabel(plan.validity_days);
          const perDay = getPerDayPrice(plan.price_minor, plan.validity_days);

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlanId(plan.id)}
              className={cn(
                'group relative flex items-center gap-4 rounded-xl border p-4 text-left transition duration-200',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(255,95,54,0.2)]'
                  : 'border-border/60 bg-card hover:border-border hover:bg-muted/20',
              )}
            >
              {/* Radio indicator */}
              <div
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  isSelected
                    ? 'border-primary bg-primary'
                    : 'border-border group-hover:border-muted-foreground/40',
                )}
              >
                {isSelected ? (
                  <div className="size-2 rounded-full bg-primary-foreground" />
                ) : null}
              </div>

              {/* Plan info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{duration}</span>
                  {badgeText ? (
                    <Badge
                      className={cn(
                        'rounded-full px-2 py-0 text-[9px] font-bold uppercase tracking-wider',
                        isRecommended
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-muted text-muted-foreground border-border/60',
                      )}
                    >
                      {isRecommended ? <Star className="size-2.5 mr-0.5 fill-current" /> : null}
                      {badgeText}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatPlanValidityAccess(plan.validity_days)}
                  {perDay ? <span className="ml-1.5 text-muted-foreground/60">· {perDay}</span> : null}
                </p>
              </div>

              {/* Price */}
              <div className="text-right shrink-0">
                <span className="text-xl font-black tracking-tight text-foreground tabular-nums">
                  {formatPlanPrice(plan.price_minor, plan.currency)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {couponSlot?.(selectedPlanId)}

      {/* CTA */}
      <div className="space-y-2.5">
        <Button
          type="button"
          onClick={() => void handleCheckout()}
          disabled={pending || !selectedPlanId}
          className={cn(
            'w-full rounded-xl font-bold h-12 text-base',
            'bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition',
          )}
        >
          {pending ? (
            <>
              <div className="animate-spin"><Loader2 className="mr-2 size-4" /></div>
              {pendingLabel}
            </>
          ) : (
            <>
              <CreditCard className="mr-2 size-4" />
              {label}
              {selectedPlan && ctaAmountMinor != null
                ? ` — ${formatPlanPrice(ctaAmountMinor, selectedPlan.currency)}`
                : ''}
            </>
          )}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <Lock className="size-3" />
          Secure checkout via Razorpay
        </p>
      </div>
    </div>
  );
}
