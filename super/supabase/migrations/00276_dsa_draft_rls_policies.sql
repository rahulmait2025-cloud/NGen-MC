-- Migration: 00276_dsa_draft_rls_policies.sql
-- Description: Define explicit service-role-only policies for draft tables to resolve the "RLS Enabled No Policy" linter warning, while maintaining a secure default-deny posture for anon and authenticated users.

BEGIN;

-- Explicitly allow service_role to manage dsa_categories_draft (satisfies linter)
DROP POLICY IF EXISTS "Service role full" ON public.dsa_categories_draft;
CREATE POLICY "Service role full" ON public.dsa_categories_draft
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Explicitly allow service_role to manage dsa_problems_draft (satisfies linter)
DROP POLICY IF EXISTS "Service role full" ON public.dsa_problems_draft;
CREATE POLICY "Service role full" ON public.dsa_problems_draft
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
