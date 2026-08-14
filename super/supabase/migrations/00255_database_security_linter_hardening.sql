-- Migration: 00255_database_security_linter_hardening.sql
-- Description: Hardening database functions to resolve Supabase security linter warnings.
-- Handles mutable search paths by setting search_path = public (or pg_catalog, pg_temp where appropriate)
-- and systematically revoking public/anon execute access on SECURITY DEFINER functions.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: Function Search Path Hardening (MUTABLE SEARCH PATH warnings)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. get_db_now
ALTER FUNCTION public.get_db_now() SET search_path = pg_catalog, pg_temp;

-- 2. update_platform_announcements_updated_at
ALTER FUNCTION public.update_platform_announcements_updated_at() SET search_path = public, pg_temp;

-- 3. expire_pending_mentorship_bookings
ALTER FUNCTION public.expire_pending_mentorship_bookings() SET search_path = public, pg_temp;

-- 4. email_campaign_cron_job_name
ALTER FUNCTION public.email_campaign_cron_job_name(uuid) SET search_path = pg_catalog, pg_temp;

-- 5. email_campaign_cron_expression
ALTER FUNCTION public.email_campaign_cron_expression(timestamptz) SET search_path = pg_catalog, pg_temp;

-- 6. enforce_max_todos_per_category
ALTER FUNCTION public.enforce_max_todos_per_category() SET search_path = public, pg_temp;

-- 7. update_student_todos_updated_at
ALTER FUNCTION public.update_student_todos_updated_at() SET search_path = public, pg_temp;

-- 8. set_lms_transactional_updated_at
ALTER FUNCTION public.set_lms_transactional_updated_at() SET search_path = public, pg_temp;

-- 9. is_per_campaign_email_cron_job
ALTER FUNCTION public.is_per_campaign_email_cron_job(text) SET search_path = pg_catalog, pg_temp;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: Revoke EXECUTE Access on Internal/Trigger/System Functions (Set B)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. auto_publish_item_on_insert
REVOKE EXECUTE ON FUNCTION public.auto_publish_item_on_insert() FROM public, anon, authenticated;

-- 2. auto_publish_module_on_insert
REVOKE EXECUTE ON FUNCTION public.auto_publish_module_on_insert() FROM public, anon, authenticated;

-- 3. cleanup_legacy_email_center_pg_crons
REVOKE EXECUTE ON FUNCTION public.cleanup_legacy_email_center_pg_crons() FROM public, anon, authenticated;

-- 4. handle_student_college_course_entitlements
REVOKE EXECUTE ON FUNCTION public.handle_student_college_course_entitlements() FROM public, anon, authenticated;

-- 5. increment_coupon_usage
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage() FROM public, anon, authenticated;

-- 6. invoke_email_campaign_cron
REVOKE EXECUTE ON FUNCTION public.invoke_email_campaign_cron(uuid) FROM public, anon, authenticated;

-- 7. list_email_center_pg_cron_jobs
REVOKE EXECUTE ON FUNCTION public.list_email_center_pg_cron_jobs() FROM public, anon, authenticated;

-- 8. schedule_email_campaign_cron
REVOKE EXECUTE ON FUNCTION public.schedule_email_campaign_cron(uuid, timestamptz, boolean) FROM public, anon, authenticated;

