-- Allow LMS invoices for note_payment_orders (notes purchases live outside public.orders).
-- Mentorship/course/bundle/bootcamp invoices continue to use order_id.

ALTER TABLE public.lms_invoices
  ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE public.lms_invoices
  ADD COLUMN IF NOT EXISTS note_payment_order_id uuid NULL
    REFERENCES public.note_payment_orders (id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lms_invoices_note_payment_order_id
  ON public.lms_invoices (note_payment_order_id)
  WHERE note_payment_order_id IS NOT NULL;

ALTER TABLE public.lms_invoices
  DROP CONSTRAINT IF EXISTS lms_invoices_source_xor_chk;

ALTER TABLE public.lms_invoices
  ADD CONSTRAINT lms_invoices_source_xor_chk
  CHECK (
    (order_id IS NOT NULL AND note_payment_order_id IS NULL)
    OR (order_id IS NULL AND note_payment_order_id IS NOT NULL)
  );

COMMENT ON COLUMN public.lms_invoices.note_payment_order_id IS
  'Optional source for notes purchases that are stored in note_payment_orders instead of orders.';
