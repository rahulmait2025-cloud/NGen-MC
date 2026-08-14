import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  mapCouponAnalyticsToCanonicalReferralMetrics,
  type CampusAmbassadorCouponAnalyticsRow,
} from '@/lib/campus-ambassador/canonical-referral-metrics';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AmbassadorApplicationRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  whatsapp_number: string | null;
  college_name: string;
  degree: string | null;
  branch: string | null;
  year_of_study: string | null;
  city: string | null;
  state: string | null;
  why_join: string;
  expected_referrals: number | null;
  status: string;
  reviewed_at: string | null;
  created_at: string;
}

export interface AmbassadorRow {
  id: string;
  user_id: string;
  application_id: string;
  coupon_id: string | null;
  status: string;
  joined_at: string;
  removed_at: string | null;
  access_enabled: boolean;
  total_generated_minor: number;
  total_paid_minor: number;
  application?: AmbassadorApplicationRow | null;
  coupon?: {
    id: string;
    code: string;
    status: string;
    discount_type: 'fixed' | 'percentage';
    discount_value: number;
  } | null;
}

export interface AmbassadorPayoutRow {
  id: string;
  ambassador_id: string;
  kind: 'commission_earned' | 'payout_made';
  amount_minor: number;
  order_id: string | null;
  paid_via: string | null;
  reference_text: string | null;
  created_at: string;
}

export interface AmbassadorAnalytics {
  totalAmbassadors: number;
  activeAmbassadors: number;
  totalGeneratedMinor: number;
  totalPaidMinor: number;
  totalRemainingMinor: number;
  totalCommissionEarnedMinor: number;
  totalPayoutsMadeMinor: number;
  leaderboardByGenerated: {
    ambassador_id: string;
    full_name: string;
    college_name: string;
    /** Net customer revenue from paid referred orders (analytics view). */
    net_revenue_minor: number;
    /** Commission ledger total on ambassador row (not customer revenue). */
    commission_earned_minor: number;
    total_paid_minor: number;
    total_referrals: number;
    paid_referrals: number;
  }[];
  leaderboardByOrders: {
    ambassador_id: string;
    full_name: string;
    college_name: string;
    total_referrals: number;
    paid_referrals: number;
    net_revenue_minor: number;
  }[];
  collegeBreakdown: {
    college_name: string;
    ambassador_count: number;
    net_revenue_minor: number;
    total_referrals: number;
    paid_referrals: number;
  }[];
}

// ─── Fetch Applications ──────────────────────────────────────────────────────

