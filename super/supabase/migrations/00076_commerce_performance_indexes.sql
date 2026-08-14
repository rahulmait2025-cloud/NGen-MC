-- Migration: Commerce Performance Indexes
-- Phase 7A Foundation: Optimizes commerce query patterns for SuperAdmin dashboard and analytics.
-- Focuses on actual query patterns: filtered lists, sorted logs, and analytics aggregations.

-- 1. Orders Table Optimization
-- Justification: High-frequency filtering by status/source with 'created_at DESC' sorting.
CREATE INDEX IF NOT EXISTS idx_orders_status_created_desc 
  ON public.orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_source_created_desc 
  ON public.orders (source, created_at DESC);

-- Trigram index for fuzzy email search (SuperAdmin Order List)
-- Justification: query.ilike('purchaser_email', '%...%') used in orders service.
CREATE INDEX IF NOT EXISTS idx_orders_purchaser_email_trgm 
  ON public.orders USING gin (purchaser_email gin_trgm_ops);

-- GIN index for JSONB metadata (College Revenue Analytics)
-- Justification: query.contains('metadata', { college_id: ... }) used in analytics service.
CREATE INDEX IF NOT EXISTS idx_orders_metadata_gin 
  ON public.orders USING gin (metadata jsonb_path_ops);

-- 2. Payments Table Optimization
-- Justification: Dashboard filters by status/method with sorting.
CREATE INDEX IF NOT EXISTS idx_payments_status_created_desc 
  ON public.payments (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_method_created_desc 
  ON public.payments (method, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_created_desc 
  ON public.payments (created_at DESC);

-- 3. Coupons Table Optimization
-- Justification: Admin management list sorting and status filtering.
CREATE INDEX IF NOT EXISTS idx_coupons_status_created_desc 
  ON public.coupons (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coupons_created_desc 
  ON public.coupons (created_at DESC);

-- 4. Coupon Usages Table Optimization
-- Justification: Sorting usages by date when viewing coupon details.
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_created_desc 
  ON public.coupon_usages (coupon_id, created_at DESC);

-- 5. Refund Events Table Optimization
-- Justification: Analytics filtering by date and sorting.
CREATE INDEX IF NOT EXISTS idx_refund_events_created_desc 
  ON public.refund_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_refund_events_status_created_desc 
  ON public.refund_events (status, created_at DESC);