-- 9. unschedule_email_campaign_cron
REVOKE EXECUTE ON FUNCTION public.unschedule_email_campaign_cron(uuid) FROM public, anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: Revoke Public/Anon EXECUTE Access, Grant to Authenticated (Set A)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. college_peer_can_view_profile
REVOKE EXECUTE ON FUNCTION public.college_peer_can_view_profile(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.college_peer_can_view_profile(uuid) TO authenticated;

-- 2. compute_trusted_course_price_for_payment
REVOKE EXECUTE ON FUNCTION public.compute_trusted_course_price_for_payment(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.compute_trusted_course_price_for_payment(uuid, text) TO authenticated;

-- 3. effective_validity_days_for_enrollment
REVOKE EXECUTE ON FUNCTION public.effective_validity_days_for_enrollment(uuid, uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.effective_validity_days_for_enrollment(uuid, uuid, integer) TO authenticated;

-- 4. get_active_bundle_price_plans
REVOKE EXECUTE ON FUNCTION public.get_active_bundle_price_plans(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_active_bundle_price_plans(uuid) TO authenticated;

-- 5. get_active_price_plans
REVOKE EXECUTE ON FUNCTION public.get_active_price_plans(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_active_price_plans(uuid) TO authenticated;

-- 6. get_active_price_plans_for_source
REVOKE EXECUTE ON FUNCTION public.get_active_price_plans_for_source(text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_active_price_plans_for_source(text, uuid) TO authenticated;

-- 7. get_direct_learner_college_id
REVOKE EXECUTE ON FUNCTION public.get_direct_learner_college_id() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_direct_learner_college_id() TO authenticated;

-- 8. get_effective_features
REVOKE EXECUTE ON FUNCTION public.get_effective_features(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_effective_features(uuid) TO authenticated;

-- 9. get_lead_stats
REVOKE EXECUTE ON FUNCTION public.get_lead_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_lead_stats() TO authenticated;

-- 10. get_peer_profile_ids
REVOKE EXECUTE ON FUNCTION public.get_peer_profile_ids(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_peer_profile_ids(uuid) TO authenticated;

-- 11. get_program_summary
REVOKE EXECUTE ON FUNCTION public.get_program_summary() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_program_summary() TO authenticated;

-- 12. get_student_analytics_payload
REVOKE EXECUTE ON FUNCTION public.get_student_analytics_payload(uuid, uuid, boolean, date, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_student_analytics_payload(uuid, uuid, boolean, date, text) TO authenticated;

-- 13. get_student_course_player_payload
REVOKE EXECUTE ON FUNCTION public.get_student_course_player_payload(uuid, uuid, uuid, uuid, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_student_course_player_payload(uuid, uuid, uuid, uuid, uuid, text) TO authenticated;

-- 14. get_student_entitled_courses
REVOKE EXECUTE ON FUNCTION public.get_student_entitled_courses(uuid, uuid, boolean, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_student_entitled_courses(uuid, uuid, boolean, boolean) TO authenticated;

-- 15. get_student_visible_course_detail
REVOKE EXECUTE ON FUNCTION public.get_student_visible_course_detail(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_student_visible_course_detail(uuid, text) TO authenticated;

-- 16. get_user_college_ids
REVOKE EXECUTE ON FUNCTION public.get_user_college_ids() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_user_college_ids() TO authenticated;

-- 17. get_user_primary_college
REVOKE EXECUTE ON FUNCTION public.get_user_primary_college() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_user_primary_college() TO authenticated;

-- 18. has_feature
REVOKE EXECUTE ON FUNCTION public.has_feature(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_feature(uuid, text) TO authenticated;

-- 19. insert_activity_event
REVOKE EXECUTE ON FUNCTION public.insert_activity_event(uuid, uuid, text, text, text, text, text, text, jsonb, text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.insert_activity_event(uuid, uuid, text, text, text, text, text, text, jsonb, text, text, text, text) TO authenticated;

-- 20. is_college_admin_fast
REVOKE EXECUTE ON FUNCTION public.is_college_admin_fast(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_college_admin_fast(uuid) TO authenticated;

-- 21. is_college_admin_of
REVOKE EXECUTE ON FUNCTION public.is_college_admin_of(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_college_admin_of(uuid) TO authenticated;

-- 22. is_college_content_manager
REVOKE EXECUTE ON FUNCTION public.is_college_content_manager(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_college_content_manager(uuid) TO authenticated;

-- 23. is_content_manager_fast
REVOKE EXECUTE ON FUNCTION public.is_content_manager_fast(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_content_manager_fast(uuid) TO authenticated;

-- 24. is_current_user_college_admin
REVOKE EXECUTE ON FUNCTION public.is_current_user_college_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_college_admin(uuid) TO authenticated;

-- 25. is_direct_learner_college
REVOKE EXECUTE ON FUNCTION public.is_direct_learner_college(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_direct_learner_college(uuid) TO authenticated;

-- 26. is_peer_profile
REVOKE EXECUTE ON FUNCTION public.is_peer_profile(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_peer_profile(uuid) TO authenticated;

-- 27. is_student_fast
REVOKE EXECUTE ON FUNCTION public.is_student_fast(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_student_fast(uuid) TO authenticated;

-- 28. is_superadmin
REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

-- 29. is_superadmin_fast
REVOKE EXECUTE ON FUNCTION public.is_superadmin_fast() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_superadmin_fast() TO authenticated;

-- 30. list_student_visible_courses
REVOKE EXECUTE ON FUNCTION public.list_student_visible_courses(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_student_visible_courses(text) TO authenticated;

-- 31. log_security_event
REVOKE EXECUTE ON FUNCTION public.log_security_event(text, text, text, uuid, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, text, uuid, jsonb) TO authenticated;

-- 32. rate_limit_consume
REVOKE EXECUTE ON FUNCTION public.rate_limit_consume(text, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rate_limit_consume(text, int) TO authenticated;

COMMIT;
