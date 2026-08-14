import 'server-only';

/**
 * SuperAdmin Coupons Service.
 *
 * Admin-only coupon management: full CRUD operations, status management, and usage analytics.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { SellableEntityType, PurchaseSource } from '@/types/database';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type AdminCouponStatus = 'active' | 'expired' | 'exhausted' | 'disabled';
export type AdminCouponDiscountType = 'fixed' | 'percentage';

export interface AdminCouponRecord {
  id: string;
  code: string;
  description: string | null;
  discount_type: AdminCouponDiscountType;
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  max_uses_per_user: number;
  valid_from: string;
  valid_until: string | null;
  status: AdminCouponStatus;
  applicable_entity_types: SellableEntityType[];
  applicable_entity_ids: string[] | null;
  min_order_amount_minor: number | null;
  applicable_sources: PurchaseSource[];
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  disabled_at: string | null;
  disabled_reason: string | null;
}

export interface AdminCreateCouponInput {
  code: string;
  description?: string;
  discountType: AdminCouponDiscountType;
  discountValue: number;
  maxUses?: number | null;
  maxUsesPerUser: number;
  validFrom: string;
  validUntil?: string | null;
  applicableEntityTypes: SellableEntityType[];
  applicableEntityIds?: string[] | null;
  minOrderAmountMinor?: number | null;
  applicableSources: PurchaseSource[];
  metadata?: Record<string, unknown>;
  createdBy?: string;
}

export interface AdminUpdateCouponInput {
  description?: string;
  discountType?: AdminCouponDiscountType;
  discountValue?: number;
  maxUses?: number | null;
  maxUsesPerUser?: number;
  validFrom?: string;
  validUntil?: string | null;
  applicableEntityTypes?: SellableEntityType[];
  applicableEntityIds?: string[] | null;
  minOrderAmountMinor?: number | null;
  applicableSources?: PurchaseSource[];
  metadata?: Record<string, unknown>;
}

export interface AdminCouponUsageStats {
  couponId: string;
  couponCode: string;
  totalUses: number;
  totalDiscountMinor: number;
  uniqueUsers: number;
  recentUsages: Array<{
    id: string;
    orderId: string;
    purchaserEmail: string;
    discountAmountMinor: number;
    createdAt: string;
  }>;
}

// ─── Query Functions ────────────────────────────────────────────────────────────

/** Columns needed for coupon list view */
const COUPON_LIST_COLUMNS = `id,code,description,discount_type,discount_value,max_uses,uses_count,max_uses_per_user,valid_from,valid_until,status,applicable_entity_types,applicable_entity_ids,min_order_amount_minor,applicable_sources,metadata,created_by,created_at,updated_at,disabled_at,disabled_reason`;

/**
 * Get all admin coupons with optional status filter and pagination.
 */
export async function getAllAdminCoupons(params: {
  status?: AdminCouponStatus;
  limit?: number;
  offset?: number;
}): Promise<{ coupons: AdminCouponRecord[]; totalCount: number }> {
  const admin = createAdminClient();

  let query = admin
    .from('coupons')
    .select(COUPON_LIST_COLUMNS, { count: 'exact' });

  if (params.status) {
    query = query.eq('status', params.status);
  }

  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch admin coupons: ${error.message}`);
  }

  return {
    coupons: (data ?? []) as AdminCouponRecord[],
    totalCount: count ?? 0,
  };
}

// ─── CRUD ───────────────────────────────────────────────────────────────────────

/**
 * Create a new admin coupon.
 */
export async function createAdminCoupon(
  input: AdminCreateCouponInput,
): Promise<AdminCouponRecord> {
  const admin = createAdminClient();

  // Normalize code to uppercase
  const code = input.code.toUpperCase();

  // Check for duplicate code
  const { data: existing } = await admin
    .from('coupons')
    .select('id')
    .eq('code', code)
    .single();

  if (existing) {
    throw new Error(`A coupon with code '${code}' already exists`);
  }

  const { data, error } = await admin
    .from('coupons')
    .insert({
      code,
      description: input.description ?? null,
      discount_type: input.discountType,
      discount_value: input.discountValue,
      max_uses: input.maxUses ?? null,
      uses_count: 0,
      max_uses_per_user: input.maxUsesPerUser,
      valid_from: input.validFrom,
      valid_until: input.validUntil ?? null,
      status: 'active',
      applicable_entity_types: input.applicableEntityTypes,
      applicable_entity_ids: input.applicableEntityIds ?? null,
      min_order_amount_minor: input.minOrderAmountMinor ?? null,
      applicable_sources: input.applicableSources,
      metadata: input.metadata ?? {},
      created_by: input.createdBy ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create coupon: ${error?.message ?? 'No data returned'}`);
  }

  return data as AdminCouponRecord;
}

/** Columns needed for coupon mutation result */
const COUPON_MUTATION_COLUMNS = `id,code,description,discount_type,discount_value,max_uses,uses_count,max_uses_per_user,valid_from,valid_until,status,applicable_entity_types,applicable_entity_ids,min_order_amount_minor,applicable_sources,metadata,created_by,created_at,updated_at,disabled_at,disabled_reason`;

/**
 * Update an existing admin coupon.
 */
