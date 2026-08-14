-- Migration 00053: Security Hardening and Fix Safety Net
-- This migration catches any database that already applied the old (buggy) migrations.
-- All statements are idempotent (IF EXISTS / IF NOT EXISTS / OR REPLACE).
-- For fresh deployments, the source-of-truth is the edited original migration files.

-- ========================================================================
-- 1. REVOKE DANGEROUS anon GRANTS
-- ========================================================================

-- Revoke direct table access on rate_limits from anon
REVOKE SELECT, INSERT, UPDATE ON public.rate_limits FROM anon;
REVOKE EXECUTE ON FUNCTION public.rate_limit_consume(text, int) FROM anon;

-- Revoke function execution from anon on security-sensitive functions
REVOKE EXECUTE ON FUNCTION public.insert_activity_event(uuid, uuid, text, text, text, text, text, text, jsonb, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_security_event(text, text, text, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_feature(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_effective_features(uuid) FROM anon;

-- Revoke grant to service_role on insert_activity_event (only authenticated should call it)
REVOKE EXECUTE ON FUNCTION public.insert_activity_event(uuid, uuid, text, text, text, text, text, text, jsonb, text, text, text, text) FROM service_role;

-- ========================================================================
-- 2. ADD AUTHORIZATION GUARD TO insert_activity_event
-- ========================================================================

CREATE OR REPLACE FUNCTION public.insert_activity_event(
  p_tenant_id uuid, p_actor_user_id uuid, p_actor_role text, p_actor_type text,
  p_event_name text, p_event_category text, p_entity_type text, p_entity_id text,
  p_metadata jsonb, p_ip_address text, p_user_agent text, p_session_id text, p_request_id text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.activity_events (tenant_id, actor_user_id, actor_role, actor_type, event_name, event_category, entity_type, entity_id, metadata, ip_address, user_agent, session_id, request_id)
  VALUES (p_tenant_id, p_actor_user_id, p_actor_role, p_actor_type, p_event_name, p_event_category, p_entity_type, p_entity_id, COALESCE(p_metadata, '{}'::jsonb), p_ip_address, p_user_agent, p_session_id, p_request_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_activity_event(uuid, uuid, text, text, text, text, text, text, jsonb, text, text, text, text) TO authenticated;

-- ========================================================================
-- 3. ADD AUTHORIZATION GUARD TO log_security_event
-- ========================================================================

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action text,
  p_resource_type text DEFAULT 'auth',
  p_resource_id text DEFAULT NULL,
  p_college_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, college_id, payload)
  VALUES (auth.uid(), p_action, p_resource_type, p_resource_id, p_college_id, COALESCE(p_payload, '{}'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, text, uuid, jsonb) TO authenticated;

-- ========================================================================
-- 4. FIX is_college_admin_of() — REPLACE college_admins WITH college_memberships
-- ========================================================================

CREATE OR REPLACE FUNCTION public.is_college_admin_of(p_college_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.college_memberships cm
    WHERE cm.user_id = auth.uid()
      AND cm.college_id = p_college_id
      AND cm.role IN ('college_admin', 'faculty_spoc')
      AND cm.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_college_admin_of(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_college_admin_of(uuid) TO authenticated;

-- ========================================================================
-- 5. FIX is_superadmin() AND is_college_content_manager() TO SECURITY DEFINER
-- ========================================================================

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role = 'superadmin');
$$;

CREATE OR REPLACE FUNCTION public.is_college_content_manager(p_college_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.college_memberships m
    WHERE m.college_id = p_college_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role IN ('college_admin', 'faculty_spoc')
  );
$$;

REVOKE ALL ON FUNCTION public.is_superadmin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

REVOKE ALL ON FUNCTION public.is_college_content_manager(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_college_content_manager(uuid) TO authenticated;

-- ========================================================================
-- 6. FIX background_jobs RLS POLICIES — RESTRICT TO service_role
-- ========================================================================

DROP POLICY IF EXISTS "service_role_all_jobs" ON public.jobs;
CREATE POLICY "service_role_all_jobs" ON public.jobs
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all_job_attempts" ON public.job_attempts;
CREATE POLICY "service_role_all_job_attempts" ON public.job_attempts
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all_job_schedules" ON public.job_schedules;
CREATE POLICY "service_role_all_job_schedules" ON public.job_schedules
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ========================================================================
-- 7. FIX college_leads INSERT POLICY — REMOVE anon ACCESS
-- ========================================================================

DROP POLICY IF EXISTS "Public can insert college leads" ON public.college_leads;
CREATE POLICY "Authenticated can insert college leads"
  ON public.college_leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ========================================================================
-- 8. CONSOLIDATE DUPLICATE TRIGGER FUNCTIONS
-- ========================================================================

-- Reassign platform_settings trigger to canonical set_updated_at()
DROP TRIGGER IF EXISTS trg_platform_settings_updated_at ON public.platform_settings;
CREATE TRIGGER trg_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reassign college_leads trigger to canonical set_updated_at()
DROP TRIGGER IF EXISTS college_leads_updated_at ON public.college_leads;
CREATE TRIGGER college_leads_updated_at
  BEFORE UPDATE ON public.college_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reassign analytics_settings trigger to canonical set_updated_at()
DROP TRIGGER IF EXISTS trg_analytics_settings_updated_at ON public.analytics_settings;
CREATE TRIGGER trg_analytics_settings_updated_at
  BEFORE UPDATE ON public.analytics_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Drop redundant trigger functions
DROP FUNCTION IF EXISTS public.set_platform_settings_updated_at();
DROP FUNCTION IF EXISTS public.set_college_leads_updated_at();
DROP FUNCTION IF EXISTS public.set_analytics_settings_updated_at();

-- ========================================================================
-- 9. REMOVE STUB TABLES THAT CONFLICT WITH REAL SCHEMA
-- ========================================================================

DROP TABLE IF EXISTS public.student_assessments CASCADE;
DROP TABLE IF EXISTS public.student_lectures CASCADE;

-- The courses, lectures, assessments stubs created by 00023 use IF NOT EXISTS,
-- so they silently skip if real tables from 00014/00016 already exist.
-- The materialized views referencing them are already fixed in the source 00023.

-- ========================================================================
-- 10. ADD MISSING COMPOSITE INDEX
-- ========================================================================

CREATE INDEX IF NOT EXISTS idx_gce_course_college_status
  ON public.global_course_enrollments(course_id, college_id, status);

-- ========================================================================
-- 11. ADD rate_limits CLEANUP
-- ========================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.rate_limits
  WHERE window_start + (window_ms || ' milliseconds')::interval < now() - interval '24 hours'
  RETURNING 1;
$$;

DO $$
BEGIN
  PERFORM cron.schedule('cleanup_rate_limits', '0 */6 * * *', 'SELECT public.cleanup_expired_rate_limits()');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
