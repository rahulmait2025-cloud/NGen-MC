-- Expand lms_email_outbox.event_type check to allow mentorship transactional emails.
-- App types already emit these; the original constraint only allowed
-- google_welcome / payment_confirmation / batch_enrollment_success.

ALTER TABLE public.lms_email_outbox
  DROP CONSTRAINT IF EXISTS lms_email_outbox_event_type_check;

ALTER TABLE public.lms_email_outbox
  ADD CONSTRAINT lms_email_outbox_event_type_check
  CHECK (
    event_type IN (
      'google_welcome',
      'payment_confirmation',
      'batch_enrollment_success',
      'mentorship_payment_confirmation',
      'mentorship_booking_confirmed',
      'mentorship_reminder',
      'mentorship_reschedule_confirmed',
      'mentorship_session_completed'
    )
  );

COMMENT ON CONSTRAINT lms_email_outbox_event_type_check ON public.lms_email_outbox IS
  'Allowed LMS transactional email event types including mentorship lifecycle emails.';
