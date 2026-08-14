import 'server-only';
import { cache } from 'react';
import { cacheLife, cacheTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolvePurchasedContentDisplay } from '@/lib/commerce/purchased-content-display';

export interface PaymentHistoryRow {
  id: string;
  entity_type: string;
  entity_title: string;
  plan_label: string | null;
  amount_minor: number;
  currency: string;
  status: string;
  payment_method: string | null;
  coupon_code: string | null;
  created_at: string;
  paid_at: string | null;
  gateway_payment_id: string | null;
}

async function batchResolveLiveEntityTitles(
  admin: ReturnType<typeof createAdminClient>,
  orders: Array<{ id: string; entity_type: string; entity_id: string }>,
): Promise<Map<string, string>> {
  const byType = new Map<string, Set<string>>();
  for (const order of orders) {
    const set = byType.get(order.entity_type) ?? new Set<string>();
    set.add(order.entity_id);
    byType.set(order.entity_type, set);
  }

  const titlesByEntity = new Map<string, string>();
  const key = (type: string, id: string) => `${type}:${id}`;

  await Promise.all(
    [...byType.entries()].map(async ([entityType, ids]) => {
      const idList = [...ids];
      if (idList.length === 0) return;

      if (entityType === 'master_course') {
        const { data } = await admin.from('master_courses').select('id, title').in('id', idList);
        for (const row of data ?? []) {
          if (row.title) titlesByEntity.set(key(entityType, row.id as string), row.title as string);
        }
        return;
      }
      if (entityType === 'course_variant') {
        const { data } = await admin.from('course_variants').select('id, title').in('id', idList);
        for (const row of data ?? []) {
          if (row.title) titlesByEntity.set(key(entityType, row.id as string), row.title as string);
        }
        return;
      }
      if (entityType === 'course_bundle') {
        const { data } = await admin.from('course_bundles').select('id, title').in('id', idList);
        for (const row of data ?? []) {
          if (row.title) titlesByEntity.set(key(entityType, row.id as string), row.title as string);
        }
        return;
      }
      if (entityType === 'job_ready_bootcamp') {
        const { data } = await admin.from('bootcamps').select('id, title').in('id', idList);
        for (const row of data ?? []) {
          if (row.title) titlesByEntity.set(key(entityType, row.id as string), row.title as string);
        }
      }
    }),
  );

  const byOrderId = new Map<string, string>();
  for (const order of orders) {
    const title = titlesByEntity.get(key(order.entity_type, order.entity_id));
    if (title) byOrderId.set(order.id, title);
  }
  return byOrderId;
}

export const listStudentOrders = cache(async function listStudentOrders(
  userId: string,
): Promise<PaymentHistoryRow[]> {
  'use cache';
  cacheLife('weeks');
  cacheTag(`student-payment-history-${userId}`);

  const admin = createAdminClient();

  // 1. Fetch student IDs associated with the user across all colleges
  const { data: studentRecords } = await admin
    .from('students')
    .select('id')
    .eq('user_id', userId);

  const studentIds = (studentRecords ?? []).map((s) => s.id);

  // Fetch course orders and note purchases in parallel
  const [ordersRes, noteOrdersRes] = await Promise.all([
    admin
      .from('orders')
      .select(
        'id, entity_type, entity_id, total_amount_minor, currency, status, coupon_code, created_at, paid_at, gateway_payment_id, metadata',
      )
      .eq('purchaser_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100), // #7 Safety cap to prevent unbounded payment history growth
    studentIds.length > 0
      ? admin
          .from('note_payment_orders')
          .select('id, note_collection_id, amount_minor, currency, status, created_at, gateway_order_id, gateway_payment_id, note_collections(title)')
          .in('student_id', studentIds)
          .eq('status', 'paid')
          .order('created_at', { ascending: false })
          .limit(100) // #7 Safety cap
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (ordersRes.error) {
    throw new Error(`Failed to fetch orders: ${ordersRes.error.message}`);
  }

  if (noteOrdersRes.error) {
    throw new Error(`Failed to fetch note orders: ${noteOrdersRes.error.message}`);
  }

  const allOrders = ordersRes.data ?? [];

  // Fetch payment method from payments table for each course order
  const orderIds = allOrders.map((o) => o.id);
  const paymentMethodMap = new Map<string, string>();

  const [paymentsSettled, liveTitles] = await Promise.all([
    orderIds.length > 0
      ? admin
          .from('payments')
          .select('order_id, method')
          .in('order_id', orderIds)
          .eq('status', 'captured')
      : Promise.resolve({ data: [] as Array<{ order_id: string; method: string | null }> }),
    batchResolveLiveEntityTitles(
      admin,
      allOrders.map((o) => ({
        id: o.id as string,
        entity_type: o.entity_type as string,
        entity_id: o.entity_id as string,
      })),
    ),
  ]);

  if (paymentsSettled.data) {
    for (const p of paymentsSettled.data) {
      if (p.method) {
        paymentMethodMap.set(p.order_id, p.method);
      }
    }
  }

  // Build course order rows
  const courseRows: PaymentHistoryRow[] = allOrders.map((order) => {
    const meta = (order.metadata as Record<string, unknown>) ?? null;
    const display = resolvePurchasedContentDisplay({
      entityType: order.entity_type,
      metadata: meta,
      liveEntityTitle: liveTitles.get(order.id) ?? null,
    });
    return {
      id: order.id,
      entity_type: order.entity_type,
      entity_title: display.primaryTitle,
      plan_label: display.secondaryLabel,
      amount_minor: order.total_amount_minor,
      currency: order.currency ?? 'INR',
      status: order.status,
      payment_method: paymentMethodMap.get(order.id) ?? null,
      coupon_code: order.coupon_code ?? null,
      created_at: order.created_at,
      paid_at: order.paid_at ?? null,
      gateway_payment_id: order.gateway_payment_id ?? null,
    };
  });

  // Build note order rows
  const noteRows: PaymentHistoryRow[] = (noteOrdersRes.data ?? []).map((row) => {
    const rawNotes = row.note_collections;
    const nested = (Array.isArray(rawNotes) ? rawNotes[0] : rawNotes) as Record<string, unknown> | null | undefined;
    return {
      id: row.id,
      entity_type: 'note_collection',
      entity_title: (nested?.title as string) ?? 'Note Collection',
      plan_label: null,
      amount_minor: (row.amount_minor as number) * 100, // DB stores rupees, convert to paise for consistency
      currency: (row.currency as string) ?? 'INR',
      status: row.status as string,
      payment_method: null, // Note purchases don't have payments table entries
      coupon_code: null,
      created_at: row.created_at as string,
      paid_at: row.created_at as string, // No separate paid_at; created_at is when payment was captured
      gateway_payment_id: row.gateway_payment_id as string | null,
    };
  });

  // Merge and sort by created_at descending
  const allRows = [...courseRows, ...noteRows];
  allRows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return allRows;
});
