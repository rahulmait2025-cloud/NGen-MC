-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 00180: Bundle / Variant Effective Access Foundation (Phase 1)
--
-- Creates the DB foundation for lecture-level bundle resolution and access.
-- Adds:
--   1. bundle_item_selected_items  — lecture-level overrides per bundle component
--   2. bundle_resolved_items       — flattened lecture-level truth for bundle access
--   3. Updated bundle_items.item_type CHECK to allow 'bundle'
--
-- SAFETY:
--   - Fully idempotent (IF NOT EXISTS, DROP IF EXISTS + re-add).
--   - No data migration. No backfill. No runtime changes.
--   - Does NOT create bundle_visibility_colleges (course_bundle_visibility_colleges already exists).
--   - Does NOT modify payment, entitlement, or student-facing logic.
-- ──────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ─── 1. bundle_item_selected_items ───────────────────────────────────────────
-- Stores selected lecture overrides for each bundle component.
-- If no rows exist for a bundle_item_id, the component resolves to its default full content.
-- If rows exist, only those selected master_course_item_ids are included.

CREATE TABLE IF NOT EXISTS public.bundle_item_selected_items (
  id uuid primary key default gen_random_uuid(),
  bundle_item_id uuid not null references public.bundle_items(id) on delete cascade,
  master_course_item_id uuid not null references public.master_course_items(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (bundle_item_id, master_course_item_id)
);

COMMENT ON TABLE public.bundle_item_selected_items IS
  'Stores selected lecture overrides for each bundle component. If no rows exist for a component, the component resolves to its default full content.';

CREATE INDEX IF NOT EXISTS idx_bundle_item_selected_items_bundle_item_id
  ON public.bundle_item_selected_items(bundle_item_id);

CREATE INDEX IF NOT EXISTS idx_bundle_item_selected_items_master_course_item_id
  ON public.bundle_item_selected_items(master_course_item_id);

-- ─── 2. bundle_resolved_items ────────────────────────────────────────────────
-- Flattened lecture-level truth for bundle access.
-- This is the final access table for bundle entitlements.
-- Avoids runtime nested bundle recursion.

CREATE TABLE IF NOT EXISTS public.bundle_resolved_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.course_bundles(id) on delete cascade,
  parent_master_course_id uuid not null references public.master_courses(id) on delete cascade,
  master_course_item_id uuid not null references public.master_course_items(id) on delete cascade,
  source_type text not null check (
    source_type in ('master_course', 'variant', 'master_course_item', 'bundle')
  ),
  source_id uuid not null,
  source_variant_id uuid null references public.course_variants(id) on delete set null,
  source_bundle_id uuid null references public.course_bundles(id) on delete set null,
  display_title text null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (bundle_id, master_course_item_id)
);

COMMENT ON TABLE public.bundle_resolved_items IS
  'Stores flattened lecture-level bundle contents. This is the final access truth for bundle entitlements and avoids runtime nested bundle recursion.';

CREATE INDEX IF NOT EXISTS idx_bundle_resolved_items_bundle_id
  ON public.bundle_resolved_items(bundle_id);

CREATE INDEX IF NOT EXISTS idx_bundle_resolved_items_master_course_item_id
  ON public.bundle_resolved_items(master_course_item_id);

CREATE INDEX IF NOT EXISTS idx_bundle_resolved_items_parent_master_course_id
  ON public.bundle_resolved_items(parent_master_course_id);

CREATE INDEX IF NOT EXISTS idx_bundle_resolved_items_source
  ON public.bundle_resolved_items(source_type, source_id);

-- ─── 3. Update bundle_items.item_type CHECK constraint ──────────────────────
-- Extend allowed values from (variant, master_course, master_course_item)
-- to also include (bundle).

ALTER TABLE public.bundle_items
  DROP CONSTRAINT IF EXISTS bundle_items_item_type_check;

ALTER TABLE public.bundle_items
  ADD CONSTRAINT bundle_items_item_type_check
  CHECK (
    item_type = ANY (
      ARRAY[
        'variant'::text,
        'master_course'::text,
        'master_course_item'::text,
        'bundle'::text
      ]
    )
  );

-- ─── 4. RLS ──────────────────────────────────────────────────────────────────
-- Follow existing convention: bundle_items has RLS + superadmin_all + GRANT.
-- Apply the same pattern to the two new tables.

ALTER TABLE public.bundle_item_selected_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_resolved_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bundle_item_selected_items_superadmin_all ON public.bundle_item_selected_items;
CREATE POLICY bundle_item_selected_items_superadmin_all ON public.bundle_item_selected_items
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS bundle_resolved_items_superadmin_all ON public.bundle_resolved_items;
CREATE POLICY bundle_resolved_items_superadmin_all ON public.bundle_resolved_items
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- ─── 5. Grants ───────────────────────────────────────────────────────────────
-- Match existing convention (bundle_items grants).

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bundle_item_selected_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bundle_resolved_items TO authenticated;

-- ─── 6. Comment on existing table ────────────────────────────────────────────
-- Clarify that course_bundle_visibility_colleges is the existing bundle visibility mapping.

COMMENT ON TABLE public.course_bundle_visibility_colleges IS
  'Maps bundles with selected_colleges visibility to the colleges allowed to discover/use them.';

COMMIT;
