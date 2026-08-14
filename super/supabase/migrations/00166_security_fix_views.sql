-- ============================================================
-- 00166: Security Fix – Views Security Invoker + Auth Users Exposure
-- Fixes database linter errors:
--   1. auth_users_exposed: vw_audit_dashboard exposed auth.users to anon
--   2. security_definer_view: 29 views were SECURITY DEFINER (old PG default)
-- ============================================================

-- ────────────────────────────────────────────────────────────────────
-- FIX 1: vw_audit_dashboard – stop exposing auth.users
-- Replace auth.users join with public.profiles join
-- Also add security_invoker so view respects RLS of querying user
-- ────────────────────────────────────────────────────────────────────
create or replace view public.vw_audit_dashboard
with (security_invoker = true)
as
select
  a.id,
  a.action,
  a.severity,
  p.email::varchar(255) as actor_email,
  c.name as college_name,
  a.resource_type,
  a.resource_id,
  a.payload,
  a.ip_address,
  a.created_at
from public.audit_logs a
left join public.profiles p on a.actor_id = p.id
left join public.colleges c on a.college_id = c.id
order by a.created_at desc;

-- Revoke public (anon) access to the view; only superadmin should query it
revoke select on public.vw_audit_dashboard from anon, authenticated;
grant select on public.vw_audit_dashboard to authenticated;

-- ────────────────────────────────────────────────────────────────────
-- FIX 2: Add security_invoker to all views that were flagged as
-- SECURITY DEFINER (old PG default for views created before PG 15)
-- This makes them respect RLS of the querying user instead of the owner
-- ────────────────────────────────────────────────────────────────────

-- Content delivery views (00015)
create or replace view public.v_course_lecture_counts
with (security_invoker = true)
as
select
  c.id as course_id,
  c.college_id,
  c.title as course_title,
  count(l.id) as total_lectures
from public.courses c
join public.course_modules cm on cm.course_id = c.id
join public.lectures l on l.course_module_id = cm.id and l.status = 'published'
where c.status = 'published'
group by c.id, c.college_id, c.title;

create or replace view public.v_course_completion_rate
with (security_invoker = true)
as
select
  ce.course_id,
  c.college_id,
  c.title as course_title,
  count(distinct ce.student_id) as enrolled_count,
  count(distinct case
    when coalesce(agg.completed_lectures, 0) >= coalesce(lc.total_lectures, 0) and coalesce(lc.total_lectures, 0) > 0
    then ce.student_id
  end) as completed_count,
  case
    when count(distinct ce.student_id) = 0 then 0
    else round(
      100.0 * count(distinct case
        when coalesce(agg.completed_lectures, 0) >= coalesce(lc.total_lectures, 0) and coalesce(lc.total_lectures, 0) > 0
        then ce.student_id
      end) / nullif(count(distinct ce.student_id), 0),
      2
    )
  end as completion_rate_pct
from public.course_enrollments ce
join public.courses c on c.id = ce.course_id
left join public.v_course_lecture_counts lc on lc.course_id = ce.course_id
left join (
  select enrollment_id, count(*) as completed_lectures
  from public.lecture_progress
  where completed_at is not null
  group by enrollment_id
) agg on agg.enrollment_id = ce.id
group by ce.course_id, c.college_id, c.title, lc.total_lectures;

create or replace view public.v_lecture_completion_counts
with (security_invoker = true)
as
select
  l.id as lecture_id,
  l.course_module_id,
  l.title as lecture_title,
  l.sort_order as lecture_sort_order,
  cm.course_id,
  cm.title as module_title,
  cm.sort_order as module_sort_order,
  c.college_id,
  count(lp.id) filter (where lp.completed_at is not null) as completed_count,
  count(lp.id) as started_count
from public.lectures l
join public.course_modules cm on cm.id = l.course_module_id
join public.courses c on c.id = cm.course_id
left join public.lecture_progress lp on lp.lecture_id = l.id
group by l.id, l.course_module_id, l.title, l.sort_order, cm.course_id, cm.title, cm.sort_order, c.college_id;

