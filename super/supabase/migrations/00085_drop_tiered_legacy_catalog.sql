-- Phase B2: Drop Tiered_* Legacy Catalog Schema
-- 
-- Purpose:
--   Permanently drop the entire tiered_* legacy catalog schema.
--   This tiered_* system was a parallel catalog built on top of global_* - now superseded by
--   the canonical TPStreams-first architecture (master_courses, video_assets, etc.).
--
-- Important:
--   - tiered_* rows were confirmed as test/legacy data only
--   - No runtime code references tiered_* anywhere in the codebase
--   - Data is intentionally NOT archived or migrated (confirmed test rows)
--   - This is safe because no production data was ever written to tiered_*
--
-- What is NOT affected:
--   - TPStreams upload flow (master_courses, video_assets, master_course_modules, master_course_items)
--   - Canonical course system (course_variants, course_bundles, content_assignments, student_entitlements)
--   - No runtime code references tiered_* anywhere in the codebase
--
-- Verification:
--   - Row count scripts in supabase/manual/phase_b1_tiered_row_count_check.sql
--   - Confirmed: 0 TypeScript references, 0 API routes, 0 service files use tiered_*

-- ===============================================================================
-- STEP 1: Drop unused platform_settings column
-- ===============================================================================

alter table public.platform_settings
  drop column if exists default_onboarding_tiered_bundle_code;

-- ===============================================================================
-- STEP 2: Drop all tiered_* tables in safe reverse FK dependency order
-- ===============================================================================
-- Junction/child tables first (no children depend on them)

drop table if exists public.tiered_entitlement_assets;
drop table if exists public.tiered_bundle_version_assets;
drop table if exists public.tiered_course_variant_revision_assets;
drop table if exists public.tiered_bundle_draft_items;
drop table if exists public.tiered_course_variant_assets;
drop table if exists public.tiered_master_course_assets;

-- Version/archive tables next

drop table if exists public.tiered_bundle_versions;
drop table if exists public.tiered_course_variant_revisions;

-- Main tables last

drop table if exists public.tiered_entitlements;
drop table if exists public.tiered_assignments;
drop table if exists public.tiered_price_records;
drop table if exists public.tiered_bundles;
drop table if exists public.tiered_course_variants;
drop table if exists public.tiered_master_courses;
drop table if exists public.tiered_content_assets;

-- Log completion
do $$
begin
  raise notice 'Phase B2 complete: tiered_* legacy catalog schema dropped';
  raise notice '  - platform_settings.default_onboarding_tiered_bundle_code removed';
  raise notice '  - 15 tiered_* tables dropped';
  raise notice '  - Data intentionally not archived (confirmed test/legacy data)';
  raise notice '  - TPStreams canonical architecture untouched';
end $$;