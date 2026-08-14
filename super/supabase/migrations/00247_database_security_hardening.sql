-- Migration: 00247_database_security_hardening
-- Objective: Hardening Supabase database security and query plan efficiency.
-- Automatically generated idempotent script.

BEGIN;


----------------------------------------------------------------------
-- 1. HARDENING SECURITY DEFINER FUNCTIONS (EXPLICIT search_path)
----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_publish_item_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  parent_status text;
BEGIN
  SELECT publish_status INTO parent_status FROM public.master_courses WHERE id = NEW.master_course_id;
  IF parent_status = 'published' THEN
    NEW.publish_status := 'published';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


CREATE OR REPLACE FUNCTION public.auto_publish_module_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  parent_status text;
BEGIN
  SELECT publish_status INTO parent_status FROM public.master_courses WHERE id = NEW.master_course_id;
  IF parent_status = 'published' THEN
    NEW.publish_status := 'published';
    NEW.visible_to_students := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


CREATE OR REPLACE FUNCTION public.get_active_price_plans(
  p_master_course_id uuid
)
RETURNS TABLE (
  id uuid,
  plan_name text,
  description text,
  validity_days integer,
  price_minor integer,
  currency text,
  is_default boolean,
  sort_order integer
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  select
    cpp.id,
    cpp.plan_name,
    cpp.description,
    cpp.validity_days,
    cpp.price_minor,
    cpp.currency,
    cpp.is_default,
    cpp.sort_order
  from public.course_price_plans cpp
  where cpp.master_course_id = p_master_course_id
    and cpp.is_active = true
  order by
    case when cpp.is_default then 0 else 1 end,
    cpp.sort_order,
    cpp.price_minor;
$$;


----------------------------------------------------------------------
-- 2. ELIMINATING REDUNDANT/DUPLICATE INDEXES
----------------------------------------------------------------------

DROP INDEX IF EXISTS public.idx_activity_events_tenant_actor;

DROP INDEX IF EXISTS public.idx_audit_logs_created;

DROP INDEX IF EXISTS public.idx_audit_logs_college_created;

DROP INDEX IF EXISTS public.idx_bundle_items_bundle_id;

DROP INDEX IF EXISTS public.idx_college_leads_created_at;

DROP INDEX IF EXISTS public.idx_course_modules_course_id;

DROP INDEX IF EXISTS public.idx_courses_college_id;

DROP INDEX IF EXISTS public.idx_email_campaign_recipients_campaign_id;

DROP INDEX IF EXISTS public.idx_global_course_assignment_blocks_course_sort;

DROP INDEX IF EXISTS public.idx_global_course_lesson_resources_lesson_sort;

DROP INDEX IF EXISTS public.idx_global_course_lessons_module_sort;

DROP INDEX IF EXISTS public.idx_master_course_items_video_asset_id;

DROP INDEX IF EXISTS public.idx_master_course_modules_course_id;

DROP INDEX IF EXISTS public.idx_master_course_modules_master_course_id;

DROP INDEX IF EXISTS public.idx_platform_announcements_active;

DROP INDEX IF EXISTS public.idx_svp_student_lesson;

DROP INDEX IF EXISTS public.idx_tenant_feature_overrides_college;

DROP INDEX IF EXISTS public.idx_video_assets_tp_asset_id;


----------------------------------------------------------------------
-- 3. CREATING MISSING HIGH-TRAFFIC FOREIGN KEY INDEXES
----------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_lms_email_outbox_invoice_id ON public.lms_email_outbox(invoice_id);


----------------------------------------------------------------------
-- 4. WRAPPING RLS POLICIES WITH (SELECT auth.uid()) / (SELECT auth.role())
----------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can read own active session" ON public.active_sessions;

CREATE POLICY "Users can read own active session" ON public.active_sessions FOR SELECT USING ((select auth.uid()) = user_id);


DROP POLICY IF EXISTS "Student read own activity_events" ON public.activity_events;

create policy "Student read own activity_events" on public.activity_events for select using (actor_user_id = (select auth.uid()) and tenant_id in (select m.college_id from public.college_memberships m where m.user_id = (select auth.uid()) and m.status = 'active'));


DROP POLICY IF EXISTS "Superadmin read all activity_events" ON public.activity_events;

create policy "Superadmin read all activity_events" on public.activity_events for select using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin'));


DROP POLICY IF EXISTS "Tenant admin read own activity_events" ON public.activity_events;

create policy "Tenant admin read own activity_events" on public.activity_events for select using (tenant_id in (select m.college_id from public.college_memberships m where m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('college_admin', 'faculty_spoc')));


DROP POLICY IF EXISTS "Superadmin full access admin_sessions" ON public.admin_sessions;

create policy "Superadmin full access admin_sessions" on public.admin_sessions for all using ( exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin') ) with check ( exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin') );


DROP POLICY IF EXISTS "Users can insert own admin sessions" ON public.admin_sessions;

create policy "Users can insert own admin sessions" on public.admin_sessions for insert with check (user_id = (select auth.uid()));


DROP POLICY IF EXISTS "Users can read own admin sessions" ON public.admin_sessions;

create policy "Users can read own admin sessions" on public.admin_sessions for select using (user_id = (select auth.uid()));


DROP POLICY IF EXISTS "Users can update own admin sessions" ON public.admin_sessions;

create policy "Users can update own admin sessions" on public.admin_sessions for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));


DROP POLICY IF EXISTS "analytics_settings_authenticated_insert" ON public.analytics_settings;

create policy analytics_settings_authenticated_insert on public.analytics_settings for insert to authenticated with check ( exists ( select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.global_role = 'superadmin' ) );


DROP POLICY IF EXISTS "analytics_settings_authenticated_update" ON public.analytics_settings;

create policy analytics_settings_authenticated_update on public.analytics_settings for update to authenticated using ( exists ( select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.global_role = 'superadmin' ) );


DROP POLICY IF EXISTS "Students read published announcements" ON public.announcements;

create policy "Students read published announcements" on public.announcements for select using ( published_at is not null and published_at <= now() and ( college_id in (select s.college_id from public.students s where s.user_id = (select auth.uid())) ) );


DROP POLICY IF EXISTS "Superadmin ops access" ON public.api_request_logs;

