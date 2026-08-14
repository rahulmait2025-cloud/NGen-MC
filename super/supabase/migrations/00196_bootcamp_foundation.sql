-- ============================================================
-- 00196: Bootcamp foundation
--
-- Creates the bootcamps table as a new B2C catalog container.
-- Extends master_courses with catalog_type + bootcamp_id so
-- future bootcamp courses can reuse the existing course engine.
-- ============================================================

BEGIN;

-- ─── 1) bootcamps ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bootcamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core identification
  code TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  short_description TEXT,

  -- Media
  thumbnail_url TEXT,
  cover_image_url TEXT,

  -- Publish control
  publish_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (publish_status IN ('draft', 'published', 'archived')),

  -- Lifecycle
  lifecycle_status TEXT NOT NULL DEFAULT 'active'
    CHECK (lifecycle_status IN ('active', 'inactive')),

  -- Ordering
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- TPStreams sync fields (Phase 1: columns only, no folder creation yet)
  tp_folder_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (tp_folder_status IN ('pending', 'created', 'failed')),
  tp_folder_uuid TEXT,
  tp_folder_title TEXT,
  tp_last_synced_at TIMESTAMPTZ,
  tp_last_error TEXT,

  -- Audit / Metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bootcamps IS
  'B2C catalog container. Each bootcamp groups many courses. '
  'Courses reuse the existing master_courses engine via catalog_type = bootcamp.';

-- Trigger: updated_at
DROP TRIGGER IF EXISTS trg_bootcamps_updated_at ON public.bootcamps;
CREATE TRIGGER trg_bootcamps_updated_at
  BEFORE UPDATE ON public.bootcamps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bootcamps_slug
  ON public.bootcamps (slug);
CREATE INDEX IF NOT EXISTS idx_bootcamps_code
  ON public.bootcamps (code);
CREATE INDEX IF NOT EXISTS idx_bootcamps_publish_status
  ON public.bootcamps (publish_status);
CREATE INDEX IF NOT EXISTS idx_bootcamps_lifecycle_status
  ON public.bootcamps (lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_bootcamps_sort_order
  ON public.bootcamps (sort_order);
CREATE INDEX IF NOT EXISTS idx_bootcamps_tp_folder_uuid
  ON public.bootcamps (tp_folder_uuid)
  WHERE tp_folder_uuid IS NOT NULL;

-- RLS
ALTER TABLE public.bootcamps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bootcamps_superadmin_all ON public.bootcamps;
CREATE POLICY bootcamps_superadmin_all ON public.bootcamps
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- ─── 2) Extend master_courses ───────────────────────────────────────────────

-- catalog_type: distinguishes pillar vs bootcamp vs free_course courses
ALTER TABLE public.master_courses
  ADD COLUMN IF NOT EXISTS catalog_type TEXT NOT NULL DEFAULT 'pillar';

-- bootcamp_id: links bootcamp courses back to their parent bootcamp
ALTER TABLE public.master_courses
  ADD COLUMN IF NOT EXISTS bootcamp_id UUID
    REFERENCES public.bootcamps(id) ON DELETE SET NULL;

-- Check constraint for catalog_type (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'master_courses_catalog_type_check'
      AND conrelid = 'public.master_courses'::regclass
  ) THEN
    ALTER TABLE public.master_courses
      ADD CONSTRAINT master_courses_catalog_type_check
      CHECK (catalog_type IN ('pillar', 'bootcamp', 'free_course'));
  END IF;
END $$;

COMMENT ON COLUMN public.master_courses.catalog_type IS
  'Top-level catalog container: pillar (default), bootcamp, or free_course. '
  'Existing rows default to pillar.';

COMMENT ON COLUMN public.master_courses.bootcamp_id IS
  'References bootcamps(id). Set when catalog_type = bootcamp. '
  'ON DELETE SET NULL preserves the course if a bootcamp is deleted.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_master_courses_catalog_type
  ON public.master_courses (catalog_type);
CREATE INDEX IF NOT EXISTS idx_master_courses_bootcamp_id
  ON public.master_courses (bootcamp_id)
  WHERE bootcamp_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_master_courses_catalog_type_publish_status
  ON public.master_courses (catalog_type, publish_status);
CREATE INDEX IF NOT EXISTS idx_master_courses_bootcamp_id_publish_status
  ON public.master_courses (bootcamp_id, publish_status)
  WHERE bootcamp_id IS NOT NULL;

-- NOTE: We intentionally do NOT add a strict constraint requiring
-- pillar_id for pillar courses or bootcamp_id for bootcamp courses.
-- Existing free_course rows (course_kind = 'free_course') may have
-- pillar_id set to the Uncategorized pillar, making such a constraint
-- ambiguous. This is left as a future TODO if data cleanliness is desired.

COMMIT;
