'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  createBundleOrderAction,
  verifyBundlePaymentAction,
  enrollFreeBundleAction,
} from '../actions';
import {
  RAZORPAY_CHECKOUT_MERCHANT_NAME,
  RAZORPAY_CHECKOUT_THEME_COLOR,
} from '@/lib/payments/checkout-brand';
import { cn } from '@/lib/utils';
import type { CouponPreview } from '@/components/courses/checkout-coupon-section';
import { BundleCheckoutCouponSection } from '@/components/bundles/bundle-checkout-coupon-section';
import { ProductPricingPlans } from '@/components/pricing/product-pricing-plans';
import type { ProductPricingPlan } from '@/lib/pricing/types';
import { preloadRazorpayCheckout, isRazorpayReady, type RazorpayPaymentFailedResponse } from '@/lib/payments/razorpay-loader';
import { useAuthGate } from '@/hooks/use-auth-gate';

const EMPTY_PLANS: ProductPricingPlan[] = [];

interface BundleCheckoutSectionProps {
  collegeSlug: string;
  bundleSlug: string;
  bundleTitle: string;
  priceMinor: number;
  pricePlanId?: string | null;
  currency: string;
  plans?: ProductPricingPlan[];
  isFree?: boolean;
  showPrice?: boolean;
  showCoupon?: boolean;
  buttonLabel?: string;
  accessExpired?: boolean;
  className?: string;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

type CheckoutState = 'opening' | 'verifying' | 'confirmed' | null;

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

export function BundleCheckoutSection({
  collegeSlug,
  bundleSlug,
  bundleTitle,
  priceMinor,
  pricePlanId,
  currency,
  plans = EMPTY_PLANS,
  isFree = false,
  showPrice = true,
  showCoupon = true,
  buttonLabel = 'Enroll In Bundle Now',
  accessExpired = false,
  className,
}: BundleCheckoutSectionProps) {
  const [checkoutState, setCheckoutState] = useState<CheckoutState>(null);
  const checkoutInProgressRef = useRef(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponPreview | null>(null);
  const router = useRouter();
  const { requireAuth } = useAuthGate();

  const clearCoupon = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  // Preload Razorpay script on mount — no blocking, no UI impact
  useEffect(() => {
    if (!isFree) {
      void preloadRazorpayCheckout().catch(() => undefined);
    }
  }, [isFree]);

  async function handleFreeEnroll() {
    if (!requireAuth({
      intent: 'Enroll',
      returnTo: typeof window !== 'undefined' ? window.location.href : '',
    })) {
      return;
    }

    if (checkoutInProgressRef.current) return;
    checkoutInProgressRef.current = true;
    setCheckoutState('opening');
    let didRedirect = false;
    try {
      const res = await enrollFreeBundleAction(collegeSlug, bundleSlug);
      if (res.ok) {
        didRedirect = true;
        setCheckoutState('confirmed');
        toast.success('Enrolled successfully.');
        router.push(`/c/${collegeSlug}/student/payment-success?bundleSlug=${encodeURIComponent(bundleSlug)}`);
        return;
      } else {
        toast.error(res.error ?? 'Failed to enroll');
      }
    } catch {
      toast.error('Could not complete enrollment. Try again.');
    } finally {
      if (!didRedirect) {
        checkoutInProgressRef.current = false;
        setCheckoutState(null);
      }
    }
  }

  const runCheckout = useCallback(
    async (selectedPlanId: string) => {
      if (checkoutInProgressRef.current) return;

      // Instant click feedback
      checkoutInProgressRef.current = true;
      setCheckoutState('opening');

      try {
        // Ensure Razorpay is loaded (fast if already preloaded)
        if (!isRazorpayReady()) {
          await preloadRazorpayCheckout();
        }

        const orderRes = await createBundleOrderAction(
          collegeSlug,
          bundleSlug,
          appliedCoupon?.couponCode,
          selectedPlanId,
        );
        if (!orderRes.ok || !orderRes.data) {
          toast.error(orderRes.error ?? 'Failed to initiate purchase');
          if (appliedCoupon && orderRes.error?.toLowerCase().includes('coupon')) {
            clearCoupon();
          }
          checkoutInProgressRef.current = false;
          setCheckoutState(null);
          return;
        }

        const { order, gatewayOrder, razorpayKey } = orderRes.data as {
          order: { id: string; purchaser_email: string; purchaser_name: string | null };
          gatewayOrder: { amount_minor: number; currency: string; gateway_order_id: string };
          razorpayKey: string;
        };

        const options = {
          key: razorpayKey,
          amount: gatewayOrder.amount_minor,
          currency: gatewayOrder.currency,
          name: RAZORPAY_CHECKOUT_MERCHANT_NAME,
          description: `Bundle: ${bundleTitle}`,
          order_id: gatewayOrder.gateway_order_id,
          handler: async (response: RazorpayResponse) => {
            let didRedirect = false;
            setCheckoutState('verifying');
            try {
              const verifyRes = await verifyBundlePaymentAction(collegeSlug, bundleSlug, {
                orderId: order.id,
                gatewayOrderId: response.razorpay_order_id,
                gatewayPaymentId: response.razorpay_payment_id,
                gatewaySignature: response.razorpay_signature,
              });

              if (verifyRes.ok) {
                didRedirect = true;
                setCheckoutState('confirmed');
                toast.success('Purchase complete.');
                router.push(`/c/${collegeSlug}/student/payment-success?bundleSlug=${encodeURIComponent(bundleSlug)}`);
              } else {
                toast.error(verifyRes.error ?? 'Payment verification failed');
              }
            } catch {
              toast.error('Failed to verify payment');
            } finally {
              if (!didRedirect) {
                checkoutInProgressRef.current = false;
                setCheckoutState(null);
              }
            }
          },
          prefill: {
            email: order.purchaser_email,
            name: order.purchaser_name || '',
          },
          theme: { color: RAZORPAY_CHECKOUT_THEME_COLOR },
          modal: {
            ondismiss: () => {
              checkoutInProgressRef.current = false;
              setCheckoutState(null);
            },
          },
        };

        const rzp = new window.Razorpay(options);

        rzp.on('payment.failed', (response: RazorpayPaymentFailedResponse) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('[razorpay payment.failed]', {
              code: response?.error?.code,
              description: response?.error?.description,
              source: response?.error?.source,
              step: response?.error?.step,
              reason: response?.error?.reason,
              orderId: response?.error?.metadata?.order_id,
              paymentId: response?.error?.metadata?.payment_id,
            });
          }

          toast.error(
            response?.error?.description ||
              'Payment failed. Try another UPI app or bank account.'
          );

          checkoutInProgressRef.current = false;
          setCheckoutState(null);
        });

        rzp.open();
        // Do NOT reset isPending here — keep button disabled until modal closes
      } catch {
        toast.error('Could not start checkout. Try again.');
        checkoutInProgressRef.current = false;
        setCheckoutState(null);
      }
    },
    [appliedCoupon, bundleSlug, bundleTitle, collegeSlug, clearCoupon, router],
  );