create policy "Superadmin ops access" on public.api_request_logs for select using (exists (select 1 from public.profiles where id = (select auth.uid()) and global_role = 'superadmin'));


DROP POLICY IF EXISTS "Admins can manage assignments" ON assessment_assignments;

CREATE POLICY "Admins can manage assignments" ON assessment_assignments FOR ALL USING ( tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = (select auth.uid()) AND role IN ('college_admin', 'faculty_spoc')) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.global_role = 'superadmin') );


DROP POLICY IF EXISTS "Students can view their own assignments" ON assessment_assignments;

CREATE POLICY "Students can view their own assignments" ON assessment_assignments FOR SELECT USING ( student_id = (select auth.uid()) OR cohort_id IN (SELECT cohort_id FROM students WHERE user_id = (select auth.uid()) AND cohort_id IS NOT NULL) OR (cohort_id IS NULL AND student_id IS NULL AND tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = (select auth.uid()))) );


DROP POLICY IF EXISTS "Admins can view attempts" ON assessment_attempts;

CREATE POLICY "Admins can view attempts" ON assessment_attempts FOR SELECT USING ( EXISTS (SELECT 1 FROM assessment_assignments aa WHERE aa.id = assessment_attempts.assignment_id AND (aa.tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = (select auth.uid()) AND role IN ('college_admin', 'faculty_spoc')) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.global_role = 'superadmin'))) );


DROP POLICY IF EXISTS "Students can manage their own attempts" ON assessment_attempts;

CREATE POLICY "Students can manage their own attempts" ON assessment_attempts FOR ALL USING ( student_id = (select auth.uid()) );


DROP POLICY IF EXISTS "Admins can manage options" ON assessment_options;

CREATE POLICY "Admins can manage options" ON assessment_options FOR ALL USING ( EXISTS (SELECT 1 FROM assessment_questions q JOIN assessment_sections s ON s.id = q.section_id JOIN assessments a ON a.id = s.assessment_id WHERE q.id = assessment_options.question_id AND (a.tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = (select auth.uid()) AND role IN ('college_admin', 'faculty_spoc')) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.global_role = 'superadmin'))) );


DROP POLICY IF EXISTS "Admins can manage questions" ON assessment_questions;

CREATE POLICY "Admins can manage questions" ON assessment_questions FOR ALL USING ( EXISTS (SELECT 1 FROM assessment_sections s JOIN assessments a ON a.id = s.assessment_id WHERE s.id = assessment_questions.section_id AND (a.tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = (select auth.uid()) AND role IN ('college_admin', 'faculty_spoc')) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.global_role = 'superadmin'))) );


DROP POLICY IF EXISTS "Admins can view responses" ON assessment_responses;

CREATE POLICY "Admins can view responses" ON assessment_responses FOR SELECT USING ( EXISTS (SELECT 1 FROM assessment_attempts att JOIN assessment_assignments aa ON aa.id = att.assignment_id WHERE att.id = assessment_responses.attempt_id AND (aa.tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = (select auth.uid()) AND role IN ('college_admin', 'faculty_spoc')) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.global_role = 'superadmin'))) );


DROP POLICY IF EXISTS "Students can manage their own responses" ON assessment_responses;

CREATE POLICY "Students can manage their own responses" ON assessment_responses FOR ALL USING ( EXISTS (SELECT 1 FROM assessment_attempts att WHERE att.id = assessment_responses.attempt_id AND att.student_id = (select auth.uid())) );


DROP POLICY IF EXISTS "Admins can manage results" ON assessment_results;

CREATE POLICY "Admins can manage results" ON assessment_results FOR ALL USING ( EXISTS (SELECT 1 FROM assessment_attempts att JOIN assessment_assignments aa ON aa.id = att.assignment_id WHERE att.id = assessment_results.attempt_id AND (aa.tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = (select auth.uid()) AND role IN ('college_admin', 'faculty_spoc')) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.global_role = 'superadmin'))) );


DROP POLICY IF EXISTS "Students can view their own released results" ON assessment_results;

CREATE POLICY "Students can view their own released results" ON assessment_results FOR SELECT USING ( EXISTS (SELECT 1 FROM assessment_attempts att WHERE att.id = assessment_results.attempt_id AND att.student_id = (select auth.uid())) AND status = 'released' );


DROP POLICY IF EXISTS "Admins can manage reviews" ON assessment_reviews;

CREATE POLICY "Admins can manage reviews" ON assessment_reviews FOR ALL USING ( EXISTS (SELECT 1 FROM assessment_responses r JOIN assessment_attempts att ON att.id = r.attempt_id JOIN assessment_assignments aa ON aa.id = att.assignment_id WHERE r.id = assessment_reviews.response_id AND (aa.tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = (select auth.uid()) AND role IN ('college_admin', 'faculty_spoc')) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.global_role = 'superadmin'))) );


DROP POLICY IF EXISTS "Students can view their own reviews if results released" ON assessment_reviews;

CREATE POLICY "Students can view their own reviews if results released" ON assessment_reviews FOR SELECT USING ( EXISTS ( SELECT 1 FROM assessment_responses r JOIN assessment_attempts att ON att.id = r.attempt_id JOIN assessment_results res ON res.attempt_id = att.id WHERE r.id = assessment_reviews.response_id AND att.student_id = (select auth.uid()) AND res.status = 'released' ) );


DROP POLICY IF EXISTS "Admins can manage sections" ON assessment_sections;

CREATE POLICY "Admins can manage sections" ON assessment_sections FOR ALL USING ( EXISTS (SELECT 1 FROM assessments a WHERE a.id = assessment_sections.assessment_id AND a.tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = (select auth.uid()) AND role IN ('college_admin', 'faculty_spoc'))) OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.global_role = 'superadmin') );


DROP POLICY IF EXISTS "Admins can manage their tenant's assessments" ON assessments;

CREATE POLICY "Admins can manage their tenant's assessments" ON assessments FOR ALL USING ( (select auth.uid()) IN ( SELECT user_id FROM college_memberships m WHERE m.college_id = assessments.tenant_id AND m.role IN ('college_admin', 'faculty_spoc') ) );


DROP POLICY IF EXISTS "Students can view assessments assigned to them or their cohort" ON assessments;

