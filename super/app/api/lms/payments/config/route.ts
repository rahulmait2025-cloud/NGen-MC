import { NextResponse } from 'next/server';
import { getLmsRazorpayPublicKey } from '@/lib/lms/commerce/razorpay';

/**
 * GET /api/lms/payments/config
 *
 * Returns public LMS Razorpay configuration for checkout integration.
 * This is safe to expose to the browser - only contains the public key.
 *
 * Response:
 * {
 *   "razorpay_key_id": "rzp_test_...",
 *   "currency": "INR"
 * }
 *
 * Security:
 * - Only NEXT_PUBLIC_RAZORPAY_KEY_ID is returned
 * - RAZORPAY_KEY_SECRET is NEVER exposed
 * - No pricing or business logic is returned
 */
export async function GET() {
  try {
    const keyId = getLmsRazorpayPublicKey();

    return NextResponse.json({
      razorpay_key_id: keyId,
      currency: 'INR',
    });
  } catch {
    return NextResponse.json(
      { error: 'LMS Razorpay is not configured' },
      { status: 503 },
    );
  }
}
