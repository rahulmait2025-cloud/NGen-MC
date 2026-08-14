import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PurchaseSource } from '@/types/database';

export interface CouponUsageEvent {
  orderId: string;
  couponCode: string;
  isDeleted: boolean;
  purchaserEmail: string;
  purchaserName: string | null;
  source: PurchaseSource;
  baseAmountMinor: number;
  discountAmountMinor: number;
  totalAmountMinor: number;
  currency: string;
  createdAt: string;
  entityType: string;
  entityId: string;
  entityTitle: string;
}

export interface CouponMetricSummary {
  code: string;
  usesCount: number;
  totalDiscountMinor: number;
  totalRevenueMinor: number;
  isDeleted: boolean;
  status?: string;
}

export interface CourseMetricSummary {
  title: string;
  usesCount: number;
  totalDiscountMinor: number;
  totalRevenueMinor: number;
}

export interface StudentMetricSummary {
  email: string;
  name: string | null;
  usesCount: number;
  totalDiscountMinor: number;
  totalRevenueMinor: number;
}

export interface DailyUsageTrend {
  date: string;
  redemptions: number;
  discountMinor: number;
  revenueMinor: number;
}

export interface CouponAnalyticsData {
  summary: {
    totalRevenueMinor: number;
    totalDiscountMinor: number;
    totalRedemptions: number;
    activeCouponsCount: number;
    avgDiscountMinor: number;
    avgRevenueMinor: number;
    lmsRedemptionsCount: number;
    collegeRedemptionsCount: number;
  };
  topCoupons: CouponMetricSummary[];
  topCourses: CourseMetricSummary[];
  topStudents: StudentMetricSummary[];
  dailyTrend: DailyUsageTrend[];
  history: CouponUsageEvent[];
}

