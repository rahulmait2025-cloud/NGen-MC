-- ============================================================
-- 00168: Revoke EXECUTE from AUTHENTICATED for internal functions
-- Security fix - part 2
-- ============================================================

begin;

revoke execute on function public.cleanup_expired_rate_limits() from authenticated;
revoke execute on function public.expire_assignments() from authenticated;
revoke execute on function public.func_compare_periods(uuid, date, date, date, date) from authenticated;
revoke execute on function public.func_get_at_risk_colleges() from authenticated;
revoke execute on function public.func_get_college_trends(uuid, integer) from authenticated;
revoke execute on function public.generate_daily_college_snapshots() from authenticated;
revoke execute on function public.get_college_dashboard_extended(uuid, integer, integer, integer) from authenticated;
revoke execute on function public.get_college_dashboard_shell(uuid) from authenticated;
revoke execute on function public.get_superadmin_dashboard_shell() from authenticated;
revoke execute on function public.invoke_email_center_cron() from authenticated;
revoke execute on function public.log_security_event(text, text, text, uuid, jsonb) from authenticated;
revoke execute on function public.rls_auto_enable() from authenticated;

commit;