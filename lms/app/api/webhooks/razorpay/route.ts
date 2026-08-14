import { NextResponse } from 'next/server';
import { getRazorpayProvider } from '@/lib/payments/razorpay';
import { handleRazorpayWebhookEvent } from '@/lib/services/razorpay-webhooks';

export async function POST(request: Request) {
  const signature = request.headers.get('x-razorpay-signature');
  if (!signature) {
    return NextResponse.json({ ok: false, error: 'Invalid signature.' }, { status: 400 });
  }

  const body = await request.text();

  try {
    const verification = await getRazorpayProvider().verifyWebhook({
      body,
      signature,
      webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
    });

    if (!verification.verified) {
      return NextResponse.json({ ok: false, error: 'Invalid signature.' }, { status: 400 });
    }

    await handleRazorpayWebhookEvent({
      eventId: verification.event_id || null,
      eventType: verification.event_type,
      payload: verification.payload,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('RAZORPAY_WEBHOOK_SECRET is not set')
    ) {
      return NextResponse.json({ ok: false, error: 'Webhook not configured.' }, { status: 500 });
    }

    console.error('[razorpay-webhook] Failed to process event.');
    return NextResponse.json({ ok: false, error: 'Webhook processing failed.' }, { status: 500 });
  }
}
