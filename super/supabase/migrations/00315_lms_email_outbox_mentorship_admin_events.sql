-- Allow mentorship admin notification event types on lms_email_outbox.

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
      'mentorship_session_completed',
      'mentorship_admin_booking_notification',
      'mentorship_admin_reschedule_notification'
    )
  );

COMMENT ON CONSTRAINT lms_email_outbox_event_type_check ON public.lms_email_outbox IS
  'Allowed LMS transactional email event types including mentorship learner and admin notifications.';
