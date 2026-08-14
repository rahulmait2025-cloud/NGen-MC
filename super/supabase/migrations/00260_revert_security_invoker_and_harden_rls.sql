-- Migration: 00260_revert_security_invoker_and_harden_rls.sql
-- Description: Revert critical auth/RLS functions back to SECURITY DEFINER to fix login loop/ recursion issues,
-- and consolidate remaining permissive RLS policies to resolve linter warnings.

BEGIN;

-- =========================================================================
-- Part 1: Revert SECURITY INVOKER changes from 00259 to restore functionality
-- =========================================================================

-- 1. college_peer_can_view_profile
ALTER FUNCTION public.college_peer_can_view_profile(uuid) SECURITY DEFINER;

-- 2. compute_trusted_course_price_for_payment
ALTER FUNCTION public.compute_trusted_course_price_for_payment(uuid, text) SECURITY DEFINER;

-- 3. effective_validity_days_for_enrollment
ALTER FUNCTION public.effective_validity_days_for_enrollment(uuid, uuid, integer) SECURITY DEFINER;

-- 4. get_active_bundle_price_plans
ALTER FUNCTION public.get_active_bundle_price_plans(uuid) SECURITY DEFINER;

-- 5. get_active_price_plans
ALTER FUNCTION public.get_active_price_plans(uuid) SECURITY DEFINER;

-- 6. get_active_price_plans_for_source
ALTER FUNCTION public.get_active_price_plans_for_source(text, uuid) SECURITY DEFINER;

-- 7. get_direct_learner_college_id
ALTER FUNCTION public.get_direct_learner_college_id() SECURITY DEFINER;

-- 8. get_lead_stats
ALTER FUNCTION public.get_lead_stats() SECURITY DEFINER;

-- 9. get_peer_profile_ids
ALTER FUNCTION public.get_peer_profile_ids(uuid) SECURITY DEFINER;

-- 10. get_program_summary
ALTER FUNCTION public.get_program_summary() SECURITY DEFINER;

-- 11. get_student_analytics_payload
ALTER FUNCTION public.get_student_analytics_payload(uuid, uuid, boolean, date, text) SECURITY DEFINER;

-- 12. get_student_course_player_payload
ALTER FUNCTION public.get_student_course_player_payload(uuid, uuid, uuid, uuid, uuid, text) SECURITY DEFINER;

-- 13. get_student_entitled_courses
ALTER FUNCTION public.get_student_entitled_courses(uuid, uuid, boolean, boolean) SECURITY DEFINER;

-- 14. get_student_visible_course_detail
ALTER FUNCTION public.get_student_visible_course_detail(uuid, text) SECURITY DEFINER;

-- 15. is_college_admin_of
ALTER FUNCTION public.is_college_admin_of(uuid) SECURITY DEFINER;

-- 16. is_college_content_manager
ALTER FUNCTION public.is_college_content_manager(uuid) SECURITY DEFINER;

-- 17. is_peer_profile
ALTER FUNCTION public.is_peer_profile(uuid) SECURITY DEFINER;

-- 18. list_student_visible_courses
ALTER FUNCTION public.list_student_visible_courses(text) SECURITY DEFINER;

-- 19. reorder_course_lessons
ALTER FUNCTION public.reorder_course_lessons(uuid[]) SECURITY DEFINER;

-- 20. reorder_course_modules
ALTER FUNCTION public.reorder_course_modules(uuid[]) SECURITY DEFINER;

-- 21. resolve_admin_auth_context
ALTER FUNCTION public.resolve_admin_auth_context(uuid, text) SECURITY DEFINER;

-- 22. resolve_login_route_context
ALTER FUNCTION public.resolve_login_route_context(uuid) SECURITY DEFINER;

-- 23. resolve_student_auth_context
ALTER FUNCTION public.resolve_student_auth_context(uuid, text) SECURITY DEFINER;


-- =========================================================================
-- Part 2: Resolve remaining multiple_permissive_policies linter warnings for role 'anon'
-- =========================================================================

-- public.demo_course_curriculum
ALTER POLICY demo_course_curriculum_superadmin_all ON public.demo_course_curriculum TO authenticated;

-- public.demo_course_faqs
ALTER POLICY demo_course_faqs_superadmin_all ON public.demo_course_faqs TO authenticated;

-- public.demo_course_features
ALTER POLICY demo_course_features_superadmin_all ON public.demo_course_features TO authenticated;

-- public.demo_course_instructors
ALTER POLICY demo_course_instructors_superadmin_all ON public.demo_course_instructors TO authenticated;

-- public.demo_course_outcomes
ALTER POLICY demo_course_outcomes_superadmin_all ON public.demo_course_outcomes TO authenticated;

-- public.demo_course_stats
ALTER POLICY demo_course_stats_superadmin_all ON public.demo_course_stats TO authenticated;

-- public.demo_course_testimonials
ALTER POLICY demo_course_testimonials_superadmin_all ON public.demo_course_testimonials TO authenticated;

-- public.demo_courses
ALTER POLICY demo_courses_superadmin_all ON public.demo_courses TO authenticated;

-- public.placement_profiles
ALTER POLICY "Content managers full placement_profiles" ON public.placement_profiles TO authenticated;
ALTER POLICY "Superadmin full placement_profiles" ON public.placement_profiles TO authenticated;

-- public.placement_readiness_reviews
ALTER POLICY "Content managers full placement_readiness_reviews" ON public.placement_readiness_reviews TO authenticated;
ALTER POLICY "Superadmin full placement_readiness_reviews" ON public.placement_readiness_reviews TO authenticated;

-- public.placement_status_history
ALTER POLICY "Content managers full placement_status_history" ON public.placement_status_history TO authenticated;
ALTER POLICY "Superadmin full placement_status_history" ON public.placement_status_history TO authenticated;

-- public.profiles
ALTER POLICY "College admin can read profiles in their college" ON public.profiles TO authenticated;
ALTER POLICY "Superadmin read all profiles" ON public.profiles TO authenticated;

-- public.resume_versions
ALTER POLICY "Content managers full resume_versions" ON public.resume_versions TO authenticated;
ALTER POLICY "Superadmin full resume_versions" ON public.resume_versions TO authenticated;

-- public.student_applications
ALTER POLICY "Content managers full student_applications" ON public.student_applications TO authenticated;
ALTER POLICY "Superadmin full student_applications" ON public.student_applications TO authenticated;

COMMIT;