CREATE POLICY "Students can view assessments assigned to them or their cohort" ON assessments FOR SELECT USING ( assessments.status = 'published' AND EXISTS ( SELECT 1 FROM assessment_assignments aa LEFT JOIN cohort_memberships cm ON cm.cohort_id = aa.cohort_id LEFT JOIN students s ON s.id = cm.student_id AND s.user_id = (select auth.uid()) WHERE aa.assessment_id = assessments.id AND ( aa.student_id = (select auth.uid()) OR s.id IS NOT NULL OR (aa.cohort_id IS NULL AND aa.student_id IS NULL AND aa.tenant_id IN (SELECT college_id FROM college_memberships WHERE user_id = (select auth.uid()) LIMIT 1)) ) ) );


DROP POLICY IF EXISTS "Superadmins can manage all assessments" ON assessments;

CREATE POLICY "Superadmins can manage all assessments" ON assessments FOR ALL USING ( EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.global_role = 'superadmin') );


DROP POLICY IF EXISTS "Content managers can read audit logs for their college" ON public.audit_logs;

create policy "Content managers can read audit logs for their college" on public.audit_logs for select to authenticated using ( college_id in ( select m.college_id from public.college_memberships m where m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('college_admin', 'faculty_spoc') ) );


DROP POLICY IF EXISTS "Superadmin can read all audit logs" ON public.audit_logs;

create policy "Superadmin can read all audit logs" on public.audit_logs for select using ( exists (select 1 from public.profiles where id = (select auth.uid()) and global_role = 'superadmin') );


DROP POLICY IF EXISTS "Users can read own audit logs" ON public.audit_logs;

create policy "Users can read own audit logs" on public.audit_logs for select using (actor_id = (select auth.uid()));


DROP POLICY IF EXISTS "Students read own cohort_memberships" ON public.cohort_memberships;

create policy "Students read own cohort_memberships" on public.cohort_memberships for select using (student_id in (select s.id from public.students s where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.college_analytics_snapshots;

create policy "Allow read access for authenticated users" on public.college_analytics_snapshots for select using ((select auth.role()) = 'authenticated');


DROP POLICY IF EXISTS "Tenant admins can read enabled features" ON public.college_features;

create policy "Tenant admins can read enabled features" on public.college_features for select using ( college_id in ( select m.college_id from public.college_memberships m where m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('college_admin', 'faculty_spoc') ) );


DROP POLICY IF EXISTS "college_leads_auth_insert" ON public.college_leads;

create policy "college_leads_auth_insert" on public.college_leads for insert to authenticated with check ((select auth.uid()) is not null);


DROP POLICY IF EXISTS "SuperAdmin can delete college leads" ON public.college_leads;

create policy "SuperAdmin can delete college leads" on public.college_leads for delete to authenticated using ( exists ( select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.global_role = 'superadmin' ) );


DROP POLICY IF EXISTS "SuperAdmin can insert college leads" ON public.college_leads;

create policy "SuperAdmin can insert college leads" on public.college_leads for insert to authenticated with check ( exists ( select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.global_role = 'superadmin' ) );


DROP POLICY IF EXISTS "SuperAdmin can read college leads" ON public.college_leads;

create policy "SuperAdmin can read college leads" on public.college_leads for select to authenticated using ( exists ( select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.global_role = 'superadmin' ) );


DROP POLICY IF EXISTS "SuperAdmin can update college leads" ON public.college_leads;

create policy "SuperAdmin can update college leads" on public.college_leads for update to authenticated using ( exists ( select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.global_role = 'superadmin' ) );


DROP POLICY IF EXISTS "Users can activate own invited membership" ON public.college_memberships;

create policy "Users can activate own invited membership" on public.college_memberships for update using (user_id = (select auth.uid()) and status = 'invited') with check (user_id = (select auth.uid()) and status = 'active');


DROP POLICY IF EXISTS "Users can read own memberships" ON public.college_memberships;

create policy "Users can read own memberships" on public.college_memberships for select using (user_id = (select auth.uid()));


DROP POLICY IF EXISTS "Users can view own coupon usages" ON coupon_usages;

CREATE POLICY "Users can view own coupon usages" ON coupon_usages FOR SELECT USING (purchaser_user_id = (select auth.uid()));


DROP POLICY IF EXISTS "course_bundle_visibility_colleges_superadmin_all" ON public.course_bundle_visibility_colleges;

CREATE POLICY course_bundle_visibility_colleges_superadmin_all ON public.course_bundle_visibility_colleges FOR ALL USING (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin')) WITH CHECK (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin'));


DROP POLICY IF EXISTS "Students read own course_enrollments" ON public.course_enrollments;

create policy "Students read own course_enrollments" on public.course_enrollments for select using (student_id in (select s.id from public.students s where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "Students read course_modules for accessible courses" ON public.course_modules;

create policy "Students read course_modules for accessible courses" on public.course_modules for select using ( course_id in ( select c.id from public.courses c where c.status = 'published' or c.id in (select ce.course_id from public.course_enrollments ce join public.students s on s.id = ce.student_id and s.user_id = (select auth.uid())) ) );


DROP POLICY IF EXISTS "course_resources_superadmin_all" ON public.course_resources;

CREATE POLICY course_resources_superadmin_all ON public.course_resources FOR ALL TO authenticated USING ( EXISTS ( SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.global_role = 'superadmin' AND p.is_active = true ) ) WITH CHECK ( EXISTS ( SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.global_role = 'superadmin' AND p.is_active = true ) );


DROP POLICY IF EXISTS "course_variant_visibility_colleges_superadmin_all" ON public.course_variant_visibility_colleges;

CREATE POLICY course_variant_visibility_colleges_superadmin_all ON public.course_variant_visibility_colleges FOR ALL USING (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin')) WITH CHECK (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin'));


DROP POLICY IF EXISTS "Students read enrolled or published courses" ON public.courses;

create policy "Students read enrolled or published courses" on public.courses for select using ( status = 'published' or id in ( select ce.course_id from public.course_enrollments ce join public.students s on s.id = ce.student_id and s.user_id = (select auth.uid()) ) );


DROP POLICY IF EXISTS "demo_courses_published_select" ON public.demo_courses;

create policy demo_courses_published_select on public.demo_courses for select using (publish_status = 'published' and (select auth.uid()) is not null);


DROP POLICY IF EXISTS "Superadmin ops access" ON public.error_events;

create policy "Superadmin ops access" on public.error_events for select using (exists (select 1 from public.profiles where id = (select auth.uid()) and global_role = 'superadmin'));


DROP POLICY IF EXISTS "free_youtube_video_completions_student_insert" ON public.free_youtube_video_completions;

CREATE POLICY free_youtube_video_completions_student_insert ON public.free_youtube_video_completions FOR INSERT TO authenticated WITH CHECK ( student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid())) );


