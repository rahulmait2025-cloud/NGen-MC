-- Migration: 00179_student_content_entitlements_active_unique_by_source
-- Purpose: Add a broader unique partial index to prevent duplicate active
--          scoped entitlements across all source types.
--
-- Context:
--   Existing index idx_student_content_entitlements_active_manual only
--   protects source_type = 'manual_grant'. Other source types
--   (college_assignment, b2c_direct, payment, b2b_college) were previously
--   unprotected and could accumulate duplicates.
--
--   Phase 6B1 backfilled scoped college_assignment entitlements.
--   Phase 6B3 now locks the door so future inserts are protected.
--
-- Safety pre-check (run before migration to confirm 0 duplicates):

--   select
--     student_id,
--     assigned_entity_type,
--     assigned_entity_id,
--     source_type,
--     status,
--     count(*) as duplicate_count
--   from public.student_content_entitlements
--   where status = 'active'
--   group by student_id, assigned_entity_type, assigned_entity_id, source_type, status
--   having count(*) > 1;

--   If this returns any rows, do NOT run this migration — investigate first.
--   Phase 6A audit confirmed 0 duplicate active rows, so this is safe.

-- ==============================================================================

begin;

-- Broader unique index covering all source types for active entitlements.
-- This is a superset of the existing idx_student_content_entitlements_active_manual
-- (which only covers source_type = 'manual_grant'). We keep the old index for
-- backward compatibility; it is now redundant but harmless.
create unique index if not exists idx_student_content_entitlements_active_unique_by_source
  on public.student_content_entitlements (
    student_id,
    assigned_entity_type,
    assigned_entity_id,
    source_type
  )
  where status = 'active';

commit;

-- Verification (run after migration):
--   select
--     indexname,
--     indexdef
--   from pg_indexes
--   where schemaname = 'public'
--     and tablename = 'student_content_entitlements'
--     and indexname = 'idx_student_content_entitlements_active_unique_by_source';
