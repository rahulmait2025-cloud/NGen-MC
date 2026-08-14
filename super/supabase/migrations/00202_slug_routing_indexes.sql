-- Migration: 00202_slug_routing_indexes.sql
-- Description: Adds slug-based routing support.
-- Backfills null slugs from title, adds missing unique constraints and indexes
-- for slug-first URL routing across LMS, SuperAdmin, and CollegeAdmin.

BEGIN;

-- ─── 1. Backfill null slugs for master_courses ───────────────────────────────
-- Generate slug from title where slug is NULL or empty.
-- Scope: uniqueness within (pillar_id, slug) for pillar courses,
--        and (bootcamp_id, slug) for bootcamp courses.

DO $$
DECLARE
  r RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INT;
BEGIN
  FOR r IN
    SELECT id, title, pillar_id, bootcamp_id
    FROM public.master_courses
    WHERE slug IS NULL OR slug = ''
  LOOP
    -- Generate base slug from title
    base_slug := lower(regexp_replace(r.title, '[^a-z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);

    -- Fallback if title produces empty slug
    IF base_slug = '' THEN
      base_slug := 'course';
    END IF;

    final_slug := base_slug;
    counter := 2;

    -- Check for duplicates within the same scope
    WHILE EXISTS (
      SELECT 1
      FROM public.master_courses
      WHERE slug = final_slug
        AND id != r.id
        AND (
          (r.pillar_id IS NULL AND pillar_id IS NULL AND bootcamp_id IS NULL)
          OR (r.pillar_id IS NOT NULL AND pillar_id = r.pillar_id)
          OR (r.bootcamp_id IS NOT NULL AND bootcamp_id = r.bootcamp_id)
        )
    ) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;

    UPDATE public.master_courses
    SET slug = final_slug
    WHERE id = r.id;
  END LOOP;
END $$;

-- ─── 2. Backfill null slugs for master_course_modules ────────────────────────
-- Generate slug from title where slug is NULL or empty.
-- Scope: uniqueness within (master_course_id, slug).

DO $$
DECLARE
  r RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INT;
BEGIN
  FOR r IN
    SELECT id, title, master_course_id
    FROM public.master_course_modules
    WHERE slug IS NULL OR slug = ''
  LOOP
    base_slug := lower(regexp_replace(r.title, '[^a-z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);

    IF base_slug = '' THEN
      base_slug := 'module';
    END IF;

    final_slug := base_slug;
    counter := 2;

    WHILE EXISTS (
      SELECT 1
      FROM public.master_course_modules
      WHERE slug = final_slug
        AND id != r.id
        AND master_course_id = r.master_course_id
    ) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;

    UPDATE public.master_course_modules
    SET slug = final_slug
    WHERE id = r.id;
  END LOOP;
END $$;

-- ─── 3. Unique constraint: master_course_modules (master_course_id, slug) ────
-- Prevents duplicate module slugs within the same course.

CREATE UNIQUE INDEX IF NOT EXISTS idx_master_course_modules_course_slug
  ON public.master_course_modules (master_course_id, slug)
  WHERE slug IS NOT NULL;

-- ─── 4. Unique constraint: master_courses (bootcamp_id, slug) ───────────────
-- Prevents duplicate course slugs within the same bootcamp.
-- Note: pillar_id + slug unique index already exists from migration 00092.

CREATE UNIQUE INDEX IF NOT EXISTS idx_master_courses_bootcamp_slug
  ON public.master_courses (bootcamp_id, slug)
  WHERE bootcamp_id IS NOT NULL AND slug IS NOT NULL;

-- ─── 5. Performance indexes for slug lookups ─────────────────────────────────
-- Speeds up slug-based route resolution queries.

CREATE INDEX IF NOT EXISTS idx_master_course_modules_slug
  ON public.master_course_modules (slug)
  WHERE slug IS NOT NULL;

COMMIT;
