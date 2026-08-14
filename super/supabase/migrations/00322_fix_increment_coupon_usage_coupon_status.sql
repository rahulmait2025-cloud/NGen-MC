-- 00322: Fix increment_coupon_usage under empty search_path
--
-- coupon_usages INSERT failed with: type "coupon_status" does not exist
-- because increment_coupon_usage() uses SET search_path = '' and cast
-- 'exhausted'::coupon_status without the public schema qualifier.
-- Note path already uses public.coupon_status (00302).

BEGIN;

CREATE OR REPLACE FUNCTION public.increment_coupon_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.coupons
  SET
    uses_count = uses_count + 1,
    status = CASE
      WHEN max_uses IS NOT NULL AND uses_count + 1 >= max_uses
        THEN 'exhausted'::public.coupon_status
      ELSE status
    END
  WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.increment_coupon_usage() IS
  'Increments coupons.uses_count on coupon_usages insert; uses public.coupon_status for empty search_path.';

COMMIT;
