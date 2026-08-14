import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapCouponAnalyticsToCanonicalReferralMetrics } from '../../lib/campus-ambassador/canonical-referral-metrics';

describe('super admin referral canonical metrics', () => {
  it('matches LMS mapping for paid referrals and net revenue', () => {
    const metrics = mapCouponAnalyticsToCanonicalReferralMetrics({
      total_uses: 8,
      paid_uses: 3,
      net_revenue_minor: '120050',
      total_discount_minor: 30000,
      gross_revenue_minor: 150050,
    });
    assert.deepEqual(metrics, {
      totalReferrals: 8,
      paidReferrals: 3,
      netRevenueMinor: 120050,
      totalDiscountMinor: 30000,
      grossRevenueMinor: 150050,
    });
  });
});
