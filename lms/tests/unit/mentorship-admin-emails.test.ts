import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.NEXT_PUBLIC_STUDENT_APP_URL ??= 'https://example.com';
process.env.NEXT_PUBLIC_APP_URL ??= 'https://example.com';

import {
  buildMentorshipAdminBookingIdempotencyKey,
  buildMentorshipAdminBookingNotificationEmail,
  buildMentorshipAdminRescheduleIdempotencyKey,
  buildMentorshipAdminRescheduleNotificationEmail,
} from '../../lib/lms/transactional-email/templates/mentorship-emails';

describe('mentorship admin notification emails', () => {
  it('builds a booking admin email with student, schedule, and meeting link', () => {
    const email = buildMentorshipAdminBookingNotificationEmail({
      studentName: 'Rahul Kumar',
      studentEmail: 'rahul@example.com',
      categoryTitle: 'Resume Review',
      sessionDate: '2026-07-22',
      startTime: '11:00',
      endTime: '11:30',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      orderId: 'ord-12345678',
      bookingId: 'bk-new-1',
      supportEmail: 'support@nextgencto.com',
    });

    assert.match(email.subject, /New Mentorship Booking/);
    assert.match(email.html, /Rahul Kumar/);
    assert.match(email.html, /rahul@example.com/);
    assert.match(email.html, /Resume Review/);
    assert.match(email.html, /meet\.google\.com/);
    assert.match(email.html, /NEW BOOKING/);
    assert.doesNotMatch(email.html, /Payment Confirmed/);
  });

  it('builds a reschedule admin email with previous and updated schedule', () => {
    const email = buildMentorshipAdminRescheduleNotificationEmail({
      studentName: 'Rahul Kumar',
      studentEmail: 'rahul@example.com',
      categoryTitle: 'Mock Interview',
      previousDate: '2026-07-20',
      previousStartTime: '10:00',
      previousEndTime: '10:30',
      newDate: '2026-07-22',
      newStartTime: '11:00',
      newEndTime: '11:30',
      meetingUrl: null,
      bookingId: 'bk-new-2',
      rescheduleVersion: 1,
      supportEmail: 'support@nextgencto.com',
    });

    assert.match(email.subject, /Mentorship Rescheduled/);
    assert.match(email.html, /Previous schedule/);
    assert.match(email.html, /Updated schedule/);
    assert.match(email.html, /No meeting link is configured/);
    assert.doesNotMatch(email.html, /Open Meeting Link/);
  });

  it('uses stable admin idempotency keys so verify+webhook do not duplicate', () => {
    const bookingKey = buildMentorshipAdminBookingIdempotencyKey({
      orderId: 'ord_1',
      bookingId: 'bk_1',
    });
    assert.equal(bookingKey, 'mentorship_admin_booking:order:ord_1');

    const rescheduleA = buildMentorshipAdminRescheduleIdempotencyKey({
      bookingId: 'bk_2',
      rescheduleVersion: 1,
    });
    const rescheduleReplay = buildMentorshipAdminRescheduleIdempotencyKey({
      bookingId: 'bk_2',
      rescheduleVersion: 1,
    });
    const rescheduleLater = buildMentorshipAdminRescheduleIdempotencyKey({
      bookingId: 'bk_3',
      rescheduleVersion: 2,
    });
    assert.equal(rescheduleA, rescheduleReplay);
    assert.notEqual(rescheduleA, rescheduleLater);
  });
});
