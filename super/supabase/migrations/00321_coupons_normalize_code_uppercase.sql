-- 00321: Normalize coupon codes to uppercase
--
-- Bug: approve_campus_ambassador_application appends LEFT(md5(...), 4) which is
-- lowercase hex, so stored codes can be mixed-case (e.g. RAHULCTO12a1b3).
-- LMS validateCoupon normalizes input with UPPER and looks up with eq → miss →
-- "Invalid coupon code".

BEGIN;

-- Existing mixed-case codes (CA uniqueness suffixes and any other drift)
UPDATE public.coupons
SET code = upper(btrim(code)),
    updated_at = now()
WHERE code IS NOT NULL
  AND code <> upper(btrim(code));

-- Keep future inserts/updates normalized even if RPC forgets UPPER on suffix
CREATE OR REPLACE FUNCTION public.coupons_normalize_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.code IS NOT NULL THEN
    NEW.code := upper(btrim(NEW.code));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_coupons_normalize_code ON public.coupons;
CREATE TRIGGER trg_coupons_normalize_code
  BEFORE INSERT OR UPDATE OF code ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.coupons_normalize_code();

COMMENT ON FUNCTION public.coupons_normalize_code() IS
  'Forces coupons.code to uppercase so case-sensitive lookups after LMS normalizeCouponCode succeed.';

COMMIT;
