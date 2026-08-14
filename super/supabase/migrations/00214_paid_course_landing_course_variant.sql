-- Extend paid_course_landing_metadata for course_variant source type.
-- Drop master_courses-only FK so source_id can reference variants too.

ALTER TABLE public.paid_course_landing_metadata
  DROP CONSTRAINT IF EXISTS paid_course_landing_metadata_source_id_fkey;

ALTER TABLE public.paid_course_landing_metadata
  DROP CONSTRAINT IF EXISTS paid_course_landing_metadata_source_type_check;

ALTER TABLE public.paid_course_landing_metadata
  ADD CONSTRAINT paid_course_landing_metadata_source_type_check
  CHECK (source_type IN ('master_course', 'paid_course_builder', 'course_variant'));

COMMENT ON COLUMN public.paid_course_landing_metadata.source_id IS
  'Polymorphic source id: master_courses.id for master_course/paid_course_builder, course_variants.id for course_variant.';

-- Dedupe slugs within source_type before unique index (avoid migration crash on existing data)
WITH ranked AS (
  SELECT
    id,
    source_type,
    slug,
    source_id,
    ROW_NUMBER() OVER (PARTITION BY source_type, slug ORDER BY created_at, id) AS rn
  FROM public.paid_course_landing_metadata
)
UPDATE public.paid_course_landing_metadata AS m
SET slug = m.slug || '-' || LEFT(m.source_id::text, 8)
FROM ranked AS r
WHERE m.id = r.id
  AND r.rn > 1;

-- Safe slug uniqueness per source type (allows same slug across types if needed)
DROP INDEX IF EXISTS idx_paid_course_landing_metadata_source_type_slug;
CREATE UNIQUE INDEX IF NOT EXISTS idx_paid_course_landing_metadata_source_type_slug
  ON public.paid_course_landing_metadata (source_type, slug);