create or replace view public.v_module_completion_rate
with (security_invoker = true)
as
select
  cm.id as module_id,
  cm.course_id,
  cm.title as module_title,
  cm.sort_order,
  c.college_id,
  count(distinct ce.id) as enrollments_in_course,
  count(distinct case when mod_agg.completed_lectures = mod_agg.total_lectures and mod_agg.total_lectures > 0 then ce.id end) as completed_module_count,
  round(
    100.0 * count(distinct case when mod_agg.completed_lectures = mod_agg.total_lectures and mod_agg.total_lectures > 0 then ce.id end)
    / nullif(count(distinct ce.id), 0),
    2
  ) as completion_rate_pct
from public.course_modules cm
join public.courses c on c.id = cm.course_id
left join public.course_enrollments ce on ce.course_id = cm.course_id
left join (
  select
    lp.enrollment_id,
    l.course_module_id,
    count(distinct l.id) as total_lectures,
    count(distinct case when lp.completed_at is not null then l.id end) as completed_lectures
  from public.lecture_progress lp
  join public.lectures l on l.id = lp.lecture_id
  group by lp.enrollment_id, l.course_module_id
) mod_agg on mod_agg.enrollment_id = ce.id and mod_agg.course_module_id = cm.id
group by cm.id, cm.course_id, cm.title, cm.sort_order, c.college_id;

create or replace view public.v_lecture_drop_off
with (security_invoker = true)
as
select
  lcc.lecture_id,
  lcc.course_id,
  lcc.college_id,
  lcc.lecture_title,
  lcc.module_title,
  lcc.lecture_sort_order,
  lcc.module_sort_order,
  lcc.completed_count,
  lcc.started_count,
  lc.total_lectures as course_total_lectures,
  case
    when ce_cnt.enrolled_count = 0 then 0
    else round(100.0 * lcc.completed_count / nullif(ce_cnt.enrolled_count, 0), 2)
  end as completion_pct
from public.v_lecture_completion_counts lcc
left join public.v_course_lecture_counts lc on lc.course_id = lcc.course_id
left join (select course_id, count(*) as enrolled_count from public.course_enrollments group by course_id) ce_cnt on ce_cnt.course_id = lcc.course_id;

create or replace view public.v_inactive_students_by_course
with (security_invoker = true)
as
select
  ce.course_id,
  ce.student_id,
  c.college_id,
  c.title as course_title,
  ce.enrolled_at,
  max(lp.updated_at) as last_activity_at,
  (current_date - (coalesce(max(lp.updated_at), ce.enrolled_at))::date) as days_inactive
from public.course_enrollments ce
join public.courses c on c.id = ce.course_id
left join public.lecture_progress lp on lp.enrollment_id = ce.id
group by ce.id, ce.course_id, ce.student_id, ce.enrolled_at, c.college_id, c.title
having (max(lp.updated_at) is null and (current_date - ce.enrolled_at::date) >= 14)
    or (max(lp.updated_at) is not null and (current_date - max(lp.updated_at)::date) >= 14);

-- Placement views (00018)
create or replace view public.v_placement_readiness_funnel
with (security_invoker = true)
as
select
  college_id,
  count(*) filter (where status = 'not_ready') as not_ready_count,
  count(*) filter (where status = 'needs_improvement') as needs_improvement_count,
  count(*) filter (where status = 'interview_ready') as interview_ready_count,
  count(*) filter (where status = 'placed') as placed_count,
  count(*) as total_profiles
from public.placement_profiles
group by college_id;

create or replace view public.v_placement_pending_reviews
with (security_invoker = true)
as
select
  pp.college_id,
  pp.id as profile_id,
  pp.student_id,
  (select count(*) from public.resume_versions rv where rv.placement_profile_id = pp.id and rv.status = 'pending') as pending_resume,
  (select count(*) from public.linkedin_reviews lr where lr.student_id = pp.student_id and lr.college_id = pp.college_id and lr.status = 'pending') as pending_linkedin,
  (select count(*) from public.github_reviews gr where gr.student_id = pp.student_id and gr.college_id = pp.college_id and gr.status = 'pending') as pending_github
from public.placement_profiles pp;

