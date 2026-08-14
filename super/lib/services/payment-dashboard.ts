import 'server-only';

/**
 * Payment Dashboard Service.
 * 
 * Provides read-only data for the SuperAdmin commerce dashboard.
 * Includes both course orders and note collection purchases.
 */

import { cacheLife, cacheTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type { OrderStatus, PurchaseSource } from '@/types/database';

export interface OrderListFilter {
  status?: OrderStatus | 'all';
  source?: PurchaseSource | 'all';
  fromDate?: string;
  toDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface OrderListItem {
  id: string;
  entity_type: string;
  entity_id: string;
  purchaser_email: string;
  purchaser_name: string | null;
  source: PurchaseSource;
  total_amount_minor: number;
  currency: string;
  status: OrderStatus;
  gateway_name: string;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
  // Joined fields
  entity_title?: string;
  master_course_title?: string;
  pillar_title?: string;
}

export interface PaymentDashboardStats {
  totalRevenueMinor: number;
  successfulOrdersCount: number;
  pendingOrdersCount: number;
  failedOrdersCount: number;
  refundedOrdersCount: number;
  totalB2CEntitlements: number;
  currency: string;
}

/**
 * Normalise a note_payment_orders row into OrderListItem shape.
 * Note purchases store amounts in rupees; multiply by 100 for paise convention.
 */
function normaliseNoteOrder(
  row: Record<string, unknown>,
  titleMap: Map<string, string>,
): OrderListItem {
  return {
    id: row.id as string,
    entity_type: 'note_collection',
    entity_id: row.note_collection_id as string,
    purchaser_email: '',
    purchaser_name: null,
    source: 'lms',
    total_amount_minor: (row.amount_minor as number) * 100,
    currency: (row.currency as string) || 'INR',
    status: row.status as OrderStatus,
    gateway_name: 'razorpay',
    gateway_order_id: row.gateway_order_id as string | null,
    gateway_payment_id: row.gateway_payment_id as string | null,
    created_at: row.created_at as string,
    paid_at: row.updated_at as string | null,
    entity_title: titleMap.get(row.note_collection_id as string) || 'Note Collection',
  };
}

/**
 * List B2C/Global payment orders with filters and joined metadata.
 * Includes both course orders and note collection purchases.
 */
export async function listPaymentOrders(filters: OrderListFilter) {
  'use cache';
  cacheLife('minutes');
  cacheTag('payment-orders');
  const admin = createAdminClient();

  // ── Course orders ──────────────────────────────────────────────────────────
  let query = admin
    .from('orders')
    .select(`
      *,
      order_items (
        entity_id,
        entity_type
      )
    `)
    .order('created_at', { ascending: false });

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters.source && filters.source !== 'all') {
    query = query.eq('source', filters.source);
  }

  if (filters.fromDate) {
    query = query.or(`paid_at.gte.${filters.fromDate},and(paid_at.is.null,created_at.gte.${filters.fromDate})`);
  }

  if (filters.toDate) {
    query = query.or(`paid_at.lte.${filters.toDate},and(paid_at.is.null,created_at.lte.${filters.toDate})`);
  }

  if (filters.search) {
    query = query.or(`purchaser_email.ilike.%${filters.search}%,purchaser_name.ilike.%${filters.search}%,id.ilike.%${filters.search}%`);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  // ── Note collection orders ─────────────────────────────────────────────────
  let noteQuery = admin
    .from('note_payment_orders')
    .select('*, note_collections(id, title)')
    .order('created_at', { ascending: false });

  if (filters.status && filters.status !== 'all') {
    noteQuery = noteQuery.eq('status', filters.status);
  }

  if (filters.fromDate) {
    noteQuery = noteQuery.or(`updated_at.gte.${filters.fromDate},and(updated_at.is.null,created_at.gte.${filters.fromDate})`);
  }

  if (filters.toDate) {
    noteQuery = noteQuery.or(`updated_at.lte.${filters.toDate},and(updated_at.is.null,created_at.lte.${filters.toDate})`);
  }

  noteQuery = noteQuery.range(offset, offset + limit - 1);

  const [{ data: orders, error }, { data: noteOrders, error: noteError }] = await Promise.all([
    query,
    noteQuery,
  ]);

  if (error) {
    console.error('[payment-dashboard] listPaymentOrders', error);
    return [];
  }

  if (noteError) {
    console.error('[payment-dashboard] listPaymentOrders note_payment_orders', noteError);
  }

  // ── Enrich course orders ───────────────────────────────────────────────────
  const variantIds: string[] = [];
  const bundleIds: string[] = [];
  const masterCourseIds: string[] = [];
  for (const o of orders ?? []) {
    if (o.entity_type === 'course_variant') {
      variantIds.push(o.entity_id);
    } else if (o.entity_type === 'course_bundle') {
      bundleIds.push(o.entity_id);
    } else if (o.entity_type === 'master_course') {
      masterCourseIds.push(o.entity_id);
    }
  }

  const [variantsRes, bundlesRes, masterCoursesRes] = await Promise.all([
    variantIds.length > 0 
      ? admin.from('course_variants').select('id, title, master_courses(id, title, master_course_pillars(id, title))').in('id', variantIds)
      : Promise.resolve({ data: [] }),
    bundleIds.length > 0
      ? admin.from('course_bundles').select('id, title').in('id', bundleIds)
      : Promise.resolve({ data: [] }),
    masterCourseIds.length > 0
      ? admin.from('master_courses').select('id, title, master_course_pillars(id, title)').in('id', masterCourseIds)
      : Promise.resolve({ data: [] })
  ]);

  const variantMap = new Map((variantsRes.data || []).map((v: { id: string }) => [v.id, v]));
  const bundleMap = new Map((bundlesRes.data || []).map((b: { id: string }) => [b.id, b]));
  const masterCourseMap = new Map((masterCoursesRes.data || []).map((m: { id: string }) => [m.id, m]));

  const enrichedCourseOrders = (orders ?? []).map(order => {
    let entityTitle = 'Unknown';
    let masterCourseTitle = '-';
    let pillarTitle = '-';

    if (order.entity_type === 'course_variant') {
      const v = variantMap.get(order.entity_id) as Record<string, unknown> | undefined;
      if (v) {
        entityTitle = (v.title as string) || 'Unknown';
        
        const mc = v.master_courses as Record<string, unknown> | undefined;
        if (mc) {
          masterCourseTitle = (mc.title as string) || '-';
          
          const p = mc.master_course_pillars as Record<string, unknown> | undefined;
          if (p) {
            pillarTitle = (p.title as string) || '-';
          }
        }
      }
    } else if (order.entity_type === 'course_bundle') {
      const b = bundleMap.get(order.entity_id) as Record<string, unknown> | undefined;
      if (b) {
        entityTitle = (b.title as string) || 'Unknown';
      }
    } else if (order.entity_type === 'master_course') {
      const mc = masterCourseMap.get(order.entity_id) as Record<string, unknown> | undefined;
      if (mc) {
        entityTitle = (mc.title as string) || 'Unknown';
        masterCourseTitle = (mc.title as string) || '-';
        
        const p = mc.master_course_pillars as Record<string, unknown> | undefined;
        if (p) {
          pillarTitle = (p.title as string) || '-';
        }
      }
    }

    if (entityTitle === 'Unknown' || entityTitle === '-') {
      const metadata = (order.metadata || {}) as Record<string, unknown>;
      entityTitle = (metadata.entity_title as string) || (metadata.course_title as string) || (metadata.title as string) || entityTitle;
    }

    return {
      ...order,
      entity_title: entityTitle,
      master_course_title: masterCourseTitle,
      pillar_title: pillarTitle,
    } as OrderListItem;
  });

  // ── Enrich note orders ─────────────────────────────────────────────────────
  const noteTitleMap = new Map<string, string>();
  const noteStudentIds = new Set<string>();
  for (const row of noteOrders ?? []) {
    const nested = row.note_collections as Record<string, unknown> | null;
    if (nested && row.note_collection_id) {
      noteTitleMap.set(row.note_collection_id as string, (nested.title as string) || 'Note Collection');
    }
    if (row.student_id) noteStudentIds.add(row.student_id as string);
  }

  // Fetch student emails for note orders
  const noteEmailMap = new Map<string, string>();
  if (noteStudentIds.size > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, email')
      .in('id', Array.from(noteStudentIds));
    if (profiles) {
      for (const p of profiles) {
        if (p.id && p.email) noteEmailMap.set(p.id, p.email);
      }
    }
  }

  const enrichedNoteOrders = (noteOrders ?? []).map(row => {
    const normalised = normaliseNoteOrder(row, noteTitleMap);
    normalised.purchaser_email = noteEmailMap.get(row.student_id as string) || '';
    return normalised;
  });

  // ── Merge and sort by created_at descending ────────────────────────────────
  const all = [...enrichedCourseOrders, ...enrichedNoteOrders];
  all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return all.slice(0, limit);
}

/**
 * Get detailed stats for the payment dashboard.
 * Includes both course orders and note collection purchases.
 */
async function _getPaymentDashboardStatsInternal(): Promise<PaymentDashboardStats> {
  const admin = createAdminClient();

  // Parallel count queries for course orders
  const [
    paidCountRes,
    pendingCountRes,
    failedCountRes,
    refundedCountRes,
    revenueRes,
    b2cRes,
    // Note payment counts
    notePaidCountRes,
    notePendingCountRes,
    noteFailedCountRes,
    noteRefundedCountRes,
    noteRevenueRes,
    noteEntitlementsRes,
  ] = await Promise.all([
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('orders').select('id', { count: 'exact', head: true }).in('status', ['failed', 'cancelled']),
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'refunded'),
    admin.from('orders').select('total_amount_minor').eq('status', 'paid').range(0, 9999),
    admin.from('student_entitlements').select('*', { count: 'exact', head: true }).eq('source_type', 'b2c_direct').eq('status', 'active'),
    // Note payment queries
    admin.from('note_payment_orders').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
    admin.from('note_payment_orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('note_payment_orders').select('id', { count: 'exact', head: true }).in('status', ['failed', 'cancelled']),
    admin.from('note_payment_orders').select('id', { count: 'exact', head: true }).eq('status', 'refunded'),
    admin.from('note_payment_orders').select('amount_minor').eq('status', 'paid').range(0, 9999),
    admin.from('student_note_entitlements').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  if (paidCountRes.error || pendingCountRes.error || failedCountRes.error || refundedCountRes.error) {
    console.error('[payment-dashboard] getPaymentDashboardStats count queries', {
      paid: paidCountRes.error,
      pending: pendingCountRes.error,
      failed: failedCountRes.error,
      refunded: refundedCountRes.error,
    });
    return {
      totalRevenueMinor: 0,
      successfulOrdersCount: 0,
      pendingOrdersCount: 0,
      failedOrdersCount: 0,
      refundedOrdersCount: 0,
      totalB2CEntitlements: 0,
      currency: 'INR',
    };
  }

  // Sum course revenue (paise)
  let totalRevenueMinor = 0;
  for (const row of revenueRes.data ?? []) {
    totalRevenueMinor += row.total_amount_minor;
  }

  // Sum note revenue (stored in rupees, convert to paise)
  for (const row of noteRevenueRes.data ?? []) {
    totalRevenueMinor += (row.amount_minor ?? 0) * 100;
  }

  return {
    totalRevenueMinor,
    successfulOrdersCount: (paidCountRes.count ?? 0) + (notePaidCountRes.count ?? 0),
    pendingOrdersCount: (pendingCountRes.count ?? 0) + (notePendingCountRes.count ?? 0),
    failedOrdersCount: (failedCountRes.count ?? 0) + (noteFailedCountRes.count ?? 0),
    refundedOrdersCount: (refundedCountRes.count ?? 0) + (noteRefundedCountRes.count ?? 0),
    totalB2CEntitlements: (b2cRes.count ?? 0) + (noteEntitlementsRes.count ?? 0),
    currency: 'INR',
  };
}

/**
 * Get detailed stats for the payment dashboard.
 */
export async function getPaymentDashboardStats(): Promise<PaymentDashboardStats> {
  return _getPaymentDashboardStatsInternal();
}

/**
 * Get full order details including items, payments, and student info.
 * Handles both course orders and note collection purchases.
 */
export async function getOrderDetails(orderId: string) {
  const admin = createAdminClient();

  // Try course order first
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select(`
      *,
      order_items (*),
      payments (*)
    `)
    .eq('id', orderId)
    .single();

  if (!orderError && order) {
    let studentInfo = null;
    if (order.purchaser_user_id) {
      const { data: profile } = await admin
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', order.purchaser_user_id)
        .single();
      
      if (profile) studentInfo = profile;
    }

    const metadata = (order.metadata || {}) as Record<string, unknown>;
    const courseIds: string[] = [];
    for (const item of (order.order_items as Array<Record<string, unknown>>) || []) {
      if (item.entity_type === 'course_variant') {
        const cid = (metadata.course_id as string) || '';
        if (cid) courseIds.push(cid);
      }
    }

    let entitlements = [];
    if (order.purchaser_user_id && courseIds.length > 0) {
      const { data: ents } = await admin
          .from('student_entitlements')
          .select('*')
          .eq('student_id', order.purchaser_user_id)
          .in('master_course_id', courseIds);
      entitlements = ents ?? [];
    }

    return { order, studentInfo, entitlements };
  }

  // Try note payment order
  const { data: noteOrder, error: noteError } = await admin
    .from('note_payment_orders')
    .select('*, note_collections(id, title, slug)')
    .eq('id', orderId)
    .single();

  if (noteError || !noteOrder) {
    return null;
  }

  // Fetch student info via profiles (note orders use student_id = user id)
  let studentInfo = null;
  if (noteOrder.student_id) {
    const { data: profile } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', noteOrder.student_id)
      .single();
    if (profile) studentInfo = profile;
  }

  // Fetch note entitlement
  let entitlements = [];
  if (noteOrder.student_id) {
    const { data: ents } = await admin
      .from('student_note_entitlements')
      .select('*')
      .eq('student_id', noteOrder.student_id)
      .eq('note_collection_id', noteOrder.note_collection_id);
    entitlements = ents ?? [];
  }

  // Normalise into order shape for the UI
  const nested = noteOrder.note_collections as Record<string, unknown> | null;
  const normalisedOrder = {
    ...noteOrder,
    entity_type: 'note_collection',
    entity_id: noteOrder.note_collection_id,
    total_amount_minor: (noteOrder.amount_minor ?? 0) * 100,
    purchaser_user_id: noteOrder.student_id,
    order_items: [{
      entity_type: 'note_collection',
      entity_id: noteOrder.note_collection_id,
      unit_amount_minor: (noteOrder.amount_minor ?? 0) * 100,
      discount_amount_minor: 0,
      total_amount_minor: (noteOrder.amount_minor ?? 0) * 100,
    }],
    payments: [],
    _isNoteOrder: true,
    _noteCollectionTitle: (nested?.title as string) || 'Note Collection',
  };

  return {
    order: normalisedOrder,
    studentInfo,
    entitlements,
  };
}
