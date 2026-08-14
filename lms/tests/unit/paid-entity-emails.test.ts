import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildPaymentConfirmationEmail } from '../../lib/lms/transactional-email/templates/payment-confirmation';
import {
  buildBatchEnrollmentSuccessEmail,
  resolveAccessConfirmationCta,
} from '../../lib/lms/transactional-email/templates/batch-enrollment-success';

describe('payment confirmation email template', () => {
  it('renders entity-aware wording for courses and keeps Start Learning CTA', () => {
    const email = buildPaymentConfirmationEmail({
      purchaserName: 'Rahul Kumar',
      entityName: 'DSA Mastery',
      entityLabel: 'Course',
      purchaseTypeLabel: 'Course',
      orderId: 'abcdef12-3456',
      invoiceNumber: 'NGCTO-2526-0001',
      totalMinor: 499900,
      paidAtLabel: '14 Jul 2026, 3:00 pm',
      invoiceDownloadUrl: 'https://example.com/invoice',
      dashboardUrl: 'https://example.com/dashboard',
      primaryCtaUrl: 'https://example.com/course',
      primaryCtaLabel: 'Start Learning',
      paymentId: 'pay_123',
      supportEmail: 'support@nextgencto.com',
    });

    assert.match(email.subject, /DSA Mastery/);
    assert.match(email.html, /Start Learning/);
    assert.match(email.html, /View \/ Download Invoice/);
    assert.match(email.html, /pay_123/);
    assert.doesNotMatch(email.html, /Pilot Program/);
  });

  it('omits invoice CTA when invoice URL is missing', () => {
    const email = buildPaymentConfirmationEmail({
      purchaserName: 'Rahul Kumar',
      entityName: 'Career Notes Pack',
      entityLabel: 'Notes',
      orderId: 'noteord1-3456',
      invoiceNumber: null,
      totalMinor: 99900,
      paidAtLabel: '14 Jul 2026, 3:00 pm',
      invoiceDownloadUrl: null,
      dashboardUrl: 'https://example.com/dashboard',
      primaryCtaUrl: 'https://example.com/notes',
      primaryCtaLabel: 'Start Learning',
      supportEmail: 'support@nextgencto.com',
    });

    assert.doesNotMatch(email.html, /View \/ Download Invoice/);
    assert.match(email.html, /Career Notes Pack/);
    assert.match(email.html, /Start Learning/);
  });

  it('supports mentorship CTA and schedule information', () => {
    const email = buildPaymentConfirmationEmail({
      purchaserName: 'Rahul Kumar',
      entityName: 'Mock Interview',
      entityLabel: 'Mentorship',
      orderId: 'mentor01-3456',
      totalMinor: 199900,
      paidAtLabel: '14 Jul 2026, 3:00 pm',
      dashboardUrl: 'https://example.com/mentorship',
      primaryCtaUrl: 'https://example.com/mentorship',
      primaryCtaLabel: 'View Mentorship Schedule',
      scheduleInformation: '2026-07-20 · 10:00–11:00 IST',
      supportEmail: 'support@nextgencto.com',
    });

    assert.match(email.html, /View Mentorship Schedule/);
    assert.match(email.html, /2026-07-20/);
    assert.match(email.subject, /Mock Interview/);
  });
});

describe('access confirmation email template', () => {
  it('keeps enrollment wording for courses/bundles/notes', () => {
    const email = buildBatchEnrollmentSuccessEmail({
      purchaserName: 'Rahul Kumar',
      entityTitle: 'Full Stack Bundle',
      entityTypeLabel: 'Course bundle',
      accessUrl: 'https://example.com/bundle',
      dashboardUrl: 'https://example.com/dashboard',
      supportEmail: 'support@nextgencto.com',
      primaryCtaLabel: 'Start Learning',
    });

    assert.match(email.html, /Start Learning/);
    assert.match(email.html, /Full Stack Bundle/);
    assert.match(email.html, /ACCESS ACTIVATED/);
  });

  it('resolves mentorship CTA labels without calling them enrollment CTAs', () => {
    assert.equal(
      resolveAccessConfirmationCta({
        entityTypeLabel: 'Mentorship',
        accessUrl: 'https://example.com/mentorship',
      }).ctaLabel,
      'View Mentorship Schedule',
    );
    assert.equal(
      resolveAccessConfirmationCta({
        entityTypeLabel: 'Mentorship reschedule',
        accessUrl: 'https://example.com/mentorship',
      }).ctaLabel,
      'View Updated Schedule',
    );
  });
});

describe('idempotency key shapes', () => {
  it('uses stable key formats for payment and access emails', () => {
    const paymentKey = `payment_confirmation:order:ord_123`;
    const accessKey = `batch_enrollment_success:order:ord_123:course_bundle:bun_1`;
    const notePaymentKey = `payment_confirmation:note_order:note_1`;
    const noteAccessKey = `access_confirmation:note_collection:nc_1:user:user_1:note_order:note_1`;
    const mentorshipPaymentKey = `mentorship_payment:order:ord_m1`;
    const mentorshipRescheduleKey = `mentorship_reschedule:booking:bk_2:v1`;

    assert.match(paymentKey, /^payment_confirmation:order:/);
    assert.match(accessKey, /^batch_enrollment_success:order:/);
    assert.match(notePaymentKey, /^payment_confirmation:note_order:/);
    assert.match(
      noteAccessKey,
      /^access_confirmation:note_collection:[^:]+:user:[^:]+:note_order:/,
    );
    assert.match(mentorshipPaymentKey, /^mentorship_payment:order:/);
    assert.match(mentorshipRescheduleKey, /^mentorship_reschedule:booking:[^:]+:v\d+$/);
  });
});
