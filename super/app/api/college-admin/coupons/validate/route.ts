import { NextRequest, NextResponse } from 'next/server';
import { validateCollegeCoupon } from '@/lib/college-admin/commerce/services/coupons';
import type { SellableEntityType } from '@/types/database';
import { z } from 'zod';

const CouponValidationSchema = z.object({
  code: z.string().min(1).max(50).transform(v => v.toUpperCase()),
  order_amount_minor: z.number().int().min(0),
  entity_type: z.enum(['course_variant', 'course_bundle']),
  entity_id: z.uuid(),
  purchaser_user_id: z.uuid().optional(),
  purchaser_email: z.email().optional().or(z.literal('')),
});

/**
 * POST /api/college-admin/coupons/validate
 *
 * Validate a CollegeAdmin coupon server-side and return the calculated discount.
 *
 * Request body:
 * {
 *   "code": "SAVE20",
 *   "order_amount_minor": 49900,
 *   "entity_type": "course_variant" | "course_bundle",
 *   "entity_id": "<uuid>",
 *   "purchaser_user_id": "<uuid>",   // optional
 *   "purchaser_email": "<email>"     // optional
 * }
 *
 * Response (valid):
 * {
 *   "valid": true,
 *   "discount_amount_minor": 9980,
 *   "discount_percentage": 20,
 *   "coupon_code": "SAVE20"
 * }
 *
 * Response (invalid):
 * {
 *   "valid": false,
 *   "error": "Coupon has expired"
 * }
 *
 * Security:
 * - All validation happens server-side
 * - Client never receives coupon configuration details
 * - Only the discount amount is returned
 * - Source is always restricted to "college_admin"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parseResult = CouponValidationSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Invalid request data',
          detail: parseResult.error.issues.map(i => i.message).join(', '),
        },
        { status: 400 },
      );
    }

    const { code, order_amount_minor, entity_type, entity_id, purchaser_user_id, purchaser_email } = parseResult.data;

    const result = await validateCollegeCoupon({
      code,
      orderAmountMinor: order_amount_minor,
      entityType: entity_type as SellableEntityType,
      entityId: entity_id,
      source: 'college_admin',
      purchaserUserId: purchaser_user_id,
      purchaserEmail: purchaser_email || undefined,
    });

    if (!result.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: result.errorMessage ?? 'Invalid coupon',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      valid: true,
      discount_amount_minor: result.discountAmountMinor,
      discount_percentage:
        result.coupon?.discount_type === 'percentage'
          ? result.coupon.discount_value
          : undefined,
      coupon_code: code,
      message: result.coupon?.description ?? undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/college-admin/coupons/validate] Coupon validation failed:', error);
    return NextResponse.json(
      {
        valid: false,
        error: 'Failed to validate coupon',
        detail: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 },
    );
  }
}
