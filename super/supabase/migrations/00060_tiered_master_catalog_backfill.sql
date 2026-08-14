-- Tiered master catalog — Phase 2 backfill support (indexes + documentation only)
--
-- Phase 2 mirrors existing public.global_courses / global_course_modules / global_course_lessons
-- into tiered_master_courses, tiered_content_assets, and tiered_master_course_assets.
-- Student and LMS runtime continue to read global_* tables only; tiered rows are preparatory.

comment on table public.tiered_master_courses is
  'Logical grouping of reusable content assets. Phase 2: rows may be mirrored from public.global_courses for compatibility prep; runtime authority remains global_courses until later phases.';

comment on table public.tiered_content_assets is
  'Smallest reusable learning unit. Phase 2: rows may be mirrored from public.global_course_lessons (source_kind=global_course_lesson, source_ref_id=lesson id). LMS playback still uses global_course_lessons.';

comment on table public.tiered_master_course_assets is
  'Ordered map of assets into a master course. Phase 2: ordering mirrors global module + lesson sort_order; idx (master_course_id, sort_order) already exists from 00059.';

-- Deterministic backfill upserts use stable codes; these indexes speed verification and idempotent lookups by origin.
create index if not exists idx_tiered_content_assets_source_kind_ref
  on public.tiered_content_assets (source_kind, source_ref_id)
  where source_ref_id is not null;

-- Mirror key stored in metadata.global_course_id by the Phase 2 backfill job.
create index if not exists idx_tiered_master_courses_metadata_global_course_id
  on public.tiered_master_courses ((metadata->>'global_course_id'))
  where (metadata->>'global_course_id') is not null;

-- Optional: lineage also records global_lesson_id for traceability (see app backfill).
create index if not exists idx_tiered_content_assets_lineage_global_lesson_id
  on public.tiered_content_assets ((lineage->>'global_lesson_id'))
  where (lineage->>'global_lesson_id') is not null;
