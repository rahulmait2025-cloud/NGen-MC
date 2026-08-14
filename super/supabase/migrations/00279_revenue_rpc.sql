-- Migration: 00279_revenue_rpc.sql
-- Description: SuperAdmin revenue KPIs — replaces full orders table scan in revenue page

CREATE OR REPLACE FUNCTION get_superadmin_revenue_kpis(
  p_from_date timestamptz DEFAULT NULL,
  p_to_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  total_revenue numeric,
  total_orders bigint,
  total_students bigint,
  revenue_by_status jsonb,
  revenue_by_month jsonb
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_from timestamptz := COALESCE(p_from_date, now() - INTERVAL '365 days');
  v_to timestamptz := COALESCE(p_to_date, now());
BEGIN
  RETURN QUERY
  WITH orders_in_range AS (
    SELECT o.id, o.status, (o.total_amount_minor::numeric / 100.0) AS total_amount, o.paid_at, o.purchaser_user_id AS user_id
    FROM orders o
    WHERE o.created_at BETWEEN v_from AND v_to
      AND o.status = 'paid'
  ),
  kpis AS (
    SELECT
      COALESCE(SUM(o.total_amount), 0)::numeric AS total_revenue,
      COUNT(*)::bigint AS total_orders,
      COUNT(DISTINCT o.user_id)::bigint AS total_students
    FROM orders_in_range o
  ),
  by_status AS (
    SELECT jsonb_agg(jsonb_build_object('status', o.status, 'count', cnt, 'revenue', rev))
    FROM (
      SELECT o.status, COUNT(*) AS cnt, SUM(o.total_amount) AS rev
      FROM orders_in_range o
      GROUP BY o.status
    ) o
  ),
  by_month AS (
    SELECT jsonb_agg(jsonb_build_object('month', m, 'revenue', COALESCE(r, 0), 'orders', COALESCE(c, 0)))
    FROM (
      SELECT date_trunc('month', gs)::date AS m
      FROM generate_series(v_from, v_to, '1 month') gs
    ) months
    LEFT JOIN (
      SELECT date_trunc('month', paid_at)::date AS m, SUM(total_amount) AS r, COUNT(*) AS c
      FROM orders_in_range
      GROUP BY date_trunc('month', paid_at)
    ) agg ON agg.m = months.m
  )
  SELECT
    k.total_revenue,
    k.total_orders,
    k.total_students,
    (SELECT * FROM by_status),
    (SELECT * FROM by_month)
  FROM kpis k;
END;
$$;
