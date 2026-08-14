-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 00181: Expire student_content_entitlements with assignments
--
-- Purpose:
-- When content_assignments expire, expire both:
--   1. student_entitlements
--   2. student_content_entitlements
--
-- Needed for variant/bundle/partial-content grants.
--
-- SAFETY:
--   - Uses CREATE OR REPLACE
--   - Does not delete business data
--   - Does not change RLS
--   - Does not change access rules except correctly expiring stale access
--   - Avoids text = uuid[] comparison bug
-- ──────────────────────────────────────────────────────────────────────────────

BEGIN;

CREATE OR REPLACE FUNCTION public.expire_assignments()
RETURNS TABLE (
  assignments_expired INT,
  entitlements_revoked INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  expired_ids UUID[] := '{}'::UUID[];
  expired_ids_text TEXT[] := '{}'::TEXT[];
  a_count INT := 0;
  e_count INT := 0;
  ce_count INT := 0;
BEGIN
  -- Step 1: Expire content_assignments whose end_date has passed
  WITH expired AS (
    UPDATE public.content_assignments
    SET status = 'expired'
    WHERE status = 'active'
      AND end_date IS NOT NULL
      AND end_date < now()
    RETURNING id
  )
  SELECT
    COALESCE(array_agg(id), '{}'::UUID[]),
    COALESCE(array_agg(id::TEXT), '{}'::TEXT[])
  INTO expired_ids, expired_ids_text
  FROM expired;

  a_count := cardinality(expired_ids);

  IF a_count > 0 THEN
    -- Step 2: Expire normal course entitlements linked to expired assignments
    UPDATE public.student_entitlements
    SET
      status = 'expired',
      revoked_at = now(),
      revoke_reason = 'assignment_expired'
    WHERE status = 'active'
      AND metadata->>'assignment_id' = ANY(expired_ids_text);

    GET DIAGNOSTICS e_count = ROW_COUNT;

    -- Step 3: Expire variant/bundle/content-level entitlements
    UPDATE public.student_content_entitlements
    SET
      status = 'expired',
      revoked_at = now(),
      revoke_reason = 'assignment_expired'
    WHERE status = 'active'
      AND metadata->>'assignment_id' = ANY(expired_ids_text);

    GET DIAGNOSTICS ce_count = ROW_COUNT;
  END IF;

  -- Step 4: Expire B2C direct course entitlements whose validity has passed
  UPDATE public.student_entitlements
  SET status = 'expired'
  WHERE status = 'active'
    AND source_type = 'b2c_direct'
    AND valid_until IS NOT NULL
    AND valid_until < now();

  -- Step 5: Expire content-level entitlements whose validity has passed
  UPDATE public.student_content_entitlements
  SET status = 'expired'
  WHERE status = 'active'
    AND valid_until IS NOT NULL
    AND valid_until < now();

  RETURN QUERY SELECT a_count, e_count + ce_count;
END;
$$;

COMMENT ON FUNCTION public.expire_assignments() IS
'Expires content_assignments and linked student_entitlements/student_content_entitlements. Also expires direct entitlements whose valid_until has passed.';

COMMIT;