create or replace view public.v_placement_company_pipeline
with (security_invoker = true)
as
select
  college_id,
  company_name,
  count(*) as application_count,
  count(*) filter (where status = 'applied') as applied_count,
  count(*) filter (where status = 'shortlisted') as shortlisted_count,
  count(*) filter (where status = 'interview') as interview_count,
  count(*) filter (where status = 'offer') as offer_count,
  count(*) filter (where status = 'rejected') as rejected_count
from public.student_applications
group by college_id, company_name;

create or replace view public.v_placement_mock_interview_outcomes
with (security_invoker = true)
as
select
  college_id,
  outcome,
  count(*) as cnt
from public.mock_interviews
where outcome is not null
group by college_id, outcome;

create or replace view public.v_placement_offer_stats
with (security_invoker = true)
as
select
  college_id,
  count(*) as total_offers,
  count(*) filter (where status = 'accepted') as accepted_count,
  count(*) filter (where verified_at is not null) as verified_count
from public.offers
group by college_id;

-- Analytics foundation views (00075)
create or replace view public.analytics_revenue_summary
with (security_invoker = true)
as
select
    date_trunc('day', o.created_at) as report_date,
    o.source,
    o.entity_type,
    o.status,
    count(o.id) as total_orders,
    sum(o.base_amount_minor) as total_base_revenue_minor,
    sum(o.discount_amount_minor) as total_discount_minor,
    sum(o.total_amount_minor) as total_net_revenue_minor
from public.orders o
group by 1, 2, 3, 4;

create or replace view public.analytics_enrollment_summary
with (security_invoker = true)
as
select
    date_trunc('day', se.created_at) as report_date,
    se.source_type,
    se.status,
    se.master_course_id,
    se.college_id,
    count(se.id) as total_entitlements
from public.student_entitlements se
group by 1, 2, 3, 4, 5;

create or replace view public.analytics_content_performance
with (security_invoker = true)
as
select
    sp.item_id,
    mci.title as item_title,
    count(distinct sp.student_id) as total_students_started,
    sum(case when sp.completed then 1 else 0 end) as total_students_completed,
    sum(sp.watched_seconds) as total_watched_seconds
from public.student_progress sp
left join public.master_course_items mci on sp.item_id = mci.id
group by 1, 2;

create or replace view public.analytics_college_performance
with (security_invoker = true)
as
select
    se.college_id,
    c.name as college_name,
    count(distinct se.student_id) as active_students,
    count(se.id) as total_entitlements,
    count(distinct se.master_course_id) as unique_courses_assigned
from public.student_entitlements se
left join public.colleges c on se.college_id = c.id
where se.status = 'active' and se.college_id is not null
group by 1, 2;

-- Advanced analytics views (00078)
create or replace view public.v_college_weekly_performance
with (security_invoker = true)
as
select
    aa.tenant_id as college_id,
    date_trunc('week', ar.created_at) as week_start,
    avg(ar.score) as avg_score,
    count(ar.id) as submissions_count
from public.assessment_results ar
join public.assessment_attempts att on ar.attempt_id = att.id
join public.assessment_assignments aa on att.assignment_id = aa.id
group by 1, 2;

create or replace view public.v_college_score_distribution
with (security_invoker = true)
as
select
    aa.tenant_id as college_id,
    case
        when ar.score < 20 then '0-20'
        when ar.score < 40 then '20-40'
        when ar.score < 60 then '40-60'
        when ar.score < 80 then '60-80'
        else '80-100'
    end as score_range,
    count(distinct att.student_id) as student_count
from public.assessment_results ar
join public.assessment_attempts att on ar.attempt_id = att.id
join public.assessment_assignments aa on att.assignment_id = aa.id
group by 1, 2;

create or replace view public.v_college_weekly_engagement
with (security_invoker = true)
as
select
    s.college_id,
    date_trunc('week', svs.started_at) as week_start,
    date_trunc('day', svs.started_at) as report_day,
    count(distinct svs.student_id) as active_students
from public.student_video_sessions svs
join public.students s on svs.student_id = s.id
group by 1, 2, 3;

create or replace view public.v_student_learning_hours
with (security_invoker = true)
as
select
    student_id,
    date_trunc('day', started_at) as report_date,
    sum(watched_duration_seconds) / 3600.0 as hours_logged
