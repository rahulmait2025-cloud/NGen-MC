'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format-price';
import { Loader2, Tag, X, Check } from 'lucide-react';
import { preloadRazorpayCheckout, isRazorpayReady } from '@/lib/payments/razorpay-loader';
import {
  createNoteOrderAction,
  verifyNotePaymentAction,
  validateNoteCouponAction,
} from '../note-purchase-actions';
import type { CreateNoteOrderResult, NoteOrderCouponSummary } from '@/lib/services/note-purchases';

interface NotePurchaseButtonProps {
  collegeSlug: string;
  noteCollectionId: string;
  noteCollectionSlug: string;
  priceMinor: number;
  currency: string;
}

type NoteOrderActionData = Pick<
  CreateNoteOrderResult,
  'order' | 'gatewayOrder' | 'razorpayKey' | 'zeroPayUnlock'
>;

export function NotePurchaseButton({
  collegeSlug,
  noteCollectionId,
  noteCollectionSlug,
  priceMinor,
  currency,
}: NotePurchaseButtonProps) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const checkoutRef = useRef(false);

  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<NoteOrderCouponSummary | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    void preloadRazorpayCheckout().catch(() => undefined);
  }, []);

  const handleApplyCoupon = useCallback(async () => {
    if (!couponInput.trim() || couponLoading) return;
    setCouponLoading(true);
    setCouponError(null);

    try {
      const result = await validateNoteCouponAction(
        collegeSlug,
        noteCollectionId,
        couponInput.trim(),
      );
      if (result.ok && result.data) {
        const summary = result.data as NoteOrderCouponSummary;
        if (summary.valid) {
          setAppliedCoupon(summary);
          setCouponError(null);
        } else {
          setAppliedCoupon(null);
          setCouponError(summary.message ?? 'Invalid coupon');
        }
      } else {
        setAppliedCoupon(null);
        setCouponError(result.error ?? 'Failed to validate coupon');
      }
    } catch {
      setAppliedCoupon(null);
      setCouponError('Failed to validate coupon');
    } finally {
      setCouponLoading(false);
    }
  }, [collegeSlug, noteCollectionId, couponInput, couponLoading]);

  const handleRemoveCoupon = useCallback(() => {
    setCouponInput('');
    setAppliedCoupon(null);
    setCouponError(null);
  }, []);

  const handlePurchase = useCallback(async () => {
    if (checkoutRef.current || processing) return;
    checkoutRef.current = true;
    setProcessing(true);

    try {
      const couponCode =
        (appliedCoupon?.couponCode ?? couponInput.trim()) || undefined;

      const orderRes = await createNoteOrderAction(
        collegeSlug,
        noteCollectionId,
        couponCode,
      );
      if (!orderRes.ok || !orderRes.data) {
        toast.error(orderRes.error ?? 'Failed to create order');
        return;
      }

      const { order, gatewayOrder, razorpayKey, zeroPayUnlock } =
        orderRes.data as NoteOrderActionData;

      if (zeroPayUnlock) {
        toast.success('Notes unlocked with coupon!');
        router.refresh();
        router.push(
          `/c/${collegeSlug}/student/notes/${noteCollectionSlug}`,
        );
        checkoutRef.current = false;
        setProcessing(false);
        return;
      }

      if (!gatewayOrder || !razorpayKey || !order) {
        toast.error('Failed to create payment order');
        checkoutRef.current = false;
        setProcessing(false);
        return;
      }

      if (!isRazorpayReady()) {
        await preloadRazorpayCheckout();
      }

      const options = {
        key: razorpayKey,
        amount: gatewayOrder.amount_minor,
        currency: gatewayOrder.currency,
        name: 'Avesh LMS',
        description: `Purchase: ${noteCollectionSlug}`,
        order_id: gatewayOrder.gateway_order_id,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await verifyNotePaymentAction(
              collegeSlug,
              {
                orderId: order.id,
                gatewayOrderId: response.razorpay_order_id,
                gatewayPaymentId: response.razorpay_payment_id,
                gatewaySignature: response.razorpay_signature,
              },
              noteCollectionSlug,
            );

            if (verifyRes.ok) {
              toast.success('Payment successful! Notes unlocked.');
              router.refresh();
              router.push(
                `/c/${collegeSlug}/student/notes/${noteCollectionSlug}`,
              );
            } else {
              toast.error(verifyRes.error ?? 'Payment verification failed');
            }
          } catch {
            toast.error('Payment verification failed. Contact support.');
          } finally {
            checkoutRef.current = false;
            setProcessing(false);
          }
        },
        prefill: {},
        theme: { color: 'oklch(0.72 0.19 45)' },
        modal: {
          ondismiss: () => {
            checkoutRef.current = false;
            setProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed');
      checkoutRef.current = false;
      setProcessing(false);
    }
  }, [
    collegeSlug,
    noteCollectionId,
    noteCollectionSlug,
    appliedCoupon,
    couponInput,
    processing,
    router,
  ]);

  const displayPrice = appliedCoupon
    ? appliedCoupon.finalAmountMinor
    : priceMinor;
  const hasDiscount =
    appliedCoupon !== null && appliedCoupon.discountMinor > 0;
  const isFreePurchase = displayPrice <= 0;

  return (
    <div className="space-y-3">
      {/* Coupon */}
      <div className="space-y-1.5">
        {appliedCoupon ? (
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm',
              'border-success/30 bg-success/10',
            )}
            role="status"
          >
            <Tag
              className="size-4 shrink-0 text-success"
              aria-hidden="true"
            />
            <span className="flex-1 font-medium text-foreground">
              {appliedCoupon.couponCode}
              <span className="text-success ml-1">
                — {formatPrice(appliedCoupon.discountMinor, currency)} off
              </span>
            </span>
            <button
              onClick={handleRemoveCoupon}
              type="button"
              aria-label={`Remove coupon ${appliedCoupon.couponCode}`}
              className={cn(
                'inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors',
                'hover:bg-muted hover:text-foreground',
                'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
              )}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Coupon code"
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value);
                setCouponError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleApplyCoupon();
                }
              }}
              disabled={couponLoading}
              aria-label="Coupon code"
              aria-describedby={couponError ? 'coupon-error' : undefined}
              className="flex-1 text-sm uppercase tracking-wider"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleApplyCoupon()}
              disabled={!couponInput.trim() || couponLoading}
              aria-label="Apply coupon"
            >
              {couponLoading ? (
                <div className="animate-spin"><Loader2 className="size-4" aria-hidden="true" /></div>
              ) : (
                'Apply'
              )}
            </Button>
          </div>
        )}
        {couponError && (
          <p
            id="coupon-error"
            className="px-1 text-xs text-destructive"
            role="alert"
          >
            {couponError}
          </p>
        )}
      </div>

      {/* Price breakdown */}
      {hasDiscount && (
        <div className="flex items-baseline gap-2 text-sm" aria-live="polite">
          <span className="text-muted-foreground line-through tabular-nums">
            {formatPrice(priceMinor, currency)}
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatPrice(displayPrice, currency)}
          </span>
          <span className="ml-auto text-xs font-medium text-success">
            You save {formatPrice(appliedCoupon!.discountMinor, currency)}
          </span>
        </div>
      )}

      {/* Buy / Unlock */}
      <Button
        onClick={handlePurchase}
        disabled={processing}
        className="w-full"
        aria-label={
          processing
            ? 'Processing payment'
            : isFreePurchase
              ? 'Unlock notes for free'
              : `Pay ${formatPrice(displayPrice, currency)} to unlock notes`
        }
      >
        {processing ? (
          <span className="inline-flex items-center gap-2">
            <div className="animate-spin"><Loader2 className="size-4" aria-hidden="true" /></div>
            Processing…
          </span>
        ) : isFreePurchase ? (
          <span className="inline-flex items-center gap-2">
            <Check className="size-4" aria-hidden="true" />
            Unlock Notes
          </span>
        ) : (
          `Pay ${formatPrice(displayPrice, currency)}`
        )}
      </Button>

      {!isFreePurchase && (
        <p className="text-center text-xs text-muted-foreground">
          One-time payment · Lifetime access
        </p>
      )}
    </div>
  );
}
