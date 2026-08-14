-- Polymorphic course_price_plans for all paid course source types.
-- Keeps master_course_id populated for backward compatibility with existing RPC/queries.

BEGIN;

ALTER TABLE public.course_price_plans
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid;

-- Backfill existing master-course plans
UPDATE public.course_price_plans AS cpp
SET
  source_type = CASE
    WHEN mc.catalog_type = 'bootcamp' OR mc.bootcamp_id IS NOT NULL THEN 'paid_course_builder'
    ELSE 'master_course'
  END,
  source_id = cpp.master_course_id
FROM public.master_courses AS mc
WHERE mc.id = cpp.master_course_id
  AND (cpp.source_type IS NULL OR cpp.source_id IS NULL);

UPDATE public.course_price_plans
SET
  source_type = COALESCE(source_type, 'master_course'),
  source_id = COALESCE(source_id, master_course_id)
WHERE source_type IS NULL OR source_id IS NULL;

ALTER TABLE public.course_price_plans
  ALTER COLUMN source_type SET NOT NULL,
  ALTER COLUMN source_id SET NOT NULL;

ALTER TABLE public.course_price_plans
  DROP CONSTRAINT IF EXISTS course_price_plans_source_type_check;

ALTER TABLE public.course_price_plans
  ADD CONSTRAINT course_price_plans_source_type_check
  CHECK (source_type IN ('master_course', 'course_variant', 'paid_course_builder'));

CREATE INDEX IF NOT EXISTS idx_course_price_plans_source
  ON public.course_price_plans (source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_course_price_plans_source_active
  ON public.course_price_plans (source_type, source_id, is_active);

DROP INDEX IF EXISTS idx_course_price_plans_one_default_per_course;

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_price_plans_one_default_per_source
  ON public.course_price_plans (source_type, source_id)
  WHERE is_default = true;

-- Default plan per paid variant from legacy selling_price
INSERT INTO public.course_price_plans (
  master_course_id,
  source_type,
  source_id,
  plan_name,
  description,
  validity_days,
  price_minor,
  currency,
  is_active,
  is_default,
  sort_order
)
SELECT
  cv.master_course_id,
  'course_variant',
  cv.id,
  COALESCE(NULLIF(TRIM(cv.title), ''), 'Default Plan'),
  'Default paid variant plan',
  NULL,
  cv.selling_price,
  'INR',
  true,
  true,
  0
FROM public.course_variants AS cv
WHERE COALESCE(cv.show_as_paid_course, false) = true
  AND cv.selling_price IS NOT NULL
  AND cv.selling_price > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.course_price_plans AS cpp
    WHERE cpp.source_type = 'course_variant'
      AND cpp.source_id = cv.id
  );

-- Backfill variant landing metadata for paid variants
INSERT INTO public.paid_course_landing_metadata (
  source_type,
  source_id,
  slug,
  title,
  short_description,
  description,
  is_published,
  is_visible
)
SELECT
  'course_variant',
  cv.id,
  COALESCE(NULLIF(TRIM(cv.slug), ''), cv.id::text),
  cv.title,
  cv.description,
  cv.description,
  (cv.publish_status = 'published'),
  COALESCE(cv.show_as_paid_course, false)
FROM public.course_variants AS cv
WHERE COALESCE(cv.show_as_paid_course, false) = true
ON CONFLICT (source_type, source_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_active_price_plans_for_source(
  p_source_type text,
  p_source_id uuid
)
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
SET search_path = ''
AS $$
  SELECT
    cpp.id,
    cpp.plan_name,
    cpp.description,
    cpp.validity_days,
    cpp.price_minor,
    cpp.currency,
    cpp.is_default,
    cpp.sort_order
  FROM public.course_price_plans AS cpp
  WHERE cpp.source_type = p_source_type
    AND cpp.source_id = p_source_id
    AND cpp.is_active = true
  ORDER BY
    CASE WHEN cpp.is_default THEN 0 ELSE 1 END,
    cpp.sort_order,
    cpp.price_minor;
$$;

REVOKE EXECUTE ON FUNCTION public.get_active_price_plans_for_source(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_price_plans_for_source(text, uuid) TO authenticated;

COMMENT ON COLUMN public.course_price_plans.source_type IS
  'Paid product source: master_course, course_variant, or paid_course_builder.';
COMMENT ON COLUMN public.course_price_plans.source_id IS
  'Polymorphic id matching source_type. master_course_id remains parent course for lineage.';

COMMIT;
