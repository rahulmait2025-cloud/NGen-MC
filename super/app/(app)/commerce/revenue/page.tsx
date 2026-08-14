import type { ReactNode } from 'react';
import { format, startOfDay, startOfMonth, subDays, subYears } from 'date-fns';
import { cacheLife, cacheTag } from 'next/cache';

import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { createAdminClient } from '@/lib/supabase/admin';
import { SuperAdminRevenueService } from '@/lib/superadmin/analytics/services/revenue';
import {
  RevenueDashboard,
  type RevenueDashboardMetrics,
  type RevenuePeriod,
} from '@/components/commerce/revenue-dashboard';

type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
type PurchaseSource = 'lms' | 'college_admin';
type SellableEntityType = 'course_variant' | 'course_bundle' | 'master_course' | 'paid_mentorship_booking' | 'note_collection';

interface OrderRow {
  id: string;
  entity_type: SellableEntityType;
  entity_id: string;
  purchaser_email: string;
  purchaser_name: string | null;
  source: PurchaseSource;
  base_amount_minor: number;
  discount_amount_minor: number;
  total_amount_minor: number;
  currency: string;
  status: OrderStatus;
  created_at: string;
  paid_at: string | null;
  gateway_name?: string;
  entity_title?: string;
  master_course_title?: string;
  pillar_title?: string;
}

const PERIODS: RevenuePeriod[] = ['7d', '30d', '90d', 'all'];

function getDateRange(period: RevenuePeriod) {
  const today = startOfDay(new Date());

  switch (period) {
    case '7d':
      return { from: subDays(today, 7).toISOString(), to: today.toISOString() };
    case '30d':
      return { from: subDays(today, 30).toISOString(), to: today.toISOString() };
    case '90d':
      return { from: subDays(today, 90).toISOString(), to: today.toISOString() };
    case 'all':
    default:
      return { from: subYears(today, 1).toISOString(), to: today.toISOString() };
  }
}

function getBucketKey(date: Date, period: RevenuePeriod) {
  return period === 'all' ? format(date, 'yyyy-MM') : format(date, 'yyyy-MM-dd');
}

function getBucketLabel(date: Date, period: RevenuePeriod) {
  return period === 'all' ? format(date, 'MMM yy') : format(date, 'MMM d');
}

function getPeriodLabel(period: RevenuePeriod) {
  switch (period) {
    case '7d':
      return 'Last 7 days';
    case '30d':
      return 'Last 30 days';
    case '90d':
      return 'Last 90 days';
    case 'all':
    default:
      return 'All time';
  }
}