from public.student_video_sessions
group by 1, 2;

create or replace view public.v_student_course_progress
with (security_invoker = true)
as
select
    se.student_id,
    se.master_course_id,
    mc.title as course_title,
    count(mci.id) as total_items,
    sum(case when sp.completed then 1 else 0 end) as completed_items,
    sum(sp.watched_seconds) / 3600.0 as hours_invested
from public.student_entitlements se
join public.master_courses mc on se.master_course_id = mc.id
join public.master_course_items mci on mc.id = mci.master_course_id
left join public.student_progress sp on se.student_id = sp.student_id and mci.id = sp.item_id
where se.status = 'active'
group by 1, 2, 3;

-- At-risk analytics view (00080)
create or replace view public.v_student_risk_profile
with (security_invoker = true)
as
with student_latest_activity as (
    select
        student_id,
        max(started_at) as last_active_at
    from public.student_video_sessions
    group by student_id
),
student_avg_scores as (
    select
        att.student_id,
        avg(ar.score) as avg_score
    from public.assessment_results ar
    join public.assessment_attempts att on ar.attempt_id = att.id
    group by att.student_id
),
student_enrollment_age as (
    select
        student_id,
        min(created_at) as first_enrollment_at
    from public.student_entitlements
    where status = 'active'
    group by student_id
),
student_progress_summary as (
    select
        student_id,
        sum(total_items) as total_items,
        sum(completed_items) as completed_items
    from public.v_student_course_progress
    group by student_id
)
select
    s.id as student_id,
    s.college_id,
    p.full_name as student_name,
    p.email as student_email,
    sla.last_active_at,
    sas.avg_score,
    sea.first_enrollment_at,
    sps.completed_items,
    sps.total_items,
    coalesce(
        case
            when (sla.last_active_at is null or sla.last_active_at < now() - interval '14 days')
                 and sea.first_enrollment_at < now() - interval '14 days' then 'Inactive (14d+)'
            when sas.avg_score < 40 then 'Low Performance'
            when coalesce(sps.completed_items, 0) = 0 and sea.first_enrollment_at < now() - interval '14 days' then 'No Progress'
            else 'On Track'
        end,
        'On Track'
    ) as risk_status,
    case
        when ((sla.last_active_at is null or sla.last_active_at < now() - interval '14 days') and sea.first_enrollment_at < now() - interval '14 days')
             or (sas.avg_score < 40)
             or (coalesce(sps.completed_items, 0) = 0 and sea.first_enrollment_at < now() - interval '14 days')
        then true
        else false
    end as is_at_risk
from public.students s
join public.profiles p on s.user_id = p.id
left join student_latest_activity sla on s.id = sla.student_id
left join student_avg_scores sas on s.id = sas.student_id
left join student_enrollment_age sea on s.id = sea.student_id
left join student_progress_summary sps on s.id = sps.student_id;

-- Master course delivery stats (00152)
create or replace view public.master_course_delivery_stats
with (security_invoker = true)
as
select
  c.id as master_course_id,
  count(distinct m.id) filter (
    where m.publish_status = 'published'
      and (m.visible_to_students is true or m.visible_to_students is null)
  ) as module_count,
  count(distinct i.id) filter (
    where i.publish_status = 'published'
  ) as lesson_count,
  count(distinct i.id) filter (
    where i.publish_status = 'published'
      and i.video_asset_id is not null
      and va.sync_status = 'active'
      and va.processing_status = 'completed'
      and va.removed_at is null
  ) as video_count,
  coalesce(sum(i.duration_seconds) filter (
    where i.publish_status = 'published'
      and i.duration_seconds is not null
  ), 0)::integer as total_duration_seconds,
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

-- Video analytics views (00161)
create or replace view public.v_daily_watch_analytics
with (security_invoker = true)
as
select
    date_trunc('day', created_at) as report_date,
    student_id,
    course_id,
    module_id,
    sum(unique_watched_seconds) / 3600.0 as hours_watched,
    count(nullif(completed, false)) as lectures_completed,
    sum(total_video_seconds_watched) as total_seconds_watched
