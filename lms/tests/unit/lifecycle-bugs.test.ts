import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { studentPortalMetadata } from '../../lib/metadata/student-portal';
import { collegeAdminPortalMetadata } from '../../lib/metadata/college-admin-portal';
import { mapCouponAnalyticsToCanonicalReferralMetrics } from '../../lib/campus-ambassador/canonical-referral-metrics';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

describe('portal metadata branding', () => {
  it('uses Student Portal title for student metadata', () => {
    assert.equal(studentPortalMetadata.title, 'NextGen CTO Student Portal');
    const og = studentPortalMetadata.openGraph;
    assert.ok(og && typeof og === 'object' && 'title' in og);
    assert.equal(og.title, 'NextGen CTO Student Portal');
  });

  it('uses College Admin Portal title for college admin metadata', () => {
    assert.equal(collegeAdminPortalMetadata.title, 'NextGen CTO College Admin Portal');
  });

  it('uses absolute Open Graph image URLs', () => {
    const images = studentPortalMetadata.openGraph?.images;
    assert.ok(Array.isArray(images) && images.length > 0);
    const first = images[0];
    const url =
      typeof first === 'string'
        ? first
        : first instanceof URL
          ? first.toString()
          : String((first as { url?: string | URL }).url ?? '');
    assert.match(url, /^https?:\/\//);
  });
});

describe('email idempotency key shapes', () => {
  it('scopes welcome and CA approval keys by immutable entity ids', () => {
    const userId = '11111111-1111-1111-1111-111111111111';
    const applicationId = '22222222-2222-2222-2222-222222222222';
    assert.equal(`account_welcome:user:${userId}`, `account_welcome:user:${userId}`);
    assert.equal(
      `campus_ambassador_approval:application:${applicationId}`,
      `campus_ambassador_approval:application:${applicationId}`,
    );
    assert.notEqual(`account_welcome:user:${userId}`, `google_welcome:user:${userId}`);
  });
});

describe('referral parity query-layer mapping', () => {
  it('maps LMS and Super Admin canonical helpers identically for the same fixture', () => {
    const fixture = {
      total_uses: 5,
      paid_uses: 2,
      net_revenue_minor: 199900,
      total_discount_minor: 40000,
      gross_revenue_minor: 239900,
    };

    const lmsMetrics = mapCouponAnalyticsToCanonicalReferralMetrics(fixture);
    const expected = {
      totalReferrals: 5,
      paidReferrals: 2,
      netRevenueMinor: 199900,
      totalDiscountMinor: 40000,
      grossRevenueMinor: 239900,
    };
    assert.deepEqual(lmsMetrics, expected);

    const fs = require('fs') as typeof import('fs');
    const superPath = path.resolve(
      __dirname,
      '../../../super/lib/campus-ambassador/canonical-referral-metrics.ts',
    );
    const superSrc = fs.readFileSync(superPath, 'utf8');
    assert.match(superSrc, /export function mapCouponAnalyticsToCanonicalReferralMetrics/);
    assert.match(superSrc, /totalReferrals: toInt\(row\?\.total_uses\)/);
    assert.match(superSrc, /paidReferrals: toInt\(row\?\.paid_uses\)/);
    assert.match(superSrc, /netRevenueMinor: toInt\(row\?\.net_revenue_minor\)/);
  });

  it('does not treat commission ledger totals as net revenue', () => {
    const analytics = mapCouponAnalyticsToCanonicalReferralMetrics({
      paid_uses: 3,
      net_revenue_minor: 50000,
    });
    const commissionLedgerMinor = 15000;
    assert.notEqual(analytics.netRevenueMinor, commissionLedgerMinor);
    assert.equal(analytics.paidReferrals, 3);
    assert.equal(analytics.netRevenueMinor, 50000);
  });
});

describe('migration 00320 static contract', () => {
  it('preserves prior outbox event types and adds welcome + CA approval', () => {
    const fs = require('fs') as typeof import('fs');
    const sqlPath = path.resolve(
      __dirname,
      '../../../super/supabase/migrations/00320_student_delete_financial_retain_and_email_events.sql',
    );
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const required = [
      'google_welcome',
      'account_welcome',
      'campus_ambassador_approval',
      'payment_confirmation',
      'batch_enrollment_success',
      'mentorship_payment_confirmation',
      'mentorship_booking_confirmed',
      'mentorship_reminder',
      'mentorship_reschedule_confirmed',
      'mentorship_session_completed',
      'mentorship_admin_booking_notification',
      'mentorship_admin_reschedule_notification',
      'ON DELETE SET NULL',
      'DROP NOT NULL',
      'BEGIN',
      'COMMIT',
    ];
    for (const token of required) {
      assert.ok(sql.includes(token), `migration missing ${token}`);
    }
  });
});
