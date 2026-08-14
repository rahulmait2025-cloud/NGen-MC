-- Migration: 00274_database_security_linter_remediation_round3.sql
-- Description: Addressing final security linter warnings:
-- 1. Convert campus_ambassador_coupon_analytics to a security invoker view.
-- 2. Harden SECURITY DEFINER functions (campus_ambassador_coupon_usage_details, resolve_course_access, get_student_dsa_sheets_list) by setting search_path = public and revoking public execute privileges.
-- 3. Drop overly permissive "Service role full" RLS policies on DSA tables to ensure client roles cannot modify them, relying on service_role bypassing RLS instead.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: Convert View to SECURITY INVOKER
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.campus_ambassador_coupon_analytics
WITH (security_invoker = true) AS
SELECT
  c.id AS coupon_id,
  c.code AS coupon_code,
  c.status AS coupon_status,
  ca.id AS ambassador_id,
  ca.user_id,
  COALESCE(app.full_name, p.full_name, '') AS ambassador_name,
  COALESCE(app.email, p.email, '') AS ambassador_email,
  app.college_name,
  ca.joined_at,
  c.discount_type,
  c.discount_value,
  COUNT(cu.id)::integer AS total_uses,
  COUNT(cu.id) FILTER (WHERE o.status = 'paid')::integer AS paid_uses,
  COUNT(
    DISTINCT COALESCE(cu.purchaser_user_id::text, cu.purchaser_email)
  )::integer AS unique_customers,
  COALESCE(SUM(cu.discount_amount_minor), 0)::bigint AS total_discount_minor,
  COALESCE(SUM(o.base_amount_minor) FILTER (WHERE o.status = 'paid'), 0)::bigint AS gross_revenue_minor,
  COALESCE(SUM(o.total_amount_minor) FILTER (WHERE o.status = 'paid'), 0)::bigint AS net_revenue_minor,
  MAX(cu.created_at) AS last_used_at
FROM public.coupons c
INNER JOIN public.campus_ambassadors ca ON ca.coupon_id = c.id
INNER JOIN public.campus_ambassador_applications app ON app.id = ca.application_id
LEFT JOIN public.profiles p ON p.id = ca.user_id
LEFT JOIN public.coupon_usages cu ON cu.coupon_id = c.id
LEFT JOIN public.orders o ON o.id = cu.order_id
WHERE c.coupon_origin = 'campus_ambassador'
GROUP BY
  c.id,
  c.code,
  c.status,
  ca.id,
  ca.user_id,
  app.full_name,
  p.full_name,
  app.email,
  p.email,
  app.college_name,
  ca.joined_at,
  c.discount_type,
  c.discount_value;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: Function Search Path and Execution Privilege Hardening
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. campus_ambassador_coupon_usage_details
ALTER FUNCTION public.campus_ambassador_coupon_usage_details(uuid, integer, integer) SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.campus_ambassador_coupon_usage_details(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.campus_ambassador_coupon_usage_details(uuid, integer, integer) TO service_role;

-- 2. resolve_course_access
ALTER FUNCTION public.resolve_course_access(uuid, uuid, boolean) SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.resolve_course_access(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_course_access(uuid, uuid, boolean) TO authenticated, service_role;

-- 3. get_student_dsa_sheets_list
ALTER FUNCTION public.get_student_dsa_sheets_list(uuid) SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.get_student_dsa_sheets_list(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_dsa_sheets_list(uuid) TO authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: Drop Overly Permissive "Service role full" RLS Policies on DSA Tables
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Service role full" ON public.dsa_sheets;
DROP POLICY IF EXISTS "Service role full" ON public.dsa_categories;
DROP POLICY IF EXISTS "Service role full" ON public.dsa_problems;
DROP POLICY IF EXISTS "Service role full" ON public.dsa_progress;
DROP POLICY IF EXISTS "Service role full" ON public.dsa_favorites;
DROP POLICY IF EXISTS "Service role full" ON public.dsa_categories_draft;
DROP POLICY IF EXISTS "Service role full" ON public.dsa_problems_draft;
DROP POLICY IF EXISTS "Service role full" ON public.dsa_enrollments;

COMMIT;
