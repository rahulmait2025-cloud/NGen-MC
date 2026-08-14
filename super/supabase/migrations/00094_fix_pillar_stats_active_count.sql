-- Migration: update_master_course_pillar_stats_to_filter_active_videos
-- Filters out 'removed' assets from the video count in the pillar stats view.

-- We must DROP because CREATE OR REPLACE VIEW cannot change column signatures/order
DROP VIEW IF EXISTS public.master_course_pillar_stats CASCADE;

create view public.master_course_pillar_stats 
with (security_invoker = true)
as
select
  p.id as pillar_id,
  p.title,
  p.code,
  p.slug,
  p.description,
  p.short_description,
  p.publish_status,
  p.visible_to_college_admins,
  p.visible_to_college_students,
  p.visible_to_global_students,
  p.tp_folder_status,
  nullif(greatest(coalesce(p.tp_last_synced_at, '-infinity'), coalesce(max(mc.tp_last_synced_at), '-infinity')), '-infinity') as tp_last_synced_at,
  p.tp_last_error,
  count(distinct mc.id) as course_count,
  count(distinct mcm.id) as module_count,
  count(distinct va.id) filter (where va.sync_status = 'active') as video_count
from
  public.master_course_pillars p
left join public.master_courses mc on mc.pillar_id = p.id
left join public.master_course_modules mcm on mcm.master_course_id = mc.id
left join public.video_assets va on va.master_course_id = mc.id
group by
  p.id, 
  p.title,
  p.code,
  p.slug,
  p.description,
  p.short_description,
  p.publish_status,
  p.visible_to_college_admins,
  p.visible_to_college_students,
  p.visible_to_global_students,
  p.tp_folder_status,
  p.tp_last_synced_at,
  p.tp_last_error;

comment on view public.master_course_pillar_stats is
  'Aggregated stats for Master Course Pillars including course, module, and active video counts.';
