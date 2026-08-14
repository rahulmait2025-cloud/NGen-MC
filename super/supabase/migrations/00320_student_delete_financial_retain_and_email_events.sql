-- 00320: Preserve financial note orders on student deletion + expand email event types
--
-- Bug 9: students → note_payment_orders CASCADE was blocked by
-- lms_invoices.note_payment_order_id ON DELETE RESTRICT.
-- Preserve payment/invoice history by nullifying student_id on note orders.
--
-- Bug 6 / 10: allow campus ambassador approval emails and provider-agnostic
-- account welcome emails in lms_email_outbox.

BEGIN;

-- ─── 1. note_payment_orders.student_id: CASCADE → SET NULL ────────────────────

ALTER TABLE public.note_payment_orders
  DROP CONSTRAINT IF EXISTS note_payment_orders_student_id_fkey;

ALTER TABLE public.note_payment_orders
  ALTER COLUMN student_id DROP NOT NULL;

ALTER TABLE public.note_payment_orders
  ADD CONSTRAINT note_payment_orders_student_id_fkey
  FOREIGN KEY (student_id)
  REFERENCES public.students(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.note_payment_orders.student_id IS
  'Owning student when present. SET NULL on student deletion so invoices and payment history remain.';

-- ─── 2. Expand transactional email event types ───────────────────────────────

ALTER TABLE public.lms_email_outbox
  DROP CONSTRAINT IF EXISTS lms_email_outbox_event_type_check;

ALTER TABLE public.lms_email_outbox
  ADD CONSTRAINT lms_email_outbox_event_type_check
  CHECK (
    event_type IN (
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
      'mentorship_admin_reschedule_notification'
    )
  );

COMMENT ON CONSTRAINT lms_email_outbox_event_type_check ON public.lms_email_outbox IS
  'Allowed LMS transactional email event types including CA approval and account welcome.';

COMMIT;
