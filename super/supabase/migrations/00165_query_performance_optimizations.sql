-- ============================================================
-- 00165: Query Performance Optimizations
-- Targets top slow queries from pg_stat_statements analysis:
--   1. resolve_student_auth_context (7.88% total time)
--   2. rate_limit_consume (5.69% total time)
--   3. Materialized view refreshes (~12.8% total time)
--   4. get_effective_features (2.49% total time)
--   5. claim_email_outbox_batch (2.54% total time)
-- ============================================================

-- ============================================================
-- Section 1: resolve_student_auth_context optimization
-- ============================================================

-- Primary hot path: user_id + role + status filter + created_at sort on memberships
-- Note: different name from existing idx_college_memberships_user_role_status
-- (existing index omits created_at and INCLUDE columns)
CREATE INDEX IF NOT EXISTS idx_college_memberships_user_role_created
  ON public.college_memberships (user_id, role, status, created_at)
  INCLUDE (id, college_id);

-- Slug lookup for active colleges (used in validation step)
CREATE INDEX IF NOT EXISTS idx_colleges_slug_active
  ON public.colleges (lower(slug))
  WHERE status = 'active';

-- Student lookup by user_id + college_id
CREATE INDEX IF NOT EXISTS idx_students_user_college
  ON public.students (user_id, college_id);

-- Profile lookup by id with is_active flag
CREATE INDEX IF NOT EXISTS idx_profiles_id_active
  ON public.profiles (id)
  INCLUDE (is_active, email, full_name);

-- ============================================================
-- Section 2: rate_limit_consume optimization
-- ============================================================

-- Tune autovacuum for high-churn rate_limits table
ALTER TABLE public.rate_limits SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_vacuum_threshold = 1000
);

-- ============================================================
-- Section 3: Materialized View refresh optimizations
-- ============================================================

-- For mv_college_kpis student_stats CTE
CREATE INDEX IF NOT EXISTS idx_students_college_stats
  ON public.students (college_id)
  INCLUDE (id, github_url, linkedin_url, resume_url, placement_ready_status, cohort_id);

-- For mv_college_kpis course_stats CTE
CREATE INDEX IF NOT EXISTS idx_courses_college_status
  ON public.courses (college_id)
  INCLUDE (id)
  WHERE status = 'published';

-- For mv_college_kpis lecture_stats CTE (joins courses → course_modules → lectures)
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id
  ON public.course_modules (course_id);

CREATE INDEX IF NOT EXISTS idx_lectures_module_published
  ON public.lectures (course_module_id)
  INCLUDE (id)
  WHERE status = 'published';

-- For mv_college_kpis enrollment_stats CTE
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_student
  ON public.course_enrollments (course_id, student_id);

CREATE INDEX IF NOT EXISTS idx_lecture_progress_enrollment_completed
  ON public.lecture_progress (enrollment_id)
  WHERE completed_at IS NOT NULL;

-- For mv_college_kpis mentor_stats CTE
CREATE INDEX IF NOT EXISTS idx_college_memberships_college_mentor
  ON public.college_memberships (college_id)
  INCLUDE (user_id)
  WHERE role IN ('college_admin', 'faculty_spoc');

-- For mv_student_progress_kpis: idx_course_enrollments_student already exists in 00014
-- Only add if it doesn't cover (student_id) for lecture_stats LEFT JOIN

-- ============================================================
-- Section 4: get_effective_features optimization
-- ============================================================

-- plan_features lookup by plan_id
CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id
  ON public.plan_features (plan_id);

-- Profile superadmin lookup
CREATE INDEX IF NOT EXISTS idx_profiles_superadmin
  ON public.profiles (id)
  WHERE global_role = 'superadmin';

-- College membership authorization lookup
CREATE INDEX IF NOT EXISTS idx_college_memberships_user_college_active
  ON public.college_memberships (user_id, college_id)
  WHERE status = 'active';

-- ============================================================
-- Section 5: claim_email_outbox_batch optimization
-- ============================================================

-- Composite index for the claim batch query
-- Replaces the need for bitmap-merging individual column indexes
CREATE INDEX IF NOT EXISTS idx_email_outbox_claim_batch
  ON public.email_outbox (status, next_attempt_at, attempts, created_at)
  WHERE status IN ('queued', 'failed');

-- ============================================================
-- Section 6: General performance indexes
-- ============================================================

-- courses.college_id (used in many dashboard queries)
CREATE INDEX IF NOT EXISTS idx_courses_college_id
  ON public.courses (college_id);

-- college_memberships by role (for counting queries)
CREATE INDEX IF NOT EXISTS idx_college_memberships_role
  ON public.college_memberships (role);

-- ============================================================
-- Section 7: Increase rate limit cleanup frequency
-- Old: every 6 hours. New: every 30 minutes.
-- High INSERT+UPDATE+DELETE churn on rate_limits causes bloat.
-- ============================================================

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup_rate_limits');
  PERFORM cron.schedule('cleanup_rate_limits', '*/30 * * * *', 'SELECT public.cleanup_expired_rate_limits()');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- Section 8: Optimize rate_limit_consume to reduce bloat
-- Old: INSERT ... ON CONFLICT with complex CASE expressions
-- New: Use a simpler, more efficient upsert pattern
-- ============================================================

CREATE OR REPLACE FUNCTION public.rate_limit_consume(p_key text, p_window_ms int)
RETURNS TABLE (new_count int, out_window_start timestamptz, out_window_ms int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_count int;
  v_window_start timestamptz;
BEGIN

  UPDATE public.rate_limits
  SET
    count = CASE
      WHEN window_start + (window_ms || ' milliseconds')::interval < v_now THEN 1
      ELSE count + 1
    END,
    window_start = CASE
      WHEN window_start + (window_ms || ' milliseconds')::interval < v_now THEN v_now
      ELSE window_start
    END,
    window_ms = p_window_ms
  WHERE key = p_key
  RETURNING count, window_start, window_ms INTO v_count, v_window_start, out_window_ms;

  IF NOT FOUND THEN
    v_count := 1;
    v_window_start := v_now;
    out_window_ms := p_window_ms;
    INSERT INTO public.rate_limits (key, count, window_start, window_ms)
    VALUES (p_key, 1, v_now, p_window_ms)
    RETURNING count, window_start, window_ms INTO v_count, v_window_start, out_window_ms;
  END IF;

  new_count := v_count;
  out_window_start := v_window_start;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rate_limit_consume(text, int) TO authenticated;