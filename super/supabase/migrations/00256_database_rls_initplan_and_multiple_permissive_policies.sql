-- Remediate RLS Performance and Multiple Permissive Policies Warnings
-- 
-- Objectives:
-- 1. Wrap auth function calls (like public.is_superadmin()) in SELECT subqueries to ensure single evaluation (initplan) per query.
-- 2. Consolidate policies to the 'authenticated' role to secure the database against anonymous access and resolve 'multiple_permissive_policies' warnings for 'anon'.

begin;

-- =============================================================================
-- 1. Optimize is_superadmin() calls in RLS policies to evaluate once per query
-- =============================================================================

DROP POLICY IF EXISTS "SuperAdmins have full access to tpstreams_webhook_logs" ON public.tpstreams_webhook_logs;
CREATE POLICY "SuperAdmins have full access to tpstreams_webhook_logs"
  ON public.tpstreams_webhook_logs FOR ALL
  TO authenticated
  USING ((SELECT public.is_superadmin()))
  WITH CHECK ((SELECT public.is_superadmin()));

DROP POLICY IF EXISTS "SuperAdmins have full access to tpstreams_sync_logs" ON public.tpstreams_sync_logs;
CREATE POLICY "SuperAdmins have full access to tpstreams_sync_logs"
  ON public.tpstreams_sync_logs FOR ALL
  TO authenticated
  USING ((SELECT public.is_superadmin()))
  WITH CHECK ((SELECT public.is_superadmin()));

DROP POLICY IF EXISTS college_features_superadmin_all ON public.college_features;
CREATE POLICY college_features_superadmin_all
  ON public.college_features FOR ALL
  TO authenticated
  USING ((SELECT public.is_superadmin()))
  WITH CHECK ((SELECT public.is_superadmin()));

DROP POLICY IF EXISTS jobs_superadmin_select ON public.jobs;
CREATE POLICY jobs_superadmin_select
  ON public.jobs FOR SELECT
  TO authenticated
  USING ((SELECT public.is_superadmin()));

DROP POLICY IF EXISTS job_attempts_superadmin_select ON public.job_attempts;
CREATE POLICY job_attempts_superadmin_select
  ON public.job_attempts FOR SELECT
  TO authenticated
  USING ((SELECT public.is_superadmin()));

DROP POLICY IF EXISTS job_schedules_superadmin_select ON public.job_schedules;
CREATE POLICY job_schedules_superadmin_select
  ON public.job_schedules FOR SELECT
  TO authenticated
  USING ((SELECT public.is_superadmin()));

DROP POLICY IF EXISTS rate_limits_superadmin_select ON public.rate_limits;
CREATE POLICY rate_limits_superadmin_select
  ON public.rate_limits FOR SELECT
  TO authenticated
  USING ((SELECT public.is_superadmin()));

DROP POLICY IF EXISTS "Superadmin full access college_memberships" ON public.college_memberships;
CREATE POLICY "Superadmin full access college_memberships"
  ON public.college_memberships FOR ALL
  TO authenticated
  USING ((SELECT public.is_superadmin()))
  WITH CHECK ((SELECT public.is_superadmin()));

DROP POLICY IF EXISTS "Superadmin full access students" ON public.students;
CREATE POLICY "Superadmin full access students"
  ON public.students FOR ALL
  TO authenticated
  USING ((SELECT public.is_superadmin()))
  WITH CHECK ((SELECT public.is_superadmin()));

DROP POLICY IF EXISTS "Superadmin full access colleges" ON public.colleges;
CREATE POLICY "Superadmin full access colleges"
  ON public.colleges FOR ALL
  TO authenticated
  USING ((SELECT public.is_superadmin()))
  WITH CHECK ((SELECT public.is_superadmin()));


-- =============================================================================
-- 2. Restrict permissive policies to authenticated role only to resolve multiple_permissive_policies on anon
-- =============================================================================

-- public.activity_events
ALTER POLICY "Student read own activity_events" ON public.activity_events TO authenticated;
ALTER POLICY "Superadmin read all activity_events" ON public.activity_events TO authenticated;
ALTER POLICY "Tenant admin read own activity_events" ON public.activity_events TO authenticated;

