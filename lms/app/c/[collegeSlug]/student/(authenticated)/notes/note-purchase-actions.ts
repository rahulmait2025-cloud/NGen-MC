'use server';

/**
 * Note Purchase Server Actions (Phase 3 + Coupons).
 *
 * Server actions for creating and verifying note collection purchases.
 * Supports official coupons and campus ambassador coupons.
 * Follows the same pattern as course purchase actions.
 */

import { requireAuth } from '@/lib/auth/require-student-action';
import {
  createNoteOrder,
  verifyNotePayment,
  validateNoteCoupon,
} from '@/lib/services/note-purchases';
import { revalidatePath } from 'next/cache';

export interface ActionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate a coupon against a note collection (for the "Apply Coupon" UI).
 * Returns discount breakdown without creating an order.
 */
export async function validateNoteCouponAction(
  collegeSlug: string,
  noteCollectionId: string,
  couponCode: string,
): Promise<ActionResponse> {
  const ctx = await requireAuth(collegeSlug);
  if (!ctx) return { ok: false, error: 'Unauthorized' };

  try {
    const result = await validateNoteCoupon({
      studentId: ctx.studentId,
      purchaserUserId: ctx.user.id,
      noteCollectionId,
      couponCode,
    });

    return { ok: true, data: result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to validate coupon',
    };
  }
}

/**
 * Create a Razorpay order for note collection purchase.
 * Accepts optional couponCode — discount calculated server-side.
 */
export async function createNoteOrderAction(
  collegeSlug: string,
  noteCollectionId: string,
  couponCode?: string,
): Promise<ActionResponse> {
  try {
    const { requireSensitiveStudentRuntime } = await import('@/lib/student-runtime/runtime');
    const runtime = await requireSensitiveStudentRuntime(collegeSlug);

    const result = await createNoteOrder({
      studentId: runtime.student.studentId,
      noteCollectionId,
      couponCode: couponCode || undefined,
    });

    return {
      ok: true,
      data: {
        order: result.order,
        gatewayOrder: result.gatewayOrder,
        razorpayKey: result.razorpayKey,
        collection: result.collection,
        coupon: result.coupon,
        zeroPayUnlock: result.zeroPayUnlock,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to create note order',
    };
  }
}

/**
 * Verify a Razorpay payment for note collection purchase.
 */
export async function verifyNotePaymentAction(
  collegeSlug: string,
  input: {
    orderId: string;
    gatewayOrderId: string;
    gatewayPaymentId: string;
    gatewaySignature: string;
  },
  noteCollectionSlug: string,
): Promise<ActionResponse> {
  try {
    const { requireSensitiveStudentRuntime } = await import('@/lib/student-runtime/runtime');
    const runtime = await requireSensitiveStudentRuntime(collegeSlug);
    if (!runtime) return { ok: false, error: 'Unauthorized' };

    const result = await verifyNotePayment(input);

    if (result.success) {
      // Revalidate the notes pages and note access cache
      revalidatePath(`/c/${collegeSlug}/student/notes`);
      revalidatePath(`/c/${collegeSlug}/student/notes/${noteCollectionSlug}`);
      const { revalidateTag } = await import('next/cache');
      revalidateTag('note-access', 'max');
      revalidateTag(`note-access-${runtime.student.studentId}`, 'max');

      void (async () => {
        const { ensureNotePaymentSuccessSideEffects } = await import(
          '@/lib/lms/transactional-email/note-payment-success'
        );
        await ensureNotePaymentSuccessSideEffects({
          notePaymentOrderId: input.orderId,
          source: 'verify',
          collegeSlug,
        });
      })();
    }

    return {
      ok: result.success,
      error: result.success ? undefined : result.message,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to verify note payment',
    };
  }
}
