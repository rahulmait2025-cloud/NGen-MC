-- Migration: Query performance indexes and RPCs for SuperAdmin slow queries.
-- Addresses critical, medium, and low priority findings from query audit.
-- Safe to run multiple times (IF NOT EXISTS throughout).

-- ---------------------------------------------------------------------------
-- 0. Extensions (for trigram search on college_leads)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- 1. college_leads indexes (C1, C3)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_college_leads_status_created
  ON public.college_leads(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_college_leads_priority_created
  ON public.college_leads(priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_college_leads_created_desc
  ON public.college_leads(created_at DESC);

-- Trigram indexes for ilike search on college_leads
CREATE INDEX IF NOT EXISTS idx_college_leads_full_name_trgm
  ON public.college_leads USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_college_leads_work_email_trgm
  ON public.college_leads USING gin (work_email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_college_leads_college_name_trgm
  ON public.college_leads USING gin (college_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_college_leads_phone_trgm
  ON public.college_leads USING gin (phone_number gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 2. global_course_lessons / lesson_resources indexes (C2)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_global_course_lessons_module_sort
  ON public.global_course_lessons(module_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_global_course_lesson_resources_lesson_sort
  ON public.global_course_lesson_resources(lesson_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_global_course_assignment_blocks_course_sort
  ON public.global_course_assignment_blocks(course_id, sort_order);

-- ---------------------------------------------------------------------------
-- 3. jobs table indexes (M7)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_jobs_state_created
  ON public.jobs(state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_type_state_created
  ON public.jobs(type, state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_pending_claim
  ON public.jobs(state, priority DESC, next_run_at)
  WHERE state = 'pending';

-- ---------------------------------------------------------------------------
-- 4. job_schedules indexes (M6)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_job_schedules_type
  ON public.job_schedules(job_type);

CREATE INDEX IF NOT EXISTS idx_job_schedules_enabled_next
  ON public.job_schedules(enabled, next_enqueue_at)
  WHERE enabled = true;

-- ---------------------------------------------------------------------------
-- 5. module_access_appeals indexes (M8)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_module_access_appeals_status_created
  ON public.module_access_appeals(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_module_access_appeals_college_created
  ON public.module_access_appeals(college_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_module_access_appeals_college_module
  ON public.module_access_appeals(college_id, module_key);

-- ---------------------------------------------------------------------------
-- 6. audit_logs indexes (M4)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_desc
  ON public.audit_logs(created_at DESC);

-- ---------------------------------------------------------------------------
-- 7. tenant_module_overrides indexes (used in approveAndUnlock, setTenantModuleOverride)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tenant_module_overrides_college_module
  ON public.tenant_module_overrides(college_id, module_key);

-- ---------------------------------------------------------------------------
-- 8. tenant_feature_overrides indexes (used in list/set/clear overrides)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tenant_feature_overrides_college
  ON public.tenant_feature_overrides(college_id);

-- ---------------------------------------------------------------------------
-- 9. notification_queue indexes (dashboard failed notifications query)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notification_queue_status_created
  ON public.notification_queue(status, created_at DESC);

-- ---------------------------------------------------------------------------
-- 10. students indexes (L3 - default ordering without college filter)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_students_created_desc
  ON public.students(created_at DESC);

-- ---------------------------------------------------------------------------
-- 11. RPC: get_lead_stats (C1 - replaces full-table scan in getLeadStats)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_lead_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', count(*),
    'new_count', count(*) FILTER (WHERE status = 'new'),
    'contacted_count', count(*) FILTER (WHERE status = 'contacted'),
    'qualified_count', count(*) FILTER (WHERE status = 'qualified'),
    'demo_scheduled_count', count(*) FILTER (WHERE status = 'demo_scheduled'),
    'converted_count', count(*) FILTER (WHERE status = 'converted'),
    'closed_count', count(*) FILTER (WHERE status = 'closed'),
    'spam_count', count(*) FILTER (WHERE status = 'spam')
  )
  FROM public.college_leads;
$$;

COMMENT ON FUNCTION public.get_lead_stats() IS
  'Returns aggregated lead stats by status in a single scan instead of fetching all rows to JS.';

GRANT EXECUTE ON FUNCTION public.get_lead_stats() TO authenticated;

-- ---------------------------------------------------------------------------
-- 12. RPC: get_program_summary (M3 - replaces 5000-row fetch + JS aggregation)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_program_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', program_id::text,
        'name', program_id::text,
        'students', student_count,
        'colleges', college_count
      )
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      program_id,
      count(*)::int AS student_count,
      count(DISTINCT college_id)::int AS college_count
    FROM public.students
    WHERE program_id IS NOT NULL
    GROUP BY program_id
  ) t;
$$;

COMMENT ON FUNCTION public.get_program_summary() IS
  'Returns program summary (student + college counts) via SQL aggregation instead of fetching all rows to JS.';

GRANT EXECUTE ON FUNCTION public.get_program_summary() TO authenticated;

-- ---------------------------------------------------------------------------
-- 13. RPC: reorder_course_modules (M2 - replaces 2N round-trip loop)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reorder_course_modules(
  p_module_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bump constant int := 10000;
  i int;
BEGIN
  -- Phase 1: bump to temporary sort_order (avoids unique constraint violation)
  FOR i IN 1..array_length(p_module_ids, 1) LOOP
    UPDATE public.global_course_modules
    SET sort_order = v_bump + i - 1
    WHERE id = p_module_ids[i];
  END LOOP;

  -- Phase 2: set final sort_order
  FOR i IN 1..array_length(p_module_ids, 1) LOOP
    UPDATE public.global_course_modules
    SET sort_order = i - 1
    WHERE id = p_module_ids[i];
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.reorder_course_modules(uuid[]) IS
  'Reorders course modules in a single DB round-trip instead of 2N application-level UPDATEs.';

GRANT EXECUTE ON FUNCTION public.reorder_course_modules(uuid[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- 14. RPC: reorder_course_lessons (M2 - replaces 2N round-trip loop)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reorder_course_lessons(
  p_lesson_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bump constant int := 10000;
  i int;
BEGIN
  FOR i IN 1..array_length(p_lesson_ids, 1) LOOP
    UPDATE public.global_course_lessons
    SET sort_order = v_bump + i - 1
    WHERE id = p_lesson_ids[i];
  END LOOP;

  FOR i IN 1..array_length(p_lesson_ids, 1) LOOP
    UPDATE public.global_course_lessons
    SET sort_order = i - 1
    WHERE id = p_lesson_ids[i];
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.reorder_course_lessons(uuid[]) IS
  'Reorders course lessons in a single DB round-trip instead of 2N application-level UPDATEs.';

GRANT EXECUTE ON FUNCTION public.reorder_course_lessons(uuid[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- 15. RPC: get_superadmin_dashboard_shell (update - add college_leads count)
-- ---------------------------------------------------------------------------
-- Postgres cannot change RETURNS TABLE column set via CREATE OR REPLACE (42P13); drop first.
DROP FUNCTION IF EXISTS public.get_superadmin_dashboard_shell();

CREATE OR REPLACE FUNCTION public.get_superadmin_dashboard_shell()
RETURNS TABLE (
  active_colleges bigint,
  inactive_colleges bigint,
  suspended_colleges bigint,
  total_students bigint,
  active_admins bigint,
  pending_invites bigint,
  college_leads bigint,
  new_active_colleges_this_month bigint,
  new_students_this_month bigint,
  new_admins_this_month bigint,
  invites_last_7_days bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    (select count(*)::bigint from public.college_leads) as college_leads,
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

COMMENT ON FUNCTION public.get_superadmin_dashboard_shell() IS
  'Consolidates SuperAdmin dashboard shell KPI counts (including college_leads) into one DB contract.';

GRANT EXECUTE ON FUNCTION public.get_superadmin_dashboard_shell() TO authenticated;
