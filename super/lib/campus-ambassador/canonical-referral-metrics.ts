/**
 * Canonical Campus Ambassador referral metrics from `campus_ambassador_coupon_analytics`.
 * LMS and Super Admin must map the same view columns to the same labels.
 */
export type CampusAmbassadorCouponAnalyticsRow = {
  total_uses?: number | null;
  paid_uses?: number | null;
  net_revenue_minor?: number | string | null;
  total_discount_minor?: number | string | null;
  gross_revenue_minor?: number | string | null;
};

export type CanonicalReferralMetrics = {
  /** All coupon usages (click/sign-up/unpaid/paid/refunded rows that created a usage). */
  totalReferrals: number;
  /** Usages tied to paid orders only. */
  paidReferrals: number;
  /** Sum of paid order totals (customer net revenue), minor units. */
  netRevenueMinor: number;
  /** Sum of discounts given across usages, minor units. */
  totalDiscountMinor: number;
  /** Sum of paid order base amounts before discount, minor units. */
  grossRevenueMinor: number;
};

function toInt(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

/** Map analytics view row → canonical metrics shared by LMS + Super Admin. */
export function mapCouponAnalyticsToCanonicalReferralMetrics(
  row: CampusAmbassadorCouponAnalyticsRow | null | undefined,
): CanonicalReferralMetrics {
  return {
    totalReferrals: toInt(row?.total_uses),
    paidReferrals: toInt(row?.paid_uses),
    netRevenueMinor: toInt(row?.net_revenue_minor),
    totalDiscountMinor: toInt(row?.total_discount_minor),
    grossRevenueMinor: toInt(row?.gross_revenue_minor),
  };
}
