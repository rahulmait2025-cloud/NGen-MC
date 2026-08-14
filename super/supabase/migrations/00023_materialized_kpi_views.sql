-- Migration 00023: Materialized KPI Views and Analytics Infrastructure (renumbered from 00011 to avoid version conflict with 00011_activity_events)
-- Creates precomputed views for dashboards based on real schema tables from 00014/00016

-------------------------------------------------------------------------------
-- 1. MATERIALIZED VIEWS (reference real tables from 00014 content_delivery)
-------------------------------------------------------------------------------

drop materialized view if exists public.mv_platform_kpis cascade;
drop materialized view if exists public.mv_student_progress_kpis cascade;
drop materialized view if exists public.mv_college_kpis cascade;

-- 1A. College KPIs
create materialized view public.mv_college_kpis as
with student_stats as (
  select
    college_id,
    count(distinct id) as total_students,
    count(distinct id) filter (where github_url is not null and linkedin_url is not null and resume_url is not null) as profile_completed_count,
    count(distinct id) filter (where placement_ready_status = 'ready') as placement_ready_count,
    count(distinct id) filter (where placement_ready_status = 'placed') as placed_count,
    count(distinct id) filter (where placement_ready_status = 'review') as pending_placement_review_count
  from public.students
  group by college_id
),
course_stats as (
  select
    college_id,
    count(distinct id) as total_courses,
    count(distinct id) filter (where status = 'published') as total_courses_published
  from public.courses
  group by college_id
),
lecture_stats as (
  select
    c.college_id,
    count(distinct l.id) as total_lectures,
    count(distinct l.id) filter (where l.status = 'published') as total_lectures_published
  from public.courses c
  left join public.course_modules cm on cm.course_id = c.id
  left join public.lectures l on l.course_module_id = cm.id
  group by c.college_id
),
cohort_stats as (
  select college_id, count(distinct cohort_id) as total_cohorts
  from public.students
  where cohort_id is not null
  group by college_id
),
mentor_stats as (
  select college_id, count(distinct user_id) as total_mentors
  from public.college_memberships
  where role in ('college_admin', 'faculty_spoc')
  group by college_id
),
enrollment_stats as (
  select
    c.college_id,
    count(distinct ce.id) as total_enrollment_records,
    count(distinct ce.id) filter (where ce.id in (
      select lp.enrollment_id from public.lecture_progress lp where lp.completed_at is not null
    )) as total_lectures_completed
  from public.course_enrollments ce
  join public.courses c on c.id = ce.course_id
  group by c.college_id
)
select
  c.id as college_id,
  c.status,
  coalesce(s.total_students, 0) as total_students,
  coalesce(s.total_students, 0) as active_students,
  0 as inactive_students,
  coalesce(ch.total_cohorts, 0) as total_cohorts,
  coalesce(m.total_mentors, 0) as total_mentors,
  coalesce(cs.total_courses, 0) as total_courses_assigned,
  coalesce(ls.total_lectures_published, 0) as total_lectures_published,
  coalesce(es.total_lectures_completed, 0) as total_lectures_completed,
  case when coalesce(es.total_enrollment_records, 0) > 0 then (coalesce(es.total_lectures_completed, 0)::numeric / es.total_enrollment_records) * 100 else 0 end as lecture_completion_rate,
  0 as attendance_rate,
  0 as average_assessment_score,
  0 as assessment_completion_rate,
  coalesce(s.placement_ready_count, 0) as placement_ready_count,
  coalesce(s.placed_count, 0) as placed_count,
  coalesce(s.pending_placement_review_count, 0) as pending_placement_review_count,
  case when coalesce(s.total_students, 0) > 0 then (coalesce(s.profile_completed_count, 0)::numeric / s.total_students) * 100 else 0 end as resume_completion_rate,
  case when coalesce(s.total_students, 0) > 0 then (coalesce(s.profile_completed_count, 0)::numeric / s.total_students) * 100 else 0 end as linkedin_completion_rate,
  case when coalesce(s.total_students, 0) > 0 then (coalesce(s.profile_completed_count, 0)::numeric / s.total_students) * 100 else 0 end as github_completion_rate,
  ((case when coalesce(es.total_enrollment_records, 0) > 0 then (coalesce(es.total_lectures_completed, 0)::numeric / es.total_enrollment_records) * 100 else 0 end) * 0.5 +
   0 * 0.5) as engagement_score,
  null::timestamptz as last_activity_timestamp
