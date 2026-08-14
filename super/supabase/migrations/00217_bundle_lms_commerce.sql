-- Bundle LMS commerce: landing metadata + bundle_price_plans
-- Extends course_bundles for LMS cards/catalog without duplicating bundle system.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: LMS landing metadata on course_bundles
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.course_bundles
  ADD COLUMN IF NOT EXISTS landing_card_title text,
  ADD COLUMN IF NOT EXISTS landing_card_description text,
  ADD COLUMN IF NOT EXISTS landing_badge_label text,
  ADD COLUMN IF NOT EXISTS landing_badge_variant text,
  ADD COLUMN IF NOT EXISTS landing_highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS landing_footer_note text,
  ADD COLUMN IF NOT EXISTS landing_hero_title text,
  ADD COLUMN IF NOT EXISTS landing_hero_subtitle text,
  ADD COLUMN IF NOT EXISTS landing_outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS landing_audience_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS show_on_lms_catalog boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_on_lms_curated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS curated_sort_order integer,
  ADD COLUMN IF NOT EXISTS catalog_sort_order integer;

COMMENT ON COLUMN public.course_bundles.landing_card_title IS 'LMS card/hero title override';
COMMENT ON COLUMN public.course_bundles.landing_highlights IS 'Up to 3 bullet highlights for curated LMS cards';
COMMENT ON COLUMN public.course_bundles.show_on_lms_catalog IS 'Show in LMS all-bundles catalog section';
COMMENT ON COLUMN public.course_bundles.show_on_lms_curated IS 'Show in LMS curated bundles section';

CREATE INDEX IF NOT EXISTS idx_course_bundles_lms_catalog
  ON public.course_bundles (show_on_lms_catalog, catalog_sort_order)
  WHERE publish_status = 'published' AND lifecycle_status = 'active';

CREATE INDEX IF NOT EXISTS idx_course_bundles_lms_curated
  ON public.course_bundles (show_on_lms_curated, curated_sort_order)
  WHERE publish_status = 'published' AND lifecycle_status = 'active';

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: bundle_price_plans (mirrors course_price_plans)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.bundle_price_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.course_bundles(id) ON DELETE CASCADE,
  plan_name text NOT NULL DEFAULT 'Standard Access',
  description text,
  price_minor integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  validity_days integer,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bundle_price_plans_price_non_negative CHECK (price_minor >= 0),
  CONSTRAINT bundle_price_plans_validity_positive_when_set
    CHECK (validity_days IS NULL OR validity_days > 0)
);

COMMENT ON TABLE public.bundle_price_plans IS
  'Multiple price/validity options per course bundle (B2C purchase).';

CREATE INDEX IF NOT EXISTS idx_bundle_price_plans_bundle
  ON public.bundle_price_plans (bundle_id);

CREATE INDEX IF NOT EXISTS idx_bundle_price_plans_active
  ON public.bundle_price_plans (is_active);

CREATE INDEX IF NOT EXISTS idx_bundle_price_plans_bundle_active
  ON public.bundle_price_plans (bundle_id, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bundle_price_plans_one_default_per_bundle
  ON public.bundle_price_plans (bundle_id)
  WHERE is_default = true AND is_active = true;

CREATE TRIGGER trg_bundle_price_plans_updated_at
  BEFORE UPDATE ON public.bundle_price_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bundle_price_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY bundle_price_plans_superadmin_all ON public.bundle_price_plans
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY bundle_price_plans_student_read ON public.bundle_price_plans
  FOR SELECT TO authenticated
  USING (is_active = true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bundle_price_plans TO authenticated;

-- Bundle purchases reuse orders.price_plan_id when bundle plan UUID is stored at checkout.
-- No separate commerce_orders column required.

-- Seed default plan from legacy selling_price where present
INSERT INTO public.bundle_price_plans (
  bundle_id,
  plan_name,
  description,
  price_minor,
  currency,
  validity_days,
  is_default,
  is_active,
  sort_order
)
SELECT
  cb.id,
  'Standard Access',
  'Migrated from bundle selling_price',
  cb.selling_price,
  COALESCE(cb.currency, 'INR'),
  NULL,
  true,
  true,
  0
FROM public.course_bundles cb
WHERE cb.selling_price IS NOT NULL
  AND cb.selling_price > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.bundle_price_plans bpp
    WHERE bpp.bundle_id = cb.id
  );

-- Free bundles: optional zero-price default plan
INSERT INTO public.bundle_price_plans (
  bundle_id,
  plan_name,
  description,
  price_minor,
  currency,
  validity_days,
  is_default,
  is_active,
  sort_order
)
SELECT
  cb.id,
  'Free Access',
  'Migrated from free bundle pricing_model',
  0,
  COALESCE(cb.currency, 'INR'),
  NULL,
  true,
  true,
  0
FROM public.course_bundles cb
WHERE (cb.pricing_model = 'free' OR cb.selling_price = 0)
  AND NOT EXISTS (
    SELECT 1 FROM public.bundle_price_plans bpp
    WHERE bpp.bundle_id = cb.id
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: Helper RPC for active bundle price plans
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_active_bundle_price_plans(p_bundle_id uuid)
RETURNS TABLE (
  id uuid,
  plan_name text,
  description text,
  validity_days integer,
  price_minor integer,
  currency text,
  is_default boolean,
  sort_order integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    bpp.id,
    bpp.plan_name,
    bpp.description,
    bpp.validity_days,
    bpp.price_minor,
    bpp.currency,
    bpp.is_default,
    bpp.sort_order
  FROM public.bundle_price_plans bpp
  WHERE bpp.bundle_id = p_bundle_id
    AND bpp.is_active = true
  ORDER BY
    CASE WHEN bpp.is_default THEN 0 ELSE 1 END,
    bpp.sort_order,
    bpp.price_minor;
$$;

COMMIT;
