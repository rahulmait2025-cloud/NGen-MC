-- Migration: 00259_database_security_linter_remediation_part2.sql
-- Description: Convert remaining public/authenticated exposed SECURITY DEFINER functions to SECURITY INVOKER.
-- This ensures they run under the caller's privileges, resolving the remaining database security linter warnings.

BEGIN;

-- 1. college_peer_can_view_profile
ALTER FUNCTION public.college_peer_can_view_profile(uuid) SECURITY INVOKER;

-- 2. compute_trusted_course_price_for_payment
ALTER FUNCTION public.compute_trusted_course_price_for_payment(uuid, text) SECURITY INVOKER;

-- 3. effective_validity_days_for_enrollment
ALTER FUNCTION public.effective_validity_days_for_enrollment(uuid, uuid, integer) SECURITY INVOKER;

-- 4. get_active_bundle_price_plans
ALTER FUNCTION public.get_active_bundle_price_plans(uuid) SECURITY INVOKER;

-- 5. get_active_price_plans
ALTER FUNCTION public.get_active_price_plans(uuid) SECURITY INVOKER;

-- 6. get_active_price_plans_for_source
ALTER FUNCTION public.get_active_price_plans_for_source(text, uuid) SECURITY INVOKER;

-- 7. get_direct_learner_college_id
ALTER FUNCTION public.get_direct_learner_college_id() SECURITY INVOKER;

-- 8. get_lead_stats
ALTER FUNCTION public.get_lead_stats() SECURITY INVOKER;

-- 9. get_peer_profile_ids
ALTER FUNCTION public.get_peer_profile_ids(uuid) SECURITY INVOKER;

-- 10. get_program_summary
ALTER FUNCTION public.get_program_summary() SECURITY INVOKER;

-- 11. get_student_analytics_payload
ALTER FUNCTION public.get_student_analytics_payload(uuid, uuid, boolean, date, text) SECURITY INVOKER;

-- 12. get_student_course_player_payload
ALTER FUNCTION public.get_student_course_player_payload(uuid, uuid, uuid, uuid, uuid, text) SECURITY INVOKER;

-- 13. get_student_entitled_courses
ALTER FUNCTION public.get_student_entitled_courses(uuid, uuid, boolean, boolean) SECURITY INVOKER;

-- 14. get_student_visible_course_detail
ALTER FUNCTION public.get_student_visible_course_detail(uuid, text) SECURITY INVOKER;

-- 15. is_college_admin_of
ALTER FUNCTION public.is_college_admin_of(uuid) SECURITY INVOKER;

-- 16. is_college_content_manager
ALTER FUNCTION public.is_college_content_manager(uuid) SECURITY INVOKER;

-- 17. is_peer_profile
ALTER FUNCTION public.is_peer_profile(uuid) SECURITY INVOKER;

-- 18. list_student_visible_courses
ALTER FUNCTION public.list_student_visible_courses(text) SECURITY INVOKER;

-- 19. reorder_course_lessons
ALTER FUNCTION public.reorder_course_lessons(uuid[]) SECURITY INVOKER;

-- 20. reorder_course_modules
ALTER FUNCTION public.reorder_course_modules(uuid[]) SECURITY INVOKER;

-- 21. resolve_admin_auth_context
ALTER FUNCTION public.resolve_admin_auth_context(uuid, text) SECURITY INVOKER;

-- 22. resolve_login_route_context
ALTER FUNCTION public.resolve_login_route_context(uuid) SECURITY INVOKER;

-- 23. resolve_student_auth_context
ALTER FUNCTION public.resolve_student_auth_context(uuid, text) SECURITY INVOKER;

COMMIT;
