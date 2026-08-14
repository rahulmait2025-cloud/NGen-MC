import { NextRequest, NextResponse } from 'next/server';
import { verifyCollegePayment } from '@/lib/college-admin/commerce/services/orders';

/**
 * POST /api/college-admin/payments/verify
 *
 * Verify a Razorpay payment server-side after checkout completion.
 *
 * Request body:
 * {
 *   "order_id": "<local_order_uuid>",
 *   "gateway_order_id": "<rzp_order_id>",
 *   "gateway_payment_id": "<rzp_payment_id>",
 *   "gateway_signature": "<razorpay_signature>"
 * }
 *
 * Response (success):
 * {
 *   "success": true,
 *   "order_id": "<uuid>",
 *   "status": "paid",
 *   "message": "Payment verified successfully"
 * }
 *
 * Response (failure):
 * {
 *   "success": false,
 *   "message": "Payment signature verification failed"
 * }
 *
 * Security:
 * - Signature verified server-side using HMAC-SHA256
 * - Never trusts frontend success callback alone
 * - Idempotent — safe to call multiple times
 * - Prevents duplicate order transitions
 * - Source is always "college_admin"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const {
      order_id,
      gateway_order_id,
      gateway_payment_id,
      gateway_signature,
    } = body;

    if (!order_id || !gateway_order_id || !gateway_payment_id || !gateway_signature) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, gateway_order_id, gateway_payment_id, gateway_signature' },
        { status: 400 },
      );
    }

    // Verify payment
    const result = await verifyCollegePayment({
      orderId: order_id,
      gatewayOrderId: gateway_order_id,
      gatewayPaymentId: gateway_payment_id,
      gatewaySignature: gateway_signature,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          order_id: result.order?.id,
          status: result.order?.status,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      order_id: result.order.id,
      status: result.order.status,
      message: result.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/college-admin/payments/verify] Payment verification failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Payment verification failed',
        detail: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 },
    );
  }
}