export async function fetchApplications(
  status?: string,
  limit = 20,
  offset = 0,
): Promise<{ applications: AmbassadorApplicationRow[]; total: number }> {
  const admin = createAdminClient();

  let query = admin
    .from('campus_ambassador_applications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch applications: ${error.message}`);
  return {
    applications: (data ?? []) as AmbassadorApplicationRow[],
    total: count ?? 0,
  };
}

// ─── Fetch Ambassadors ───────────────────────────────────────────────────────

export async function fetchAmbassadors(
  status?: string,
  limit = 20,
  offset = 0,
): Promise<{ ambassadors: AmbassadorRow[]; total: number }> {
  const admin = createAdminClient();

  let query = admin
    .from('campus_ambassadors')
    .select(`
      *,
      application:campus_ambassador_applications!inner(
        id, full_name, email, college_name, phone
      ),
      coupon:coupons!coupon_id!inner(
        id, code, status, discount_type, discount_value
      )
    `, { count: 'exact' })
    .order('joined_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch ambassadors: ${error.message}`);
  return {
    ambassadors: (data ?? []) as AmbassadorRow[],
    total: count ?? 0,
  };
}

// ─── Fetch Ambassador Detail ─────────────────────────────────────────────────

export async function fetchAmbassadorDetail(ambassadorId: string): Promise<AmbassadorRow | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('campus_ambassadors')
    .select(`
      *,
      application:campus_ambassador_applications!inner(
        id, full_name, email, college_name, phone, why_join, expected_referrals
      ),
      coupon:coupons!coupon_id!inner(
        id, code, status, discount_type, discount_value
      )
    `)
    .eq('id', ambassadorId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch ambassador: ${error.message}`);
  return (data as AmbassadorRow) ?? null;
}

// ─── Fetch Ambassador Payouts ────────────────────────────────────────────────

export async function fetchAmbassadorPayouts(
  ambassadorId: string,
  limit = 5,
  offset = 0,
): Promise<AmbassadorPayoutRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('campus_ambassador_payouts')
    .select('*')
    .eq('ambassador_id', ambassadorId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch payouts: ${error.message}`);
  return (data ?? []) as AmbassadorPayoutRow[];
}

// ─── Fetch Analytics Overview ────────────────────────────────────────────────

export async function fetchAnalyticsOverview(): Promise<AmbassadorAnalytics> {
  const admin = createAdminClient();

  // Fetch all ambassadors with their totals
  const { data: ambassadors, error: ambError } = await admin
    .from('campus_ambassadors')
    .select(`
      id, status, total_generated_minor, total_paid_minor,
      application:campus_ambassador_applications!inner(full_name, college_name),
      coupon:coupons!coupon_id(code, status)
    `)
    .order('total_generated_minor', { ascending: false });

  if (ambError) throw new Error(`Failed to fetch analytics: ${ambError.message}`);

  // Canonical referral/revenue metrics from the same analytics view LMS uses
  const { data: couponAnalytics } = await admin
    .from('campus_ambassador_coupon_analytics')
    .select(
      'ambassador_id, paid_uses, total_uses, net_revenue_minor, total_discount_minor, gross_revenue_minor',
    );

  const metricsByAmbassador = new Map<
    string,
    ReturnType<typeof mapCouponAnalyticsToCanonicalReferralMetrics>
  >();
  for (const item of couponAnalytics ?? []) {
    const row = item as CampusAmbassadorCouponAnalyticsRow & { ambassador_id?: string };
    if (!row.ambassador_id) continue;
    metricsByAmbassador.set(
      row.ambassador_id,
      mapCouponAnalyticsToCanonicalReferralMetrics(row),
    );
  }

  // Supabase returns nested relations as arrays; extract first element or null
  const rows = (ambassadors ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    status: r.status as string,
    total_generated_minor: (r.total_generated_minor as number) ?? 0,
    total_paid_minor: (r.total_paid_minor as number) ?? 0,
    application: Array.isArray(r.application)
      ? (r.application[0] as { full_name: string; college_name: string }) ?? null
      : (r.application as { full_name: string; college_name: string }) ?? null,
    coupon: Array.isArray(r.coupon)
      ? (r.coupon[0] as { code: string; status: string }) ?? null
      : (r.coupon as { code: string; status: string }) ?? null,
  }));

  const active = rows.filter(r => r.status === 'active');
  const totalGenerated = rows.reduce((s, r) => s + (r.total_generated_minor ?? 0), 0);
  const totalPaid = rows.reduce((s, r) => s + (r.total_paid_minor ?? 0), 0);

  // Leaderboard by net customer revenue (canonical; matches LMS "Revenue Generated")
  const leaderboardByGenerated = rows
    .filter(r => r.status === 'active')
    .map(r => {
      const m = metricsByAmbassador.get(r.id) ?? mapCouponAnalyticsToCanonicalReferralMetrics(null);
      return {
        ambassador_id: r.id,
        full_name: r.application?.full_name ?? 'Unknown',
        college_name: r.application?.college_name ?? 'Unknown',
        net_revenue_minor: m.netRevenueMinor,
        commission_earned_minor: r.total_generated_minor ?? 0,
        total_paid_minor: r.total_paid_minor ?? 0,
        total_referrals: m.totalReferrals,
        paid_referrals: m.paidReferrals,
      };
    })
    .sort((a, b) => b.net_revenue_minor - a.net_revenue_minor)
    .slice(0, 20);

  // Leaderboard by paid referrals (canonical)
  const leaderboardByOrders = [...leaderboardByGenerated]
    .sort((a, b) => b.paid_referrals - a.paid_referrals)
    .slice(0, 20);

  // College breakdown uses net revenue + referral counts from analytics view
  const collegeMap = new Map<
    string,
    { ambassador_count: number; net_revenue_minor: number; total_referrals: number; paid_referrals: number }
  >();
  for (const r of rows) {
    const college = r.application?.college_name ?? 'Unknown';
    const m = metricsByAmbassador.get(r.id) ?? mapCouponAnalyticsToCanonicalReferralMetrics(null);
    const existing = collegeMap.get(college) ?? {
      ambassador_count: 0,
      net_revenue_minor: 0,
      total_referrals: 0,
      paid_referrals: 0,
    };
    existing.ambassador_count += 1;
    existing.net_revenue_minor += m.netRevenueMinor;
    existing.total_referrals += m.totalReferrals;
    existing.paid_referrals += m.paidReferrals;
    collegeMap.set(college, existing);
  }

  const collegeBreakdown = Array.from(collegeMap.entries())
    .map(([college_name, data]) => ({ college_name, ...data }))
    .sort((a, b) => b.net_revenue_minor - a.net_revenue_minor)
    .slice(0, 20);

  // Commission/payout totals from ledger
  const { data: ledgerTotals } = await admin
    .from('campus_ambassador_payouts')
    .select('kind, amount_minor');

  let totalCommissionEarned = 0;
  let totalPayoutsMade = 0;
  for (const row of (ledgerTotals ?? []) as { kind: string; amount_minor: number }[]) {
    if (row.kind === 'commission_earned') totalCommissionEarned += row.amount_minor;
    if (row.kind === 'payout_made') totalPayoutsMade += row.amount_minor;
  }

  return {
    totalAmbassadors: rows.length,
    activeAmbassadors: active.length,
    totalGeneratedMinor: totalGenerated,
    totalPaidMinor: totalPaid,
    totalRemainingMinor: totalGenerated - totalPaid,
    totalCommissionEarnedMinor: totalCommissionEarned,
    totalPayoutsMadeMinor: totalPayoutsMade,
    leaderboardByGenerated,
    leaderboardByOrders,
    collegeBreakdown,
  };
}

// ─── Fetch Global Settings ───────────────────────────────────────────────────

export async function fetchGlobalSettings(): Promise<{
  discount_type: string;
  discount_value: number;
} | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('campus_ambassador_settings')
    .select('discount_type, discount_value')
    .eq('id', 'default')
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch settings: ${error.message}`);
  return data;
}
