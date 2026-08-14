-- ============================================================
-- 00167: Revoke EXECUTE from ANON for SECURITY DEFINER functions
-- Security fix - part 1
-- ============================================================

begin;

revoke execute on function public.cleanup_expired_rate_limits() from anon;
revoke execute on function public.college_peer_can_view_profile(uuid) from anon;
revoke execute on function public.compute_trusted_course_price_for_payment(uuid, text) from anon;
revoke execute on function public.effective_validity_days_for_enrollment(uuid, uuid, integer) from anon;
revoke execute on function public.expire_assignments() from anon;
revoke execute on function public.func_compare_periods(uuid, date, date, date, date) from anon;
revoke execute on function public.func_get_at_risk_colleges() from anon;
revoke execute on function public.func_get_college_trends(uuid, integer) from anon;
revoke execute on function public.generate_daily_college_snapshots() from anon;
revoke execute on function public.get_active_price_plans(uuid) from anon;
revoke execute on function public.get_college_dashboard_extended(uuid, integer, integer, integer) from anon;
revoke execute on function public.get_college_dashboard_shell(uuid) from anon;
revoke execute on function public.get_direct_learner_college_id() from anon;
revoke execute on function public.get_effective_features(uuid) from anon;
revoke execute on function public.get_lead_stats() from anon;
revoke execute on function public.get_program_summary() from anon;
revoke execute on function public.get_student_visible_course_detail(uuid, text) from anon;
revoke execute on function public.get_superadmin_dashboard_shell() from anon;
revoke execute on function public.has_feature(uuid, text) from anon;
revoke execute on function public.insert_activity_event(uuid, uuid, text, text, text, text, text, text, jsonb, text, text, text, text) from anon;
revoke execute on function public.invoke_email_center_cron() from anon;
revoke execute on function public.is_college_admin_of(uuid) from anon;
revoke execute on function public.is_college_content_manager(uuid) from anon;
revoke execute on function public.is_current_user_college_admin(uuid) from anon;
revoke execute on function public.is_direct_learner_college(uuid) from anon;
revoke execute on function public.is_superadmin() from anon;
revoke execute on function public.list_student_visible_courses(text) from anon;
revoke execute on function public.log_security_event(text, text, text, uuid, jsonb) from anon;
revoke execute on function public.rate_limit_consume(text, integer) from anon;
revoke execute on function public.refresh_enrollment_access_windows_for_assignment(uuid) from anon;
revoke execute on function public.refresh_enrollment_access_windows_for_course(uuid) from anon;
revoke execute on function public.reorder_course_lessons(uuid[]) from anon;
revoke execute on function public.reorder_course_modules(uuid[]) from anon;
revoke execute on function public.require_superadmin() from anon;
revoke execute on function public.resolve_admin_auth_context(uuid, text) from anon;
revoke execute on function public.resolve_login_route_context(uuid) from anon;
revoke execute on function public.resolve_student_auth_context(uuid, text) from anon;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.validate_course_access_for_learner(uuid, text) from anon;

commit;