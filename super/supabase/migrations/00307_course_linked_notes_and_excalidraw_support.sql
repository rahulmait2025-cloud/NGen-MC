-- ============================================================================
-- 00307_course_linked_notes_and_excalidraw_support.sql
-- Extends note_collections with source_type/catalog_visibility to distinguish
-- standalone vs course-linked notes. Adds excalidraw_link resource kind.
--
-- SAFETY: Additive-only. No existing columns, constraints, or data are removed.
-- Existing notes default to standalone + public_catalog.
-- Existing resource kinds are preserved.
-- ============================================================================

BEGIN;

-- ─── 1. note_collections: source_type + catalog_visibility ─────────────────────
-- Distinguishes standalone notes (purchasable in /notes catalog) from
-- course-linked notes (hidden from catalog, unlocked via course access).

ALTER TABLE public.note_collections
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'standalone'
  CHECK (source_type IN ('standalone', 'course_linked'));

ALTER TABLE public.note_collections
  ADD COLUMN IF NOT EXISTS catalog_visibility text NOT NULL DEFAULT 'public_catalog'
  CHECK (catalog_visibility IN ('public_catalog', 'hidden_course_attached'));

-- Backfill existing data:
-- Notes that have at least one note_course_links row → course_linked + hidden_course_attached
-- All other notes → standalone + public_catalog (the default)
UPDATE public.note_collections nc
SET
  source_type = 'course_linked',
  catalog_visibility = 'hidden_course_attached'
WHERE EXISTS (
  SELECT 1 FROM public.note_course_links ncl
  WHERE ncl.note_collection_id = nc.id
)
AND nc.source_type = 'standalone';

-- Index for catalog queries: filter by catalog_visibility + publish_status + deleted_at
CREATE INDEX IF NOT EXISTS idx_note_collections_catalog_visibility
  ON public.note_collections (catalog_visibility, publish_status, created_at DESC)
  WHERE deleted_at IS NULL;

-- Index for source_type lookups (e.g., listing only standalone or only course-linked)
CREATE INDEX IF NOT EXISTS idx_note_collections_source_type
  ON public.note_collections (source_type);

-- ─── 2. course_resource_items: excalidraw_link kind ───────────────────────────
-- Adds nullable excalidraw columns FIRST, then extends the CHECK constraints.

-- Add excalidraw-specific nullable columns (nullable so existing rows unaffected)
ALTER TABLE public.course_resource_items
  ADD COLUMN IF NOT EXISTS excalidraw_url text;

ALTER TABLE public.course_resource_items
  ADD COLUMN IF NOT EXISTS excalidraw_scene_json jsonb;

-- Update the kind CHECK constraint to include excalidraw_link
ALTER TABLE public.course_resource_items
  DROP CONSTRAINT IF EXISTS course_resource_items_kind_check;

ALTER TABLE public.course_resource_items
  ADD CONSTRAINT course_resource_items_kind_check
  CHECK (kind IN ('external_link', 'note_collection', 'markdown_text', 'file_link', 'excalidraw_link'));

-- Recreate payload check: excalidraw_link is valid when either field is set
ALTER TABLE public.course_resource_items
  DROP CONSTRAINT IF EXISTS course_resource_items_payload_check;

ALTER TABLE public.course_resource_items
  ADD CONSTRAINT course_resource_items_payload_check CHECK (
    (kind = 'external_link'   AND external_url IS NOT NULL)
    OR
    (kind = 'note_collection' AND note_collection_id IS NOT NULL)
    OR
    (kind = 'markdown_text'   AND markdown_body IS NOT NULL)
    OR
    (kind = 'file_link'       AND file_path IS NOT NULL)
    OR
    (kind = 'excalidraw_link' AND (excalidraw_url IS NOT NULL OR excalidraw_scene_json IS NOT NULL))
  );

-- Index for excalidraw resource lookups
CREATE INDEX IF NOT EXISTS idx_course_resource_items_excalidraw
  ON public.course_resource_items (section_id)
  WHERE kind = 'excalidraw_link';

-- ─── 3. note_course_links: add updated_at column ─────────────────────────────
-- The existing table has created_at but no updated_at. Add it for consistency.
ALTER TABLE public.note_course_links
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_note_course_links_updated_at ON public.note_course_links;
CREATE TRIGGER trg_note_course_links_updated_at
  BEFORE UPDATE ON public.note_course_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 4. note_course_links: indexes for lookup ────────────────────────────────
-- idx_note_course_links_scope_unique already exists from 00301 with COALESCE
-- for scope-aware dedup (note_collection_id + course_id + module_id + item_id).
-- Add partial indexes for module_id and item_id lookups.

CREATE INDEX IF NOT EXISTS idx_note_course_links_module
  ON public.note_course_links (module_id)
  WHERE module_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_note_course_links_item
  ON public.note_course_links (item_id)
  WHERE item_id IS NOT NULL;

-- ─── 5. RLS: no changes needed ────────────────────────────────────────────────
-- All new columns are on tables that already have RLS enabled.
-- SuperAdmin service-role bypasses RLS via createAdminClient().
-- Student access is server-side via helpers, not direct table reads.
-- No new RLS policies required.

COMMIT;