async function fetchOrders(period: RevenuePeriod): Promise<OrderRow[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('revenue-dashboard');

  const admin = createAdminClient();
  const { from, to } = getDateRange(period);

  let query = admin.from('orders').select('*, order_items(entity_id, entity_type)').order('created_at', { ascending: false });

  if (from) {
    query = query.gte('created_at', from);
  }
  if (to) {
    query = query.lte('created_at', to);
  }

  // Cap to 1000 rows to prevent unbounded full-table scans
  query = query.range(0, 999);

  // Also fetch note collection orders
  let noteQuery = admin.from('note_payment_orders').select('*, note_collections(id, title)').order('created_at', { ascending: false });
  if (from) noteQuery = noteQuery.gte('created_at', from);
  if (to) noteQuery = noteQuery.lte('created_at', to);
  noteQuery = noteQuery.range(0, 999);

  const [{ data, error }, { data: noteData, error: noteError }] = await Promise.all([query, noteQuery]);

  if (error) {
    throw new Error(`Failed to fetch revenue orders: ${error.message}`);
  }

  const orders = (data ?? []) as Array<Record<string, unknown> & { order_items?: Array<Record<string, unknown>> }>;

  const variantIds: string[] = [];
  const bundleIds: string[] = [];
  const masterIds: string[] = [];
  for (const o of orders) {
    if (o.entity_type === 'course_variant' && o.entity_id) variantIds.push(o.entity_id as string);
    else if (o.entity_type === 'course_bundle' && o.entity_id) bundleIds.push(o.entity_id as string);
    else if (o.entity_type === 'master_course' && o.entity_id) masterIds.push(o.entity_id as string);
  }

  const [variantsRes, bundlesRes, mastersRes] = await Promise.all([
    variantIds.length > 0
      ? admin.from('course_variants').select('id, title, master_courses(id, title, master_course_pillars(id, title))').in('id', variantIds)
      : Promise.resolve({ data: [] }),
    bundleIds.length > 0
      ? admin.from('course_bundles').select('id, title').in('id', bundleIds)
      : Promise.resolve({ data: [] }),
    masterIds.length > 0
      ? admin.from('master_courses').select('id, title, master_course_pillars(id, title)').in('id', masterIds)
      : Promise.resolve({ data: [] }),
  ]);

  const variantMap = new Map((variantsRes.data || []).map((v) => [v.id, v]));
  const bundleMap = new Map((bundlesRes.data || []).map((b) => [b.id, b]));
  const masterMap = new Map((mastersRes.data || []).map((m) => [m.id, m]));

  const enrichedOrders: OrderRow[] = orders.map((order) => {
    let entityTitle: string | undefined;
    let masterCourseTitle: string | undefined;
    let pillarTitle: string | undefined;

    if (order.entity_type === 'course_variant') {
      const variant = variantMap.get(order.entity_id as string);
      entityTitle = variant?.title as string | undefined;
      const master = variant?.master_courses as { title?: string; master_course_pillars?: Array<{ title?: string }> } | undefined;
      masterCourseTitle = master?.title as string | undefined;
      pillarTitle = master?.master_course_pillars?.[0]?.title as string | undefined;
    } else if (order.entity_type === 'course_bundle') {
      const bundle = bundleMap.get(order.entity_id as string);
      entityTitle = bundle?.title as string | undefined;
    } else if (order.entity_type === 'master_course') {
      const master = masterMap.get(order.entity_id as string);
      entityTitle = master?.title as string | undefined;
      pillarTitle = (master as { master_course_pillars?: Array<{ title?: string }> } | undefined)?.master_course_pillars?.[0]?.title as string | undefined;
    }

    return {
      id: order.id as string,
      entity_type: order.entity_type as SellableEntityType,
      entity_id: order.entity_id as string,
      purchaser_email: order.purchaser_email as string,
      purchaser_name: order.purchaser_name as string | null,
      source: order.source as PurchaseSource,
      base_amount_minor: order.base_amount_minor as number,
      discount_amount_minor: order.discount_amount_minor as number,
      total_amount_minor: order.total_amount_minor as number,
      currency: order.currency as string,
      status: order.status as OrderStatus,
      created_at: order.created_at as string,
      paid_at: order.paid_at as string | null,
      gateway_name: order.gateway_name as string | undefined,
      entity_title: entityTitle,
      master_course_title: masterCourseTitle,
      pillar_title: pillarTitle,
    } as OrderRow;
  });

  // Enrich note orders (amount in rupees, convert to paise)
  if (!noteError && noteData) {
    for (const row of noteData) {
      const nested = row.note_collections as Record<string, unknown> | null;
      const title = (nested?.title as string) || 'Note Collection';
      enrichedOrders.push({
        id: row.id as string,
        entity_type: 'note_collection',
        entity_id: row.note_collection_id as string,
        purchaser_email: '',
        purchaser_name: null,
        source: 'lms',
        base_amount_minor: (row.amount_minor as number) * 100,
        discount_amount_minor: 0,
        total_amount_minor: (row.amount_minor as number) * 100,
        currency: (row.currency as string) || 'INR',
        status: row.status as OrderStatus,
        created_at: row.created_at as string,
        paid_at: row.updated_at as string | null,
        gateway_name: 'razorpay',
        entity_title: title,
      });
    }
  }

  enrichedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return enrichedOrders;
}

async function fetchThisMonthPaidRevenue(): Promise<number> {
  const admin = createAdminClient();
  const monthStart = startOfMonth(new Date()).toISOString();

  const [{ data, error }, { data: noteData, error: noteError }] = await Promise.all([
    admin
      .from('orders')
      .select('total_amount_minor')
      .eq('status', 'paid')
      .gte('paid_at', monthStart),
    admin
      .from('note_payment_orders')
      .select('amount_minor')
      .eq('status', 'paid')
      .gte('updated_at', monthStart),
  ]);

  let total = 0;
  if (!error && data) {
    total += data.reduce((sum, row) => sum + row.total_amount_minor, 0);
  }
  if (!noteError && noteData) {
    total += noteData.reduce((sum, row) => sum + (row.amount_minor ?? 0) * 100, 0);
  }
  return total;
}

