import { NextRequest, NextResponse } from 'next/server';
import { createCollegeOrder } from '@/lib/college-admin/commerce/services/orders';
import type { SellableEntityType } from '@/types/database';
import { isSuperadminAuthError, requireSuperadmin } from '@/lib/auth/require-superadmin';

/**
 * POST /api/college-admin/orders
 *
 * Create a new CollegeAdmin order securely.
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
 * - Source is always "college_admin"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const {
      entity_type,
      entity_id,
      purchaser_email,
    } = body;

    if (!entity_type || !entity_id || !purchaser_email) {
      return NextResponse.json(
        { error: 'Missing required fields: entity_type, entity_id, purchaser_email' },
        { status: 400 },
      );
    }

    // Validate entity_type
    if (!['course_variant', 'course_bundle'].includes(entity_type)) {
      return NextResponse.json(
        { error: 'Invalid entity_type. Must be "course_variant" or "course_bundle"' },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(purchaser_email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 },
      );
    }

    // Create order (source is always "college_admin")
    const result = await createCollegeOrder({
      entityType: entity_type as SellableEntityType,
      entityId: entity_id,
      purchaserEmail: purchaser_email,
      purchaserName: body.purchaser_name,
      purchaserUserId: body.purchaser_user_id,
      couponCode: body.coupon_code,
      idempotencyKey: body.idempotency_key,
      metadata: body.metadata,
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

    console.error('[api/college-admin/orders] Failed to create order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/college-admin/orders?email=<email>
 *
 * Get CollegeAdmin orders by purchaser email.
 * Used by students to view their CollegeAdmin purchase history.
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

    const { getCollegeOrdersByEmail } = await import('@/lib/college-admin/commerce/services/orders');
    const orders = await getCollegeOrdersByEmail(email);

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
      })),
    });
  } catch (error) {
    console.error('[api/college-admin/orders] Failed to fetch orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 },
    );
  }
}
