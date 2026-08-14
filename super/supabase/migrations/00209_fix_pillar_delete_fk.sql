-- Migration 00209: Fix pillar deletion foreign key constraint
--
-- Problem: master_courses.pillar_id has ON DELETE RESTRICT, which blocks
-- pillar deletion when courses reference it.
--
-- Solution: Change to ON DELETE SET NULL so courses are unlinked (not deleted)
-- when a pillar is removed.

-- 1. Drop the existing FK constraint
ALTER TABLE public.master_courses
  DROP CONSTRAINT IF EXISTS master_courses_pillar_id_fkey;

-- 2. Re-add with ON DELETE SET NULL
ALTER TABLE public.master_courses
  ADD CONSTRAINT master_courses_pillar_id_fkey
    FOREIGN KEY (pillar_id)
    REFERENCES public.master_course_pillars(id)
    ON DELETE SET NULL;

-- 3. Verify the change
SELECT conname, conrelid::regclass, confrelid::regclass, confdeltype
FROM pg_constraint
WHERE confrelid = 'public.master_course_pillars'::regclass;
