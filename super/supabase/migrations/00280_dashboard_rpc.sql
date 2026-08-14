-- Migration: 00280_dashboard_rpc.sql
-- Description: SuperAdmin dashboard shell — replaces 11 parallel count queries

DROP FUNCTION IF EXISTS public.get_superadmin_dashboard_shell();

CREATE OR REPLACE FUNCTION get_superadmin_dashboard_shell()
RETURNS TABLE (
  total_colleges bigint,
  total_students bigint,
  total_orders bigint,
  total_revenue numeric,
  pending_orders bigint,
  active_coupons bigint,
  total_courses bigint
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM colleges)::bigint,
    (SELECT COUNT(*) FROM students)::bigint,
    (SELECT COUNT(*) FROM orders WHERE status = 'paid')::bigint,
    (SELECT COALESCE(SUM(total_amount_minor::numeric / 100.0), 0) FROM orders WHERE status = 'paid')::numeric,
    (SELECT COUNT(*) FROM orders WHERE status = 'pending')::bigint,
    (SELECT COUNT(*) FROM coupons WHERE status = 'active')::bigint,
    (SELECT COUNT(*) FROM master_courses)::bigint;
END;
$$;
