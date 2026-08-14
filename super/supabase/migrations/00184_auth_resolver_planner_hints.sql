-- ============================================================
-- 00184: Auth resolver planner hints
-- Purpose:
--   Make auth resolver RPCs cheaper for PostgREST/Postgres planning.
--
-- Safety:
--   - No table changes
--   - No data changes
--   - No function body changes
--   - No RLS changes
--   - Keeps existing security model
-- ============================================================

BEGIN;

-- Fail early if expected auth resolver functions do not exist.
DO $$
BEGIN
  IF to_regprocedure('public.resolve_admin_auth_context(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'Missing function public.resolve_admin_auth_context(uuid,text)';
  END IF;

  IF to_regprocedure('public.resolve_student_auth_context(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'Missing function public.resolve_student_auth_context(uuid,text)';
  END IF;
END $$;

-- Admin auth resolver:
-- This function returns at most one auth-context row for one user + optional college slug.
ALTER FUNCTION public.resolve_admin_auth_context(uuid, text) STABLE;
ALTER FUNCTION public.resolve_admin_auth_context(uuid, text) COST 5;
ALTER FUNCTION public.resolve_admin_auth_context(uuid, text) ROWS 1;

-- Student auth resolver:
-- This function also returns at most one auth-context row for one user + optional college slug.
ALTER FUNCTION public.resolve_student_auth_context(uuid, text) STABLE;
ALTER FUNCTION public.resolve_student_auth_context(uuid, text) COST 5;
ALTER FUNCTION public.resolve_student_auth_context(uuid, text) ROWS 1;

-- Preserve safe execution model.
REVOKE ALL ON FUNCTION public.resolve_admin_auth_context(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_admin_auth_context(uuid, text) FROM anon;

REVOKE ALL ON FUNCTION public.resolve_student_auth_context(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_student_auth_context(uuid, text) FROM anon;

GRANT EXECUTE ON FUNCTION public.resolve_admin_auth_context(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_student_auth_context(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.resolve_admin_auth_context(uuid, text) IS
'Auth context resolver for college/admin portals. Planner hints: STABLE, COST 5, ROWS 1. Logic unchanged.';

COMMENT ON FUNCTION public.resolve_student_auth_context(uuid, text) IS
'Auth context resolver for student portal. Planner hints: STABLE, COST 5, ROWS 1. Logic unchanged.';

COMMIT;