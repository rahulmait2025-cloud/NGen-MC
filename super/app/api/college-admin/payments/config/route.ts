import { NextResponse } from 'next/server';
import { getCollegeRazorpayPublicKey } from '@/lib/college-admin/commerce/razorpay';

/**
 * GET /api/college-admin/payments/config
 *
 * Returns public Razorpay configuration for CollegeAdmin checkout integration.
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
    const keyId = getCollegeRazorpayPublicKey();

    if (!keyId) {
      return NextResponse.json(
        { error: 'Razorpay is not configured' },
        { status: 503 },
      );
    }

    return NextResponse.json({
      razorpay_key_id: keyId,
      currency: 'INR',
    });
  } catch (error) {
    console.error('[api/college-admin/payments/config] Razorpay config error:', error);
    return NextResponse.json(
      { error: 'Razorpay is not configured' },
      { status: 503 },
    );
  }
}
