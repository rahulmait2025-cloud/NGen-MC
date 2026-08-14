-- Migration: refine_master_course_pillar_stats_view
-- 1. Adds tp_folder_uuid to the view for better client-side filtering.
-- 2. Filters out 'deleted' pillars (unpublished + no TP folder).

-- We must DROP because we are adding a column
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
  p.tp_folder_uuid,
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
where 
  -- Hide pillars that are unpublished AND have no TP folder (fully deleted)
  -- But keep Drafts (tp_folder_uuid is null but status is 'draft')
  -- And keep Archived pillars (unpublished but tp_folder_uuid exists)
  (p.publish_status != 'unpublished' or p.tp_folder_uuid is not null)
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
  p.tp_folder_uuid,
  p.tp_last_synced_at,
  p.tp_last_error;

comment on view public.master_course_pillar_stats is
  'Aggregated stats for Master Course Pillars including course, module, and active video counts. Filters out fully deleted pillars.';
