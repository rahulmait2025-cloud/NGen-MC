-- Phase 5: Dashboard/query performance improvements based on real app query patterns.
-- This migration is additive: high-value indexes + consolidated dashboard RPC contracts.

-- ---------------------------------------------------------------------------
-- Indexes for repeated auth, dashboard and reporting predicates
-- ---------------------------------------------------------------------------

-- Frequent pattern: user_id + role/status lookup when resolving admin/student tenant context.
create index if not exists idx_college_memberships_user_role_status
  on public.college_memberships(user_id, role, status);

-- Frequent pattern: college roster/admin stats and recent-first table queries.
create index if not exists idx_college_memberships_college_role_status_created
  on public.college_memberships(college_id, role, status, created_at desc);

-- Frequent pattern: college roster listing ordered by created_at desc.
create index if not exists idx_students_college_created
  on public.students(college_id, created_at desc);

-- Frequent pattern: dashboard cohort distribution where cohort_id is present.
create index if not exists idx_students_college_cohort_not_null
  on public.students(college_id, cohort_id)
  where cohort_id is not null;

-- Frequent pattern: audit dashboard pulls college-scoped recent rows.
create index if not exists idx_audit_logs_college_created_desc
  on public.audit_logs(college_id, created_at desc);

-- Frequent pattern: college dashboard notifications (pending/failed) by tenant, newest first.
create index if not exists idx_notification_queue_tenant_status_created_desc
  on public.notification_queue(tenant_id, status, created_at desc)
  where status in ('pending', 'failed');

-- Frequent pattern: LMS activity feed filters tenant + actor and sorts by created_at desc.
create index if not exists idx_activity_events_tenant_actor_created_desc
  on public.activity_events(tenant_id, actor_user_id, created_at desc);

-- Frequent pattern: student placement pages query by student+college and sort by updated/created timestamps.
create index if not exists idx_student_applications_student_college_updated_desc
  on public.student_applications(student_id, college_id, updated_at desc);
create index if not exists idx_offers_student_college_created_desc
  on public.offers(student_id, college_id, created_at desc);
create index if not exists idx_placement_documents_student_college_created_desc
  on public.placement_documents(student_id, college_id, created_at desc);
create index if not exists idx_mock_interviews_student_college_scheduled_desc
  on public.mock_interviews(student_id, college_id, scheduled_at desc);
create index if not exists idx_resume_versions_profile_created_desc
  on public.resume_versions(placement_profile_id, created_at desc);
create index if not exists idx_placement_readiness_reviews_profile_reviewed_desc
  on public.placement_readiness_reviews(placement_profile_id, reviewed_at desc);
create index if not exists idx_placement_status_history_profile_changed_desc
  on public.placement_status_history(placement_profile_id, changed_at desc);

-- Frequent pattern: college dashboard course completion counts active/completed enrollments.
create index if not exists idx_global_course_enrollments_college_status_course
  on public.global_course_enrollments(college_id, status, course_id);

-- Frequent pattern: student/college catalogs mainly scan published courses.
create index if not exists idx_global_courses_published_only
  on public.global_courses(published_at desc, id)
  where publish_status = 'published';

-- ---------------------------------------------------------------------------
-- Consolidated dashboard RPCs to reduce application round-trips
-- ---------------------------------------------------------------------------

