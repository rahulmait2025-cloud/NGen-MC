-- 00306: Add global visibility support to course_resource_sections
--
-- Adds visibility support:
-- - per_course: existing behavior, requires course_id
-- - global: applies to every course player, does not belong to one course

BEGIN;

ALTER TABLE public.course_resource_sections
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'per_course'
  CHECK (visibility IN ('per_course', 'global'));

-- Allow global resource sections to exist without a course.
-- Existing per_course rows keep their course_id.
ALTER TABLE public.course_resource_sections
  ALTER COLUMN course_id DROP NOT NULL;

-- Enforce correct ownership model.
-- per_course resources must have course_id.
-- global resources must not depend on any course_id.
ALTER TABLE public.course_resource_sections
  DROP CONSTRAINT IF EXISTS course_resource_sections_visibility_course_check;

ALTER TABLE public.course_resource_sections
  ADD CONSTRAINT course_resource_sections_visibility_course_check
  CHECK (
    (visibility = 'per_course' AND course_id IS NOT NULL)
    OR
    (visibility = 'global' AND course_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_course_resource_sections_visibility
  ON public.course_resource_sections (visibility, sort_order)
  WHERE visibility = 'global';

CREATE INDEX IF NOT EXISTS idx_course_resource_sections_per_course
  ON public.course_resource_sections (course_id, scope_type, sort_order)
  WHERE visibility = 'per_course';

COMMIT;
