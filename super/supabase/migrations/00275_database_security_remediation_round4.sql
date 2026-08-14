-- Migration: 00275_database_security_remediation_round4.sql
-- Description: Revoke authenticated and anon execution privileges on SECURITY DEFINER functions 
-- that are used exclusively on the server side via the service_role (createAdminClient).
-- This satisfies the Supabase Database Security Advisor linter warnings without breaking RLS-linked functions.

BEGIN;

-- 1. resolve_course_access
REVOKE EXECUTE ON FUNCTION public.resolve_course_access(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_course_access(uuid, uuid, boolean) TO service_role;

-- 2. get_student_dsa_sheets_list
REVOKE EXECUTE ON FUNCTION public.get_student_dsa_sheets_list(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_dsa_sheets_list(uuid) TO service_role;

-- 3. get_student_analytics_payload
REVOKE EXECUTE ON FUNCTION public.get_student_analytics_payload(uuid, uuid, boolean, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_analytics_payload(uuid, uuid, boolean, date, text) TO service_role;

-- 4. get_student_course_player_payload
REVOKE EXECUTE ON FUNCTION public.get_student_course_player_payload(uuid, uuid, uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_course_player_payload(uuid, uuid, uuid, uuid, uuid, text) TO service_role;

-- 5. get_student_entitled_courses
REVOKE EXECUTE ON FUNCTION public.get_student_entitled_courses(uuid, uuid, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_entitled_courses(uuid, uuid, boolean, boolean) TO service_role;

-- 6. get_active_price_plans
REVOKE EXECUTE ON FUNCTION public.get_active_price_plans(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_price_plans(uuid) TO service_role;

-- 7. get_active_price_plans_for_source
REVOKE EXECUTE ON FUNCTION public.get_active_price_plans_for_source(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_price_plans_for_source(text, uuid) TO service_role;

-- 8. get_active_bundle_price_plans
REVOKE EXECUTE ON FUNCTION public.get_active_bundle_price_plans(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_bundle_price_plans(uuid) TO service_role;

-- 9. validate_course_access_for_learner
REVOKE EXECUTE ON FUNCTION public.validate_course_access_for_learner(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_course_access_for_learner(uuid, text) TO service_role;

-- 10. get_student_visible_course_detail
REVOKE EXECUTE ON FUNCTION public.get_student_visible_course_detail(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_visible_course_detail(uuid, text) TO service_role;

-- 11. list_student_visible_courses
REVOKE EXECUTE ON FUNCTION public.list_student_visible_courses(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_student_visible_courses(text) TO service_role;

-- 12. get_direct_learner_college_id
REVOKE EXECUTE ON FUNCTION public.get_direct_learner_college_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_direct_learner_college_id() TO service_role;

-- 13. get_lead_stats
REVOKE EXECUTE ON FUNCTION public.get_lead_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_stats() TO service_role;

-- 14. get_program_summary
REVOKE EXECUTE ON FUNCTION public.get_program_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_program_summary() TO service_role;

-- 15. get_peer_profile_ids
REVOKE EXECUTE ON FUNCTION public.get_peer_profile_ids(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_peer_profile_ids(uuid) TO service_role;

-- 16. college_peer_can_view_profile
REVOKE EXECUTE ON FUNCTION public.college_peer_can_view_profile(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.college_peer_can_view_profile(uuid) TO service_role;

-- 17. is_peer_profile
REVOKE EXECUTE ON FUNCTION public.is_peer_profile(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_peer_profile(uuid) TO service_role;

-- 18. compute_trusted_course_price_for_payment
REVOKE EXECUTE ON FUNCTION public.compute_trusted_course_price_for_payment(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_trusted_course_price_for_payment(uuid, text) TO service_role;

-- 19. effective_validity_days_for_enrollment
REVOKE EXECUTE ON FUNCTION public.effective_validity_days_for_enrollment(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.effective_validity_days_for_enrollment(uuid, uuid, integer) TO service_role;

-- 20. reorder_course_lessons
REVOKE EXECUTE ON FUNCTION public.reorder_course_lessons(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_course_lessons(uuid[]) TO service_role;

-- 21. reorder_course_modules
REVOKE EXECUTE ON FUNCTION public.reorder_course_modules(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_course_modules(uuid[]) TO service_role;

COMMIT;