-- SuperAdmin shell stats previously required many count queries from app layer.
create or replace function public.get_superadmin_dashboard_shell()
returns table (
  active_colleges bigint,
  inactive_colleges bigint,
  suspended_colleges bigint,
  total_students bigint,
  active_admins bigint,
  pending_invites bigint,
  new_active_colleges_this_month bigint,
  new_students_this_month bigint,
  new_admins_this_month bigint,
  invites_last_7_days bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_month_start timestamptz := date_trunc('month', now() at time zone 'utc');
  v_seven_days_ago timestamptz := now() - interval '7 days';
begin
  perform public.require_superadmin();

  return query
  select
    count(*) filter (where c.status = 'active')::bigint as active_colleges,
    count(*) filter (where c.status = 'inactive')::bigint as inactive_colleges,
    count(*) filter (where c.status = 'suspended')::bigint as suspended_colleges,
    (select count(*)::bigint from public.students) as total_students,
    (
      select count(*)::bigint
      from public.college_memberships m
      where m.role = 'college_admin'
        and m.status = 'active'
    ) as active_admins,
    (
      select count(*)::bigint
      from public.college_memberships m
      where m.status = 'invited'
    ) as pending_invites,
    count(*) filter (where c.status = 'active' and c.created_at >= v_month_start)::bigint as new_active_colleges_this_month,
    (
      select count(*)::bigint
      from public.students s
      where s.created_at >= v_month_start
    ) as new_students_this_month,
    (
      select count(*)::bigint
      from public.college_memberships m
      where m.role = 'college_admin'
        and m.status = 'active'
        and m.created_at >= v_month_start
    ) as new_admins_this_month,
    (
      select count(*)::bigint
      from public.college_memberships m
      where m.status = 'invited'
        and m.created_at >= v_seven_days_ago
    ) as invites_last_7_days
  from public.colleges c;
end;
$$;

comment on function public.get_superadmin_dashboard_shell() is
  'Consolidates SuperAdmin dashboard shell KPI counts into one DB contract to avoid many count round-trips.';

grant execute on function public.get_superadmin_dashboard_shell() to authenticated;

-- College shell stats previously made separate app-layer count queries.
create or replace function public.get_college_dashboard_shell(p_college_id uuid)
returns table (
  students_count bigint,
  admins_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (
    public.is_superadmin()
    or exists (
      select 1
      from public.college_memberships m
      where m.user_id = auth.uid()
        and m.college_id = p_college_id
        and m.status = 'active'
        and m.role in ('college_admin', 'faculty_spoc', 'mentor')
    )
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    (select count(*)::bigint from public.students s where s.college_id = p_college_id) as students_count,
    (
      select count(*)::bigint
      from public.college_memberships m
      where m.college_id = p_college_id
        and m.role = 'college_admin'
        and m.status = 'active'
    ) as admins_count;
end;
$$;

comment on function public.get_college_dashboard_shell(uuid) is
  'Returns core college dashboard shell counts (students/admins) in one query contract.';

grant execute on function public.get_college_dashboard_shell(uuid) to authenticated;

-- College extended dashboard payload for KPI/reporting sections currently loaded via multiple app queries.
create or replace function public.get_college_dashboard_extended(
  p_college_id uuid,
  p_activity_limit integer default 15,
  p_at_risk_limit integer default 20,
  p_notification_limit integer default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
begin
  if not (
    public.is_superadmin()
    or exists (
      select 1
      from public.college_memberships m
      where m.user_id = auth.uid()
        and m.college_id = p_college_id
        and m.status = 'active'
        and m.role in ('college_admin', 'faculty_spoc', 'mentor')
    )
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with
  kpis as (
    select to_jsonb(k) as row_json
    from public.mv_college_kpis k
    where k.college_id = p_college_id
    limit 1
  ),
  cohort_performance as (
    select coalesce(
      jsonb_agg(jsonb_build_object('cohort_id', t.cohort_id, 'student_count', t.student_count)),
      '[]'::jsonb
    ) as rows_json
    from (
      select s.cohort_id, count(*)::int as student_count
      from public.students s
      where s.college_id = p_college_id
        and s.cohort_id is not null
      group by s.cohort_id
    ) t
  ),
  course_completion as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'course_id', c.course_id,
          'course_title', c.title,
          'enrolled_count', c.enrolled_count,
          'completed_count', c.completed_count,
          'completion_rate_pct', c.completion_rate_pct
        )
      ),
      '[]'::jsonb
    ) as rows_json
    from (
      select
        lac.course_id,
        lac.title,
        count(*) filter (where gce.status in ('active', 'completed'))::int as enrolled_count,
        count(*) filter (where gce.status = 'completed')::int as completed_count,
        case
          when count(*) filter (where gce.status in ('active', 'completed')) = 0 then 0
          else round(
            (
              count(*) filter (where gce.status = 'completed')::numeric
              / nullif(count(*) filter (where gce.status in ('active', 'completed')), 0)::numeric
            ) * 100
          )::int
        end as completion_rate_pct
      from public.list_published_assignable_courses(p_college_id) lac
      left join public.global_course_enrollments gce
        on gce.course_id = lac.course_id
       and gce.college_id = p_college_id
       and gce.status in ('active', 'completed')
      where lac.is_assigned_to_college = true
      group by lac.course_id, lac.title
      order by lac.title
    ) c
  ),
  placement_funnel as (
    select coalesce(
      jsonb_build_object(
        'not_ready_count', v.not_ready_count,
        'needs_improvement_count', v.needs_improvement_count,
        'interview_ready_count', v.interview_ready_count,
        'placed_count', v.placed_count,
        'total_profiles', v.total_profiles
      ),
      'null'::jsonb
    ) as row_json
    from public.v_placement_readiness_funnel v
    where v.college_id = p_college_id
    limit 1
  ),
  pending_reviews as (
    select coalesce(
      sum(coalesce(v.pending_resume, 0) + coalesce(v.pending_linkedin, 0) + coalesce(v.pending_github, 0)),
      0
    )::int as total_count
    from public.v_placement_pending_reviews v
    where v.college_id = p_college_id
  ),
  notifications as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'notification_type', n.notification_type,
          'status', n.status,
          'created_at', n.created_at
        )
        order by n.created_at desc
      ),
      '[]'::jsonb
    ) as rows_json
    from (
      select id, notification_type, status, created_at
      from public.notification_queue
      where tenant_id = p_college_id
        and status in ('pending', 'failed')
      order by created_at desc
      limit greatest(1, least(p_notification_limit, 100))
    ) n
  ),
  recent_activity as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'action', a.action,
          'created_at', a.created_at
        )
        order by a.created_at desc
      ),
      '[]'::jsonb
    ) as rows_json
    from (
      select id, action, created_at
      from public.audit_logs
      where college_id = p_college_id
      order by created_at desc
      limit greatest(1, least(p_activity_limit, 100))
    ) a
  ),
  at_risk as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'student_id', r.student_id,
          'course_title', r.course_title,
          'days_inactive', r.days_inactive
        )
      ),
      '[]'::jsonb
    ) as rows_json
    from (
      select student_id, course_title, days_inactive
      from public.v_inactive_students_by_course
      where college_id = p_college_id
      limit greatest(1, least(p_at_risk_limit, 200))
    ) r
  )
  select jsonb_build_object(
    'collegeKpis', (select row_json from kpis),
    'cohortPerformance', (select rows_json from cohort_performance),
    'courseCompletion', (select rows_json from course_completion),
    'placementFunnel', (select row_json from placement_funnel),
    'pendingReviewsCount', (select total_count from pending_reviews),
    'notifications', (select rows_json from notifications),
    'recentActivity', (select rows_json from recent_activity),
    'atRiskStudents', (select rows_json from at_risk)
  )
  into v_payload;

  return coalesce(v_payload, '{}'::jsonb);
end;
$$;

comment on function public.get_college_dashboard_extended(uuid, integer, integer, integer) is
  'Consolidates college dashboard extended datasets (kpis, course completion, placement, notifications, activity, at-risk) into one JSON RPC.';

grant execute on function public.get_college_dashboard_extended(uuid, integer, integer, integer) to authenticated;
