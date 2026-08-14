import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRazorpayProvider } from '@/lib/payments/razorpay';
import { confirmBooking } from '@/lib/services/paid-mentorship';

export async function POST(request: NextRequest) {
  try {
    const headerStore = await headers();
    const userId = headerStore.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ ok: false, error: 'Missing payment parameters.' }, { status: 400 });
    }

    const provider = getRazorpayProvider();
    const isValid = await provider.verifyPayment({
      gateway_order_id: razorpay_order_id,
      gateway_payment_id: razorpay_payment_id,
      gateway_signature: razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json({ ok: false, error: 'Payment verification failed.' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: order } = await admin
      .from('orders')
      .select('id, entity_id, status')
      .eq('gateway_order_id', razorpay_order_id)
      .eq('entity_type', 'paid_mentorship_booking')
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ ok: false, error: 'Order not found.' }, { status: 404 });
    }

    if (order.status === 'paid') {
      return NextResponse.json({ ok: true, message: 'Already processed.' });
    }

    await Promise.all([
      admin
        .from('orders')
        .update({
          status: 'paid',
          gateway_payment_id: razorpay_payment_id,
          gateway_signature: razorpay_signature,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id),
      order.entity_id ? confirmBooking(order.entity_id, order.id) : Promise.resolve(),
    ]);

    const { revalidateTag } = await import('next/cache');
    revalidateTag(`student-payment-history-${userId}`, 'max');

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment verification failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
