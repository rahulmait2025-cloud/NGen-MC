-- Migration: 00257_database_security_advisor_remediation.sql
-- Description: Addressing final security advisor warnings:
-- 1. Define row level security (RLS) policies for orphaned tables that have RLS enabled but lack policies.
-- 2. Migrate helper and trigger functions from SECURITY DEFINER to SECURITY INVOKER where elevated privileges are not required.
-- 3. Revoke EXECUTE privileges on internal and system-level functions from the authenticated role.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: Row Level Security (RLS) Policies for "rls_enabled_no_policy" Tables
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. public.lesson_resources
DROP POLICY IF EXISTS "Allow authenticated read access to lesson resources" ON public.lesson_resources;
CREATE POLICY "Allow authenticated read access to lesson resources"
  ON public.lesson_resources FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow superadmin write access to lesson resources" ON public.lesson_resources;
CREATE POLICY "Allow superadmin write access to lesson resources"
  ON public.lesson_resources FOR ALL
  TO authenticated, service_role
  USING ((SELECT public.is_superadmin()))
  WITH CHECK ((SELECT public.is_superadmin()));

-- 2. public.student_lesson_bookmarks
DROP POLICY IF EXISTS "Allow students access to own bookmarks" ON public.student_lesson_bookmarks;
CREATE POLICY "Allow students access to own bookmarks"
  ON public.student_lesson_bookmarks FOR ALL
  TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = (SELECT auth.uid()))
    OR (SELECT public.is_superadmin())
  )
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = (SELECT auth.uid()))
    OR (SELECT public.is_superadmin())
  );

-- 3. public.student_lesson_notes
DROP POLICY IF EXISTS "Allow students access to own notes" ON public.student_lesson_notes;
CREATE POLICY "Allow students access to own notes"
  ON public.student_lesson_notes FOR ALL
  TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = (SELECT auth.uid()))
    OR (SELECT public.is_superadmin())
  )
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = (SELECT auth.uid()))
    OR (SELECT public.is_superadmin())
  );

-- 4. public.lms_invoice_download_tokens
DROP POLICY IF EXISTS "System and superadmin only" ON public.lms_invoice_download_tokens;
CREATE POLICY "System and superadmin only"
  ON public.lms_invoice_download_tokens FOR ALL
  TO authenticated, service_role
  USING ((SELECT public.is_superadmin()));

-- 5. public.registered_jobs
DROP POLICY IF EXISTS "System and superadmin only" ON public.registered_jobs;
CREATE POLICY "System and superadmin only"
  ON public.registered_jobs FOR ALL
  TO authenticated, service_role
  USING ((SELECT public.is_superadmin()));

-- 6. public.webhook_audit_logs
DROP POLICY IF EXISTS "System and superadmin only" ON public.webhook_audit_logs;
CREATE POLICY "System and superadmin only"
  ON public.webhook_audit_logs FOR ALL
  TO authenticated, service_role
  USING ((SELECT public.is_superadmin()));

-- 7. public.student_invites
DROP POLICY IF EXISTS "Allow superadmin and college_admin to manage invites" ON public.student_invites;
CREATE POLICY "Allow superadmin and college_admin to manage invites"
  ON public.student_invites FOR ALL
  TO authenticated, service_role
  USING (
    (SELECT public.is_superadmin())
    OR college_id IN (
      SELECT college_id
      FROM public.college_memberships
      WHERE user_id = (SELECT auth.uid())
        AND role = 'college_admin'
        AND status = 'active'
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: Switch Helper/Trigger Functions to SECURITY INVOKER
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() SECURITY INVOKER;

-- 2. is_superadmin
ALTER FUNCTION public.is_superadmin() SECURITY INVOKER;

-- 3. is_superadmin_fast
ALTER FUNCTION public.is_superadmin_fast() SECURITY INVOKER;

-- 4. is_college_admin_fast
ALTER FUNCTION public.is_college_admin_fast(uuid) SECURITY INVOKER;

-- 5. is_content_manager_fast
ALTER FUNCTION public.is_content_manager_fast(uuid) SECURITY INVOKER;

-- 6. is_student_fast
ALTER FUNCTION public.is_student_fast(uuid) SECURITY INVOKER;

-- 7. get_user_college_ids
ALTER FUNCTION public.get_user_college_ids() SECURITY INVOKER;

-- 8. get_user_primary_college
ALTER FUNCTION public.get_user_primary_college() SECURITY INVOKER;

-- 9. is_direct_learner_college
ALTER FUNCTION public.is_direct_learner_college(uuid) SECURITY INVOKER;

-- 10. get_direct_learner_college_id
ALTER FUNCTION public.get_direct_learner_college_id() SECURITY INVOKER;

-- 11. has_feature
ALTER FUNCTION public.has_feature(uuid, text) SECURITY INVOKER;

-- 12. get_effective_features
ALTER FUNCTION public.get_effective_features(uuid) SECURITY INVOKER;

-- 13. Trigger functions that do not require elevated privileges
ALTER FUNCTION public.update_platform_announcements_updated_at() SECURITY INVOKER;
ALTER FUNCTION public.update_student_todos_updated_at() SECURITY INVOKER;
ALTER FUNCTION public.set_lms_transactional_updated_at() SECURITY INVOKER;
ALTER FUNCTION public.enforce_max_todos_per_category() SECURITY INVOKER;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: Revoke EXECUTE Access on Internal/Trigger/System Functions (Set B/C)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. require_superadmin
REVOKE EXECUTE ON FUNCTION public.require_superadmin() FROM public, anon, authenticated;

-- 2. rls_auto_enable
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM public, anon, authenticated;

-- 3. refresh_enrollment_access_windows_for_assignment
REVOKE EXECUTE ON FUNCTION public.refresh_enrollment_access_windows_for_assignment(uuid) FROM public, anon, authenticated;

-- 4. refresh_enrollment_access_windows_for_course
REVOKE EXECUTE ON FUNCTION public.refresh_enrollment_access_windows_for_course(uuid) FROM public, anon, authenticated;

-- 5. auto_enroll_new_student_into_assigned_courses (Dropped in migration 00086)
-- REVOKE EXECUTE ON FUNCTION public.auto_enroll_new_student_into_assigned_courses(uuid) FROM public, anon, authenticated;

-- 6. handle_student_global_course_auto_enrollment (Dropped in migration 00086)
-- REVOKE EXECUTE ON FUNCTION public.handle_student_global_course_auto_enrollment() FROM public, anon, authenticated;

-- 7. enroll_existing_students_of_college_into_assigned_course (Dropped in migration 00086)
-- REVOKE EXECUTE ON FUNCTION public.enroll_existing_students_of_college_into_assigned_course(uuid, uuid) FROM public, anon, authenticated;

COMMIT;
