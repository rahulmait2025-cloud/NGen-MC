-- Migration: Commerce Redundant Index Cleanup
-- Cleanup: Removes single-column indexes that are now covered by composite indexes added in migration 00076.

-- IMPORTANT: This migration should be applied ONLY after staging/prod verification 
-- confirms the new composite indexes cover the workload safely and performance 
-- regressions are ruled out.

-- Composite (status, created_at DESC) covers (status) equality checks
DROP INDEX IF EXISTS public.idx_orders_status;
DROP INDEX IF EXISTS public.idx_payments_status;
DROP INDEX IF EXISTS public.idx_coupons_status;

-- Composite (source, created_at DESC) covers (source) equality checks
DROP INDEX IF EXISTS public.idx_orders_source;
