-- Migration 00183: Explicit display pillar for course variants (Phase 5.5)
--
-- Adds course_variants.pillar_id so variants can appear under a chosen pillar
-- in student/admin catalogs, independent of the parent master course pillar.

BEGIN;

ALTER TABLE public.course_variants
  ADD COLUMN IF NOT EXISTS pillar_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'course_variants_pillar_id_fkey'
      AND conrelid = 'public.course_variants'::regclass
  ) THEN
    ALTER TABLE public.course_variants
      ADD CONSTRAINT course_variants_pillar_id_fkey
      FOREIGN KEY (pillar_id)
      REFERENCES public.master_course_pillars(id)
      ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.course_variants.pillar_id IS
  'Controls where the variant appears in student/admin pillar catalogs. When null, runtime may fall back to the parent master course pillar.';

UPDATE public.course_variants cv
SET pillar_id = mc.pillar_id
FROM public.master_courses mc
WHERE cv.master_course_id = mc.id
  AND cv.pillar_id IS NULL
  AND mc.pillar_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_course_variants_pillar_id
  ON public.course_variants(pillar_id);

COMMIT;
