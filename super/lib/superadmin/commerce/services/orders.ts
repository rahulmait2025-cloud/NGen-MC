import 'server-only';

/**
 * SuperAdmin Orders Service.
 *
 * Admin-only order management: reads, filters, cancels, and reports on orders.
 * NO checkout/payment creation — SuperAdmin does not create orders or process payments.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { SellableEntityType, PurchaseSource } from '@/types/database';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type AdminOrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export interface AdminOrderRecord {
  id: string;
  entity_type: SellableEntityType;
  entity_id: string;
  purchaser_user_id: string | null;
  purchaser_email: string;
  purchaser_name: string | null;
  source: PurchaseSource;
  base_amount_minor: number;
  discount_amount_minor: number;
  total_amount_minor: number;
  currency: string;
  coupon_code: string | null;
  status: AdminOrderStatus;
  gateway_name: string;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  gateway_signature: string | null;
  metadata: Record<string, unknown>;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
}

export interface AdminOrderFilter {
  status?: AdminOrderStatus;
  source?: PurchaseSource;
  entityType?: SellableEntityType;
  purchaserEmail?: string;
  purchaserUserId?: string;
  couponCode?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AdminOrderWithItems extends AdminOrderRecord {
  items: Array<{
    id: string;
    entity_type: SellableEntityType;
    entity_id: string;
    unit_amount_minor: number;
    discount_amount_minor: number;
    total_amount_minor: number;
    currency: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
}

export interface AdminOrderStats {
  totalOrders: number;
  ordersByStatus: Record<AdminOrderStatus, number>;
  ordersBySource: Record<PurchaseSource, number>;
  ordersByEntityType: Record<SellableEntityType, number>;
  totalRevenueMinor: number;
  totalDiscountMinor: number;
  netRevenueMinor: number;
}

export interface AdminRevenueData {
  totalRevenueMinor: number;
  netRevenueMinor: number;
  totalDiscountMinor: number;
  breakdownBySource: Array<{ source: PurchaseSource; revenueMinor: number; orderCount: number }>;
  breakdownByEntityType: Array<{ entityType: SellableEntityType; revenueMinor: number; orderCount: number }>;
  trendData: Array<{ date: string; revenueMinor: number; orderCount: number }>;
}

// ─── Query Functions ────────────────────────────────────────────────────────────

/** Columns needed for order list view */
const ORDER_LIST_COLUMNS = `id,entity_type,entity_id,purchaser_user_id,purchaser_email,purchaser_name,source,base_amount_minor,discount_amount_minor,total_amount_minor,currency,coupon_code,status,gateway_name,gateway_order_id,gateway_payment_id,metadata,idempotency_key,created_at,updated_at,paid_at,cancelled_at,refunded_at`;

/**
 * Get all admin orders with optional filtering and pagination.
 */