-- public.admin_sessions
ALTER POLICY "Superadmin full access admin_sessions" ON public.admin_sessions TO authenticated;
ALTER POLICY "Users can insert own admin sessions" ON public.admin_sessions TO authenticated;
ALTER POLICY "Users can read own admin sessions" ON public.admin_sessions TO authenticated;
ALTER POLICY "Users can update own admin sessions" ON public.admin_sessions TO authenticated;

-- public.announcements
ALTER POLICY "Content managers full access announcements" ON public.announcements TO authenticated;
ALTER POLICY "Students read published announcements" ON public.announcements TO authenticated;
ALTER POLICY "Superadmin full access announcements" ON public.announcements TO authenticated;

-- public.assessment_assignments
ALTER POLICY "Admins can manage assignments" ON public.assessment_assignments TO authenticated;
ALTER POLICY "Students can view their own assignments" ON public.assessment_assignments TO authenticated;

-- public.assessment_attempts
ALTER POLICY "Admins can view attempts" ON public.assessment_attempts TO authenticated;
ALTER POLICY "Students can manage their own attempts" ON public.assessment_attempts TO authenticated;

-- public.assessment_options
ALTER POLICY "Admins can manage options" ON public.assessment_options TO authenticated;
ALTER POLICY "Students can view options of published assessments" ON public.assessment_options TO authenticated;

-- public.assessment_questions
ALTER POLICY "Admins can manage questions" ON public.assessment_questions TO authenticated;
ALTER POLICY "Students can view questions of published assessments" ON public.assessment_questions TO authenticated;

-- public.assessment_responses
ALTER POLICY "Admins can view responses" ON public.assessment_responses TO authenticated;
ALTER POLICY "Students can manage their own responses" ON public.assessment_responses TO authenticated;

-- public.assessment_results
ALTER POLICY "Admins can manage results" ON public.assessment_results TO authenticated;
ALTER POLICY "Students can view their own released results" ON public.assessment_results TO authenticated;

-- public.assessment_reviews
ALTER POLICY "Admins can manage reviews" ON public.assessment_reviews TO authenticated;
ALTER POLICY "Students can view their own reviews if results released" ON public.assessment_reviews TO authenticated;

-- public.assessment_sections
ALTER POLICY "Admins can manage sections" ON public.assessment_sections TO authenticated;
ALTER POLICY "Students can view sections of published assessments" ON public.assessment_sections TO authenticated;

-- public.assessments
ALTER POLICY "Admins can manage their tenant's assessments" ON public.assessments TO authenticated;
ALTER POLICY "Students can view assessments assigned to them or their cohort" ON public.assessments TO authenticated;
ALTER POLICY "Superadmins can manage all assessments" ON public.assessments TO authenticated;

-- public.audit_logs
ALTER POLICY "Superadmin can read all audit logs" ON public.audit_logs TO authenticated;
ALTER POLICY "Users can read own audit logs" ON public.audit_logs TO authenticated;

-- public.cohort_memberships
ALTER POLICY "Content managers full access cohort_memberships" ON public.cohort_memberships TO authenticated;
ALTER POLICY "Students read own cohort_memberships" ON public.cohort_memberships TO authenticated;
ALTER POLICY "Superadmin full access cohort_memberships" ON public.cohort_memberships TO authenticated;

-- public.cohorts
ALTER POLICY "Content managers full access own college cohorts" ON public.cohorts TO authenticated;
ALTER POLICY "Superadmin full access cohorts" ON public.cohorts TO authenticated;

-- public.college_features
ALTER POLICY "Superadmin full access college_features" ON public.college_features TO authenticated;
ALTER POLICY "Tenant admins can read enabled features" ON public.college_features TO authenticated;

-- public.college_memberships
ALTER POLICY "Users can read own memberships" ON public.college_memberships TO authenticated;
ALTER POLICY "Users can activate own invited membership" ON public.college_memberships TO authenticated;

-- public.course_cohort_assignments
ALTER POLICY "Content managers full access course_cohort_assignments" ON public.course_cohort_assignments TO authenticated;
ALTER POLICY "Superadmin full access course_cohort_assignments" ON public.course_cohort_assignments TO authenticated;

