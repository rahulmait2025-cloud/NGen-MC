import { NextRequest, NextResponse } from 'next/server';
import { createLmsOrder } from '@/lib/lms/commerce/services/orders';
import type { LmsEntityType } from '@/lib/lms/commerce/services/orders';
import { z } from 'zod';
import { isSuperadminAuthError, requireSuperadmin } from '@/lib/auth/require-superadmin';

const LMS_SOURCE = 'lms' as const;

const createOrderSchema = z.object({
  entity_type: z.enum(['course_variant', 'course_bundle', 'master_course']),
  entity_id: z.uuid(),
  purchaser_email: z.email(),
  purchaser_name: z.string().max(255).optional(),
  purchaser_user_id: z.uuid().optional(),
  coupon_code: z.string().max(50).optional(),
  idempotency_key: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/lms/orders
 *
 * Create a new LMS order securely.
 *
 * Request body:
 * {
 *   "entity_type": "course_variant" | "course_bundle",
 *   "entity_id": "<uuid>",
 *   "purchaser_email": "<email>",
 *   "purchaser_name": "<name>",        // optional
 *   "purchaser_user_id": "<uuid>",     // optional
 *   "coupon_code": "<code>",           // optional
 *   "idempotency_key": "<key>",        // optional
 *   "metadata": {}                     // optional
 * }
 *
 * Response:
 * {
 *   "order_id": "<uuid>",
 *   "razorpay_key": "<public_key>",
 *   "gateway_order_id": "<rzp_order_id>",
 *   "amount_minor": 49900,
 *   "currency": "INR",
 *   "total_amount_minor": 44910
 * }
 *
 * Security:
 * - All pricing computed server-side from DB
 * - Coupon validated server-side
 * - No client-supplied amounts trusted
 * - Source is always "lms"
 */
export async function POST(request: NextRequest) {
  try {
    await requireSuperadmin({ forApi: true });
  } catch (error) {
    if (isSuperadminAuthError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  try {
    const body = await request.json();

    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const {
      entity_type,
      entity_id,
      purchaser_email,
      purchaser_name,
      purchaser_user_id,
      coupon_code,
      idempotency_key,
      metadata,
    } = validation.data;

    // Create LMS order (source is always "lms")
    const result = await createLmsOrder({
      entityType: entity_type as LmsEntityType,
      entityId: entity_id,
      purchaserEmail: purchaser_email,
      purchaserName: purchaser_name,
      purchaserUserId: purchaser_user_id,
      couponCode: coupon_code,
      idempotencyKey: idempotency_key,
      metadata: metadata,
    });

    return NextResponse.json(
      {
        order_id: result.order.id,
        razorpay_key: result.razorpayKey,
        gateway_order_id: result.gatewayOrder.gateway_order_id,
        amount_minor: result.gatewayOrder.amount_minor,
        currency: result.gatewayOrder.currency,
        total_amount_minor: result.order.total_amount_minor,
        base_amount_minor: result.order.base_amount_minor,
        discount_amount_minor: result.order.discount_amount_minor,
        coupon_applied: result.order.coupon_code !== null,
        entity_type: result.order.entity_type,
        entity_id: result.order.entity_id,
        source: LMS_SOURCE,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Handle specific error types
    if (message.includes('not found') || message.includes('not available')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message.includes('does not have a valid price')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error('[api/lms/orders] Failed to create LMS order:', error);
    return NextResponse.json(
      { error: 'Failed to create LMS order' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/lms/orders?email=<email>
 *
 * Get LMS orders by purchaser email.
 * Used by students to view their LMS purchase history.
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperadmin({ forApi: true });
  } catch (error) {
    if (isSuperadminAuthError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email query parameter is required' },
        { status: 400 },
      );
    }

    const { getLmsOrdersByEmail } = await import('@/lib/lms/commerce/services/orders');
    const orders = await getLmsOrdersByEmail(email);

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        entity_type: o.entity_type,
        entity_id: o.entity_id,
        total_amount_minor: o.total_amount_minor,
        currency: o.currency,
        status: o.status,
        created_at: o.created_at,
        paid_at: o.paid_at,
        source: o.source,
      })),
    });
  } catch (error) {
    console.error('[api/lms/orders] Failed to fetch LMS orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LMS orders' },
      { status: 500 },
    );
  }
}
