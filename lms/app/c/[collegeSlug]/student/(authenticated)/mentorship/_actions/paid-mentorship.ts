'use server';

import { requireAuth } from '@/lib/auth/require-student-action';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRazorpayProvider } from '@/lib/payments/razorpay';
import {
  listActiveCategories,
  getActivePricing,
  getAvailableSlots,
  getAvailableDates,
  getDateAvailabilityStatuses,
  getActiveBookingForUser,
  createPendingBooking,
  confirmBooking,
  rescheduleBooking,
  type CustomAnswer,
} from '@/lib/services/paid-mentorship';

export async function getCategoriesAction(collegeSlug: string) {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { ok: false as const, error: 'Not authenticated' };
    const categories = await listActiveCategories();
    return { ok: true as const, categories };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function getPricingAction(collegeSlug: string) {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { ok: false as const, error: 'Not authenticated' };
    const pricing = await getActivePricing();
    return { ok: true as const, pricing };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function getActiveBookingAction(collegeSlug: string, userId: string) {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { ok: false as const, error: 'Not authenticated' };
    if (auth.user.id !== userId) return { ok: false as const, error: 'Not authorized' };
    const booking = await getActiveBookingForUser(userId);
    return { ok: true as const, booking };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function getSlotsAction(collegeSlug: string, date: string) {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { ok: false as const, error: 'Not authenticated' };
    const slots = await getAvailableSlots(date);
    return { ok: true as const, slots };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function getAvailableDatesAction(collegeSlug: string, yearMonth: string) {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { ok: false as const, error: 'Not authenticated' };
    const dates = await getAvailableDates(yearMonth);
    return { ok: true as const, dates };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function getDateAvailabilityStatusesAction(collegeSlug: string, yearMonth: string) {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { ok: false as const, error: 'Not authenticated' };
    const statuses = await getDateAvailabilityStatuses(yearMonth);
    return { ok: true as const, statuses };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function createOrderAction(collegeSlug: string, input: {
  userId: string;
  studentId: string;
  collegeId: string;
  categoryId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  achievementGoal: string;
  skillLevel: string;
  additionalNotes?: string;
  whatsappNumber?: string;
  customAnswers?: CustomAnswer[];
  couponCode?: string;
}) {
  try {
    const { requireSensitiveStudentRuntime } = await import('@/lib/student-runtime/runtime');
    const runtime = await requireSensitiveStudentRuntime(collegeSlug);
    if (!runtime) return { ok: false as const, error: 'Not authenticated' };
    if (runtime.identity.userId !== input.userId) return { ok: false as const, error: 'Not authorized' };

    if (!input.categoryId || !input.sessionDate || !input.startTime || !input.endTime || !input.achievementGoal || !input.skillLevel) {
      return { ok: false as const, error: 'Missing required fields.' };
    }

    if (input.achievementGoal.length > 500) {
      return { ok: false as const, error: 'Achievement goal must be 500 characters or less.' };
    }

    if (input.additionalNotes && input.additionalNotes.length > 500) {
      return { ok: false as const, error: 'Additional notes must be 500 characters or less.' };
    }

    const existingBooking = await getActiveBookingForUser(input.userId);
    if (existingBooking) {
      return { ok: false as const, error: 'You already have an active booking. Complete or reschedule it before booking another.' };
    }

    const admin = createAdminClient();
    const requestedStart = timeToMinutes(input.startTime);
    const requestedEnd = timeToMinutes(input.endTime);

    const { data: conflictingBookings } = await admin
      .from('paid_mentorship_bookings')
      .select('id, start_time_ist, end_time_ist')
      .eq('session_date', input.sessionDate)
      .in('status', ['confirmed', 'rescheduled', 'pending']);

    for (const b of conflictingBookings ?? []) {
      const bStart = timeToMinutes(String(b.start_time_ist));
      const bEnd = timeToMinutes(String(b.end_time_ist));
      if (requestedStart < bEnd && requestedEnd > bStart) {
        return { ok: false as const, error: 'This time slot is no longer available. Please pick another slot.' };
      }
    }

    const { data: category } = await admin
      .from('paid_mentorship_categories')
      .select('id')
      .eq('id', input.categoryId)
      .eq('is_active', true)
      .maybeSingle();

    if (!category) {
      return { ok: false as const, error: 'Invalid category.' };
    }

    const pricing = await getActivePricing();
    if (!pricing) {
      return { ok: false as const, error: 'Pricing not configured.' };
    }

    let discountAmount = 0;
    let finalAmount = pricing.selling_price_minor;

    if (input.couponCode) {
      const { data: coupon } = await admin
        .from('coupons')
        .select('id, discount_type, discount_value, max_uses, current_uses, is_active')
        .eq('code', input.couponCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (coupon) {
        const usesLeft = (coupon.max_uses ?? Infinity) - (coupon.current_uses ?? 0);
        if (usesLeft > 0) {
          if (coupon.discount_type === 'percentage') {
            discountAmount = Math.round(pricing.selling_price_minor * (coupon.discount_value / 100));
          } else {
            discountAmount = Math.min(coupon.discount_value, pricing.selling_price_minor);
          }
          finalAmount = pricing.selling_price_minor - discountAmount;
        }
      }
    }

    const razorpay = getRazorpayProvider();
    const tempOrderId = `pm_${input.userId.slice(0, 8)}_${Date.now()}`;
    const gatewayOrder = await razorpay.createOrder({
      order_id: tempOrderId,
      amount_minor: finalAmount,
      currency: pricing.currency,
      receipt: tempOrderId,
    });

    // Look up user email and name for the order record
    const { data: userProfile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', input.userId)
      .maybeSingle();

    const { data: newOrder, error: insertError } = await admin
      .from('orders')
      .insert({
        entity_type: 'paid_mentorship_booking',
        entity_id: null,
        purchaser_user_id: input.userId,
        purchaser_email: userProfile?.email ?? '',
        purchaser_name: userProfile?.full_name ?? 'Student',
        source: 'lms',
        base_amount_minor: pricing.selling_price_minor,
        discount_amount_minor: discountAmount,
        total_amount_minor: finalAmount,
        currency: pricing.currency,
        coupon_code: input.couponCode?.toUpperCase() || null,
        status: 'pending',
        gateway_name: 'razorpay',
        gateway_order_id: gatewayOrder.gateway_order_id,
      })
      .select('id')
      .single();

    if (insertError) throw new Error(insertError.message);

    const booking = await createPendingBooking({
      userId: input.userId,
      studentId: input.studentId,
      collegeId: input.collegeId,
      categoryId: input.categoryId,
      sessionDate: input.sessionDate,
      startTimeIst: input.startTime,
      endTimeIst: input.endTime,
      achievementGoal: input.achievementGoal,
      skillLevel: input.skillLevel,
      additionalNotes: input.additionalNotes,
      whatsappNumber: input.whatsappNumber,
      customAnswers: input.customAnswers,
      couponCode: input.couponCode?.toUpperCase(),
      originalPriceMinor: pricing.original_price_minor,
      sellingPriceMinor: pricing.selling_price_minor,
      discountAmountMinor: discountAmount,
      finalAmountMinor: finalAmount,
      orderId: newOrder.id,
    });

    await admin
      .from('orders')
      .update({ entity_id: booking.id })
      .eq('id', newOrder.id);

    return {
      ok: true as const,
      orderId: gatewayOrder.gateway_order_id,
      amount: finalAmount,
      currency: pricing.currency,
      bookingId: booking.id,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed to create order' };
  }
}

export async function verifyPaymentAction(collegeSlug: string, input: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  try {
    const { requireSensitiveStudentRuntime } = await import('@/lib/student-runtime/runtime');
    const runtime = await requireSensitiveStudentRuntime(collegeSlug);
    if (!runtime) return { ok: false as const, error: 'Not authenticated' };

    const razorpay = getRazorpayProvider();
    const result = await razorpay.verifyPayment({
      gateway_order_id: input.razorpay_order_id,
      gateway_payment_id: input.razorpay_payment_id,
      gateway_signature: input.razorpay_signature,
    });

    if (!result.verified) {
      return { ok: false as const, error: 'Payment verification failed.' };
    }

    const admin = createAdminClient();

    const { data: order } = await admin
      .from('orders')
      .select('id, entity_id, status, purchaser_user_id')
      .eq('gateway_order_id', input.razorpay_order_id)
      .eq('entity_type', 'paid_mentorship_booking')
      .maybeSingle();

    if (!order) {
      return { ok: false as const, error: 'Order not found.' };
    }

    if (order.purchaser_user_id !== runtime.identity.userId) {
      return { ok: false as const, error: 'This order does not belong to you.' };
    }

    if (order.status === 'paid') {
      return { ok: true as const, message: 'Already processed.' };
    }

    await admin
      .from('orders')
      .update({
        status: 'paid',
        gateway_payment_id: input.razorpay_payment_id,
        gateway_signature: input.razorpay_signature,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (order.entity_id) {
      await confirmBooking(order.entity_id, order.id);
    }

    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Payment verification failed' };
  }
}

export async function rescheduleAction(collegeSlug: string, input: {
  bookingId: string;
  userId: string;
  newDate: string;
  newStart: string;
  newEnd: string;
}) {
  try {
    const auth = await requireAuth(collegeSlug);
    if (!auth) return { ok: false as const, error: 'Not authenticated' };
    if (auth.user.id !== input.userId) return { ok: false as const, error: 'Not authorized' };

    const newBooking = await rescheduleBooking(
      input.bookingId,
      input.userId,
      input.newDate,
      input.newStart,
      input.newEnd,
    );
    return { ok: true as const, booking: newBooking };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed to reschedule' };
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = String(time).slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}
