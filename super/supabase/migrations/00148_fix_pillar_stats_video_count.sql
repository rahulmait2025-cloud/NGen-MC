-- Migration: 00148_fix_pillar_stats_video_count.sql
-- Purpose: Fix video_count in pillar stats to count synced lessons (master_course_items)
--          instead of raw video_assets. This ensures SuperAdmin shows the same count
--          as CollegeAdmin and LMS.
--
-- Issue: SuperAdmin was counting all video_assets, but CollegeAdmin/LMS only show
--        videos that have been synced to master_course_items (lessons).

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
  -- Count synced video lessons (items with item_type='video' and published status)
  count(distinct mci.id) filter (where mci.item_type = 'video' and mci.publish_status = 'published') as video_count
from
  public.master_course_pillars p
left join public.master_courses mc on mc.pillar_id = p.id
  and (mc.publish_status != 'unpublished' or mc.tp_folder_uuid is not null)
left join public.master_course_modules mcm on mcm.master_course_id = mc.id
  and (mcm.publish_status != 'unpublished' or mcm.tp_folder_uuid is not null)
left join public.master_course_items mci on mci.master_course_id = mc.id
  and mci.module_id = mcm.id
where 
  -- Hide pillars that are unpublished AND have no TP folder (fully deleted)
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
  'Aggregated stats for Master Course Pillars. video_count now reflects synced lessons (master_course_items), matching CollegeAdmin/LMS display.';
