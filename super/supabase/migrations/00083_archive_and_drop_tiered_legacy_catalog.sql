-- Phase B2: Archive and Drop Tiered_* Legacy Catalog Schema
-- 
-- Purpose:
--   Archive test/legacy tiered_* data before dropping the entire tiered_* legacy catalog.
--   This tiered_* system was a parallel catalog built on top of global_* - now superseded by
--   the canonical TPStreams-first architecture (master_courses, video_assets, etc.).
--
-- What this migration does:
--   1. Creates archive table for backup before drop
--   2. Archives all tiered_* rows to JSONB archive table
--   3. Drops platform_settings.default_onboarding_tiered_bundle_code column
--   4. Drops all tiered_* tables in safe reverse FK dependency order
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
-- STEP 1: Create archive table
-- ===============================================================================

create table if not exists public.legacy_tiered_catalog_archive (
  id uuid primary key default gen_random_uuid(),
  archived_at timestamptz not null default now(),
  archive_reason text not null,
  source_table text not null,
  row_count integer not null,
  rows jsonb not null
);

comment on table public.legacy_tiered_catalog_archive is
  'Archive of deleted tiered_* legacy catalog rows from Phase B2 cleanup. Data was confirmed as test/legacy and not migrated to canonical tables.';

-- ===============================================================================
-- STEP 2: Archive all tiered_* rows before dropping
-- ===============================================================================

-- Archive tiered_content_assets
insert into public.legacy_tiered_catalog_archive (
  archive_reason,
  source_table,
  row_count,
  rows
)
select
  'Phase B2 cleanup: archived test/legacy tiered catalog data before dropping tiered_* schema',
  'tiered_content_assets',
  count(*)::integer,
  coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
from public.tiered_content_assets t;

-- Archive tiered_master_courses
insert into public.legacy_tiered_catalog_archive (
  archive_reason,
  source_table,
  row_count,
  rows
)
select
  'Phase B2 cleanup: archived test/legacy tiered catalog data before dropping tiered_* schema',
  'tiered_master_courses',
  count(*)::integer,
  coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
from public.tiered_master_courses t;

-- Archive tiered_master_course_assets
insert into public.legacy_tiered_catalog_archive (
  archive_reason,
  source_table,
  row_count,
  rows
)
select
  'Phase B2 cleanup: archived test/legacy tiered catalog data before dropping tiered_* schema',
  'tiered_master_course_assets',
  count(*)::integer,
  coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
from public.tiered_master_course_assets t;

-- Archive tiered_course_variants
insert into public.legacy_tiered_catalog_archive (
  archive_reason,
  source_table,
  row_count,
  rows
)
select
  'Phase B2 cleanup: archived test/legacy tiered catalog data before dropping tiered_* schema',
  'tiered_course_variants',
  count(*)::integer,
  coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
from public.tiered_course_variants t;

-- Archive tiered_course_variant_assets
insert into public.legacy_tiered_catalog_archive (
  archive_reason,
  source_table,
  row_count,
  rows
)
select
  'Phase B2 cleanup: archived test/legacy tiered catalog data before dropping tiered_* schema',
  'tiered_course_variant_assets',
  count(*)::integer,
  coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
from public.tiered_course_variant_assets t;

-- Archive tiered_course_variant_revisions
insert into public.legacy_tiered_catalog_archive (
  archive_reason,
  source_table,
  row_count,
  rows
)
select
  'Phase B2 cleanup: archived test/legacy tiered catalog data before dropping tiered_* schema',
  'tiered_course_variant_revisions',
  count(*)::integer,
  coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
from public.tiered_course_variant_revisions t;

-- Archive tiered_course_variant_revision_assets
insert into public.legacy_tiered_catalog_archive (
  archive_reason,
  source_table,
  row_count,
  rows
)
select
  'Phase B2 cleanup: archived test/legacy tiered catalog data before dropping tiered_* schema',
  'tiered_course_variant_revision_assets',
  count(*)::integer,
  coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
from public.tiered_course_variant_revision_assets t;

-- Archive tiered_bundles
insert into public.legacy_tiered_catalog_archive (
  archive_reason,
  source_table,
  row_count,
  rows
)
select
  'Phase B2 cleanup: archived test/legacy tiered catalog data before dropping tiered_* schema',
  'tiered_bundles',
  count(*)::integer,
  coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
from public.tiered_bundles t;

-- Archive tiered_bundle_draft_items
insert into public.legacy_tiered_catalog_archive (
  archive_reason,
  source_table,
  row_count,
  rows
)
select
  'Phase B2 cleanup: archived test/legacy tiered catalog data before dropping tiered_* schema',
  'tiered_bundle_draft_items',
  count(*)::integer,
  coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
from public.tiered_bundle_draft_items t;

-- Archive tiered_bundle_versions
insert into public.legacy_tiered_catalog_archive (
  archive_reason,
  source_table,
  row_count,
  rows
)
select
  'Phase B2 cleanup: archived test/legacy tiered catalog data before dropping tiered_* schema',
  'tiered_bundle_versions',
  count(*)::integer,
  coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
from public.tiered_bundle_versions t;

-- Archive tiered_bundle_version_assets
insert into public.legacy_tiered_catalog_archive (
  archive_reason,
  source_table,
  row_count,
  rows
)
select
  'Phase B2 cleanup: archived test/legacy tiered catalog data before dropping tiered_* schema',
  'tiered_bundle_version_assets',
  count(*)::integer,
  coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
from public.tiered_bundle_version_assets t;

-- Archive tiered_price_records
insert into public.legacy_tiered_catalog_archive (
  archive_reason,
  source_table,
  row_count,
  rows
)
select
  'Phase B2 cleanup: archived test/legacy tiered catalog data before dropping tiered_* schema',
  'tiered_price_records',
  count(*)::integer,
  coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
from public.tiered_price_records t;

-- Archive tiered_assignments
insert into public.legacy_tiered_catalog_archive (
  archive_reason,
  source_table,
  row_count,
  rows
)
select
  'Phase B2 cleanup: archived test/legacy tiered catalog data before dropping tiered_* schema',
  'tiered_assignments',
  count(*)::integer,
  coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
from public.tiered_assignments t;

-- Archive tiered_entitlements
insert into public.legacy_tiered_catalog_archive (
  archive_reason,
  source_table,
  row_count,
  rows
)
select
  'Phase B2 cleanup: archived test/legacy tiered catalog data before dropping tiered_* schema',
  'tiered_entitlements',
  count(*)::integer,
  coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
from public.tiered_entitlements t;

-- Archive tiered_entitlement_assets
insert into public.legacy_tiered_catalog_archive (
  archive_reason,
  source_table,
  row_count,
  rows
)
select
  'Phase B2 cleanup: archived test/legacy tiered catalog data before dropping tiered_* schema',
  'tiered_entitlement_assets',
  count(*)::integer,
  coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
from public.tiered_entitlement_assets t;

-- ===============================================================================
-- STEP 3: Drop unused platform_settings column
-- ===============================================================================

alter table public.platform_settings
  drop column if exists default_onboarding_tiered_bundle_code;

-- ===============================================================================
-- STEP 4: Drop all tiered_* tables in safe reverse FK dependency order
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
  raise notice 'Phase B2 complete: tiered_* legacy catalog schema archived and dropped';
  raise notice '  - All rows archived to legacy_tiered_catalog_archive';
  raise notice '  - platform_settings.default_onboarding_tiered_bundle_code removed';
  raise notice '  - 15 tiered_* tables dropped';
  raise notice '  - TPStreams canonical architecture (master_courses, video_assets, etc.) untouched';
end $$;