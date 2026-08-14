-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 00182: Entitlement performance indexes
--
-- Adds indexes used by expire_assignments() cron and revokeAssignment().
-- These columns are currently queried via full table scans.
--
-- SAFETl CREATE INDEX IF NOT EXISTS (idempotent)
--   - No unique constraints added
--   - No data changes
--   - CONCURRENTLY not used (requires separate transaction; safe for small tables)
-- ───────────────Y:
--   - Al───────────────────────────────────────────────────────────────

BEGIN;

-- Index for expire_assignments() and revokeAssignment() on student_entitlements
-- Used by: WHERE metadata->>'assignment_id' = ANY(expired_ids_text)
CREATE INDEX IF NOT EXISTS idx_student_entitlements_assignment_id
  ON public.student_entitlements ((metadata->>'assignment_id'));

-- Index for expire_assignments() and revokeAssignment() on student_content_entitlements
-- Used by: WHERE metadata->>'assignment_id' = ANY(expired_ids_text)
CREATE INDEX IF NOT EXISTS idx_student_content_entitlements_assignment_id
  ON public.student_content_entitlements ((metadata->>'assignment_id'));

-- Partial index for expire_assignments() cron on content_assignments
-- Used by: WHERE status = 'active' AND end_date IS NOT NULL AND end_date < now()
CREATE INDEX IF NOT EXISTS idx_content_assignments_active_end_date
  ON public.content_assignments (end_date)
  WHERE status = 'active' AND end_date IS NOT NULL;

COMMIT;
