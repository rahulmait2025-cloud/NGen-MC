-- ============================================================
-- 00174: Database security linter warnings fixes - Round 2
-- ============================================================

begin;

-- ═════════════════════════════════════════════════════════════
-- PART 1: pg_trgm extension schema migration
-- ═════════════════════════════════════════════════════════════
-- Ensure the extensions schema exists and move the pg_trgm
-- extension into it to remove it from the public schema.
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

-- ═════════════════════════════════════════════════════════════
-- PART 2: Public storage bucket list policy fix
-- ═════════════════════════════════════════════════════════════
-- Drop the broad SELECT policy on public bucket 'brand-assets'
-- since public buckets do not require any SELECT policies for
-- URL-based asset loading, which prevents exposure of file lists.
drop policy if exists "brand_assets_no_listing" on storage.objects;

-- ═════════════════════════════════════════════════════════════
-- PART 3: Mutable search path fixes for utility functions
-- ═════════════════════════════════════════════════════════════
-- Lock down search paths for utility functions to avoid spoofing.
alter function public.compute_valid_until_from_plan(integer, timestamptz) set search_path = '';
alter function public.is_assignment_active(public.content_assignments) set search_path = '';
alter function public.is_entitlement_active(public.student_entitlements) set search_path = '';
alter function public.update_updated_at() set search_path = '';

-- ═════════════════════════════════════════════════════════════
-- PART 4: Revoke PUBLIC / ANON execute permissions from SECURITY DEFINER functions
-- ═════════════════════════════════════════════════════════════
-- In PostgreSQL, SECURITY DEFINER functions are executable by
-- PUBLIC by default. We must explicitly revoke execute from PUBLIC
-- and then selectively grant it to roles that require it.