async function computeMetrics(period: RevenuePeriod): Promise<RevenueDashboardMetrics> {
  const [orders, thisMonthPaidRevenue, repeatData, growthData, paymentMethods, byCollege] = await Promise.all([
    fetchOrders(period),
    fetchThisMonthPaidRevenue(),
    SuperAdminRevenueService.getRepeatCustomerRate().catch(() => ({ rate: 0, repeatCustomers: 0, totalCustomers: 0 })),
    SuperAdminRevenueService.getMonthlyGrowthRate().catch(() => ({ growthRate: null, currentMonthRevenue: 0, previousMonthRevenue: 0 })),
    SuperAdminRevenueService.getPaymentMethodBreakdown().catch(() => []),
    SuperAdminRevenueService.getRevenueByCollege().catch(() => []),
  ]);

  const statusMap = new Map<string, { count: number; amount: number }>();
  const sourceMap = new Map<string, { count: number; revenue: number }>();
  const entityMap = new Map<string, { count: number; revenue: number }>();
  const trendMap = new Map<
    string,
    {
      label: string;
      grossRevenue: number;
      successfulPayment: number;
      netRevenue: number;
      refundedRevenue: number;
      discounts: number;
      paidOrders: number;
    }
  >();
  const orderVolumeMap = new Map<string, { label: string; total: number; paid: number; failed: number; pending: number; refunded: number }>();
  const avgOrderValueMap = new Map<string, { label: string; totalRevenue: number; orderCount: number }>();
  const gatewayMap = new Map<string, { count: number; revenue: number }>();
  const courseMap = new Map<string, { title: string; entityId: string; entityType: string; source: string; count: number; revenue: number }>();

  let totalOrders = 0;
  let paidOrders = 0;
  let refundedOrders = 0;
  let grossRevenue = 0;
  let refundedRevenue = 0;
  let pendingRevenue = 0;
  let totalDiscount = 0;

  for (const order of orders) {
    totalOrders += 1;

    const statusEntry = statusMap.get(order.status) ?? { count: 0, amount: 0 };
    statusEntry.count += 1;
    statusEntry.amount += order.total_amount_minor;
    statusMap.set(order.status, statusEntry);

    const revenueDate = order.status === 'paid' && order.paid_at
      ? new Date(order.paid_at)
      : new Date(order.created_at);
    const trendKey = getBucketKey(revenueDate, period);
    const trendEntry = trendMap.get(trendKey) ?? {
      label: getBucketLabel(revenueDate, period),
      grossRevenue: 0,
      successfulPayment: 0,
      netRevenue: 0,
      refundedRevenue: 0,
      discounts: 0,
      paidOrders: 0,
    };
    const volumeEntry = orderVolumeMap.get(trendKey) ?? {
      label: getBucketLabel(revenueDate, period),
      total: 0,
      paid: 0,
      failed: 0,
      pending: 0,
      refunded: 0,
    };
    const aovEntry = avgOrderValueMap.get(trendKey) ?? {
      label: getBucketLabel(revenueDate, period),
      totalRevenue: 0,
      orderCount: 0,
    };

    volumeEntry.total += 1;

    if (order.status === 'paid') {
      paidOrders += 1;
      grossRevenue += order.total_amount_minor;
      totalDiscount += order.discount_amount_minor;
      volumeEntry.paid += 1;
      aovEntry.totalRevenue += order.total_amount_minor;
      aovEntry.orderCount += 1;

      trendEntry.grossRevenue += order.total_amount_minor;
      trendEntry.successfulPayment += order.total_amount_minor;
      trendEntry.netRevenue += order.total_amount_minor;
      trendEntry.discounts += order.discount_amount_minor;
      trendEntry.paidOrders += 1;

      const sourceEntry = sourceMap.get(order.source) ?? { count: 0, revenue: 0 };
      sourceEntry.count += 1;
      sourceEntry.revenue += order.total_amount_minor;
      sourceMap.set(order.source, sourceEntry);

      const entityEntry = entityMap.get(order.entity_type) ?? { count: 0, revenue: 0 };
      entityEntry.count += 1;
      entityEntry.revenue += order.total_amount_minor;
      entityMap.set(order.entity_type, entityEntry);

      if (order.gateway_name) {
        const gatewayEntry = gatewayMap.get(order.gateway_name) ?? { count: 0, revenue: 0 };
        gatewayEntry.count += 1;
        gatewayEntry.revenue += order.total_amount_minor;
        gatewayMap.set(order.gateway_name, gatewayEntry);
      }

      const courseKey = order.entity_id;
      const courseEntry = courseMap.get(courseKey) ?? {
        title: order.entity_title || order.master_course_title || 'Unknown',
        entityId: order.entity_id,
        entityType: order.entity_type,
        source: order.source,
        count: 0,
        revenue: 0,
      };
      courseEntry.count += 1;
      courseEntry.revenue += order.total_amount_minor;
      courseMap.set(courseKey, courseEntry);
    }

    if (order.status === 'refunded') {
      refundedOrders += 1;
      refundedRevenue += order.total_amount_minor;
      volumeEntry.refunded += 1;
      trendEntry.refundedRevenue += order.total_amount_minor;
      trendEntry.netRevenue -= order.total_amount_minor;
    }

    if (order.status === 'failed') {
      volumeEntry.failed += 1;
    }

    if (order.status === 'pending') {
      pendingRevenue += order.total_amount_minor;
      volumeEntry.pending += 1;
    }

    trendMap.set(trendKey, trendEntry);
    orderVolumeMap.set(trendKey, volumeEntry);
    avgOrderValueMap.set(trendKey, aovEntry);
  }

  const averageOrderValue = paidOrders > 0 ? Math.round(grossRevenue / paidOrders) : 0;
  const netRevenue = grossRevenue - refundedRevenue;
  const successRate = totalOrders > 0 ? Number(((paidOrders / totalOrders) * 100).toFixed(1)) : 0;
  const refundRate = paidOrders > 0 ? Number(((refundedOrders / paidOrders) * 100).toFixed(1)) : 0;

  return {
    period,
    periodLabel: getPeriodLabel(period),
    currency: orders[0]?.currency ?? 'INR',
    totalOrders,
    paidOrders,
    refundedOrders,
    grossRevenue,
    netRevenue,
    refundedRevenue,
    pendingRevenue,
    totalDiscount,
    thisMonthPaidRevenue,
    averageOrderValue,
    successRate,
    refundRate,
    statusBreakdown: Array.from(statusMap.entries())
      .map(([status, value]) => ({
        status,
        count: value.count,
        amount: value.amount,
      }))
      .sort((a, b) => b.count - a.count),
    sourceBreakdown: Array.from(sourceMap.entries())
      .map(([source, value]) => ({
        source,
        count: value.count,
        revenue: value.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue),
    entityBreakdown: Array.from(entityMap.entries())
      .map(([entityType, value]) => ({
        entityType,
        count: value.count,
        revenue: value.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue),
    revenueTrend: Array.from(trendMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => value),
    orderVolumeTrend: Array.from(orderVolumeMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => value),
    avgOrderValueTrend: Array.from(avgOrderValueMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => ({
        label: value.label,
        avgOrderValue: value.orderCount > 0 ? Math.round(value.totalRevenue / value.orderCount) : 0,
      })),
    gatewayBreakdown: Array.from(gatewayMap.entries())
      .map(([gateway, value]) => ({
        gateway,
        count: value.count,
        revenue: value.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue),
    topCourses: Array.from(courseMap.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([, value]) => value),
    recentOrders: orders.slice(0, 12),
    repeatCustomerRate: repeatData.rate,
    repeatCustomerCount: repeatData.repeatCustomers,
    totalCustomers: repeatData.totalCustomers,
    monthlyGrowthRate: growthData.growthRate,
    currentMonthRevenue: growthData.currentMonthRevenue,
    previousMonthRevenue: growthData.previousMonthRevenue,
    paymentMethodBreakdown: paymentMethods,
    revenueByCollege: byCollege,
  };
}

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  const params = await searchParams;
  const requestedPeriod = params.period;
  const period = PERIODS.includes(requestedPeriod as RevenuePeriod)
    ? (requestedPeriod as RevenuePeriod)
    : '30d';

  const metrics = await computeMetrics(period);

  return <RevenueDashboard metrics={metrics} />;
}
