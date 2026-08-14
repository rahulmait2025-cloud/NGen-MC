-- Phase B1: Row Count Verification for Tiered_* Legacy Tables
-- This is a VERIFICATION script only - NOT a destructive migration
-- Run this in Supabase SQL Editor to check data before any cleanup

SELECT 'tiered_content_assets' AS table_name, count(*) AS row_count FROM public.tiered_content_assets
UNION ALL SELECT 'tiered_master_courses', count(*) FROM public.tiered_master_courses
UNION ALL SELECT 'tiered_master_course_assets', count(*) FROM public.tiered_master_course_assets
UNION ALL SELECT 'tiered_course_variants', count(*) FROM public.tiered_course_variants
UNION ALL SELECT 'tiered_course_variant_assets', count(*) FROM public.tiered_course_variant_assets
UNION ALL SELECT 'tiered_course_variant_revisions', count(*) FROM public.tiered_course_variant_revisions
UNION ALL SELECT 'tiered_course_variant_revision_assets', count(*) FROM public.tiered_course_variant_revision_assets
UNION ALL SELECT 'tiered_bundles', count(*) FROM public.tiered_bundles
UNION ALL SELECT 'tiered_bundle_draft_items', count(*) FROM public.tiered_bundle_draft_items
UNION ALL SELECT 'tiered_bundle_versions', count(*) FROM public.tiered_bundle_versions
UNION ALL SELECT 'tiered_bundle_version_assets', count(*) FROM public.tiered_bundle_version_assets
UNION ALL SELECT 'tiered_price_records', count(*) FROM public.tiered_price_records
UNION ALL SELECT 'tiered_assignments', count(*) FROM public.tiered_assignments
UNION ALL SELECT 'tiered_entitlements', count(*) FROM public.tiered_entitlements
UNION ALL SELECT 'tiered_entitlement_assets', count(*) FROM public.tiered_entitlement_assets
ORDER BY table_name;