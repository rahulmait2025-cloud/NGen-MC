-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 00152: master_course_delivery_stats
-- Canonical view for course delivery statistics.
-- Replaces ad-hoc counting logic scattered across SuperAdmin, CollegeAdmin, LMS.
--
-- Counting rules:
-- 1. module_count:  published modules where visible_to_students IS true OR null
-- 2. lesson_count:  published items (all types)
--    NOTE: master_course_items does NOT have visible_to_students column,
--          so item-level visibility filtering is not applied to lesson_count.
-- 3. video_count:   published items linked to active/completed video assets only
--          Filters: active sync_status, completed processing_status, removed_at null
-- 4. total_duration_seconds: sum of item duration_seconds for published items
--
-- Security: Readable by authenticated users (RLS on base tables restricts writes).
-- ──────────────────────────────────────────────────────────────────────────────

create or replace view public.master_course_delivery_stats as
select
  c.id as master_course_id,

  -- module_count: published modules visible to students
  count(distinct m.id) filter (
    where m.publish_status = 'published'
      and (m.visible_to_students is true or m.visible_to_students is null)
  ) as module_count,

  -- lesson_count: all published items
  -- NOTE: master_course_items does not have visible_to_students column,
  -- so item-level visibility filtering is not applied here.
  count(distinct i.id) filter (
    where i.publish_status = 'published'
  ) as lesson_count,

  -- video_count: published items with a valid active/completed video asset
  -- Filters: sync_status=active, processing_status=completed, removed_at is null
  count(distinct i.id) filter (
    where i.publish_status = 'published'
      and i.video_asset_id is not null
      and va.sync_status = 'active'
      and va.processing_status = 'completed'
      and va.removed_at is null
  ) as video_count,

  -- total_duration_seconds: sum item durations for published items
  coalesce(sum(i.duration_seconds) filter (
    where i.publish_status = 'published'
      and i.duration_seconds is not null
  ), 0)::integer as total_duration_seconds,

  -- updated_at: greatest update time across course, modules, items
  greatest(
    c.updated_at,
    max(m.updated_at) filter (where m.publish_status = 'published'),
    max(i.updated_at) filter (where i.publish_status = 'published')
  ) as updated_at

from public.master_courses c
left join public.master_course_modules m
  on m.master_course_id = c.id
left join public.master_course_items i
  on i.master_course_id = c.id
left join public.video_assets va
  on va.id = i.video_asset_id
group by c.id;

-- Grant select to authenticated users
grant select on public.master_course_delivery_stats to authenticated;

comment on view public.master_course_delivery_stats is
'Canonical delivery stats per master course: module_count, lesson_count, video_count, total_duration_seconds. Counts only published content visible to students.';