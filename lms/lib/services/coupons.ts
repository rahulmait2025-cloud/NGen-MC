import 'server-only';

/**
 * Coupon Service for LMS.
 *
 * Server-side coupon validation and management.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { SellableEntityType, PurchaseSource } from '@/types/payments';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface CouponValidationResult {
  valid: boolean;
  coupon?: CouponRecord;
  discountAmountMinor: number;
  errorMessage?: string;
}

export interface CouponRecord {
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
  applicable_entity_types: SellableEntityType[];
  applicable_entity_ids: string[] | null;
  min_order_amount_minor: number | null;
  applicable_sources: PurchaseSource[];
  metadata?: Record<string, unknown>;
  coupon_origin?: 'superadmin' | 'campus_ambassador' | null;
  owner_user_id?: string | null;
}

export interface ValidateCouponInput {
  code: string;
  orderAmountMinor: number;
  entityType: SellableEntityType;
  entityId: string;
  source: PurchaseSource;
  purchaserUserId?: string;
  purchaserEmail?: string;
}

export interface ValidateCouponForCheckoutInput {
  couponCode: string;
  studentId?: string;
  purchaserUserId?: string;
  entityType: SellableEntityType;
  entityId: string;
  pricePlanId?: string | null;
  originalAmountMinor: number;
  currency: string;
  collegeId?: string | null;
  purchaserEmail?: string;
}

export interface CouponCheckoutValidation {
  valid: boolean;
  couponId?: string;
  couponCode?: string;
  discountMinor: number;
  finalAmountMinor: number;
  message?: string;
  breakdown: {
    originalAmountMinor: number;
    discountMinor: number;
    finalAmountMinor: number;
  };
}

const INVALID_COUPON_MESSAGE = 'Invalid coupon code';
const NOT_APPLICABLE_COUPON_MESSAGE = 'This coupon is not applicable to this course.';
const EXPIRED_COUPON_MESSAGE = 'This coupon has expired.';
const USAGE_LIMIT_COUPON_MESSAGE = 'This coupon has reached its usage limit.';
const SELF_REFERRAL_COUPON_MESSAGE = 'You cannot use your own ambassador coupon.';

// ─── Helpers ────────────────────────────────────────────────────────────────────

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

function getMaxDiscountCapMinor(metadata: Record<string, unknown> | undefined): number | null {
  const raw = metadata?.max_discount_minor;
  if (typeof raw === 'number' && raw > 0) return raw;
  if (typeof raw === 'string') {
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

async function isCouponApplicableToEntity(
  record: CouponRecord,
  entityType: SellableEntityType,
  entityId: string,
): Promise<boolean> {
  const types = record.applicable_entity_types;

  if (types.includes(entityType)) {
    if (!record.applicable_entity_ids) return true;
    return record.applicable_entity_ids.includes(entityId);
  }

  // Variant purchase: allow master_course-scoped coupons when variant belongs to that course.
  if (entityType === 'course_variant' && types.includes('master_course')) {
    const admin = createAdminClient();
    const { data: variant } = await admin
      .from('course_variants')
      .select('master_course_id')
      .eq('id', entityId)
      .maybeSingle();

    if (!variant) return false;
    if (!record.applicable_entity_ids) return true;
    return record.applicable_entity_ids.includes(
      (variant as { master_course_id: string }).master_course_id,
    );
  }

  return false;
}

// ─── Validation ─────────────────────────────────────────────────────────────────

/**
 * Validate a coupon against an order.
 */
export async function validateCoupon(
  input: ValidateCouponInput,
): Promise<CouponValidationResult> {
  const admin = createAdminClient();
  const normalizedCode = normalizeCouponCode(input.code);

  if (!normalizedCode) {
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: INVALID_COUPON_MESSAGE,
    };
  }

  const { data: coupon, error: fetchError } = await admin
    .from('coupons')
    .select('id, code, description, discount_type, discount_value, max_uses, uses_count, max_uses_per_user, valid_from, valid_until, status, applicable_entity_types, applicable_entity_ids, min_order_amount_minor, applicable_sources, metadata, coupon_origin, owner_user_id')
    // Case-insensitive: CA approve RPC historically appended lowercase md5 suffixes.
    .ilike('code', normalizedCode)
    .maybeSingle();

  if (fetchError || !coupon) {
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: INVALID_COUPON_MESSAGE,
    };
  }

  const record = coupon as CouponRecord;

  if (
    record.coupon_origin === 'campus_ambassador' &&
    input.purchaserUserId &&
    record.owner_user_id &&
    record.owner_user_id === input.purchaserUserId
  ) {
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: SELF_REFERRAL_COUPON_MESSAGE,
    };
  }

  if (record.status !== 'active') {
    const message =
      record.status === 'expired'
        ? EXPIRED_COUPON_MESSAGE
        : record.status === 'exhausted'
          ? USAGE_LIMIT_COUPON_MESSAGE
          : INVALID_COUPON_MESSAGE;
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: message,
    };
  }

  const now = new Date();
  const validFrom = new Date(record.valid_from);
  const validUntil = record.valid_until ? new Date(record.valid_until) : null;

  if (now < validFrom || (validUntil && now > validUntil)) {
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: EXPIRED_COUPON_MESSAGE,
    };
  }

  if (record.max_uses !== null && record.uses_count >= record.max_uses) {
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: USAGE_LIMIT_COUPON_MESSAGE,
    };
  }

  if (input.purchaserUserId && record.max_uses_per_user) {
    // Count course usages (coupon_usages)
    const { count: courseUsageCount } = await admin
      .from('coupon_usages')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', record.id)
      .eq('purchaser_user_id', input.purchaserUserId);

    // Count note usages (note_coupon_usages)
    const { count: noteUsageCount } = await admin
      .from('note_coupon_usages')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', record.id)
      .eq('purchaser_user_id', input.purchaserUserId);

    const totalUserUsage = (courseUsageCount ?? 0) + (noteUsageCount ?? 0);

    if (totalUserUsage >= record.max_uses_per_user) {
      return {
        valid: false,
        discountAmountMinor: 0,
        errorMessage: USAGE_LIMIT_COUPON_MESSAGE,
      };
    }
  }

  const entityApplicable = await isCouponApplicableToEntity(
    record,
    input.entityType,
    input.entityId,
  );

  if (!entityApplicable) {
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: NOT_APPLICABLE_COUPON_MESSAGE,
    };
  }

  if (record.min_order_amount_minor && input.orderAmountMinor < record.min_order_amount_minor) {
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: `Minimum order amount is ₹${(record.min_order_amount_minor / 100).toFixed(2)}`,
    };
  }

  if (!record.applicable_sources.includes(input.source)) {
    return {
      valid: false,
      discountAmountMinor: 0,
      errorMessage: INVALID_COUPON_MESSAGE,
    };
  }

  let discountAmountMinor: number;
  if (record.discount_type === 'percentage') {
    discountAmountMinor = Math.floor(
      (input.orderAmountMinor * record.discount_value) / 100,
    );
  } else {
    discountAmountMinor = record.discount_value;
  }

  const maxDiscountCap = getMaxDiscountCapMinor(record.metadata);
  if (maxDiscountCap !== null) {
    discountAmountMinor = Math.min(discountAmountMinor, maxDiscountCap);
  }

  discountAmountMinor = Math.min(discountAmountMinor, input.orderAmountMinor);

  return {
    valid: true,
    coupon: record,
    discountAmountMinor,
  };
}