-- public.course_enrollments
ALTER POLICY "Content managers full access course_enrollments" ON public.course_enrollments TO authenticated;
ALTER POLICY "Students read own course_enrollments" ON public.course_enrollments TO authenticated;
ALTER POLICY "Superadmin full access course_enrollments" ON public.course_enrollments TO authenticated;

-- public.course_modules
ALTER POLICY "Content managers full access course_modules" ON public.course_modules TO authenticated;
ALTER POLICY "Students read course_modules for accessible courses" ON public.course_modules TO authenticated;
ALTER POLICY "Superadmin full access course_modules" ON public.course_modules TO authenticated;

-- public.courses
ALTER POLICY "Content managers full access own college courses" ON public.courses TO authenticated;
ALTER POLICY "Students read enrolled or published courses" ON public.courses TO authenticated;
ALTER POLICY "Superadmin full access courses" ON public.courses TO authenticated;

-- public.github_reviews
ALTER POLICY "Content managers full github_reviews" ON public.github_reviews TO authenticated;
ALTER POLICY "Students read own github_reviews" ON public.github_reviews TO authenticated;
ALTER POLICY "Superadmin full github_reviews" ON public.github_reviews TO authenticated;

-- public.interview_rounds
ALTER POLICY "Content managers full interview_rounds" ON public.interview_rounds TO authenticated;
ALTER POLICY "Students insert own interview_rounds" ON public.interview_rounds TO authenticated;
ALTER POLICY "Students read own interview_rounds" ON public.interview_rounds TO authenticated;
ALTER POLICY "Superadmin full interview_rounds" ON public.interview_rounds TO authenticated;

-- public.lecture_progress
ALTER POLICY "Content managers read lecture_progress" ON public.lecture_progress TO authenticated;
ALTER POLICY "Students insert own lecture_progress" ON public.lecture_progress TO authenticated;
ALTER POLICY "Students read own lecture_progress" ON public.lecture_progress TO authenticated;
ALTER POLICY "Students update own lecture_progress" ON public.lecture_progress TO authenticated;
ALTER POLICY "Superadmin full access lecture_progress" ON public.lecture_progress TO authenticated;

-- public.lecture_resources
ALTER POLICY "Content managers full access lecture_resources" ON public.lecture_resources TO authenticated;
ALTER POLICY "Students read lecture_resources for accessible lectures" ON public.lecture_resources TO authenticated;
ALTER POLICY "Superadmin full access lecture_resources" ON public.lecture_resources TO authenticated;

-- public.lectures
ALTER POLICY "Content managers full access lectures" ON public.lectures TO authenticated;
ALTER POLICY "Students read lectures for accessible modules" ON public.lectures TO authenticated;
ALTER POLICY "Superadmin full access lectures" ON public.lectures TO authenticated;

-- public.linkedin_reviews
ALTER POLICY "Content managers full linkedin_reviews" ON public.linkedin_reviews TO authenticated;
ALTER POLICY "Students read own linkedin_reviews" ON public.linkedin_reviews TO authenticated;
ALTER POLICY "Superadmin full linkedin_reviews" ON public.linkedin_reviews TO authenticated;

-- public.mock_interviews
ALTER POLICY "Content managers full mock_interviews" ON public.mock_interviews TO authenticated;
ALTER POLICY "Students read own mock_interviews" ON public.mock_interviews TO authenticated;
ALTER POLICY "Superadmin full mock_interviews" ON public.mock_interviews TO authenticated;

-- public.module_access_appeals
ALTER POLICY "College Admin and Student can insert appeals for their college" ON public.module_access_appeals TO authenticated;
ALTER POLICY "Requester can read own appeals" ON public.module_access_appeals TO authenticated;
ALTER POLICY "Super Admin can read and update all appeals" ON public.module_access_appeals TO authenticated;

-- public.non_partnered_students
ALTER POLICY "Superadmin full access non_partnered_students" ON public.non_partnered_students TO authenticated;
ALTER POLICY "Users can read own non_partnered_student row" ON public.non_partnered_students TO authenticated;

