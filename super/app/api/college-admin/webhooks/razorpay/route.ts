import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * CollegeAdmin Razorpay Webhook Receiver.
 *
 * CollegeAdmin-ONLY endpoint. Handles webhook events for CollegeAdmin-originated orders.
 * Register in Razorpay Dashboard: https://<collegeadmin-domain>/api/college-admin/webhooks/razorpay
 *
 * Scope: Updates orders where source = 'college_admin'. Does NOT process LMS orders.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    if (!signature) return new Response('Missing signature', { status: 401 });

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return new Response('Webhook secret not configured', { status: 500 });

    const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      return new Response('Invalid signature', { status: 401 });
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const eventType = (payload.event as string) ?? '';
    const eventId = (payload.id as string) ?? '';
    const admin = createAdminClient();

    // Idempotency check
    const { data: existingLog } = await admin.from('webhook_audit_logs').select('id').eq('provider', 'razorpay').eq('event_id', eventId).single();
    if (existingLog) {
      return NextResponse.json({ success: true, event_id: eventId, is_duplicate: true });
    }

    await admin.from('webhook_audit_logs').insert({
      provider: 'razorpay', event_type: eventType, event_id: eventId,
      raw_payload: payload, signature_valid: true, processing_status: 'pending',
    });

    let status = 'processed';
    try {
      if (eventType === 'payment.captured') {
        const entityData = (payload.entity as Record<string, unknown>) ?? {};
        const payloadData = (payload.payload as Record<string, unknown>) ?? {};
        const orderData = (payloadData.order as Record<string, unknown>) ?? {};
        const orderEntity = (orderData.entity as Record<string, unknown>) ?? {};
        const notesData = (entityData.notes as Record<string, unknown>) ?? {};
        const orderId = (entityData.order_id as string) ?? (orderEntity.id as string) ?? (notesData.order_id as string);

        if (orderId) {
          const { data: order } = await admin.from('orders').select('status').eq('id', orderId).eq('source', 'college_admin').single();
          if (order && (order as { status: string }).status === 'paid') {
            status = 'duplicate';
          } else if (orderId) {
            await admin.from('orders').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', orderId).eq('source', 'college_admin');
            const paymentId = (entityData.id as string) ?? '';
            if (paymentId) {
              await admin.from('payments').update({ status: 'captured', captured_at: new Date().toISOString() }).eq('gateway_payment_id', paymentId);
            }
          }
        }
      } else if (eventType === 'payment.failed') {
        const entityData = (payload.entity as Record<string, unknown>) ?? {};
        const notesData = (entityData.notes as Record<string, unknown>) ?? {};
        const orderId = (entityData.order_id as string) ?? (notesData.order_id as string);
        if (orderId) {
          await admin.from('orders').update({ status: 'failed', metadata: { webhook_failed: true } }).eq('id', orderId).eq('source', 'college_admin');
        }
      } else if (eventType === 'refund.processed') {
        const paymentId = (payload.entity as Record<string, unknown>)?.id as string;
        if (paymentId) {
          await admin.from('orders').update({ status: 'refunded', refunded_at: new Date().toISOString() }).eq('gateway_payment_id', paymentId).eq('source', 'college_admin');
        }
      }
    } catch {
      status = 'failed';
    }

    await admin.from('webhook_audit_logs').update({ processing_status: status, processed_at: new Date().toISOString() }).eq('event_id', eventId);
    return NextResponse.json({ success: true, event_type: eventType, event_id: eventId });
  } catch {
    return new Response('Internal Server Error', { status: 500 });
  }
}
