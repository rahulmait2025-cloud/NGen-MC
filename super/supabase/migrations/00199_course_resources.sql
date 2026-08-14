-- Migration: 00199_course_resources.sql
-- Description: Adds course_resources table for lecture-attached and standalone module resources.
-- Reuses existing 'course_resources' storage bucket from migration 00071.

-- ─── 1. course_resources table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.course_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_course_id UUID NOT NULL REFERENCES public.master_courses(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.master_course_modules(id) ON DELETE CASCADE,
  parent_item_id UUID REFERENCES public.master_course_items(id) ON DELETE CASCADE,
  resource_scope TEXT NOT NULL CHECK (resource_scope IN ('lesson_attachment', 'module_item')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('markdown', 'pdf', 'external_link')),
  title TEXT NOT NULL,
  description TEXT,
  content_markdown TEXT,
  external_url TEXT,
  storage_bucket TEXT,
  storage_path TEXT,
  original_filename TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  publish_status TEXT NOT NULL DEFAULT 'published'
    CHECK (publish_status IN ('draft', 'published', 'unpublished')),
  visible_to_students BOOLEAN NOT NULL DEFAULT true,
  is_downloadable BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. Indexes ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_course_resources_master_course
  ON public.course_resources(master_course_id);
CREATE INDEX IF NOT EXISTS idx_course_resources_module
  ON public.course_resources(module_id);
CREATE INDEX IF NOT EXISTS idx_course_resources_parent_item
  ON public.course_resources(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_course_resources_scope
  ON public.course_resources(resource_scope);
CREATE INDEX IF NOT EXISTS idx_course_resources_publish
  ON public.course_resources(publish_status);

-- ─── 3. updated_at trigger ───────────────────────────────────────────────────

CREATE TRIGGER update_course_resources_updated_at
  BEFORE UPDATE ON public.course_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 4. Extend master_course_items ───────────────────────────────────────────

-- Add resource_id column for standalone module resources
ALTER TABLE public.master_course_items
  ADD COLUMN IF NOT EXISTS resource_id UUID
    REFERENCES public.course_resources(id) ON DELETE SET NULL;

-- Drop old item_type check and recreate with new types
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'master_course_items_item_type_check'
      AND conrelid = 'public.master_course_items'::regclass
  ) THEN
    ALTER TABLE public.master_course_items
      DROP CONSTRAINT master_course_items_item_type_check;
  END IF;
END $$;

ALTER TABLE public.master_course_items
  ADD CONSTRAINT master_course_items_item_type_check
  CHECK (item_type IN (
    'video', 'document', 'resource', 'assignment_placeholder',
    'quiz_placeholder', 'link', 'note', 'worksheet',
    'pdf', 'markdown', 'external_link'
  ));

-- ─── 5. RLS on course_resources table ────────────────────────────────────────

ALTER TABLE public.course_resources ENABLE ROW LEVEL SECURITY;

-- SuperAdmin full access (CRUD)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'course_resources_superadmin_all'
      AND tablename = 'course_resources'
  ) THEN
    CREATE POLICY course_resources_superadmin_all ON public.course_resources
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.global_role = 'superadmin'
            AND p.is_active = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.global_role = 'superadmin'
            AND p.is_active = true
        )
      );
  END IF;
END $$;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_resources TO authenticated;

-- ─── 6. Storage bucket policy cleanup ────────────────────────────────────────
-- Reuses existing 'course_resources' bucket from migration 00071.
-- Remove the broad "Authenticated read access" policy — students must use
-- server-generated signed URLs, not direct storage reads.

DROP POLICY IF EXISTS "Authenticated read access course_resources" ON storage.objects;

-- Ensure SuperAdmin full access policy on storage.objects for this bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'SuperAdmin full access course_resources'
      AND tablename = 'objects'
  ) THEN
    CREATE POLICY "SuperAdmin full access course_resources"
      ON storage.objects FOR ALL TO authenticated
      USING (
        bucket_id = 'course_resources' AND
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.global_role = 'superadmin'
            AND p.is_active = true
        )
      )
      WITH CHECK (
        bucket_id = 'course_resources' AND
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.global_role = 'superadmin'
            AND p.is_active = true
        )
      );
  END IF;
END $$;