-- public.offers
ALTER POLICY "Content managers full offers" ON public.offers TO authenticated;
ALTER POLICY "Students insert own offers" ON public.offers TO authenticated;
ALTER POLICY "Students read own offers" ON public.offers TO authenticated;
ALTER POLICY "Superadmin full offers" ON public.offers TO authenticated;

-- public.placement_documents
ALTER POLICY "Content managers full placement_documents" ON public.placement_documents TO authenticated;
ALTER POLICY "Students insert own placement_documents" ON public.placement_documents TO authenticated;
ALTER POLICY "Students read own placement_documents" ON public.placement_documents TO authenticated;
ALTER POLICY "Superadmin full placement_documents" ON public.placement_documents TO authenticated;

-- public.placement_profiles
ALTER POLICY "Students insert own placement_profiles" ON public.placement_profiles TO authenticated;
ALTER POLICY "Students read own placement_profiles" ON public.placement_profiles TO authenticated;
ALTER POLICY "Students update own placement_profiles" ON public.placement_profiles TO authenticated;

-- public.placement_status_history
ALTER POLICY "Students read own placement_status_history" ON public.placement_status_history TO authenticated;

-- public.placement_readiness_reviews
ALTER POLICY "Students read own placement_readiness_reviews" ON public.placement_readiness_reviews TO authenticated;

-- public.resume_versions
ALTER POLICY "Students insert own resume_versions" ON public.resume_versions TO authenticated;
ALTER POLICY "Students read own resume_versions" ON public.resume_versions TO authenticated;

-- public.student_applications
ALTER POLICY "Students full own student_applications" ON public.student_applications TO authenticated;

-- public.student_content_entitlements
ALTER POLICY "entitlements_student_read" ON public.student_content_entitlements TO authenticated;
ALTER POLICY "entitlements_superadmin_all" ON public.student_content_entitlements TO authenticated;

-- public.student_daily_visits
ALTER POLICY "student_daily_visits_superadmin_all" ON public.student_daily_visits TO authenticated;

-- public.student_streaks
ALTER POLICY "student_streaks_superadmin_all" ON public.student_streaks TO authenticated;

-- public.student_todos
ALTER POLICY "student_todos_superadmin_all" ON public.student_todos TO authenticated;

-- public.students
ALTER POLICY "College admin can insert students in their college" ON public.students TO authenticated;
ALTER POLICY "College admin can read students in their college" ON public.students TO authenticated;
ALTER POLICY "College admin can update students in their college" ON public.students TO authenticated;
ALTER POLICY "Students can read own record" ON public.students TO authenticated;

-- public.tenant_feature_overrides
ALTER POLICY "tenant_feature_overrides_superadmin_all" ON public.tenant_feature_overrides TO authenticated;
ALTER POLICY "tenant_feature_overrides_superadmin_all_v2" ON public.tenant_feature_overrides TO authenticated;

-- public.tenant_module_access_audit
ALTER POLICY "Super Admin and service can insert tenant_module_access_audit" ON public.tenant_module_access_audit TO authenticated;
ALTER POLICY "Super Admin can read tenant_module_access_audit" ON public.tenant_module_access_audit TO authenticated;

-- public.tenant_module_overrides
ALTER POLICY "College Admin can read own college overrides" ON public.tenant_module_overrides TO authenticated;
ALTER POLICY "Super Admin can manage tenant_module_overrides" ON public.tenant_module_overrides TO authenticated;

-- public.profiles
ALTER POLICY "Users can insert own profile" ON public.profiles TO authenticated;
ALTER POLICY "Users can read own profile" ON public.profiles TO authenticated;
ALTER POLICY "Users can update own profile" ON public.profiles TO authenticated;
ALTER POLICY "College admin read peer profiles" ON public.profiles TO authenticated;

-- public.orders
ALTER POLICY "Users can view own orders" ON public.orders TO authenticated;

-- public.order_items
ALTER POLICY "Users can view own order items" ON public.order_items TO authenticated;

-- public.payments
ALTER POLICY "Users can view own payments" ON public.payments TO authenticated;

-- public.refund_events
ALTER POLICY "Users can view own refund events" ON public.refund_events TO authenticated;

-- public.coupon_usages
ALTER POLICY "Users can view own coupon usages" ON public.coupon_usages TO authenticated;

commit;
