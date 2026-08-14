'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  createGlobalCourseOrderAction,
  verifyGlobalCoursePaymentAction,
} from '@/app/c/[collegeSlug]/student/(public)/pillars/[pillarSlug]/courses/[courseId]/actions';
import {
  CheckoutCouponSection,
  type CouponPreview,
} from '@/components/courses/checkout-coupon-section';
import { FormFieldStagger } from '@/components/_animations/form-field-stagger';
import { buildPaymentSuccessHref } from '@/lib/utils/variant-learn-url';
import { preloadRazorpayCheckout, isRazorpayReady, type RazorpayPaymentFailedResponse } from '@/lib/payments/razorpay-loader';

import { useAuthGate } from '@/hooks/use-auth-gate';

interface VariantCheckoutSectionProps {

  collegeSlug: string;
  pillarSlug: string;
  courseId: string;
  variantId: string;
  variantTitle: string;
  priceMinor: number;
  currency: string;
  pricingSource: 'variant_price_plan' | 'variant_selling_price';
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

function formatPrice(minor: number, currency: string): string {
  if (currency === 'INR') {
    return `₹${(minor / 100).toLocaleString('en-IN')}`;
  }
  return `${currency} ${(minor / 100).toLocaleString()}`;
}

export function VariantCheckoutSection({
  collegeSlug,
  pillarSlug,
  courseId,
  variantId,
  variantTitle,
  priceMinor,
  currency,
  pricingSource,
}: VariantCheckoutSectionProps) {
  const [checkoutState, setCheckoutState] = useState<CheckoutState>(null);
  const checkoutInProgressRef = useRef(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponPreview | null>(null);
  const router = useRouter();

  const clearCoupon = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  // Preload Razorpay script on mount — no blocking, no UI impact
  useEffect(() => {
    void preloadRazorpayCheckout().catch(() => undefined);
  }, []);

  const { requireAuth } = useAuthGate();

  async function handlePurchase() {
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
        undefined,
        appliedCoupon?.couponCode,
        variantId,
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
        name: 'Avesh LMS',
        description: `Purchase: ${variantTitle}`,
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
              variantId,
            );

            if (verifyRes.ok) {
              didRedirect = true;
              setCheckoutState('confirmed');
              toast.success('Purchase complete.');
              router.push(
                buildPaymentSuccessHref(collegeSlug, {
                  sourceType: 'course_variant',
                  sourceId: variantId,
                  courseId,
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
        theme: { color: '#0f172a' },
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
            toast.error('Could not verify payment. Try again.');
      checkoutInProgressRef.current = false;
      setCheckoutState(null);
    }
  }

  const payMinor = appliedCoupon?.finalAmountMinor ?? priceMinor;

  return (
    <FormFieldStagger className="space-y-4">
      <div data-field>
        <p className="text-xs text-muted-foreground text-center">
          Variant price
          {pricingSource === 'variant_selling_price' ? ' (from this variant)' : ''}
        </p>
      </div>
      <div data-field className="text-center">
        <div className="text-3xl font-black tracking-tighter tabular-nums">
          {formatPrice(priceMinor, currency)}
        </div>
      </div>

      <div data-field>
        <CheckoutCouponSection
          collegeSlug={collegeSlug}
          pillarSlug={pillarSlug}
          courseId={courseId}
          variantId={variantId}
          currency={currency}
          resetKey={variantId}
          applied={appliedCoupon}
          onApplied={setAppliedCoupon}
          onCleared={clearCoupon}
        />
      </div>

      <div data-field>
        <Button
          onClick={handlePurchase}
          disabled={checkoutState !== null}
          className="group/buy rounded-full w-full font-bold px-8 h-12 text-lg shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-[box-shadow,transform] duration-200 active:scale-[0.97] relative overflow-hidden"
        >
          {checkoutState ? (
            <span className="inline-flex items-center gap-2">
              <div className="animate-spin"><Loader2 className="h-5 w-5" /></div>
              {checkoutState === 'verifying'
                ? 'Verifying payment...'
                : checkoutState === 'confirmed'
                  ? 'Enrollment confirmed'
                  : 'Opening payment...'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 transition-transform duration-200 group-hover/buy:translate-x-0.5">
              <CreditCard className="h-5 w-5" />
              Buy Variant — {formatPrice(payMinor, currency)}
            </span>
          )}
          {checkoutState && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.5s_infinite]" />
          )}
        </Button>
      </div>
    </FormFieldStagger>
  );
}

export function VariantCheckoutUnavailable({ reason }: { reason: string }) {
  // Log the internal reason for developers, but show a clean message to students
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[VariantCheckoutUnavailable] Internal reason: ${reason}`);
  }

  return (
    <div className="space-y-4">
      <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 rounded-2xl">
        <Lock className="h-4 w-4" />
        <AlertTitle className="font-bold text-sm text-destructive">Enrollment temporarily unavailable</AlertTitle>
        <AlertDescription className="text-xs opacity-80 leading-relaxed whitespace-normal break-words">
          This course is not available for enrollment right now. Please check back later or contact support.
        </AlertDescription>
      </Alert>
      <Button disabled className="rounded-full w-full h-12 font-bold opacity-50">
        Enrollment Unavailable
      </Button>
    </div>
  );
}