DROP POLICY IF EXISTS "free_youtube_video_completions_student_select" ON public.free_youtube_video_completions;

CREATE POLICY free_youtube_video_completions_student_select ON public.free_youtube_video_completions FOR SELECT TO authenticated USING ( student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid())) );


DROP POLICY IF EXISTS "free_youtube_video_completions_superadmin_all" ON public.free_youtube_video_completions;

CREATE POLICY free_youtube_video_completions_superadmin_all ON public.free_youtube_video_completions FOR ALL TO authenticated USING ( EXISTS ( SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.global_role = 'superadmin' AND p.is_active = true ) ) WITH CHECK ( EXISTS ( SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.global_role = 'superadmin' AND p.is_active = true ) );


DROP POLICY IF EXISTS "Students read own github_reviews" ON public.github_reviews;

create policy "Students read own github_reviews" on public.github_reviews for select using (student_id in (select s.id from public.students s where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "Students insert own interview_rounds" ON public.interview_rounds;

create policy "Students insert own interview_rounds" on public.interview_rounds for insert with check (application_id in (select a.id from public.student_applications a join public.students s on s.id = a.student_id where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "Students read own interview_rounds" ON public.interview_rounds;

create policy "Students read own interview_rounds" on public.interview_rounds for select using (application_id in (select a.id from public.student_applications a join public.students s on s.id = a.student_id where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "job_application_status_history_student_select" ON public.job_application_status_history;

CREATE POLICY job_application_status_history_student_select ON public.job_application_status_history FOR SELECT TO authenticated USING ( application_id IN ( SELECT ja.id FROM public.job_applications ja JOIN public.students s ON s.id = ja.student_id WHERE s.user_id = (select auth.uid()) ) );


DROP POLICY IF EXISTS "job_applications_student_insert" ON public.job_applications;

CREATE POLICY job_applications_student_insert ON public.job_applications FOR INSERT TO authenticated WITH CHECK ( student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid())) );


DROP POLICY IF EXISTS "job_applications_student_select" ON public.job_applications;

CREATE POLICY job_applications_student_select ON public.job_applications FOR SELECT TO authenticated USING ( student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid())) );


DROP POLICY IF EXISTS "job_applications_student_update" ON public.job_applications;

CREATE POLICY job_applications_student_update ON public.job_applications FOR UPDATE TO authenticated USING ( student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid())) ) WITH CHECK ( student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid())) );


DROP POLICY IF EXISTS "job_post_colleges_student_select" ON public.job_post_colleges;

CREATE POLICY job_post_colleges_student_select ON public.job_post_colleges FOR SELECT TO authenticated USING ( college_id IN ( SELECT s.college_id FROM public.students s WHERE s.user_id = (select auth.uid()) ) );


DROP POLICY IF EXISTS "job_posts_student_select" ON public.job_posts;

CREATE POLICY job_posts_student_select ON public.job_posts FOR SELECT TO authenticated USING ( status = 'open' AND ( visibility_scope IN ('all_lms', 'college_only', 'global_only') OR EXISTS ( SELECT 1 FROM public.job_post_colleges jpc WHERE jpc.job_id = public.job_posts.id AND jpc.college_id IN ( SELECT s.college_id FROM public.students s WHERE s.user_id = (select auth.uid()) ) ) ) );


DROP POLICY IF EXISTS "jrb_enrollments_student_read" ON public.job_ready_bootcamp_enrollments;

CREATE POLICY jrb_enrollments_student_read ON public.job_ready_bootcamp_enrollments FOR SELECT TO authenticated USING ( EXISTS ( SELECT 1 FROM public.students WHERE students.id = job_ready_bootcamp_enrollments.student_id AND students.user_id = (select auth.uid()) ) );


DROP POLICY IF EXISTS "jrb_mentorship_recipients_student_read" ON public.job_ready_bootcamp_mentorship_recipients;

CREATE POLICY jrb_mentorship_recipients_student_read ON public.job_ready_bootcamp_mentorship_recipients FOR SELECT TO authenticated USING ( EXISTS ( SELECT 1 FROM public.students AS s WHERE s.id = job_ready_bootcamp_mentorship_recipients.student_id AND s.user_id = (select auth.uid()) ) );


DROP POLICY IF EXISTS "jrb_mentorship_student_read" ON public.job_ready_bootcamp_mentorship_sessions;

CREATE POLICY jrb_mentorship_student_read ON public.job_ready_bootcamp_mentorship_sessions FOR SELECT TO authenticated USING ( EXISTS ( SELECT 1 FROM public.job_ready_bootcamp_mentorship_recipients AS r INNER JOIN public.students AS s ON s.id = r.student_id WHERE r.session_id = job_ready_bootcamp_mentorship_sessions.id AND s.user_id = (select auth.uid()) ) );


DROP POLICY IF EXISTS "Superadmin ops access" ON public.job_runs;

create policy "Superadmin ops access" on public.job_runs for select using (exists (select 1 from public.profiles where id = (select auth.uid()) and global_role = 'superadmin'));


DROP POLICY IF EXISTS "Students insert own lecture_progress" ON public.lecture_progress;

create policy "Students insert own lecture_progress" on public.lecture_progress for insert with check ( enrollment_id in ( select ce.id from public.course_enrollments ce join public.students s on s.id = ce.student_id and s.user_id = (select auth.uid()) ) );


DROP POLICY IF EXISTS "Students read own lecture_progress" ON public.lecture_progress;

create policy "Students read own lecture_progress" on public.lecture_progress for select using ( enrollment_id in ( select ce.id from public.course_enrollments ce join public.students s on s.id = ce.student_id and s.user_id = (select auth.uid()) ) );


DROP POLICY IF EXISTS "Students update own lecture_progress" ON public.lecture_progress;

