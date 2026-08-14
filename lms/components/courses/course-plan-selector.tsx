'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  createGlobalCourseOrderAction,
  verifyGlobalCoursePaymentAction,
} from '@/app/c/[collegeSlug]/student/(public)/pillars/[pillarSlug]/courses/[courseId]/actions';
import {
  CheckoutCouponSection,
  type CouponPreview,
} from '@/components/courses/checkout-coupon-section';
import { buildPaymentSuccessHref } from '@/lib/utils/variant-learn-url';
import { ProductPricingPlans } from '@/components/pricing/product-pricing-plans';
import type { ProductPricingPlan } from '@/lib/pricing/types';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { preloadRazorpayCheckout, isRazorpayReady, type RazorpayPaymentFailedResponse } from '@/lib/payments/razorpay-loader';

import { useAuthGate } from '@/hooks/use-auth-gate';

type PricePlan = ProductPricingPlan;


interface CoursePlanSelectorProps {
  collegeSlug: string;
  pillarSlug: string;
  courseId: string;
  isGlobal: boolean;
  plans: PricePlan[];
  fallbackPriceMinor: number | null;
  fallbackCurrency: string;
  variantId?: string | null;
  hasActiveAccess?: boolean;
  accessExpired?: boolean;
  continueLearningHref?: string;
  showSectionHeader?: boolean;
  compact?: boolean;
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

export function CoursePlanSelector({
  collegeSlug,
  pillarSlug,
  courseId,
  isGlobal: _isGlobal,
  plans,
  fallbackPriceMinor,
  fallbackCurrency,
  variantId,
  hasActiveAccess = false,
  accessExpired = false,
  continueLearningHref,
  showSectionHeader = false,
  compact = true,
}: CoursePlanSelectorProps) {
  const [appliedCoupon, setAppliedCoupon] = useState<CouponPreview | null>(null);
  const checkoutInProgressRef = useRef(false);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>(null);
  const router = useRouter();

  const productType = variantId ? 'variant' : 'course';
  const hasPlans = plans.length > 0;

  // Preload Razorpay script on mount — no blocking, no UI impact
  useEffect(() => {
    void preloadRazorpayCheckout().catch(() => undefined);
  }, []);

  const clearCoupon = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  const { requireAuth } = useAuthGate();

  const runCheckout = useCallback(
    async (selectedPlanId: string) => {
      if (!requireAuth({ intent: 'Purchase', returnTo: typeof window !== 'undefined' ? window.location.href : '' })) {
        return;
      }
      if (checkoutInProgressRef.current) return;

      // Instant click feedback
      checkoutInProgressRef.current = true;
      setCheckoutState('opening');

      try {
        // Ensure Razorpay is loaded (fast if already preloaded)
        if (!isRazorpayReady()) {
          await preloadRazorpayCheckout();
        }

        const orderRes = await createGlobalCourseOrderAction(
          collegeSlug,
          pillarSlug,
          courseId,
          selectedPlanId,
          appliedCoupon?.couponCode,
          variantId ?? undefined,
        );

        if (!orderRes.ok || !orderRes.data) {
          toast.error(orderRes.error ?? 'Failed to initiate enrollment');
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
          name: 'Avesh LMS',
          description: 'Enrollment for course',
          order_id: gatewayOrder.gateway_order_id,
          handler: async (response: RazorpayResponse) => {
            let didRedirect = false;
            setCheckoutState('verifying');
            try {
              const verifyRes = await verifyGlobalCoursePaymentAction(
                collegeSlug,
                pillarSlug,
                courseId,
                {
                  orderId: order.id,
                  gatewayOrderId: response.razorpay_order_id,
                  gatewayPaymentId: response.razorpay_payment_id,
                  gatewaySignature: response.razorpay_signature,
                },
                variantId ?? undefined,
              );

              if (verifyRes.ok) {
                didRedirect = true;
                setCheckoutState('confirmed');
                toast.success('Enrollment complete.');
                router.push(
                  buildPaymentSuccessHref(collegeSlug, {
                    sourceType: variantId ? 'course_variant' : 'master_course',
                    sourceId: variantId ?? courseId,
                    courseId: variantId ? courseId : undefined,
                  }),
                );
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
          theme: { color: '#FF5F36' },
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
        // Do NOT reset checkoutState here — keep button disabled until modal closes
      } catch {
        toast.error('Could not start checkout. Try again.');
        checkoutInProgressRef.current = false;
        setCheckoutState(null);
      }
    },
    [
      appliedCoupon,
      collegeSlug,
      courseId,
      clearCoupon,
      pillarSlug,
      requireAuth,
      router,
      variantId,
    ],
  );

  if (!hasPlans && fallbackPriceMinor === null) {
    return (
      <Button disabled className="rounded-full w-full sm:w-auto">
        <Lock className="h-4 w-4 mr-2" />
        Enrollment not available yet
      </Button>
    );
  }

  if (!hasPlans) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Pricing will be available soon.
        </p>
      </div>
    );
  }

  return (
    <ProductPricingPlans
      productType={productType}
      productId={variantId ?? courseId}
      plans={plans}
      hasActiveAccess={hasActiveAccess}
      accessExpired={accessExpired}
      continueLearningHref={continueLearningHref}
      onCheckout={runCheckout}
      checkoutState={checkoutState}
      checkoutAmountMinor={appliedCoupon?.finalAmountMinor ?? null}
      couponSlot={(selectedPlanId) => (
        <CheckoutCouponSection
          collegeSlug={collegeSlug}
          pillarSlug={pillarSlug}
          courseId={courseId}
          pricePlanId={selectedPlanId}
          variantId={variantId}
          currency={plans.find((p) => p.id === selectedPlanId)?.currency ?? fallbackCurrency}
          resetKey={selectedPlanId ?? variantId ?? 'default'}
          applied={appliedCoupon}
          onApplied={setAppliedCoupon}
          onCleared={clearCoupon}
        />
      )}
      compact={compact}
      showSectionHeader={showSectionHeader}
    />
  );
}
