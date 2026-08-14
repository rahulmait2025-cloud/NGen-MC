-- Phase 2B: Catalog Visibility Scope
-- Adds visibility controls to course_variants and course_bundles for SuperAdmin.
-- Supports: private (internal only), global (reusable/assignable), selected_colleges.

BEGIN;

-- 1. Add visibility columns to course_variants

ALTER TABLE public.course_variants
ADD COLUMN IF NOT EXISTS visibility_scope text NOT NULL DEFAULT 'global'
  CHECK (visibility_scope IN ('private', 'global', 'selected_colleges'));

ALTER TABLE public.course_variants
ADD COLUMN IF NOT EXISTS created_for_college_id uuid REFERENCES public.colleges(id) ON DELETE SET NULL;

ALTER TABLE public.course_variants
ADD COLUMN IF NOT EXISTS visibility_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.course_variants.visibility_scope IS
'Visibility level: private (internal only), global (reusable), selected_colleges (limited to mapped colleges)';

COMMENT ON COLUMN public.course_variants.created_for_college_id IS
'Original college this variant was created for (lineage/context only)';

-- 2. Add visibility columns to course_bundles

ALTER TABLE public.course_bundles
ADD COLUMN IF NOT EXISTS visibility_scope text NOT NULL DEFAULT 'global'
  CHECK (visibility_scope IN ('private', 'global', 'selected_colleges'));

ALTER TABLE public.course_bundles
ADD COLUMN IF NOT EXISTS created_for_college_id uuid REFERENCES public.colleges(id) ON DELETE SET NULL;

ALTER TABLE public.course_bundles
ADD COLUMN IF NOT EXISTS visibility_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.course_bundles.visibility_scope IS
'Visibility level: private (internal only), global (reusable), selected_colleges (limited to mapped colleges)';

COMMENT ON COLUMN public.course_bundles.created_for_college_id IS
'Original college this bundle was created for (lineage/context only)';

-- 3. Create course_variant_visibility_colleges mapping table

CREATE TABLE IF NOT EXISTS public.course_variant_visibility_colleges (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.course_variants(id) ON DELETE CASCADE,
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (variant_id, college_id)
);

COMMENT ON TABLE public.course_variant_visibility_colleges IS
'Maps course variants to colleges when visibility_scope = selected_colleges';

CREATE INDEX IF NOT EXISTS idx_course_variant_visibility_colleges_variant
ON public.course_variant_visibility_colleges (variant_id);

CREATE INDEX IF NOT EXISTS idx_course_variant_visibility_colleges_college
ON public.course_variant_visibility_colleges (college_id);

-- 4. Create course_bundle_visibility_colleges mapping table

CREATE TABLE IF NOT EXISTS public.course_bundle_visibility_colleges (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.course_bundles(id) ON DELETE CASCADE,
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (bundle_id, college_id)
);

COMMENT ON TABLE public.course_bundle_visibility_colleges IS
'Maps course bundles to colleges when visibility_scope = selected_colleges';

CREATE INDEX IF NOT EXISTS idx_course_bundle_visibility_colleges_bundle
ON public.course_bundle_visibility_colleges (bundle_id);

CREATE INDEX IF NOT EXISTS idx_course_bundle_visibility_colleges_college
ON public.course_bundle_visibility_colleges (college_id);

-- 5. Add indexes to parent tables

CREATE INDEX IF NOT EXISTS idx_course_variants_visibility_scope
ON public.course_variants (visibility_scope);

CREATE INDEX IF NOT EXISTS idx_course_variants_created_for_college
ON public.course_variants (created_for_college_id);

CREATE INDEX IF NOT EXISTS idx_course_bundles_visibility_scope
ON public.course_bundles (visibility_scope);

CREATE INDEX IF NOT EXISTS idx_course_bundles_created_for_college
ON public.course_bundles (created_for_college_id);

COMMIT;