create policy "Students update own lecture_progress" on public.lecture_progress for update using ( enrollment_id in ( select ce.id from public.course_enrollments ce join public.students s on s.id = ce.student_id and s.user_id = (select auth.uid()) ) ) with check ( enrollment_id in ( select ce.id from public.course_enrollments ce join public.students s on s.id = ce.student_id and s.user_id = (select auth.uid()) ) );


DROP POLICY IF EXISTS "Students read lecture_resources for accessible lectures" ON public.lecture_resources;

create policy "Students read lecture_resources for accessible lectures" on public.lecture_resources for select using ( lecture_id in ( select l.id from public.lectures l join public.course_modules cm on cm.id = l.course_module_id join public.courses c on c.id = cm.course_id where c.status = 'published' or c.id in (select ce.course_id from public.course_enrollments ce join public.students s on s.id = ce.student_id and s.user_id = (select auth.uid())) ) );


DROP POLICY IF EXISTS "Students read lectures for accessible modules" ON public.lectures;

create policy "Students read lectures for accessible modules" on public.lectures for select using ( course_module_id in ( select cm.id from public.course_modules cm join public.courses c on c.id = cm.course_id where c.status = 'published' or c.id in (select ce.course_id from public.course_enrollments ce join public.students s on s.id = ce.student_id and s.user_id = (select auth.uid())) ) );


DROP POLICY IF EXISTS "legacy_tiered_catalog_archive_superadmin_all" ON public.legacy_tiered_catalog_archive;

CREATE POLICY legacy_tiered_catalog_archive_superadmin_all ON public.legacy_tiered_catalog_archive FOR ALL USING (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin')) WITH CHECK (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin'));


DROP POLICY IF EXISTS "Students read own linkedin_reviews" ON public.linkedin_reviews;

create policy "Students read own linkedin_reviews" on public.linkedin_reviews for select using (student_id in (select s.id from public.students s where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "lms_email_outbox_select_own" ON public.lms_email_outbox;

create policy lms_email_outbox_select_own on public.lms_email_outbox for select to authenticated using (user_id = (select auth.uid()));


DROP POLICY IF EXISTS "lms_invoices_select_own" ON public.lms_invoices;

create policy lms_invoices_select_own on public.lms_invoices for select to authenticated using (user_id = (select auth.uid()));


DROP POLICY IF EXISTS "items_superadmin_all" ON public.master_course_items;

create policy items_superadmin_all on public.master_course_items for all to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true)) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true));


DROP POLICY IF EXISTS "modules_superadmin_all" ON public.master_course_modules;

create policy modules_superadmin_all on public.master_course_modules for all to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true)) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true));


DROP POLICY IF EXISTS "master_courses_superadmin_all" ON public.master_courses;

create policy master_courses_superadmin_all on public.master_courses for all to authenticated using ( exists ( select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true ) ) with check ( exists ( select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true ) );


DROP POLICY IF EXISTS "Students read own mock_interviews" ON public.mock_interviews;

create policy "Students read own mock_interviews" on public.mock_interviews for select using (student_id in (select s.id from public.students s where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "College Admin and Student can insert appeals for their college" ON public.module_access_appeals;

create policy "College Admin and Student can insert appeals for their college" on public.module_access_appeals for insert with check ( requester_user_id = (select auth.uid()) and ( exists ( select 1 from public.college_memberships cm where cm.user_id = (select auth.uid()) and cm.college_id = module_access_appeals.college_id and cm.role in ('college_admin', 'faculty_spoc', 'mentor', 'student') and cm.status in ('active', 'invited') ) ) );


DROP POLICY IF EXISTS "Requester can read own appeals" ON public.module_access_appeals;

create policy "Requester can read own appeals" on public.module_access_appeals for select using (requester_user_id = (select auth.uid()));


DROP POLICY IF EXISTS "Super Admin can read and update all appeals" ON public.module_access_appeals;

create policy "Super Admin can read and update all appeals" on public.module_access_appeals for all using ( exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin') ) with check ( exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin') );


DROP POLICY IF EXISTS "Superadmin full access non_partnered_students" ON public.non_partnered_students;

create policy "Superadmin full access non_partnered_students" on public.non_partnered_students for all using ( exists ( select 1 from public.profiles where id = (select auth.uid()) and global_role = 'superadmin' ) ) with check ( exists ( select 1 from public.profiles where id = (select auth.uid()) and global_role = 'superadmin' ) );


DROP POLICY IF EXISTS "Users can read own non_partnered_student row" ON public.non_partnered_students;

create policy "Users can read own non_partnered_student row" on public.non_partnered_students for select using (user_id = (select auth.uid()));


DROP POLICY IF EXISTS "Superadmin ops access" ON public.notification_queue;

create policy "Superadmin ops access" on public.notification_queue for select using (exists (select 1 from public.profiles where id = (select auth.uid()) and global_role = 'superadmin'));


DROP POLICY IF EXISTS "Students insert own offers" ON public.offers;

create policy "Students insert own offers" on public.offers for insert with check (student_id in (select s.id from public.students s where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "Students read own offers" ON public.offers;

create policy "Students read own offers" on public.offers for select using (student_id in (select s.id from public.students s where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "Users can view own order items" ON order_items;

CREATE POLICY "Users can view own order items" ON order_items FOR SELECT USING (EXISTS ( SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.purchaser_user_id = (select auth.uid()) ));


DROP POLICY IF EXISTS "Users can view own orders" ON orders;

CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING ((select auth.uid()) = purchaser_user_id);


DROP POLICY IF EXISTS "paid_course_landing_metadata_superadmin_all" ON public.paid_course_landing_metadata;

CREATE POLICY paid_course_landing_metadata_superadmin_all ON public.paid_course_landing_metadata FOR ALL USING (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin')) WITH CHECK (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin'));


DROP POLICY IF EXISTS "Students can view availability" ON public.paid_mentorship_availability;

create policy "Students can view availability" on public.paid_mentorship_availability for select to authenticated using ((select auth.uid()) is not null and is_active = true);


DROP POLICY IF EXISTS "Superadmin can manage paid mentorship availability" ON public.paid_mentorship_availability;

CREATE POLICY "Superadmin can manage paid mentorship availability" ON public.paid_mentorship_availability FOR ALL TO authenticated USING ( EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = (select auth.uid()) AND profiles.global_role = 'superadmin' ) );


DROP POLICY IF EXISTS "Students can create own bookings" ON public.paid_mentorship_bookings;

CREATE POLICY "Students can create own bookings" ON public.paid_mentorship_bookings FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));


DROP POLICY IF EXISTS "Students can update own bookings" ON public.paid_mentorship_bookings;

CREATE POLICY "Students can update own bookings" ON public.paid_mentorship_bookings FOR UPDATE TO authenticated USING (user_id = (select auth.uid()));


DROP POLICY IF EXISTS "Students can view own bookings" ON public.paid_mentorship_bookings;

CREATE POLICY "Students can view own bookings" ON public.paid_mentorship_bookings FOR SELECT TO authenticated USING (user_id = (select auth.uid()));


DROP POLICY IF EXISTS "Superadmin can manage paid mentorship bookings" ON public.paid_mentorship_bookings;

CREATE POLICY "Superadmin can manage paid mentorship bookings" ON public.paid_mentorship_bookings FOR ALL TO authenticated USING ( EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = (select auth.uid()) AND profiles.global_role = 'superadmin' ) );


