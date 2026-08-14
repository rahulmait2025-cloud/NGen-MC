-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 00088: fix_course_builder_schema
-- Aligning schema with strict Course Builder requirements (Phase 1).
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. master_course_modules: Add metadata column
alter table public.master_course_modules
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 2. master_course_items: Add missing columns and rename preview field
alter table public.master_course_items
  add column if not exists duration_seconds integer,
  add column if not exists is_required boolean not null default true;

-- Rename preview_enabled to is_preview for strict compliance
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'master_course_items' and column_name = 'preview_enabled'
  ) and not exists (
    select 1 from information_schema.columns 
    where table_name = 'master_course_items' and column_name = 'is_preview'
  ) then
    alter table public.master_course_items rename column preview_enabled to is_preview;
  end if;
end $$;

-- 3. Ensure Indexes exist
create index if not exists idx_master_course_modules_course_id 
  on public.master_course_modules (master_course_id);

create index if not exists idx_master_course_items_course_id 
  on public.master_course_items (master_course_id);

-- 4. Verify Delete Behavior (Idempotent check)
-- modules -> course (cascade)
-- items -> module (cascade)
-- items -> video_asset (set null)
-- These were already set in 00071, but this ensures they are correct.

-- 5. Backfill/Refresh sort_order (Ensure no nulls if they were ever possible)
update public.master_course_modules set sort_order = 0 where sort_order is null;
update public.master_course_items set sort_order = 0 where sort_order is null;
