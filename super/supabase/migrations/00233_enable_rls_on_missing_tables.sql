-- Enable Row Level Security on tables that were created without it.
-- These tables already exist in the database; this migration only toggles RLS on.

-- Tenant plan feature flags
ALTER TABLE IF EXISTS public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenant_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.college_features ENABLE ROW LEVEL SECURITY;

-- Rate limiting
ALTER TABLE IF EXISTS public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Legacy catalog archive
ALTER TABLE IF EXISTS public.legacy_tiered_catalog_archive ENABLE ROW LEVEL SECURITY;

-- Catalog visibility scopes
ALTER TABLE IF EXISTS public.course_variant_visibility_colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.course_bundle_visibility_colleges ENABLE ROW LEVEL SECURITY;

-- Student daily streak
ALTER TABLE IF EXISTS public.student_daily_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_streaks ENABLE ROW LEVEL SECURITY;

-- Paid course landing metadata
ALTER TABLE IF EXISTS public.paid_course_landing_metadata ENABLE ROW LEVEL SECURITY;

-- Student todos
ALTER TABLE IF EXISTS public.student_todos ENABLE ROW LEVEL SECURITY;