DROP POLICY IF EXISTS "Superadmin can manage paid mentorship categories" ON public.paid_mentorship_categories;

CREATE POLICY "Superadmin can manage paid mentorship categories" ON public.paid_mentorship_categories FOR ALL TO authenticated USING ( EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = (select auth.uid()) AND profiles.global_role = 'superadmin' ) );


DROP POLICY IF EXISTS "Superadmin can manage paid mentorship pricing" ON public.paid_mentorship_pricing;

CREATE POLICY "Superadmin can manage paid mentorship pricing" ON public.paid_mentorship_pricing FOR ALL TO authenticated USING ( EXISTS ( SELECT 1 FROM public.profiles WHERE profiles.id = (select auth.uid()) AND profiles.global_role = 'superadmin' ) );


DROP POLICY IF EXISTS "Users can view own payments" ON payments;

CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (EXISTS ( SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.purchaser_user_id = (select auth.uid()) ));


DROP POLICY IF EXISTS "Students insert own placement_documents" ON public.placement_documents;

create policy "Students insert own placement_documents" on public.placement_documents for insert with check (student_id in (select s.id from public.students s where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "Students read own placement_documents" ON public.placement_documents;

create policy "Students read own placement_documents" on public.placement_documents for select using (student_id in (select s.id from public.students s where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "Students insert own placement_profiles" ON public.placement_profiles;

create policy "Students insert own placement_profiles" on public.placement_profiles for insert with check (student_id in (select s.id from public.students s where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "Students read own placement_profiles" ON public.placement_profiles;

create policy "Students read own placement_profiles" on public.placement_profiles for select using (student_id in (select s.id from public.students s where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "Students update own placement_profiles" ON public.placement_profiles;

create policy "Students update own placement_profiles" on public.placement_profiles for update using (student_id in (select s.id from public.students s where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "Students read own placement_readiness_reviews" ON public.placement_readiness_reviews;

create policy "Students read own placement_readiness_reviews" on public.placement_readiness_reviews for select using (placement_profile_id in (select pp.id from public.placement_profiles pp join public.students s on s.id = pp.student_id where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "Students read own placement_status_history" ON public.placement_status_history;

create policy "Students read own placement_status_history" on public.placement_status_history for select using (placement_profile_id in (select pp.id from public.placement_profiles pp join public.students s on s.id = pp.student_id where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "plan_features_superadmin_all" ON public.plan_features;

CREATE POLICY plan_features_superadmin_all ON public.plan_features FOR ALL USING (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin')) WITH CHECK (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin'));


DROP POLICY IF EXISTS "plans_read_authenticated" ON public.plans;

create policy plans_read_authenticated on public.plans for select to authenticated using ((select auth.uid()) is not null);


DROP POLICY IF EXISTS "plans_superadmin_all" ON public.plans;

CREATE POLICY plans_superadmin_all ON public.plans FOR ALL USING (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin')) WITH CHECK (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin'));


DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

create policy "Users can insert own profile" on public.profiles for insert with check (id = (select auth.uid()));


DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

create policy "Users can read own profile" on public.profiles for select using (id = (select auth.uid()));


DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

create policy "Users can update own profile" on public.profiles for update using (id = (select auth.uid()));


DROP POLICY IF EXISTS "Users can view own refund events" ON refund_events;

CREATE POLICY "Users can view own refund events" ON refund_events FOR SELECT USING (EXISTS ( SELECT 1 FROM orders WHERE orders.id = refund_events.order_id AND orders.purchaser_user_id = (select auth.uid()) ));


DROP POLICY IF EXISTS "Students insert own resume_versions" ON public.resume_versions;

create policy "Students insert own resume_versions" on public.resume_versions for insert with check (placement_profile_id in (select pp.id from public.placement_profiles pp join public.students s on s.id = pp.student_id where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "Students read own resume_versions" ON public.resume_versions;

create policy "Students read own resume_versions" on public.resume_versions for select using (placement_profile_id in (select pp.id from public.placement_profiles pp join public.students s on s.id = pp.student_id where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "Brand assets: superadmin delete" ON storage.objects;

create policy "Brand assets: superadmin delete" on storage.objects for delete to authenticated using ( bucket_id = 'brand-assets' and exists ( select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true ) );


DROP POLICY IF EXISTS "Brand assets: superadmin insert" ON storage.objects;

create policy "Brand assets: superadmin insert" on storage.objects for insert to authenticated with check ( bucket_id = 'brand-assets' and exists ( select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true ) );


DROP POLICY IF EXISTS "Brand assets: superadmin update" ON storage.objects;

create policy "Brand assets: superadmin update" on storage.objects for update to authenticated using ( bucket_id = 'brand-assets' and exists ( select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true ) ) with check ( bucket_id = 'brand-assets' and exists ( select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true ) );


DROP POLICY IF EXISTS "Global course resources: enrolled students read" ON storage.objects;


DROP POLICY IF EXISTS "Global course resources: superadmin full access" ON storage.objects;

create policy "Global course resources: superadmin full access" on storage.objects for all to authenticated using ( bucket_id = 'global-course-resources' and exists (select 1 from public.profiles where id = (select auth.uid()) and global_role = 'superadmin') ) with check ( bucket_id = 'global-course-resources' and exists (select 1 from public.profiles where id = (select auth.uid()) and global_role = 'superadmin') );


DROP POLICY IF EXISTS "Job resumes: student delete own" ON storage.objects;

CREATE POLICY "Job resumes: student delete own" ON storage.objects FOR DELETE TO authenticated USING ( bucket_id = 'job-resumes' AND (storage.foldername(name))[1]::uuid IN ( SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid()) ) );


DROP POLICY IF EXISTS "Job resumes: student insert own" ON storage.objects;

CREATE POLICY "Job resumes: student insert own" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'job-resumes' AND (storage.foldername(name))[1]::uuid IN ( SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid()) ) AND (metadata ->> 'mimetype') = 'application/pdf' );


DROP POLICY IF EXISTS "Job resumes: student read own" ON storage.objects;

CREATE POLICY "Job resumes: student read own" ON storage.objects FOR SELECT TO authenticated USING ( bucket_id = 'job-resumes' AND (storage.foldername(name))[1]::uuid IN ( SELECT s.id FROM public.students s WHERE s.user_id = (select auth.uid()) ) );


DROP POLICY IF EXISTS "Placement docs: content managers full access for their college" ON storage.objects;

create policy "Placement docs: content managers full access for their college" on storage.objects for all to authenticated using ( bucket_id = 'placement-docs' and (storage.foldername(name))[1]::uuid in ( select m.college_id from public.college_memberships m where m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('college_admin', 'faculty_spoc') ) ) with check ( bucket_id = 'placement-docs' and (storage.foldername(name))[1]::uuid in ( select m.college_id from public.college_memberships m where m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('college_admin', 'faculty_spoc') ) );


DROP POLICY IF EXISTS "Placement docs: students access own folder" ON storage.objects;

create policy "Placement docs: students access own folder" on storage.objects for all to authenticated using ( bucket_id = 'placement-docs' and (storage.foldername(name))[1]::uuid = (select s.college_id from public.students s where s.user_id = (select auth.uid()) limit 1) and (storage.foldername(name))[2]::uuid = (select s.id from public.students s where s.user_id = (select auth.uid()) limit 1) ) with check ( bucket_id = 'placement-docs' and (storage.foldername(name))[1]::uuid = (select s.college_id from public.students s where s.user_id = (select auth.uid()) limit 1) and (storage.foldername(name))[2]::uuid = (select s.id from public.students s where s.user_id = (select auth.uid()) limit 1) );


DROP POLICY IF EXISTS "Placement docs: superadmin full access" ON storage.objects;

create policy "Placement docs: superadmin full access" on storage.objects for all to authenticated using ( bucket_id = 'placement-docs' and exists (select 1 from public.profiles where id = (select auth.uid()) and global_role = 'superadmin') ) with check ( bucket_id = 'placement-docs' and exists (select 1 from public.profiles where id = (select auth.uid()) and global_role = 'superadmin') );


DROP POLICY IF EXISTS "SuperAdmin full access course_resources" ON storage.objects;

CREATE POLICY "SuperAdmin full access course_resources" ON storage.objects FOR ALL TO authenticated USING ( bucket_id = 'course_resources' AND EXISTS ( SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.global_role = 'superadmin' AND p.is_active = true ) ) WITH CHECK ( bucket_id = 'course_resources' AND EXISTS ( SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.global_role = 'superadmin' AND p.is_active = true ) );


DROP POLICY IF EXISTS "Students full own student_applications" ON public.student_applications;

create policy "Students full own student_applications" on public.student_applications for all using (student_id in (select s.id from public.students s where s.user_id = (select auth.uid()))) with check (student_id in (select s.id from public.students s where s.user_id = (select auth.uid())));


DROP POLICY IF EXISTS "entitlements_student_read" ON public.student_content_entitlements;

create policy "entitlements_student_read" on public.student_content_entitlements for select using ( exists ( select 1 from public.students where students.id = student_content_entitlements.student_id and students.user_id = (select auth.uid()) ) );


DROP POLICY IF EXISTS "entitlements_superadmin_all" ON public.student_content_entitlements;

create policy "entitlements_superadmin_all" on public.student_content_entitlements using ( exists ( select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.global_role = 'superadmin' and profiles.is_active = true ) );


DROP POLICY IF EXISTS "student_daily_visits_superadmin_all" ON public.student_daily_visits;

CREATE POLICY student_daily_visits_superadmin_all ON public.student_daily_visits FOR ALL USING (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin')) WITH CHECK (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin'));


DROP POLICY IF EXISTS "entitlements_student_read" ON public.student_entitlements;

create policy entitlements_student_read on public.student_entitlements for select to authenticated using ( student_id in (select s.id from public.students s where s.user_id = (select auth.uid())) );


DROP POLICY IF EXISTS "entitlements_superadmin_all" ON public.student_entitlements;

create policy entitlements_superadmin_all on public.student_entitlements for all to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true)) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true));


DROP POLICY IF EXISTS "progress_student_all" ON public.student_progress;

create policy progress_student_all on public.student_progress for all to authenticated using ( student_id in (select s.id from public.students s where s.user_id = (select auth.uid())) ) with check ( student_id in (select s.id from public.students s where s.user_id = (select auth.uid())) );


DROP POLICY IF EXISTS "progress_superadmin_all" ON public.student_progress;

create policy progress_superadmin_all on public.student_progress for all to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true)) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true));


DROP POLICY IF EXISTS "student_streaks_superadmin_all" ON public.student_streaks;

CREATE POLICY student_streaks_superadmin_all ON public.student_streaks FOR ALL USING (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin')) WITH CHECK (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin'));


DROP POLICY IF EXISTS "student_todos_student_delete" ON public.student_todos;

CREATE POLICY student_todos_student_delete ON public.student_todos FOR DELETE TO authenticated USING ( student_id IN ( SELECT id FROM public.students WHERE user_id = (select auth.uid()) ) );


DROP POLICY IF EXISTS "student_todos_student_insert" ON public.student_todos;

CREATE POLICY student_todos_student_insert ON public.student_todos FOR INSERT TO authenticated WITH CHECK ( student_id IN ( SELECT id FROM public.students WHERE user_id = (select auth.uid()) ) );


DROP POLICY IF EXISTS "student_todos_student_select" ON public.student_todos;

CREATE POLICY student_todos_student_select ON public.student_todos FOR SELECT TO authenticated USING ( student_id IN ( SELECT id FROM public.students WHERE user_id = (select auth.uid()) ) );


DROP POLICY IF EXISTS "student_todos_student_update" ON public.student_todos;

CREATE POLICY student_todos_student_update ON public.student_todos FOR UPDATE TO authenticated USING ( student_id IN ( SELECT id FROM public.students WHERE user_id = (select auth.uid()) ) ) WITH CHECK ( student_id IN ( SELECT id FROM public.students WHERE user_id = (select auth.uid()) ) );


DROP POLICY IF EXISTS "student_todos_superadmin_all" ON public.student_todos;

CREATE POLICY student_todos_superadmin_all ON public.student_todos FOR ALL USING (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin')) WITH CHECK (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin'));


DROP POLICY IF EXISTS "Students can view their own video progress" ON public.student_video_progress;

CREATE POLICY "Students can view their own video progress" ON public.student_video_progress FOR SELECT TO authenticated USING ( student_id IN (SELECT id FROM public.students WHERE user_id = (select auth.uid())) );


DROP POLICY IF EXISTS "sessions_student_all" ON public.student_video_sessions;

create policy sessions_student_all on public.student_video_sessions for all to authenticated using ( student_id in (select s.id from public.students s where s.user_id = (select auth.uid())) ) with check ( student_id in (select s.id from public.students s where s.user_id = (select auth.uid())) );


DROP POLICY IF EXISTS "sessions_superadmin_all" ON public.student_video_sessions;

create policy sessions_superadmin_all on public.student_video_sessions for all to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true)) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true));


