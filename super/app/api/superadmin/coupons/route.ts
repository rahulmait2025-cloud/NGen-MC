import { NextRequest, NextResponse } from 'next/server';
import {
  getAllAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  toggleAdminCouponStatus,
} from '@/lib/superadmin/commerce/services/coupons';
import type {
  AdminCouponStatus,
  AdminCreateCouponInput,
  AdminUpdateCouponInput,
} from '@/lib/superadmin/commerce/services/coupons';

/**
 * GET /api/superadmin/coupons
 * Query params: status, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const status = searchParams.get('status') as AdminCouponStatus | null;
    const limit = parseInt(searchParams.get('limit') ?? '100', 10);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    const result = await getAllAdminCoupons({
      status: status ?? undefined,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[superadmin/coupons] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch coupons' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/superadmin/coupons
 * Create a new coupon.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const input: AdminCreateCouponInput = {
      code: body.code as string,
      description: body.description as string | undefined,
      discountType: body.discountType as 'fixed' | 'percentage',
      discountValue: Number(body.discountValue),
      maxUses: body.maxUses !== undefined ? Number(body.maxUses) : null,
      maxUsesPerUser: Number(body.maxUsesPerUser) ?? 1,
      validFrom: body.validFrom as string,
      validUntil: body.validUntil as string | null | undefined,
      applicableEntityTypes: body.applicableEntityTypes as Array<'course_variant' | 'course_bundle'>,
      applicableEntityIds: body.applicableEntityIds as string[] | null | undefined,
      minOrderAmountMinor: body.minOrderAmountMinor !== undefined ? Number(body.minOrderAmountMinor) : null,
      applicableSources: body.applicableSources as Array<'lms' | 'college_admin'>,
      metadata: body.metadata as Record<string, unknown> | undefined,
      createdBy: body.createdBy as string | undefined,
    };

    const coupon = await createAdminCoupon(input);
    return NextResponse.json({ success: true, data: coupon });
  } catch (error) {
    console.error('[superadmin/coupons] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create coupon' },
      { status: 400 },
    );
  }
}

/**
 * PUT /api/superadmin/coupons?id=<couponId>
 * Update an existing coupon.
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const couponId = searchParams.get('id');

    if (!couponId) {
      return NextResponse.json(
        { success: false, error: 'Coupon ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json();

    const input: AdminUpdateCouponInput = {};

    if (body.description !== undefined) input.description = body.description;
    if (body.discountType !== undefined) input.discountType = body.discountType;
    if (body.discountValue !== undefined) input.discountValue = Number(body.discountValue);
    if (body.maxUses !== undefined) input.maxUses = body.maxUses !== null ? Number(body.maxUses) : null;
    if (body.maxUsesPerUser !== undefined) input.maxUsesPerUser = Number(body.maxUsesPerUser);
    if (body.validFrom !== undefined) input.validFrom = body.validFrom;
    if (body.validUntil !== undefined) input.validUntil = body.validUntil;
    if (body.applicableEntityTypes !== undefined) input.applicableEntityTypes = body.applicableEntityTypes;
    if (body.applicableEntityIds !== undefined) input.applicableEntityIds = body.applicableEntityIds;
    if (body.minOrderAmountMinor !== undefined) input.minOrderAmountMinor = body.minOrderAmountMinor !== null ? Number(body.minOrderAmountMinor) : null;
    if (body.applicableSources !== undefined) input.applicableSources = body.applicableSources;
    if (body.metadata !== undefined) input.metadata = body.metadata;

    const coupon = await updateAdminCoupon(couponId, input);
    return NextResponse.json({ success: true, data: coupon });
  } catch (error) {
    console.error('[superadmin/coupons] PUT error:', error);
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update coupon' },
      { status },
    );
  }
}

/**
 * POST /api/superadmin/coupons?action=toggle&id=<couponId>
 * Toggle coupon status between active and disabled.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const action = searchParams.get('action');
    const couponId = searchParams.get('id');

    if (action === 'toggle' && couponId) {
      const body = await request.json();
      const disabledReason = body.disabledReason as string | undefined;

      const coupon = await toggleAdminCouponStatus(couponId, disabledReason);
      return NextResponse.json({ success: true, data: coupon });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action or missing coupon ID' },
      { status: 400 },
    );
  } catch (error) {
    console.error('[superadmin/coupons] PATCH error:', error);
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to toggle coupon' },
      { status },
    );
  }
}
