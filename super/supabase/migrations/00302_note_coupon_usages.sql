-- ─── 00302: Note Coupon Usages ─────────────────────────────────────────────────
-- Additive table for tracking coupon usage on note collection purchases.
-- Mirrors coupon_usages structure but references note_payment_orders and
-- student_note_entitlements instead of orders.
--
-- Key design decisions:
--   1. Separate table avoids FK conflict (coupon_usages.order_id REFERENCES orders).
--   2. Trigger increments coupons.uses_count so max_uses works globally.
--   3. validateCoupon checks BOTH coupon_usages + note_coupon_usages for
--      max_uses_per_user to enforce a single global limit per user per coupon.
--   4. Per-table UNIQUE(coupon_id, purchaser_user_id, note_collection_id) allows
--      one usage per user per coupon per note (multi-note usage is valid).
-- ────────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Create note_coupon_usages table
CREATE TABLE IF NOT EXISTS public.note_coupon_usages (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id                 uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  student_id                uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  note_collection_id        uuid NOT NULL REFERENCES public.note_collections(id) ON DELETE CASCADE,
  note_payment_order_id     uuid REFERENCES public.note_payment_orders(id) ON DELETE SET NULL,
  student_note_entitlement_id uuid REFERENCES public.student_note_entitlements(id) ON DELETE SET NULL,
  purchaser_user_id         uuid,
  purchaser_email           text NOT NULL DEFAULT '',
  coupon_code               text NOT NULL,
  discount_amount_minor     integer NOT NULL DEFAULT 0 CHECK (discount_amount_minor >= 0),
  original_amount_minor     integer NOT NULL DEFAULT 0 CHECK (original_amount_minor >= 0),
  final_amount_minor        integer NOT NULL DEFAULT 0 CHECK (final_amount_minor >= 0),
  coupon_origin             text,
  metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.note_coupon_usages IS
  'Coupon usage tracking for note collection purchases. Mirrors coupon_usages for notes.';

-- 2. Indexes for lookup performance
CREATE INDEX IF NOT EXISTS idx_note_coupon_usages_coupon
  ON public.note_coupon_usages (coupon_id);

CREATE INDEX IF NOT EXISTS idx_note_coupon_usages_student
  ON public.note_coupon_usages (student_id);

CREATE INDEX IF NOT EXISTS idx_note_coupon_usages_collection
  ON public.note_coupon_usages (note_collection_id);

CREATE INDEX IF NOT EXISTS idx_note_coupon_usages_order
  ON public.note_coupon_usages (note_payment_order_id);

CREATE INDEX IF NOT EXISTS idx_note_coupon_usages_entitlement
  ON public.note_coupon_usages (student_note_entitlement_id);

CREATE INDEX IF NOT EXISTS idx_note_coupon_usages_user
  ON public.note_coupon_usages (purchaser_user_id);

CREATE INDEX IF NOT EXISTS idx_note_coupon_usages_created
  ON public.note_coupon_usages (created_at DESC);

-- 3. Unique constraint: one note usage per user per coupon per note collection
--    Allows multi-note usage while preventing duplicate redemptions for the same note.
CREATE UNIQUE INDEX IF NOT EXISTS idx_note_coupon_usages_unique_per_user_note
  ON public.note_coupon_usages (coupon_id, purchaser_user_id, note_collection_id)
  WHERE purchaser_user_id IS NOT NULL;

-- 4. Idempotency: one usage per coupon per order (where order exists)
CREATE UNIQUE INDEX IF NOT EXISTS idx_note_coupon_usages_unique_per_order
  ON public.note_coupon_usages (coupon_id, note_payment_order_id)
  WHERE note_payment_order_id IS NOT NULL;

-- 5. Idempotency: one usage per coupon per entitlement (where entitlement exists)
CREATE UNIQUE INDEX IF NOT EXISTS idx_note_coupon_usages_unique_per_entitlement
  ON public.note_coupon_usages (coupon_id, student_note_entitlement_id)
  WHERE student_note_entitlement_id IS NOT NULL;

-- 6. Trigger: increment coupons.uses_count on insert (mirrors increment_coupon_usage)
--    Uses fully-qualified public.coupon_status because SET search_path = ''.
CREATE OR REPLACE FUNCTION public.increment_note_coupon_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.coupons
  SET uses_count = uses_count + 1,
      status = CASE
        WHEN max_uses IS NOT NULL AND uses_count + 1 >= max_uses
        THEN 'exhausted'::public.coupon_status
        ELSE status
      END
  WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_note_coupon_usage ON public.note_coupon_usages;
CREATE TRIGGER trg_increment_note_coupon_usage
  AFTER INSERT ON public.note_coupon_usages
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_note_coupon_usage();

-- 7. Enable RLS
ALTER TABLE public.note_coupon_usages ENABLE ROW LEVEL SECURITY;

-- 8. SuperAdmin full access (uses platform-standard is_superadmin())
DROP POLICY IF EXISTS "note_coupon_usages_superadmin_all" ON public.note_coupon_usages;
CREATE POLICY "note_coupon_usages_superadmin_all"
  ON public.note_coupon_usages FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- 9. Student read-only (own rows)
DROP POLICY IF EXISTS "note_coupon_usages_student_read" ON public.note_coupon_usages;
CREATE POLICY "note_coupon_usages_student_read"
  ON public.note_coupon_usages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = note_coupon_usages.student_id
        AND students.user_id = (SELECT auth.uid())
    )
  );

-- 10. Revoke direct execution of trigger function (defense-in-depth, matches increment_coupon_usage)
REVOKE EXECUTE ON FUNCTION public.increment_note_coupon_usage() FROM public, anon, authenticated;

-- 11. Grants (writes are server-side only via service role)
GRANT SELECT ON public.note_coupon_usages TO authenticated;

COMMIT;
