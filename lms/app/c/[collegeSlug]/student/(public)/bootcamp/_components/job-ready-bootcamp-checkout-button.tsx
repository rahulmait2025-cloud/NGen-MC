'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  createJobReadyBootcampOrderAction,
  verifyJobReadyBootcampPaymentAction,
} from '../actions';
import type { OrderCreationResult } from '@/lib/services/orders';
import {
  RAZORPAY_CHECKOUT_MERCHANT_NAME,
  RAZORPAY_CHECKOUT_THEME_COLOR,
} from '@/lib/payments/checkout-brand';
import { JOB_READY_BOOTCAMP_SLUG, buildBootcampPaymentSuccessHref } from '@/lib/student/bootcamp-routes';
import { cn } from '@/lib/utils';
import { preloadRazorpayCheckout, isRazorpayReady, type RazorpayPaymentFailedResponse } from '@/lib/payments/razorpay-loader';
import { useAuthGate } from '@/hooks/use-auth-gate';

export const JOB_READY_BOOTCAMP_PRICING_ERROR =
  'Job Ready Bootcamp pricing is not configured yet.';

interface JobReadyBootcampCheckoutButtonProps {
  collegeSlug: string;
  bootcampSlug?: string;
  priceMinor?: number | null;
  currency?: string;
  label?: string;
  className?: string;
  size?: 'default' | 'lg';
  /** Append formatted price to button label (compact layouts). */
  includePriceInLabel?: boolean;
  /** Hide Razorpay microcopy when wrapped by JobReadyBootcampPricingCta. */
  showMicrocopy?: boolean;
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

export function JobReadyBootcampCheckoutButton({
  collegeSlug,
  bootcampSlug: _bootcampSlug = JOB_READY_BOOTCAMP_SLUG,
  priceMinor = null,
  currency = 'INR',
  label = 'Enroll Now',
  className,
  size = 'lg',
  includePriceInLabel = false,
  showMicrocopy = true,
}: JobReadyBootcampCheckoutButtonProps) {
  const pricingConfigured = priceMinor != null && priceMinor > 0;
  const [checkoutState, setCheckoutState] = useState<CheckoutState>(null);
  const checkoutInProgressRef = useRef(false);
  const router = useRouter();
  const { requireAuth } = useAuthGate();

  // Preload Razorpay script on mount — no blocking, no UI impact
  useEffect(() => {
    void preloadRazorpayCheckout().catch(() => undefined);
  }, []);

  const handleEnroll = useCallback(async () => {
    if (!pricingConfigured || checkoutInProgressRef.current) return;

    if (!requireAuth({ intent: 'Purchase', returnTo: typeof window !== 'undefined' ? window.location.href : '' })) {
      return;
    }

    // Instant click feedback
    checkoutInProgressRef.current = true;
    setCheckoutState('opening');

    try {
      // Ensure Razorpay is loaded (fast if already preloaded)
      if (!isRazorpayReady()) {
        await preloadRazorpayCheckout();
      }

      const orderResult = await createJobReadyBootcampOrderAction(collegeSlug);
      if (!orderResult.ok || !orderResult.data) {
        toast.error(orderResult.error ?? JOB_READY_BOOTCAMP_PRICING_ERROR);
        checkoutInProgressRef.current = false;
        setCheckoutState(null);
        return;
      }

      const { order, gatewayOrder, razorpayKey } = orderResult.data as OrderCreationResult;

      const rzp = new window.Razorpay({
        key: razorpayKey,
        amount: gatewayOrder.amount_minor,
        currency: gatewayOrder.currency,
        name: RAZORPAY_CHECKOUT_MERCHANT_NAME,
        description: 'Job Ready Bootcamp',
        order_id: gatewayOrder.gateway_order_id,
        theme: { color: RAZORPAY_CHECKOUT_THEME_COLOR },
        handler: async (response: RazorpayResponse) => {
          setCheckoutState('verifying');
          try {
            const verifyResult = await verifyJobReadyBootcampPaymentAction(collegeSlug, {
              orderId: order.id,
              gatewayOrderId: response.razorpay_order_id,
              gatewayPaymentId: response.razorpay_payment_id,
              gatewaySignature: response.razorpay_signature,
            });
            if (!verifyResult.ok) {
              toast.error(verifyResult.error ?? 'Payment verification failed');
              checkoutInProgressRef.current = false;
              setCheckoutState(null);
              return;
            }
            setCheckoutState('confirmed');
            const redirect =
              (verifyResult.data as { redirectHref?: string } | undefined)?.redirectHref
              ?? buildBootcampPaymentSuccessHref(collegeSlug);
            router.push(redirect);
          } catch {
            toast.error('Failed to verify payment');
            checkoutInProgressRef.current = false;
            setCheckoutState(null);
          }
        },
        modal: {
          ondismiss: () => {
            checkoutInProgressRef.current = false;
            setCheckoutState(null);
          },
        },
      });

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
  }, [collegeSlug, pricingConfigured, requireAuth, router]);

  const priceSuffix =
    includePriceInLabel && pricingConfigured
      ? ` — ${formatPrice(priceMinor!, currency)}`
      : '';

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <Button
        type="button"
        size={size}
        disabled={checkoutState !== null || !pricingConfigured}
        onClick={() => void handleEnroll()}
        className="w-full rounded-full bg-primary px-8 font-semibold text-primary-foreground shadow-[0_0_28px_color-mix(in_oklab,var(--primary)_35%,transparent)] sm:w-auto"
      >
        {checkoutState ? (
          <>
            <div className="animate-spin"><Loader2 className="mr-2 size-4" /></div>
            {checkoutState === 'verifying'
              ? 'Verifying payment...'
              : checkoutState === 'confirmed'
                ? 'Enrollment confirmed'
                : 'Opening payment...'}
          </>
        ) : (
          <>
            <CreditCard className="mr-2 size-4" />
            {label}
            {priceSuffix}
          </>
        )}
      </Button>
      {showMicrocopy && pricingConfigured ? (
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Lock className="size-3" />
          Secure Razorpay checkout
        </span>
      ) : null}
    </div>
  );
}

/** @deprecated Use JobReadyBootcampCheckoutButton */
export { JobReadyBootcampCheckoutButton as JobReadyBootcampEnrollButton };