export async function getCouponAnalytics(): Promise<CouponAnalyticsData> {
  'use cache';
  cacheLife('minutes');
  cacheTag('coupon-analytics');
  const admin = createAdminClient();

  // 1. Fetch all coupons from coupons table to know current statuses
  const { data: dbCoupons, error: dbCouponsError } = await admin
    .from('coupons')
    .select('id, code, status');

  const couponsMap = new Map<string, { id: string; status: string }>();
  if (!dbCouponsError && dbCoupons) {
    dbCoupons.forEach((c) => {
      couponsMap.set(c.code.toUpperCase(), { id: c.id, status: c.status });
    });
  }

  // 2. Fetch all paid orders where coupon_code is present (capped at 1000 for history/detail view)
  const { data: orders, error: ordersError } = await admin
    .from('orders')
    .select('*')
    .eq('status', 'paid')
    .not('coupon_code', 'is', null)
    .order('created_at', { ascending: false })
    .range(0, 999);

  // Get accurate total count for summary (separate from capped fetch)
  const { count: totalRedemptionsExact } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'paid')
    .not('coupon_code', 'is', null);

  if (ordersError || !orders) {
    console.error('[coupons-analytics] Failed to fetch coupon orders:', ordersError);
    return {
      summary: {
        totalRevenueMinor: 0,
        totalDiscountMinor: 0,
        totalRedemptions: 0,
        activeCouponsCount: dbCoupons?.filter((c) => c.status === 'active').length ?? 0,
        avgDiscountMinor: 0,
        avgRevenueMinor: 0,
        lmsRedemptionsCount: 0,
        collegeRedemptionsCount: 0,
      },
      topCoupons: [],
      topCourses: [],
      topStudents: [],
      dailyTrend: [],
      history: [],
    };
  }

  // Gather entity IDs for titles
  const variantIds: string[] = [];
  const bundleIds: string[] = [];
  const masterCourseIds: string[] = [];

  orders.forEach((o) => {
    if (o.entity_type === 'course_variant') {
      variantIds.push(o.entity_id);
    } else if (o.entity_type === 'course_bundle') {
      bundleIds.push(o.entity_id);
    } else if (o.entity_type === 'master_course') {
      masterCourseIds.push(o.entity_id);
    }
  });

  const [variantsRes, bundlesRes, masterCoursesRes] = await Promise.all([
    variantIds.length > 0
      ? admin.from('course_variants').select('id, title, master_courses(id, title)').in('id', variantIds)
      : Promise.resolve({ data: [] }),
    bundleIds.length > 0
      ? admin.from('course_bundles').select('id, title').in('id', bundleIds)
      : Promise.resolve({ data: [] }),
    masterCourseIds.length > 0
      ? admin.from('master_courses').select('id, title').in('id', masterCourseIds)
      : Promise.resolve({ data: [] }),
  ]);

  const variantMap = new Map((variantsRes.data || []).map((v) => [v.id, v as Record<string, unknown>]));
  const bundleMap = new Map((bundlesRes.data || []).map((b) => [b.id, b as Record<string, unknown>]));
  const masterCourseMap = new Map((masterCoursesRes.data || []).map((m) => [m.id, m as Record<string, unknown>]));

  let totalRevenueMinor = 0;
  let totalDiscountMinor = 0;
  const totalRedemptions = totalRedemptionsExact ?? orders.length;
  let lmsRedemptionsCount = 0;
  let collegeRedemptionsCount = 0;

  const topCouponsGrouping = new Map<string, { uses: number; discount: number; revenue: number }>();
  const topCoursesGrouping = new Map<string, { uses: number; discount: number; revenue: number }>();
  const topStudentsGrouping = new Map<string, { name: string | null; uses: number; discount: number; revenue: number }>();
  const dailyTrendGrouping = new Map<string, { redemptions: number; discount: number; revenue: number }>();

  const history: CouponUsageEvent[] = orders.map((o) => {
    const code = o.coupon_code.toUpperCase();
    const isDeleted = !couponsMap.has(code);

    // Track summary
    totalRevenueMinor += o.total_amount_minor;
    totalDiscountMinor += o.discount_amount_minor;

    if (o.source === 'lms') {
      lmsRedemptionsCount++;
    } else {
      collegeRedemptionsCount++;
    }

    // Entity title mapping
    let entityTitle = 'Unknown Course';
    if (o.entity_type === 'course_variant') {
      const v = variantMap.get(o.entity_id);
      if (v) {
        entityTitle = (v.title as string) || 'Unknown Variant';
        const mc = v.master_courses as Record<string, unknown> | null;
        if (mc && mc.title) {
          entityTitle = `${mc.title} (${entityTitle})`;
        }
      }
    } else if (o.entity_type === 'course_bundle') {
      const b = bundleMap.get(o.entity_id);
      if (b) entityTitle = (b.title as string) || 'Unknown Bundle';
    } else if (o.entity_type === 'master_course') {
      const m = masterCourseMap.get(o.entity_id);
      if (m) entityTitle = (m.title as string) || 'Unknown Course';
    }

    if (entityTitle === 'Unknown Course') {
      const meta = (o.metadata || {}) as Record<string, unknown>;
      entityTitle = ((meta.entity_title || meta.course_title || meta.title) as string) || entityTitle;
    }

    // Daily grouping (YYYY-MM-DD)
    const dateStr = new Date(o.created_at).toISOString().split('T')[0];
    const daily = dailyTrendGrouping.get(dateStr) || { redemptions: 0, discount: 0, revenue: 0 };
    daily.redemptions += 1;
    daily.discount += o.discount_amount_minor;
    daily.revenue += o.total_amount_minor;
    dailyTrendGrouping.set(dateStr, daily);

    // Coupon grouping
    const cGroup = topCouponsGrouping.get(code) || { uses: 0, discount: 0, revenue: 0 };
    cGroup.uses += 1;
    cGroup.discount += o.discount_amount_minor;
    cGroup.revenue += o.total_amount_minor;
    topCouponsGrouping.set(code, cGroup);

    // Course grouping
    const crGroup = topCoursesGrouping.get(entityTitle) || { uses: 0, discount: 0, revenue: 0 };
    crGroup.uses += 1;
    crGroup.discount += o.discount_amount_minor;
    crGroup.revenue += o.total_amount_minor;
    topCoursesGrouping.set(entityTitle, crGroup);

    // Student grouping
    const sGroup = topStudentsGrouping.get(o.purchaser_email.toLowerCase()) || { name: o.purchaser_name, uses: 0, discount: 0, revenue: 0 };
    sGroup.uses += 1;
    sGroup.discount += o.discount_amount_minor;
    sGroup.revenue += o.total_amount_minor;
    if (o.purchaser_name && !sGroup.name) {
      sGroup.name = o.purchaser_name;
    }
    topStudentsGrouping.set(o.purchaser_email.toLowerCase(), sGroup);

    return {
      orderId: o.id,
      couponCode: code,
      isDeleted,
      purchaserEmail: o.purchaser_email,
      purchaserName: o.purchaser_name,
      source: o.source as PurchaseSource,
      baseAmountMinor: o.base_amount_minor,
      discountAmountMinor: o.discount_amount_minor,
      totalAmountMinor: o.total_amount_minor,
      currency: o.currency,
      createdAt: o.created_at,
      entityType: o.entity_type,
      entityId: o.entity_id,
      entityTitle,
    };
  });

  // Convert groupings to sorted arrays
  const topCoupons: CouponMetricSummary[] = Array.from(topCouponsGrouping.entries())
    .map(([code, g]) => ({
      code,
      usesCount: g.uses,
      totalDiscountMinor: g.discount,
      totalRevenueMinor: g.revenue,
      isDeleted: !couponsMap.has(code),
      status: couponsMap.get(code)?.status,
    }))
    .sort((a, b) => b.usesCount - a.usesCount);

  const topCourses: CourseMetricSummary[] = Array.from(topCoursesGrouping.entries())
    .map(([title, g]) => ({
      title,
      usesCount: g.uses,
      totalDiscountMinor: g.discount,
      totalRevenueMinor: g.revenue,
    }))
    .sort((a, b) => b.usesCount - a.usesCount);

  const topStudents: StudentMetricSummary[] = Array.from(topStudentsGrouping.entries())
    .map(([email, g]) => ({
      email,
      name: g.name,
      usesCount: g.uses,
      totalDiscountMinor: g.discount,
      totalRevenueMinor: g.revenue,
    }))
    .sort((a, b) => b.usesCount - a.usesCount);

  // Fill in daily trends for the last 30 days
  const dailyTrend: DailyUsageTrend[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const trendVal = dailyTrendGrouping.get(dateStr) || { redemptions: 0, discount: 0, revenue: 0 };
    
    // Format display label e.g., "Jun 27"
    const displayLabel = formatTrendLabel(dateStr);

    dailyTrend.push({
      date: displayLabel,
      redemptions: trendVal.redemptions,
      discountMinor: trendVal.discount,
      revenueMinor: trendVal.revenue,
    });
  }

  const avgDiscountMinor = totalRedemptions > 0 ? Math.round(totalDiscountMinor / totalRedemptions) : 0;
  const avgRevenueMinor = totalRedemptions > 0 ? Math.round(totalRevenueMinor / totalRedemptions) : 0;

  return {
    summary: {
      totalRevenueMinor,
      totalDiscountMinor,
      totalRedemptions,
      activeCouponsCount: dbCoupons?.filter((c) => c.status === 'active').length ?? 0,
      avgDiscountMinor,
      avgRevenueMinor,
      lmsRedemptionsCount,
      collegeRedemptionsCount,
    },
    topCoupons,
    topCourses,
    topStudents,
    dailyTrend,
    history,
  };
}

function formatTrendLabel(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}