DROP POLICY IF EXISTS "College admin can insert students in their college" ON public.students;

create policy "College admin can insert students in their college" on public.students for insert with check ( college_id in ( select college_id from public.college_memberships where user_id = (select auth.uid()) and role = 'college_admin' and status = 'active' ) );


DROP POLICY IF EXISTS "College admin can read students in their college" ON public.students;

create policy "College admin can read students in their college" on public.students for select using ( college_id in ( select college_id from public.college_memberships where user_id = (select auth.uid()) and role = 'college_admin' and status = 'active' ) );


DROP POLICY IF EXISTS "College admin can update students in their college" ON public.students;

create policy "College admin can update students in their college" on public.students for update using ( college_id in ( select college_id from public.college_memberships where user_id = (select auth.uid()) and role = 'college_admin' and status = 'active' ) );


DROP POLICY IF EXISTS "Students can read own record" ON public.students;

create policy "Students can read own record" on public.students for select using (user_id = (select auth.uid()));


DROP POLICY IF EXISTS "tenant_feature_overrides_read_tenant" ON public.tenant_feature_overrides;

create policy tenant_feature_overrides_read_tenant on public.tenant_feature_overrides for select to authenticated using ( exists ( select 1 from public.college_memberships m where m.user_id = (select auth.uid()) and m.college_id = tenant_feature_overrides.college_id and m.status = 'active' ) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin') );


DROP POLICY IF EXISTS "tenant_feature_overrides_superadmin_all" ON public.tenant_feature_overrides;

create policy tenant_feature_overrides_superadmin_all on public.tenant_feature_overrides for all using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin')) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin'));


