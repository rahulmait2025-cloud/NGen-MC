-- Phase 6 — optional indexes for learner entitlement reads (service-role / internal queries).
-- Runtime LMS uses service role after auth; these indexes still help admin verification and bulk scans.

comment on table public.tiered_entitlements is
  'Learner grants (assignment/purchase/manual). Phase 6+: LMS may read a student''s rows via service role after session checks; RLS remains superadmin for direct client access unless extended later.';

-- Partial index for active entitlement lookups (see 00066: `pending` removed from entitlement status model).
create index if not exists idx_tiered_entitlements_student_status_active
  on public.tiered_entitlements (student_id)
  where status = 'active';

create index if not exists idx_tiered_content_assets_source_global_lesson
  on public.tiered_content_assets (source_kind, source_ref_id)
  where source_kind = 'global_course_lesson' and source_ref_id is not null;