from public.colleges c
left join student_stats s on s.college_id = c.id
left join course_stats cs on cs.college_id = c.id
left join lecture_stats ls on ls.college_id = c.id
left join cohort_stats ch on ch.college_id = c.id
left join mentor_stats m on m.college_id = c.id
left join enrollment_stats es on es.college_id = c.id;

create unique index idx_mv_college_kpis_college_id on public.mv_college_kpis (college_id);

-- 1B. Student Progress KPIs (references real schema: course_enrollments + lecture_progress)
create materialized view public.mv_student_progress_kpis as
with lecture_stats as (
  select
    ce.student_id,
    count(lp.id) as enrolled_lectures,
    count(lp.id) filter (where lp.completed_at is not null) as lectures_completed,
    max(lp.updated_at) as max_lecture_date
  from public.course_enrollments ce
  left join public.lecture_progress lp on lp.enrollment_id = ce.id
  group by ce.student_id
)
select
  s.id as student_id,
  coalesce(l.lectures_completed, 0) as lectures_completed,
  coalesce(l.enrolled_lectures, 0) as total_lectures,
  case when coalesce(l.enrolled_lectures, 0) > 0 then (l.lectures_completed::numeric / l.enrolled_lectures) * 100 else 0 end as course_completion_percentage,
  0 as attendance_rate,
  0 as assignments_submitted,
  0 as assessments_completed,
  0 as average_score,
  case
    when s.github_url is not null and s.linkedin_url is not null and s.resume_url is not null then 100
    when (s.github_url is not null and s.linkedin_url is not null) or (s.github_url is not null and s.resume_url is not null) or (s.linkedin_url is not null and s.resume_url is not null) then 66
    when s.github_url is not null or s.linkedin_url is not null or s.resume_url is not null then 33
    else 0
  end as profile_completion_score,
  0 as placement_readiness_score,
  l.max_lecture_date as last_seen,
  0 as engagement_score
from public.students s
left join lecture_stats l on l.student_id = s.id;

create unique index idx_mv_student_kpis_student_id on public.mv_student_progress_kpis (student_id);

-- 2C. Platform Global KPIs
create materialized view public.mv_platform_kpis as
select
  1 as platform_id,
  count(id) as total_colleges,
  count(id) filter (where status = 'active') as active_colleges,
  (select sum(total_students) from mv_college_kpis) as total_students,
  (select sum(active_students) from mv_college_kpis) as active_students,
  (select sum(placed_count) from mv_college_kpis) as total_placements,
  (select sum(active_students) from mv_college_kpis) as monthly_active_users, -- Stubbed to active users
  (select avg(average_assessment_score) from mv_college_kpis) as average_assessment_score,
  (select avg(course_completion_percentage) from mv_student_progress_kpis) as platform_completion_rate,
  -- Note: top colleges and colleges at risk are usually handled via window functions/JSON arrays. For a flat KPI table, we omit complex nested arrays unless specifically needed in JSON.
  null::jsonb as top_colleges,
  null::jsonb as colleges_at_risk
from public.colleges;

create unique index idx_mv_platform_kpis_id on public.mv_platform_kpis (platform_id);

-------------------------------------------------------------------------------
-- 3. BACKGROUND REFRESH JOBS (pg_cron)
-------------------------------------------------------------------------------
create extension if not exists pg_cron;

-- Refresh every hour
select cron.schedule('refresh_mv_college_kpis', '0 * * * *', 'refresh materialized view concurrently public.mv_college_kpis');
select cron.schedule('refresh_mv_student_kpis', '0 * * * *', 'refresh materialized view concurrently public.mv_student_progress_kpis');
select cron.schedule('refresh_mv_platform_kpis', '0 * * * *', 'refresh materialized view concurrently public.mv_platform_kpis');

-- Allow anon and authenticated to read views for dashboard accessibility (respecting app logic)
grant select on public.mv_college_kpis to anon, authenticated;
grant select on public.mv_student_progress_kpis to anon, authenticated;
grant select on public.mv_platform_kpis to anon, authenticated;

-- vw_college_rankings (depends on mv_college_kpis; moved from 00012)
create or replace view public.vw_college_rankings as
select
  kpi.college_id as tenant_id,
  c.name as college_name,
  kpi.engagement_score,
  kpi.placement_ready_count,
  kpi.average_assessment_score,
  dense_rank() over (order by kpi.engagement_score desc nulls last) as engagement_rank,
  dense_rank() over (order by kpi.placement_ready_count desc nulls last) as placement_rank
from public.mv_college_kpis kpi
join public.colleges c on kpi.college_id = c.id
where c.status = 'active';
grant select on public.vw_college_rankings to authenticated;