-- 1. Private administrative/maintenance/cron functions (no client access needed)
revoke execute on function public.cleanup_expired_rate_limits() from public, anon, authenticated;
revoke execute on function public.expire_assignments() from public, anon, authenticated;
revoke execute on function public.func_compare_periods(uuid, date, date, date, date) from public, anon, authenticated;
revoke execute on function public.func_get_at_risk_colleges() from public, anon, authenticated;
revoke execute on function public.func_get_college_trends(uuid, integer) from public, anon, authenticated;
revoke execute on function public.generate_daily_college_snapshots() from public, anon, authenticated;
revoke execute on function public.get_college_dashboard_extended(uuid, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.get_college_dashboard_shell(uuid) from public, anon, authenticated;
revoke execute on function public.get_superadmin_dashboard_shell() from public, anon, authenticated;
revoke execute on function public.grant_assigned_college_courses_to_existing_students(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.grant_assigned_college_courses_to_student(uuid, uuid, uuid) from public, anon, authenticated;

-- 2. Trigger functions (revoke from public/anon, keeping default or owner access)
revoke execute on function public.handle_student_college_course_entitlements() from public, anon;
revoke execute on function public.increment_coupon_usage() from public, anon;
revoke execute on function public.update_updated_at_column() from public, anon;

-- 3. Functions required by the client-side 'authenticated' role
-- First revoke from PUBLIC/ANON to satisfy linter, then grant back explicitly to authenticated.
revoke execute on function public.get_active_price_plans(uuid) from public, anon;
grant execute on function public.get_active_price_plans(uuid) to authenticated;

revoke execute on function public.rate_limit_consume(text, integer) from public, anon;
grant execute on function public.rate_limit_consume(text, integer) to authenticated;

revoke execute on function public.log_security_event(text, text, text, uuid, jsonb) from public, anon;
grant execute on function public.log_security_event(text, text, text, uuid, jsonb) to authenticated;

revoke execute on function public.resolve_login_route_context(uuid) from public, anon;
grant execute on function public.resolve_login_route_context(uuid) to authenticated;

revoke execute on function public.resolve_student_auth_context(uuid, text) from public, anon;
grant execute on function public.resolve_student_auth_context(uuid, text) to authenticated;

revoke execute on function public.insert_activity_event(uuid, uuid, text, text, text, text, text, text, jsonb, text, text, text, text) from public, anon;
grant execute on function public.insert_activity_event(uuid, uuid, text, text, text, text, text, text, jsonb, text, text, text, text) to authenticated;

revoke execute on function public.resolve_admin_auth_context(uuid, text) from public, anon;
grant execute on function public.resolve_admin_auth_context(uuid, text) to authenticated;

-- 4. RLS security helper functions (must be executable by authenticated)
revoke execute on function public.is_superadmin() from public, anon;
grant execute on function public.is_superadmin() to authenticated;

revoke execute on function public.is_college_admin_of(uuid) from public, anon;
grant execute on function public.is_college_admin_of(uuid) to authenticated;

revoke execute on function public.is_college_content_manager(uuid) from public, anon;
grant execute on function public.is_college_content_manager(uuid) to authenticated;

revoke execute on function public.is_current_user_college_admin(uuid) from public, anon;
grant execute on function public.is_current_user_college_admin(uuid) to authenticated;

revoke execute on function public.is_direct_learner_college(uuid) from public, anon;
grant execute on function public.is_direct_learner_college(uuid) to authenticated;

revoke execute on function public.has_feature(uuid, text) from public, anon;
grant execute on function public.has_feature(uuid, text) to authenticated;

revoke execute on function public.get_effective_features(uuid) from public, anon;
grant execute on function public.get_effective_features(uuid) to authenticated;

-- 5. Business logic functions callable by clients
revoke execute on function public.compute_trusted_course_price_for_payment(uuid, text) from public, anon;
grant execute on function public.compute_trusted_course_price_for_payment(uuid, text) to authenticated;

revoke execute on function public.effective_validity_days_for_enrollment(uuid, uuid, integer) from public, anon;
grant execute on function public.effective_validity_days_for_enrollment(uuid, uuid, integer) to authenticated;

revoke execute on function public.get_direct_learner_college_id() from public, anon;
grant execute on function public.get_direct_learner_college_id() to authenticated;

revoke execute on function public.get_lead_stats() from public, anon;
grant execute on function public.get_lead_stats() to authenticated;

revoke execute on function public.get_program_summary() from public, anon;
grant execute on function public.get_program_summary() to authenticated;

revoke execute on function public.get_student_visible_course_detail(uuid, text) from public, anon;
grant execute on function public.get_student_visible_course_detail(uuid, text) to authenticated;

revoke execute on function public.list_student_visible_courses(text) from public, anon;
grant execute on function public.list_student_visible_courses(text) to authenticated;

revoke execute on function public.refresh_enrollment_access_windows_for_assignment(uuid) from public, anon;
grant execute on function public.refresh_enrollment_access_windows_for_assignment(uuid) to authenticated;

revoke execute on function public.refresh_enrollment_access_windows_for_course(uuid) from public, anon;
grant execute on function public.refresh_enrollment_access_windows_for_course(uuid) to authenticated;

revoke execute on function public.reorder_course_lessons(uuid[]) from public, anon;
grant execute on function public.reorder_course_lessons(uuid[]) to authenticated;

revoke execute on function public.reorder_course_modules(uuid[]) from public, anon;
grant execute on function public.reorder_course_modules(uuid[]) to authenticated;

revoke execute on function public.require_superadmin() from public, anon;
grant execute on function public.require_superadmin() to authenticated;

revoke execute on function public.rls_auto_enable() from public, anon;
grant execute on function public.rls_auto_enable() to authenticated;

revoke execute on function public.validate_course_access_for_learner(uuid, text) from public, anon;
grant execute on function public.validate_course_access_for_learner(uuid, text) to authenticated;

revoke execute on function public.college_peer_can_view_profile(uuid) from public, anon;
grant execute on function public.college_peer_can_view_profile(uuid) to authenticated;

commit;
