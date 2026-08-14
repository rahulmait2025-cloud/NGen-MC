-- Phase 3C: Offer-Order Linking
--
-- Purpose
--   Wire course_access_offers to the existing commerce stack (orders/payments)
--   so a future CollegeAdmin (and direct/student) checkout flow can:
--     1. Reference the originating offer from each order row.
--     2. Sell master_course entities directly (in addition to course_variant
--        and course_bundle), since offers can be created for any of those.
--
-- Scope
--   Additive schema changes only. No data backfill. No drops. No payment
--   service logic changes. No assignment / entitlement activation logic.
--
-- Safety
--   * Uses ADD VALUE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, defensive
--     DO blocks, and CREATE INDEX IF NOT EXISTS so re-running is safe.
--   * Does NOT touch course_access_offers, content_assignments, or
--     student_entitlements schemas.
--   * Does NOT add UNIQUE(offer_id) — retry / cancel / refund flows must
--     stay free to create multiple order rows per offer when needed.
--   * Idempotency for offer-based checkouts is already covered by the
--     existing orders.idempotency_key UNIQUE constraint.

-- ─── 1. Extend sellable_entity_type enum ─────────────────────────────────────
--
-- NOTE: ALTER TYPE ... ADD VALUE cannot be executed inside a transaction
-- block. When applied via Supabase CLI / supabase db push the migration
-- runner handles this; if applied manually, run this statement standalone.

ALTER TYPE public.sellable_entity_type ADD VALUE IF NOT EXISTS 'master_course';

-- ─── 2. Add offer_id column to orders ────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS offer_id uuid NULL;

COMMENT ON COLUMN public.orders.offer_id IS
  'Optional FK to course_access_offers.id. Set when this order originated '
  'from an accepted course access offer. NULL for direct catalog purchases.';

-- ─── 3. Foreign key (defensive — only add if target table exists) ────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'course_access_offers'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_offer_id_fkey'
      AND conrelid = 'public.orders'::regclass
  )
  THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_offer_id_fkey
      FOREIGN KEY (offer_id)
      REFERENCES public.course_access_offers (id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ─── 4. Indexes ──────────────────────────────────────────────────────────────
--
-- Partial indexes (WHERE offer_id IS NOT NULL) keep the index small for the
-- expected sparse population and avoid noise from non-offer purchases.

CREATE INDEX IF NOT EXISTS idx_orders_offer_id
  ON public.orders (offer_id)
  WHERE offer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_source_offer
  ON public.orders (source, offer_id)
  WHERE offer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_status_offer
  ON public.orders (status, offer_id)
  WHERE offer_id IS NOT NULL;
