import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LmsEmailEventType } from '../../lib/lms/transactional-email/types';

/** Must stay in sync with migration 00315 lms_email_outbox_event_type_check. */
const DB_ALLOWED_EVENT_TYPES = [
  'google_welcome',
  'payment_confirmation',
  'batch_enrollment_success',
  'mentorship_payment_confirmation',
  'mentorship_booking_confirmed',
  'mentorship_reminder',
  'mentorship_reschedule_confirmed',
  'mentorship_session_completed',
  'mentorship_admin_booking_notification',
  'mentorship_admin_reschedule_notification',
] as const satisfies readonly LmsEmailEventType[];

describe('lms_email_outbox event_type allow-list', () => {
  it('includes all mentorship transactional event types used by the app', () => {
    const mentorshipTypes: LmsEmailEventType[] = [
      'mentorship_payment_confirmation',
      'mentorship_booking_confirmed',
      'mentorship_reminder',
      'mentorship_reschedule_confirmed',
      'mentorship_session_completed',
      'mentorship_admin_booking_notification',
      'mentorship_admin_reschedule_notification',
    ];
    for (const eventType of mentorshipTypes) {
      assert.ok(
        (DB_ALLOWED_EVENT_TYPES as readonly string[]).includes(eventType),
        `missing ${eventType}`,
      );
    }
  });
});
