import 'server-only';

/**
 * LMS Coupon Service.
 *
 * Server-side coupon validation and management for the LMS portal.
 * All discount calculations happen here — never trust client-side amounts.
 *
 * FULLY ISOLATED: LMS owns this code. Source is restricted to "lms" only.
 */

import { createAdminClient } from '@/lib/supabase/admin';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type LmsEntityType = 'course_variant' | 'course_bundle';
const LMS_SOURCE = 'lms' as const;

export interface LmsCouponValidationResult {
  valid: boolean;
  coupon?: LmsCouponRecord;
  discountAmountMinor: number;
  errorMessage?: string;
}

export interface LmsCouponRecord {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  max_uses_per_user: number;
  valid_from: string;
  valid_until: string | null;
  status: 'active' | 'expired' | 'exhausted' | 'disabled';
  applicable_entity_types: LmsEntityType[];
  applicable_entity_ids: string[] | null;
  min_order_amount_minor: number | null;
  applicable_sources: string[];
}

export interface LmsValidateCouponInput {
  code: string;
  orderAmountMinor: number;
  entityType: LmsEntityType;
  entityId: string;
  purchaserUserId?: string;
  purchaserEmail?: string;
}

// ─── Validation ─────────────────────────────────────────────────────────────────

/**
 * Validate an LMS coupon against an order.
 *
 * All checks happen server-side:
 * - Code exists and is active
 * - Within validity window
 * - Not exhausted
 * - Applicable to entity type/ID
 * - Meets minimum order amount
 * - User hasn't exceeded per-user limit
 * - Source is always "lms"
 *
 * Returns the calculated discount amount.
 */
export async function validateLmsCoupon(
  input: LmsValidateCouponInput,
): Promise<LmsCouponValidationResult> {
  const admin = createAdminClient();

  // Fetch coupon by code
  const { data: coupon, error: fetchError } = await admin
    .from('coupons')
    .select('*')
    .eq('code', input.code.toUpperCase())
    .single();

  if (fetchError || !coupon) {
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: 'Invalid coupon code',
    };
  }

  const record = coupon as LmsCouponRecord;

  // Check status
  if (record.status !== 'active') {
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: `Coupon is ${record.status}`,
    };
  }

  // Check validity window
  const now = new Date();
  const validFrom = new Date(record.valid_from);
  const validUntil = record.valid_until ? new Date(record.valid_until) : null;

  if (now < validFrom) {
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: 'Coupon is not yet active',
    };
  }

  if (validUntil && now > validUntil) {
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: 'Coupon has expired',
    };
  }

  // Check usage limits
  if (record.max_uses !== null && record.uses_count >= record.max_uses) {
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: 'Coupon usage limit reached',
    };
  }

  // Check per-user limit
  if (input.purchaserUserId && record.max_uses_per_user) {
    const { count: userUsageCount } = await admin
      .from('coupon_usages')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', record.id)
      .eq('purchaser_user_id', input.purchaserUserId);

    if ((userUsageCount ?? 0) >= record.max_uses_per_user) {
      return {
        valid: false,
        discountAmountMinor: 0,
        errorMessage: 'You have already used this coupon the maximum times allowed',
      };
    }
  }

  // Check entity type applicability
  if (!record.applicable_entity_types.includes(input.entityType)) {
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: 'Coupon is not applicable to this item',
    };
  }

  // Check entity ID restrictions (if specific entities are listed)
  if (record.applicable_entity_ids && !record.applicable_entity_ids.includes(input.entityId)) {
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: 'Coupon is not applicable to this specific item',
    };
  }

  // Check minimum order amount
  if (record.min_order_amount_minor && input.orderAmountMinor < record.min_order_amount_minor) {
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: `Minimum order amount is ₹${(record.min_order_amount_minor / 100).toFixed(2)}`,
    };
  }

  // Check source applicability (LMS only)
  if (!record.applicable_sources.includes(LMS_SOURCE)) {
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: 'Coupon is not valid for the LMS portal',
    };
  }

  // Calculate discount amount
  let discountAmountMinor: number;

  if (record.discount_type === 'percentage') {
    discountAmountMinor = Math.round(
      (input.orderAmountMinor * record.discount_value) / 100,
    );
  } else {
    // Fixed discount
    discountAmountMinor = record.discount_value;
  }

  // Discount cannot exceed order total
  discountAmountMinor = Math.min(discountAmountMinor, input.orderAmountMinor);

  return {
    valid: true,
    coupon: record,
    discountAmountMinor,
  };
}

// ─── Usage Tracking ─────────────────────────────────────────────────────────────

/**
 * Record an LMS coupon usage after a successful order.
 * Called as part of the order completion flow.
 */
export async function recordLmsCouponUsage(params: {
  couponId: string;
  orderId: string;
  purchaserUserId?: string;
  purchaserEmail: string;
  discountAmountMinor: number;
}): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('coupon_usages')
    .insert({
      coupon_id: params.couponId,
      order_id: params.orderId,
      purchaser_user_id: params.purchaserUserId ?? null,
      purchaser_email: params.purchaserEmail,
      discount_amount_minor: params.discountAmountMinor,
    });

  if (error) {
    console.error('[lms/coupons] Failed to record coupon usage:', error);
    // Don't throw — the order is already valid, coupon usage tracking is secondary
  }
}