export async function updateAdminCoupon(
  couponId: string,
  input: AdminUpdateCouponInput,
): Promise<AdminCouponRecord> {
  const admin = createAdminClient();

  // Verify coupon exists
  const { data: existingCoupon } = await admin
    .from('coupons')
    .select('id')
    .eq('id', couponId)
    .single();

  if (!existingCoupon) {
    throw new Error(`Coupon not found: ${couponId}`);
  }

  const updateData: Record<string, unknown> = {};

  if (input.description !== undefined) updateData.description = input.description;
  if (input.discountType !== undefined) updateData.discount_type = input.discountType;
  if (input.discountValue !== undefined) updateData.discount_value = input.discountValue;
  if (input.maxUses !== undefined) updateData.max_uses = input.maxUses;
  if (input.maxUsesPerUser !== undefined) updateData.max_uses_per_user = input.maxUsesPerUser;
  if (input.validFrom !== undefined) updateData.valid_from = input.validFrom;
  if (input.validUntil !== undefined) updateData.valid_until = input.validUntil;
  if (input.applicableEntityTypes !== undefined) updateData.applicable_entity_types = input.applicableEntityTypes;
  if (input.applicableEntityIds !== undefined) updateData.applicable_entity_ids = input.applicableEntityIds;
  if (input.minOrderAmountMinor !== undefined) updateData.min_order_amount_minor = input.minOrderAmountMinor;
  if (input.applicableSources !== undefined) updateData.applicable_sources = input.applicableSources;
  if (input.metadata !== undefined) updateData.metadata = input.metadata;

  const { data, error } = await admin
    .from('coupons')
    .update(updateData)
    .eq('id', couponId)
    .select(COUPON_MUTATION_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`Failed to update coupon: ${error?.message ?? 'No data returned'}`);
  }

  return data as AdminCouponRecord;
}

/**
 * Toggle an admin coupon between active and disabled status.
 */
export async function toggleAdminCouponStatus(
  couponId: string,
  disabledReason?: string,
): Promise<AdminCouponRecord> {
  const admin = createAdminClient();

  const { data: coupon } = await admin
    .from('coupons')
    .select('id,status')
    .eq('id', couponId)
    .single();

  if (!coupon) {
    throw new Error(`Coupon not found: ${couponId}`);
  }

  const currentCoupon = coupon as { id: string; status: AdminCouponStatus };
  const now = new Date().toISOString();

  let updateData: Record<string, unknown>;

  if (currentCoupon.status === 'active') {
    updateData = {
      status: 'disabled',
      disabled_at: now,
      disabled_reason: disabledReason ?? 'Disabled by admin',
    };
  } else if (currentCoupon.status === 'disabled') {
    updateData = {
      status: 'active',
      disabled_at: null,
      disabled_reason: null,
    };
  } else {
    throw new Error(`Cannot toggle coupon in '${currentCoupon.status}' status`);
  }

  const { data, error } = await admin
    .from('coupons')
    .update(updateData)
    .eq('id', couponId)
    .select(COUPON_MUTATION_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`Failed to toggle coupon status: ${error?.message ?? 'No data returned'}`);
  }

  return data as AdminCouponRecord;
}

// ─── Analytics ──────────────────────────────────────────────────────────────────

/** Columns needed for coupon usage stats */
const COUPON_USAGE_COLUMNS = `id,coupon_id,order_id,purchaser_user_id,purchaser_email,discount_amount_minor,created_at`;

/**
 * Get usage statistics for a specific coupon.
 */
 
async function _getCouponUsageStats(couponId: string): Promise<AdminCouponUsageStats> {
  const admin = createAdminClient();

  // Get coupon details
  const { data: coupon } = await admin
    .from('coupons')
    .select('code')
    .eq('id', couponId)
    .single();

  if (!coupon) {
    throw new Error(`Coupon not found: ${couponId}`);
  }

  const couponRecord = coupon as { code: string };

  // Get all usages
  const { data: usages, error } = await admin
    .from('coupon_usages')
    .select(COUPON_USAGE_COLUMNS)
    .eq('coupon_id', couponId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch coupon usages: ${error.message}`);
  }

  const usageList = (usages ?? []) as Array<{
    id: string;
    coupon_id: string;
    order_id: string;
    purchaser_user_id: string | null;
    purchaser_email: string;
    discount_amount_minor: number;
    created_at: string;
  }>;

  let totalDiscountMinor = 0;
  const uniqueUserIds = new Set<string>();

  for (const usage of usageList) {
    totalDiscountMinor += usage.discount_amount_minor;
    if (usage.purchaser_user_id) {
      uniqueUserIds.add(usage.purchaser_user_id);
    }
  }

  const recentUsages = usageList.slice(0, 10).map((usage) => ({
    id: usage.id,
    orderId: usage.order_id,
    purchaserEmail: usage.purchaser_email,
    discountAmountMinor: usage.discount_amount_minor,
    createdAt: usage.created_at,
  }));

  return {
    couponId,
    couponCode: couponRecord.code,
    totalUses: usageList.length,
    totalDiscountMinor,
    uniqueUsers: uniqueUserIds.size,
    recentUsages,
  };
}
