-- badge_label on price plans + max 3 active plans per product

BEGIN;

ALTER TABLE public.course_price_plans
  ADD COLUMN IF NOT EXISTS badge_label text;

ALTER TABLE public.bundle_price_plans
  ADD COLUMN IF NOT EXISTS badge_label text;

CREATE OR REPLACE FUNCTION public.enforce_max_active_course_price_plans()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  active_count integer;
BEGIN
  IF NEW.is_active IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::integer INTO active_count
  FROM public.course_price_plans AS cpp
  WHERE cpp.source_type = NEW.source_type
    AND cpp.source_id = NEW.source_id
    AND cpp.is_active = true
    AND cpp.id IS DISTINCT FROM NEW.id;

  IF active_count >= 3 THEN
    RAISE EXCEPTION 'Only 3 pricing plans are allowed. Delete an existing plan to add a new one.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_price_plans_max_active ON public.course_price_plans;
CREATE TRIGGER trg_course_price_plans_max_active
  BEFORE INSERT OR UPDATE OF is_active, source_type, source_id ON public.course_price_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_active_course_price_plans();

CREATE OR REPLACE FUNCTION public.enforce_max_active_bundle_price_plans()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  active_count integer;
BEGIN
  IF NEW.is_active IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::integer INTO active_count
  FROM public.bundle_price_plans AS bpp
  WHERE bpp.bundle_id = NEW.bundle_id
    AND bpp.is_active = true
    AND bpp.id IS DISTINCT FROM NEW.id;

  IF active_count >= 3 THEN
    RAISE EXCEPTION 'Only 3 pricing plans are allowed. Delete an existing plan to add a new one.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bundle_price_plans_max_active ON public.bundle_price_plans;
CREATE TRIGGER trg_bundle_price_plans_max_active
  BEFORE INSERT OR UPDATE OF is_active, bundle_id ON public.bundle_price_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_active_bundle_price_plans();

-- PostgreSQL cannot change RETURNS TABLE shape via CREATE OR REPLACE; drop first.
DROP FUNCTION IF EXISTS public.get_active_price_plans_for_source(text, uuid);

CREATE FUNCTION public.get_active_price_plans_for_source(
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
  sort_order integer,
  badge_label text
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
    cpp.sort_order,
    cpp.badge_label
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

DROP FUNCTION IF EXISTS public.get_active_bundle_price_plans(uuid);

CREATE FUNCTION public.get_active_bundle_price_plans(p_bundle_id uuid)
RETURNS TABLE (
  id uuid,
  plan_name text,
  description text,
  validity_days integer,
  price_minor integer,
  currency text,
  is_default boolean,
  sort_order integer,
  badge_label text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    bpp.id,
    bpp.plan_name,
    bpp.description,
    bpp.validity_days,
    bpp.price_minor,
    bpp.currency,
    bpp.is_default,
    bpp.sort_order,
    bpp.badge_label
  FROM public.bundle_price_plans AS bpp
  WHERE bpp.bundle_id = p_bundle_id
    AND bpp.is_active = true
  ORDER BY
    CASE WHEN bpp.is_default THEN 0 ELSE 1 END,
    bpp.sort_order,
    bpp.price_minor;
$$;

COMMIT;