/**
 * Checkout-oriented coupon validation with amount breakdown.
 */
export async function validateCouponForCheckout(
  input: ValidateCouponForCheckoutInput,
): Promise<CouponCheckoutValidation> {
  const originalAmountMinor = input.originalAmountMinor;
  const breakdown = {
    originalAmountMinor,
    discountMinor: 0,
    finalAmountMinor: originalAmountMinor,
  };

  void input.currency;
  void input.collegeId;
  void input.pricePlanId;

  const normalizedCode = normalizeCouponCode(input.couponCode);
  if (!normalizedCode) {
    return {
      valid: false,
      discountMinor: 0,
      finalAmountMinor: originalAmountMinor,
      message: INVALID_COUPON_MESSAGE,
      breakdown,
    };
  }

  const result = await validateCoupon({
    code: normalizedCode,
    orderAmountMinor: originalAmountMinor,
    entityType: input.entityType,
    entityId: input.entityId,
    source: 'lms',
    purchaserUserId: input.purchaserUserId ?? input.studentId,
    purchaserEmail: input.purchaserEmail,
  });

  if (!result.valid || !result.coupon) {
    return {
      valid: false,
      discountMinor: 0,
      finalAmountMinor: originalAmountMinor,
      message: result.errorMessage ?? INVALID_COUPON_MESSAGE,
      breakdown,
    };
  }

  const discountMinor = result.discountAmountMinor;
  const finalAmountMinor = Math.max(originalAmountMinor - discountMinor, 0);

  return {
    valid: true,
    couponId: result.coupon.id,
    couponCode: result.coupon.code,
    discountMinor,
    finalAmountMinor,
    breakdown: {
      originalAmountMinor,
      discountMinor,
      finalAmountMinor,
    },
  };
}

/**
 * Record a coupon usage after a successful order.
 */
export async function recordCouponUsage(params: {
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
    console.error('[coupons] Failed to record coupon usage:', error);
  }
}

/**
 * Record a note coupon usage after a successful note purchase or zero-pay unlock.
 * Inserts into note_coupon_usages (separate from coupon_usages to avoid FK conflict).
 * The increment_note_coupon_usage trigger auto-increments coupons.uses_count.
 */
export async function recordNoteCouponUsage(params: {
  couponId: string;
  studentId: string;
  noteCollectionId: string;
  notePaymentOrderId?: string | null;
  studentNoteEntitlementId?: string | null;
  purchaserUserId?: string;
  purchaserEmail?: string;
  couponCode: string;
  discountAmountMinor: number;
  originalAmountMinor: number;
  finalAmountMinor: number;
  couponOrigin?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('note_coupon_usages')
    .insert({
      coupon_id: params.couponId,
      student_id: params.studentId,
      note_collection_id: params.noteCollectionId,
      note_payment_order_id: params.notePaymentOrderId ?? null,
      student_note_entitlement_id: params.studentNoteEntitlementId ?? null,
      purchaser_user_id: params.purchaserUserId ?? null,
      purchaser_email: params.purchaserEmail ?? '',
      coupon_code: params.couponCode,
      discount_amount_minor: params.discountAmountMinor,
      original_amount_minor: params.originalAmountMinor,
      final_amount_minor: params.finalAmountMinor,
      coupon_origin: params.couponOrigin ?? null,
      metadata: params.metadata ?? {},
    });

  if (error) {
    // Unique constraint violation = idempotent duplicate — safe to ignore
    if (error.code === '23505') {
      return;
    }
    console.error('[coupons] Failed to record note coupon usage:', error);
  }
}