DROP POLICY IF EXISTS "tenant_feature_overrides_superadmin_all_v2" ON public.tenant_feature_overrides;

CREATE POLICY tenant_feature_overrides_superadmin_all_v2 ON public.tenant_feature_overrides FOR ALL USING (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin')) WITH CHECK (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin'));


DROP POLICY IF EXISTS "Super Admin and service can insert tenant_module_access_audit" ON public.tenant_module_access_audit;

create policy "Super Admin and service can insert tenant_module_access_audit" on public.tenant_module_access_audit for insert with check ( exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin') );


DROP POLICY IF EXISTS "Super Admin can read tenant_module_access_audit" ON public.tenant_module_access_audit;

create policy "Super Admin can read tenant_module_access_audit" on public.tenant_module_access_audit for select using ( exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin') );


DROP POLICY IF EXISTS "College Admin can read own college overrides" ON public.tenant_module_overrides;

create policy "College Admin can read own college overrides" on public.tenant_module_overrides for select using ( exists ( select 1 from public.college_memberships cm where cm.user_id = (select auth.uid()) and cm.college_id = tenant_module_overrides.college_id and cm.role in ('college_admin', 'faculty_spoc', 'mentor') and cm.status in ('active', 'invited') ) );


DROP POLICY IF EXISTS "Super Admin can manage tenant_module_overrides" ON public.tenant_module_overrides;

create policy "Super Admin can manage tenant_module_overrides" on public.tenant_module_overrides for all using ( exists ( select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' ) ) with check ( exists ( select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' ) );


DROP POLICY IF EXISTS "video_assets_superadmin_all" ON public.video_assets;

create policy video_assets_superadmin_all on public.video_assets for all to authenticated using ( exists ( select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true ) ) with check ( exists ( select 1 from public.profiles p where p.id = (select auth.uid()) and p.global_role = 'superadmin' and p.is_active = true ) );


DROP POLICY IF EXISTS "Students can view their own events" ON public.video_watch_events;

CREATE POLICY "Students can view their own events" ON public.video_watch_events FOR SELECT TO authenticated USING ( student_id IN (SELECT id FROM public.students WHERE user_id = (select auth.uid())) );


DROP POLICY IF EXISTS "Students can view their own segments" ON public.video_watch_segments;

CREATE POLICY "Students can view their own segments" ON public.video_watch_segments FOR SELECT TO authenticated USING ( student_id IN (SELECT id FROM public.students WHERE user_id = (select auth.uid())) );


DROP POLICY IF EXISTS "Students can view their own sessions" ON public.video_watch_sessions;

CREATE POLICY "Students can view their own sessions" ON public.video_watch_sessions FOR SELECT TO authenticated USING ( student_id IN (SELECT id FROM public.students WHERE user_id = (select auth.uid())) );


COMMIT;