export async function getAllAdminOrders(params: {
  filter?: AdminOrderFilter;
  limit?: number;
  offset?: number;
}): Promise<{ orders: AdminOrderRecord[]; totalCount: number }> {
  const admin = createAdminClient();

  let query = admin
    .from('orders')
    .select(ORDER_LIST_COLUMNS, { count: 'exact' });

  // Apply filters
  const f = params.filter;
  if (f?.status) {
    query = query.eq('status', f.status);
  }
  if (f?.source) {
    query = query.eq('source', f.source);
  }
  if (f?.entityType) {
    query = query.eq('entity_type', f.entityType);
  }
  if (f?.purchaserEmail) {
    query = query.ilike('purchaser_email', `%${f.purchaserEmail}%`);
  }
  if (f?.purchaserUserId) {
    query = query.eq('purchaser_user_id', f.purchaserUserId);
  }
  if (f?.couponCode) {
    query = query.eq('coupon_code', f.couponCode.toUpperCase());
  }
  if (f?.dateFrom) {
    query = query.gte('created_at', f.dateFrom);
  }
  if (f?.dateTo) {
    query = query.lte('created_at', f.dateTo);
  }

  // Pagination
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch admin orders: ${error.message}`);
  }

  return {
    orders: (data ?? []) as AdminOrderRecord[],
    totalCount: count ?? 0,
  };
}

/** Columns needed for order detail view (includes relation) */
const ORDER_DETAIL_COLUMNS = `id,entity_type,entity_id,purchaser_user_id,purchaser_email,purchaser_name,source,base_amount_minor,discount_amount_minor,total_amount_minor,currency,coupon_code,status,gateway_name,gateway_order_id,gateway_payment_id,gateway_signature,metadata,idempotency_key,created_at,updated_at,paid_at,cancelled_at,refunded_at,cancelled_by,cancel_reason`;
const ORDER_ITEMS_COLUMNS = `id,entity_type,entity_id,unit_amount_minor,discount_amount_minor,total_amount_minor,currency,metadata,created_at`;

/**
 * Get a single admin order by ID with its items.
 */
export async function getAdminOrderById(orderId: string): Promise<AdminOrderWithItems | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('orders')
    .select(`
      ${ORDER_DETAIL_COLUMNS},
      order_items (${ORDER_ITEMS_COLUMNS})
    `)
    .eq('id', orderId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as AdminOrderWithItems;
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────────

/** Columns needed for order mutation (before + after) */
const ORDER_MUTATION_COLUMNS = `id,status,entity_type,entity_id,purchaser_user_id,purchaser_email,purchaser_name,source,base_amount_minor,discount_amount_minor,total_amount_minor,currency,coupon_code,gateway_name,gateway_order_id,gateway_payment_id,gateway_signature,metadata,idempotency_key,created_at,updated_at,paid_at,cancelled_at,refunded_at,cancelled_by,cancel_reason`;

/**
 * Cancel a pending or paid admin order.
 */
export async function cancelAdminOrder(
  orderId: string,
  cancelledBy?: string,
  reason?: string,
): Promise<AdminOrderRecord> {
  const admin = createAdminClient();

  const { data: order, error: fetchError } = await admin
    .from('orders')
    .select(ORDER_MUTATION_COLUMNS)
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const currentOrder = order as AdminOrderRecord;

  if (currentOrder.status !== 'pending' && currentOrder.status !== 'paid') {
    throw new Error(`Cannot cancel order in '${currentOrder.status}' state`);
  }

  const now = new Date().toISOString();
  const newStatus = currentOrder.status === 'paid' ? 'refunded' : 'cancelled';

  const updateData: Record<string, unknown> = {
    status: newStatus,
    cancelled_at: now,
    cancelled_by: cancelledBy ?? null,
    cancel_reason: reason ?? null,
  };

  if (newStatus === 'refunded') {
    updateData.refunded_at = now;
  }

  const { data: updatedOrder, error: updateError } = await admin
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select(ORDER_MUTATION_COLUMNS)
    .single();

  if (updateError || !updatedOrder) {
    throw new Error(`Failed to cancel order: ${updateError?.message}`);
  }

  return updatedOrder as AdminOrderRecord;
}

/**
 * Revoke access for all entitlements granted by this order.
 */
export async function revokeOrderAccess(
  orderId: string,
  revokedBy: string,
  reason: string = 'Revoked by SuperAdmin'
): Promise<{ success: boolean; revokedCount: number }> {
  const admin = createAdminClient();

  // 1. Get order details to find student and course IDs
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('purchaser_user_id, metadata, order_items(entity_type, entity_id)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  if (!order.purchaser_user_id) {
    throw new Error('This order is not linked to a user profile.');
  }

  // Lookup the actual student record to resolve their student_id (uuid from students table)
  const { data: student, error: studentError } = await admin
    .from('students')
    .select('id')
    .eq('user_id', order.purchaser_user_id)
    .maybeSingle();

  if (studentError || !student) {
    throw new Error(`Student record not found for user ID: ${order.purchaser_user_id}`);
  }
  const studentId = student.id;

  // 2. Identify all entities by type
  const items = (order.order_items || []) as Array<{ entity_type: string; entity_id: string }>;
  const masterCourseIds: string[] = [];
  const variantIds: string[] = [];
  const bundleIds: string[] = [];
  const bootcampIds: string[] = [];

  for (const item of items) {
    if (item.entity_type === 'master_course') {
      masterCourseIds.push(item.entity_id);
    } else if (item.entity_type === 'course_variant') {
      variantIds.push(item.entity_id);
    } else if (item.entity_type === 'course_bundle') {
      bundleIds.push(item.entity_id);
    } else if (item.entity_type === 'job_ready_bootcamp') {
      bootcampIds.push(item.entity_id);
    }
  }

  // Fallback to metadata for compatibility
  const metadata = (order.metadata || {}) as Record<string, unknown>;
  if (metadata.course_id && !masterCourseIds.includes(metadata.course_id as string)) {
    masterCourseIds.push(metadata.course_id as string);
  }
  if (metadata.variant_id && !variantIds.includes(metadata.variant_id as string)) {
    variantIds.push(metadata.variant_id as string);
  }

  // Resolve variants to parent master courses for student_entitlements revocation (just in case)
  if (variantIds.length > 0) {
    const { data: variants } = await admin
      .from('course_variants')
      .select('master_course_id')
      .in('id', variantIds);
    
    variants?.forEach(v => {
      if (v.master_course_id && !masterCourseIds.includes(v.master_course_id)) {
        masterCourseIds.push(v.master_course_id);
      }
    });
  }

  let totalRevoked = 0;
  const nowIso = new Date().toISOString();

  // 3. Perform updates across all entitlement/enrollment tables
  
  // 3.1. Revoke active student_entitlements (Master Courses)
  if (masterCourseIds.length > 0) {
    const { data: revokedEnt, error: revokeEntError } = await admin
      .from('student_entitlements')
      .update({
        status: 'revoked',
        revoked_at: nowIso,
        revoked_by: revokedBy,
        revoke_reason: reason
      })
      .eq('student_id', studentId)
      .in('master_course_id', masterCourseIds)
      .eq('status', 'active')
      .select('id');

    if (revokeEntError) {
      throw new Error(`Failed to revoke master course entitlements: ${revokeEntError.message}`);
    }
    totalRevoked += revokedEnt?.length || 0;
  }

  // 3.2. Revoke active variant content entitlements
  if (variantIds.length > 0) {
    const { data: revokedVar, error: revokeVarError } = await admin
      .from('student_content_entitlements')
      .update({
        status: 'revoked',
        revoked_at: nowIso,
        revoked_by: revokedBy,
        revoke_reason: reason
      })
      .eq('student_id', studentId)
      .eq('assigned_entity_type', 'variant')
      .in('assigned_entity_id', variantIds)
      .eq('status', 'active')
      .select('id');

    if (revokeVarError) {
      throw new Error(`Failed to revoke variant entitlements: ${revokeVarError.message}`);
    }
    totalRevoked += revokedVar?.length || 0;
  }

  // 3.3. Revoke active bundle content entitlements
  if (bundleIds.length > 0) {
    const { data: revokedBun, error: revokeBunError } = await admin
      .from('student_content_entitlements')
      .update({
        status: 'revoked',
        revoked_at: nowIso,
        revoked_by: revokedBy,
        revoke_reason: reason
      })
      .eq('student_id', studentId)
      .eq('assigned_entity_type', 'bundle')
      .in('assigned_entity_id', bundleIds)
      .eq('status', 'active')
      .select('id');

    if (revokeBunError) {
      throw new Error(`Failed to revoke bundle entitlements: ${revokeBunError.message}`);
    }
    totalRevoked += revokedBun?.length || 0;
  }

  // 3.4. Revoke active job_ready_bootcamp_enrollments
  if (bootcampIds.length > 0) {
    const { data: revokedBoot, error: revokeBootError } = await admin
      .from('job_ready_bootcamp_enrollments')
      .update({
        status: 'revoked',
        updated_at: nowIso
      })
      .eq('student_id', studentId)
      .in('bootcamp_id', bootcampIds)
      .eq('status', 'active')
      .select('id');

    if (revokeBootError) {
      throw new Error(`Failed to revoke bootcamp enrollments: ${revokeBootError.message}`);
    }
    totalRevoked += revokedBoot?.length || 0;
  }

  // 3.5. Mark order as revoked in metadata
  const currentMetadata = (order.metadata || {}) as Record<string, unknown>;
  const updatedMetadata = {
    ...currentMetadata,
    revoked: true,
    revoked_at: nowIso,
    revoked_by: revokedBy,
    revoke_reason: reason
  };

  const { error: orderUpdateError } = await admin
    .from('orders')
    .update({
      metadata: updatedMetadata
    })
    .eq('id', orderId);

  if (orderUpdateError) {
    throw new Error(`Failed to update order metadata: ${orderUpdateError.message}`);
  }

  return {
    success: true,
    revokedCount: totalRevoked
  };
}

// ─── Analytics ──────────────────────────────────────────────────────────────────

/** Columns needed for order stats aggregation */
const ORDER_STATS_COLUMNS = `id,status,source,entity_type,total_amount_minor,discount_amount_minor,created_at`;

/**
 * Get aggregate order statistics for the admin dashboard.
 */
export async function getAdminOrderStats(filter?: AdminOrderFilter): Promise<AdminOrderStats> {
  const admin = createAdminClient();

  let baseQuery = admin.from('orders').select(ORDER_STATS_COLUMNS);

  if (filter?.status) {
    baseQuery = baseQuery.eq('status', filter.status);
  }
  if (filter?.source) {
    baseQuery = baseQuery.eq('source', filter.source);
  }
  if (filter?.entityType) {
    baseQuery = baseQuery.eq('entity_type', filter.entityType);
  }
  if (filter?.dateFrom) {
    baseQuery = baseQuery.gte('created_at', filter.dateFrom);
  }
  if (filter?.dateTo) {
    baseQuery = baseQuery.lte('created_at', filter.dateTo);
  }

  const { data: orders, error } = await baseQuery;

  if (error) {
    throw new Error(`Failed to fetch order stats: ${error.message}`);
  }

  const orderList = orders ?? [];

  const ordersByStatus: Record<AdminOrderStatus, number> = {
    pending: 0,
    paid: 0,
    failed: 0,
    cancelled: 0,
    refunded: 0,
  };
  const ordersBySource: Record<PurchaseSource, number> = {
    lms: 0,
    college_admin: 0,
  };
  const ordersByEntityType: Record<SellableEntityType, number> = {
    course_variant: 0,
    course_bundle: 0,
    master_course: 0,
    paid_mentorship_booking: 0,
    note_collection: 0,
  };

  let totalRevenueMinor = 0;
  let totalDiscountMinor = 0;

  for (const order of orderList) {
    ordersByStatus[order.status as AdminOrderStatus] = (ordersByStatus[order.status as AdminOrderStatus] ?? 0) + 1;
    ordersBySource[order.source as PurchaseSource] = (ordersBySource[order.source as PurchaseSource] ?? 0) + 1;
    ordersByEntityType[order.entity_type as SellableEntityType] = (ordersByEntityType[order.entity_type as SellableEntityType] ?? 0) + 1;

    if (order.status === 'paid') {
      totalRevenueMinor += order.total_amount_minor;
      totalDiscountMinor += order.discount_amount_minor;
    }
  }

  return {
    totalOrders: orderList.length,
    ordersByStatus,
    ordersBySource,
    ordersByEntityType,
    totalRevenueMinor,
    totalDiscountMinor,
    netRevenueMinor: totalRevenueMinor,
  };
}

/**
 * Get revenue analytics data with breakdowns and trend.
 * Optimized: only fetches needed columns and filters by status='paid' to reduce data.
 */
export async function getAdminRevenueData(params: {
  period?: '7d' | '30d' | '90d' | 'all';
}): Promise<AdminRevenueData> {
  const admin = createAdminClient();

  const columns = `source,entity_type,total_amount_minor,discount_amount_minor,created_at`;
  let query = admin.from('orders').select(columns).eq('status', 'paid');

  if (params.period && params.period !== 'all') {
    const now = new Date();
    let days = 7;
    if (params.period === '30d') days = 30;
    if (params.period === '90d') days = 90;
    const dateFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', dateFrom);
  }

  const { data: orders, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch revenue data: ${error.message}`);
  }

  const orderList = orders ?? [];

  let totalRevenueMinor = 0;
  let totalDiscountMinor = 0;

  const sourceMap = new Map<string, { revenueMinor: number; orderCount: number }>();
  const entityTypeMap = new Map<string, { revenueMinor: number; orderCount: number }>();
  const trendMap = new Map<string, { revenueMinor: number; orderCount: number }>();

  for (const order of orderList) {
    totalRevenueMinor += order.total_amount_minor;
    totalDiscountMinor += order.discount_amount_minor;

    const sourceEntry = sourceMap.get(order.source) ?? { revenueMinor: 0, orderCount: 0 };
    sourceEntry.revenueMinor += order.total_amount_minor;
    sourceEntry.orderCount += 1;
    sourceMap.set(order.source, sourceEntry);

    const etEntry = entityTypeMap.get(order.entity_type) ?? { revenueMinor: 0, orderCount: 0 };
    etEntry.revenueMinor += order.total_amount_minor;
    etEntry.orderCount += 1;
    entityTypeMap.set(order.entity_type, etEntry);

    const dateKey = order.created_at.substring(0, 10);
    const trendEntry = trendMap.get(dateKey) ?? { revenueMinor: 0, orderCount: 0 };
    trendEntry.revenueMinor += order.total_amount_minor;
    trendEntry.orderCount += 1;
    trendMap.set(dateKey, trendEntry);
  }

  const breakdownBySource = Array.from(sourceMap.entries()).map(([source, data]) => ({
    source: source as PurchaseSource,
    revenueMinor: data.revenueMinor,
    orderCount: data.orderCount,
  }));

  const breakdownByEntityType = Array.from(entityTypeMap.entries()).map(([entityType, data]) => ({
    entityType: entityType as SellableEntityType,
    revenueMinor: data.revenueMinor,
    orderCount: data.orderCount,
  }));

  const trendData = Array.from(trendMap.entries())
    .map(([date, data]) => ({ date, revenueMinor: data.revenueMinor, orderCount: data.orderCount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalRevenueMinor,
    netRevenueMinor: totalRevenueMinor,
    totalDiscountMinor,
    breakdownBySource,
    breakdownByEntityType,
    trendData,
  };
}
