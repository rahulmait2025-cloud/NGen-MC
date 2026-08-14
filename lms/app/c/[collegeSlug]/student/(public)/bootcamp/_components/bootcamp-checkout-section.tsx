'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  createJobReadyBootcampOrderAction,
  verifyJobReadyBootcampPaymentAction,
} from '../actions';
import {
  RAZORPAY_CHECKOUT_MERCHANT_NAME,
  RAZORPAY_CHECKOUT_THEME_COLOR,
} from '@/lib/payments/checkout-brand';
import {
  type RazorpayPaymentFailedResponse,
} from '@/lib/payments/razorpay-loader';
import { buildBootcampPaymentSuccessHref } from '@/lib/student/bootcamp-routes';
import { cn } from '@/lib/utils';
import { ProductPricingPlans } from '@/components/pricing/product-pricing-plans';
import type { ProductPricingPlan } from '@/lib/pricing/types';
import { useAuthGate } from '@/hooks/use-auth-gate';

interface BootcampCheckoutSectionProps {
  collegeSlug: string;
  priceMinor: number;
  pricePlanId?: string | null;
  currency: string;
  plans?: ProductPricingPlan[];
  accessExpired?: boolean;
  hasActiveAccess?: boolean;
  continueLearningHref?: string;
  showSectionHeader?: boolean;
  compact?: boolean;
  className?: string;
}

const EMPTY_PLANS: ProductPricingPlan[] = [];

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

export function BootcampCheckoutSection({
  collegeSlug,
  priceMinor,
  pricePlanId,
  currency,
  plans = EMPTY_PLANS,
  accessExpired = false,
  hasActiveAccess = false,
  continueLearningHref,
  showSectionHeader = true,
  compact = false,
  className,
}: BootcampCheckoutSectionProps) {
  const [checkoutState, setCheckoutState] = useState<CheckoutState>(null);
  const checkoutInProgressRef = useRef(false);
  const isRazorpayLoadedRef = useRef(false);
  const router = useRouter();
  const { requireAuth } = useAuthGate();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.Razorpay) {
      isRazorpayLoadedRef.current = true;
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => { isRazorpayLoadedRef.current = true; };
    document.body.appendChild(script);
  }, []);

  const runCheckout = useCallback(
    async (selectedPlanId: string) => {
      if (!requireAuth({ intent: 'Purchase', returnTo: typeof window !== 'undefined' ? window.location.href : '' })) {
        return;
      }

      if (!isRazorpayLoadedRef.current || checkoutInProgressRef.current) {
        if (!isRazorpayLoadedRef.current) {
          toast.error('Payment gateway is still loading. Try again in a moment.');
        }
        return;
      }

      checkoutInProgressRef.current = true;
      setCheckoutState('opening');

      try {
        const orderRes = await createJobReadyBootcampOrderAction(collegeSlug, undefined, selectedPlanId);
        if (!orderRes.ok || !orderRes.data) {
          toast.error(orderRes.error ?? 'Failed to initiate enrollment');
          checkoutInProgressRef.current = false;
          setCheckoutState(null);
          return;
        }

        const { order, gatewayOrder, razorpayKey } = orderRes.data as {
          order: { id: string };
          gatewayOrder: { amount_minor: number; currency: string; gateway_order_id: string };
          razorpayKey: string;
        };

        const options = {
          key: razorpayKey,
          amount: gatewayOrder.amount_minor,
          currency: gatewayOrder.currency,
          name: RAZORPAY_CHECKOUT_MERCHANT_NAME,
          description: 'Job Ready Bootcamp',
          order_id: gatewayOrder.gateway_order_id,
          handler: async (response: RazorpayResponse) => {
            let didRedirect = false;
            setCheckoutState('verifying');
            try {
              const verifyRes = await verifyJobReadyBootcampPaymentAction(collegeSlug, {
                orderId: order.id,
                gatewayOrderId: response.razorpay_order_id,
                gatewayPaymentId: response.razorpay_payment_id,
                gatewaySignature: response.razorpay_signature,
              });

              if (verifyRes.ok) {
                didRedirect = true;
                setCheckoutState('confirmed');
                toast.success('Enrollment successful!');
                const redirect =
                  (verifyRes.data as { redirectHref?: string } | undefined)?.redirectHref
                  ?? buildBootcampPaymentSuccessHref(collegeSlug);
                router.push(redirect);
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
    [collegeSlug, requireAuth, router],
  );

  const checkoutPlans =
    plans.length > 0
      ? plans
      : priceMinor > 0 && pricePlanId
        ? [{
            id: pricePlanId,
            plan_name: 'Full Program',
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
        productType="bootcamp"
        productId="job-ready-bootcamp"
        plans={checkoutPlans}
        hasActiveAccess={hasActiveAccess}
        accessExpired={accessExpired}
        continueLearningHref={continueLearningHref}
        ctaLabel="Enroll In Bootcamp"
        onCheckout={runCheckout}
        checkoutState={checkoutState}
        showSectionHeader={showSectionHeader}
        compact={compact}
      />
    </div>
  );
}