  if (isFree) {
    return (
      <div className={cn('space-y-4', className)}>
        <Button
          onClick={handleFreeEnroll}
          disabled={checkoutState !== null}
          className={cn(
            'h-14 w-full rounded-xl text-lg font-bold shadow-lg transition active:scale-95',
            'bundle-v2-btn-primary border border-primary/40',
          )}
        >
          {checkoutState ? (
            <>
              <div className="animate-spin"><Loader2 className="mr-2 size-5" /></div>
              {checkoutState === 'confirmed' ? 'Enrollment confirmed' : 'Opening payment...'}
            </>
          ) : (
            'Enroll Free'
          )}
        </Button>
      </div>
    );
  }

  const checkoutPlans =
    plans.length > 0
      ? plans
      : priceMinor > 0 && pricePlanId
        ? [{
            id: pricePlanId,
            plan_name: 'Standard',
            description: null,
            validity_days: null,
            price_minor: priceMinor,
            currency,
            is_default: true,
          }]
        : [];

  return (
    <div className={cn(className)}>
      <ProductPricingPlans
        productType="bundle"
        productId={bundleSlug}
        plans={checkoutPlans}
        accessExpired={accessExpired}
        ctaLabel={buttonLabel}
        onCheckout={runCheckout}
        checkoutState={checkoutState}
        checkoutAmountMinor={appliedCoupon?.finalAmountMinor ?? null}
        showSectionHeader={showPrice}
        couponSlot={
          showCoupon
            ? (selectedPlanId) => (
                <BundleCheckoutCouponSection
                  collegeSlug={collegeSlug}
                  bundleSlug={bundleSlug}
                  pricePlanId={selectedPlanId}
                  currency={currency}
                  applied={appliedCoupon}
                  onApplied={setAppliedCoupon}
                  onCleared={clearCoupon}
                />
              )
            : undefined
        }
      />
    </div>
  );
}
