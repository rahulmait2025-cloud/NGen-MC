import { NextRequest, NextResponse } from 'next/server';
import { verifyLmsPayment } from '@/lib/lms/commerce/services/orders';
import { provisionLmsAccessAfterPurchase } from '@/lib/lms/commerce/services/payment-entitlements';
import { z } from 'zod';

const PaymentVerificationSchema = z.object({
  order_id: z.uuid('Invalid order ID format'),
  gateway_order_id: z.string().min(1, 'Gateway order ID is required'),
  gateway_payment_id: z.string().min(1, 'Gateway payment ID is required'),
  gateway_signature: z.string().min(1, 'Gateway signature is required'),
});

/**
 * POST /api/lms/payments/verify
 *
 * Verify an LMS Razorpay payment server-side after checkout completion.
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
 * - Auto-provisions LMS entitlements on success
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parseResult = PaymentVerificationSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request data',
          detail: parseResult.error.issues.map(i => i.message).join(', '),
        },
        { status: 400 },
      );
    }

    const { order_id, gateway_order_id, gateway_payment_id, gateway_signature } = parseResult.data;

    // Verify LMS payment
    const result = await verifyLmsPayment({
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

    // Auto-provision LMS entitlements after verified payment
    let entitlementResult: { results: Array<{ success: boolean; message: string }> } | null = null;

    if (result.order?.purchaser_user_id && result.order?.status === 'paid') {
      // Fetch order with items
      const { getLmsOrderById } = await import('@/lib/lms/commerce/services/orders');
      const orderWithItems = await getLmsOrderById(result.order.id);

      if (orderWithItems) {
        entitlementResult = await provisionLmsAccessAfterPurchase({
          order: orderWithItems,
          studentUserId: result.order.purchaser_user_id,
          studentEmail: result.order.purchaser_email,
        });
      }
    }

    return NextResponse.json({
      success: true,
      order_id: result.order.id,
      status: result.order.status,
      message: result.message,
      entitlements: entitlementResult?.results ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/lms/payments/verify] LMS payment verification failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'LMS payment verification failed',
        detail: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 },
    );
  }
}