from public.video_watch_sessions
group by date_trunc('day', created_at), student_id, course_id, module_id;

create or replace view public.v_weekly_watch_analytics
with (security_invoker = true)
as
select
    date_trunc('week', created_at) as report_week,
    student_id,
    course_id,
    sum(unique_watched_seconds) / 3600.0 as hours_watched,
    count(nullif(completed, false)) as lectures_completed
from public.video_watch_sessions
group by date_trunc('week', created_at), student_id, course_id;

create or replace view public.v_course_watch_summary
with (security_invoker = true)
as
select
    p.student_id,
    p.course_id,
    count(p.lesson_id) as total_lessons,
    count(nullif(p.completed, false)) as completed_lessons,
    case
        when count(nullif(p.completed, false)) = count(p.lesson_id) and count(p.lesson_id) > 0 then 'completed'
        when sum(p.unique_watched_seconds) > 0 then 'started'
        else 'not_started'
    end as course_status
from public.student_video_progress p
group by p.student_id, p.course_id;

-- Demo course landing sections (00058)
create or replace view public.v_demo_course_landing_sections
with (security_invoker = true)
as
select
  dc.id as demo_course_id,
  dc.title,
  dc.subtitle,
  dc.description,
  dc.hero_image_url,
  dc.hero_video_url,
  dc.thumbnail_url,
  dc.category,
  dc.tags,
  dc.difficulty,
  dc.duration_label,
  dc.language,
  dc.rating_avg,
  dc.rating_count,
  dc.enrollment_count,
  dc.price_minor,
  dc.currency_code,
  dc.display_price_label,
  dc.is_free,
  dc.publish_status,
  dc.slug,
  dc.landing_config,
  (select count(*) from public.demo_course_outcomes o where o.demo_course_id = dc.id) as outcome_count,
  (select count(*) from public.demo_course_curriculum c where c.demo_course_id = dc.id) as curriculum_section_count,
  (select count(*) from public.demo_course_instructors i where i.demo_course_id = dc.id) as instructor_count,
  (select count(*) from public.demo_course_testimonials t where t.demo_course_id = dc.id) as testimonial_count,
  (select count(*) from public.demo_course_faqs f where f.demo_course_id = dc.id) as faq_count,
  (select count(*) from public.demo_course_features f where f.demo_course_id = dc.id) as feature_count,
  (select count(*) from public.demo_course_stats s where s.demo_course_id = dc.id) as stat_count
from public.demo_courses dc;

-- ============================================================
-- Verify: re-grant selects to authenticated (in case invoker
-- change affected grants)
-- ============================================================
grant select on public.v_daily_watch_analytics to authenticated;
grant select on public.v_weekly_watch_analytics to authenticated;
grant select on public.v_course_watch_summary to authenticated;
grant select on public.v_course_lecture_counts to authenticated;
grant select on public.v_course_completion_rate to authenticated;
grant select on public.v_lecture_completion_counts to authenticated;
grant select on public.v_module_completion_rate to authenticated;
grant select on public.v_lecture_drop_off to authenticated;
grant select on public.v_inactive_students_by_course to authenticated;
grant select on public.v_placement_readiness_funnel to authenticated;
grant select on public.v_placement_pending_reviews to authenticated;
grant select on public.v_placement_company_pipeline to authenticated;
grant select on public.v_placement_mock_interview_outcomes to authenticated;
grant select on public.v_placement_offer_stats to authenticated;
grant select on public.analytics_revenue_summary to authenticated;
grant select on public.analytics_enrollment_summary to authenticated;
grant select on public.analytics_content_performance to authenticated;
grant select on public.analytics_college_performance to authenticated;
grant select on public.v_college_weekly_performance to authenticated;
grant select on public.v_college_score_distribution to authenticated;
grant select on public.v_college_weekly_engagement to authenticated;
grant select on public.v_student_learning_hours to authenticated;
grant select on public.v_student_course_progress to authenticated;
grant select on public.v_student_risk_profile to authenticated;
grant select on public.master_course_delivery_stats to authenticated;
grant select on public.v_demo_course_landing_sections to authenticated;