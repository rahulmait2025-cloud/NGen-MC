import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getActivePricing,
  getActiveBookingForUser,
  createPendingBooking,
} from '@/lib/services/paid-mentorship';

export async function POST(request: NextRequest) {
  try {
    // #9 Parallelize independent I/O: headers() and request.json() have no dependency
    const [headerStore, body] = await Promise.all([headers(), request.json()]);
    const userId = headerStore.get('x-user-id');
    const studentId = headerStore.get('x-student-id');
    const collegeId = headerStore.get('x-college-id');

    if (!userId || !studentId || !collegeId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const {
      categoryId,
      sessionDate,
      startTime,
      endTime,
      achievementGoal,
      skillLevel,
      additionalNotes,
      couponCode,
    } = body;

    if (!categoryId || !sessionDate || !startTime || !endTime || !achievementGoal || !skillLevel) {
      return NextResponse.json({ ok: false, error: 'Missing required fields.' }, { status: 400 });
    }

    if (achievementGoal.length > 500) {
      return NextResponse.json({ ok: false, error: 'Achievement goal must be 500 characters or less.' }, { status: 400 });
    }

    if (additionalNotes && additionalNotes.length > 500) {
      return NextResponse.json({ ok: false, error: 'Additional notes must be 500 characters or less.' }, { status: 400 });
    }

    const existingBooking = await getActiveBookingForUser(userId);
    if (existingBooking) {
      return NextResponse.json(
        { ok: false, error: 'You already have an active booking. Complete or reschedule it before booking another.' },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const [{ data: category }, pricing] = await Promise.all([
      admin
        .from('paid_mentorship_categories')
        .select('id')
        .eq('id', categoryId)
        .eq('is_active', true)
        .maybeSingle(),
      getActivePricing(),
    ]);

    if (!category) {
      return NextResponse.json({ ok: false, error: 'Invalid category.' }, { status: 400 });
    }

    if (!pricing) {
      return NextResponse.json({ ok: false, error: 'Pricing not configured.' }, { status: 400 });
    }

    let discountAmount = 0;
    let finalAmount = pricing.selling_price_minor;

    if (couponCode) {
      const { data: coupon } = await admin
        .from('coupons')
        .select('id, discount_type, discount_value, max_uses, current_uses, is_active')
        .eq('code', couponCode.toUpperCase())
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

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({
        amount: finalAmount,
        currency: pricing.currency,
        receipt: `pm_${userId.slice(0, 8)}_${Date.now()}`,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: 'Failed to create payment order.' }, { status: 500 });
    }

    const rpOrder = await response.json();

    const { data: newOrder, error: insertError } = await admin
      .from('orders')
      .insert({
        entity_type: 'paid_mentorship_booking',
        entity_id: null,
        purchaser_user_id: userId,
        purchaser_email: headerStore.get('x-user-email') ?? '',
        purchaser_name: headerStore.get('x-user-fullname') ?? '',
        source: 'lms',
        base_amount_minor: pricing.selling_price_minor,
        discount_amount_minor: discountAmount,
        total_amount_minor: finalAmount,
        currency: pricing.currency,
        coupon_code: couponCode?.toUpperCase() || null,
        status: 'pending',
        gateway_name: 'razorpay',
        gateway_order_id: rpOrder.id,
      })
      .select('id')
      .single();

    if (insertError) throw new Error(insertError.message);
    const orderId = newOrder.id;
    const razorpayOrderId = rpOrder.id;

    const booking = await createPendingBooking({
      userId,
      studentId,
      collegeId,
      categoryId,
      sessionDate,
      startTimeIst: startTime,
      endTimeIst: endTime,
      achievementGoal,
      skillLevel,
      additionalNotes,
      couponCode: couponCode?.toUpperCase(),
      originalPriceMinor: pricing.original_price_minor,
      sellingPriceMinor: pricing.selling_price_minor,
      discountAmountMinor: discountAmount,
      finalAmountMinor: finalAmount,
      orderId,
    });

    await admin
      .from('orders')
      .update({ entity_id: booking.id })
      .eq('id', orderId);

    return NextResponse.json({
      ok: true,
      orderId: razorpayOrderId,
      amount: finalAmount,
      currency: pricing.currency,
      bookingId: booking.id,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create order';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
