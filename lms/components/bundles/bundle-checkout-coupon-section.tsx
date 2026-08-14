'use client';

import { useEffect, useState, useTransition } from 'react';
import { Loader2, Tag, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { validateBundleCouponPreviewAction } from '@/app/c/[collegeSlug]/student/(public)/bundles/[bundleSlug]/actions';
import type { CouponPreview } from '@/components/courses/checkout-coupon-section';

interface BundleCheckoutCouponSectionProps {
  collegeSlug: string;
  bundleSlug: string;
  pricePlanId?: string | null;
  currency: string;
  applied: CouponPreview | null;
  onApplied: (preview: CouponPreview) => void;
  onCleared: () => void;
}

function formatPrice(minor: number, currency: string): string {
  if (currency === 'INR') {
    return `₹${(minor / 100).toLocaleString('en-IN')}`;
  }
  return `${currency} ${(minor / 100).toLocaleString()}`;
}

function BundleCouponForm({
  collegeSlug,
  bundleSlug,
  pricePlanId,
  onApplied,
  onCleared,
}: Pick<
  BundleCheckoutCouponSectionProps,
  'collegeSlug' | 'bundleSlug' | 'pricePlanId' | 'onApplied' | 'onCleared'
>) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApply() {
    const trimmed = code.trim();
    if (!trimmed) return;

    setError(null);
    startTransition(async () => {
      const res = await validateBundleCouponPreviewAction(collegeSlug, bundleSlug, {
        couponCode: trimmed,
        pricePlanId: pricePlanId ?? undefined,
      });

      if (!res.ok || !res.data) {
        setError(res.error ?? 'Invalid coupon code');
        onCleared();
        return;
      }

      if (!res.data.valid) {
        setError(res.data.message ?? 'Invalid coupon code');
        onCleared();
        return;
      }

      onApplied({
        couponCode: res.data.couponCode ?? trimmed.toUpperCase(),
        originalAmountMinor: res.data.originalAmountMinor,
        discountMinor: res.data.discountMinor,
        finalAmountMinor: res.data.finalAmountMinor,
      });
      toast.success('Coupon applied');
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Have a coupon code?</p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          placeholder="Enter coupon code"
          className="rounded-lg"
          disabled={isPending}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleApply();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={isPending || !code.trim()}
          onClick={handleApply}
        >
          {isPending ? <div className="animate-spin"><Loader2 className="size-4" /></div> : 'Apply'}
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function BundleCheckoutCouponSection({
  collegeSlug,
  bundleSlug,
  pricePlanId,
  currency,
  applied,
  onApplied,
  onCleared,
}: BundleCheckoutCouponSectionProps) {
  useEffect(() => {
    onCleared();
  }, [pricePlanId, onCleared]);

  function handleRemove() {
    onCleared();
  }

  if (applied) {
    return (
      <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <Tag className="size-4" />
            Coupon {applied.couponCode} applied
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={handleRemove}>
            <X className="size-3.5 mr-1" />
            Remove
          </Button>
        </div>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <dt>Bundle price</dt>
            <dd>{formatPrice(applied.originalAmountMinor, currency)}</dd>
          </div>
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <dt>Coupon discount</dt>
            <dd>-{formatPrice(applied.discountMinor, currency)}</dd>
          </div>
          <div className="flex justify-between font-bold pt-1 border-t border-border/50">
            <dt>You pay</dt>
            <dd>{formatPrice(applied.finalAmountMinor, currency)}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <BundleCouponForm
      key={pricePlanId ?? 'none'}
      collegeSlug={collegeSlug}
      bundleSlug={bundleSlug}
      pricePlanId={pricePlanId}
      onApplied={onApplied}
      onCleared={onCleared}
    />
  );
}
