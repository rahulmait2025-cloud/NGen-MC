-- 00207_item_slug.sql
-- Add slug column to master_course_items for human-readable lesson URLs.

-- 1. Add the slug column (nullable initially for backfill)
ALTER TABLE master_course_items
  ADD COLUMN IF NOT EXISTS slug text;

-- 2. Backfill existing items: slugify(title), with collision handling within each course.
--    Uses a window function to append -{row_number} when a slug repeats within the same course.
WITH slugs AS (
  SELECT
    id,
    master_course_id,
    LOWER(REGEXP_REPLACE(TRIM(title), '[^a-z0-9]+', '-', 'g')) AS raw_slug,
    ROW_NUMBER() OVER (
      PARTITION BY master_course_id, LOWER(REGEXP_REPLACE(TRIM(title), '[^a-z0-9]+', '-', 'g'))
      ORDER BY sort_order, created_at
    ) AS rn
  FROM master_course_items
),
cleaned AS (
  SELECT
    id,
    CASE
      WHEN rn = 1 THEN raw_slug
      ELSE raw_slug || '-' || rn
    END AS slug
  FROM slugs
)
UPDATE master_course_items i
SET slug = c.slug
FROM cleaned c
WHERE i.id = c.id
  AND i.slug IS NULL;

-- 3. Trim leading/trailing hyphens from any edge-case slugs
UPDATE master_course_items
SET slug = REGEXP_REPLACE(slug, '^-+|-+$', '', 'g')
WHERE slug ~ '^-|-$';

-- 4. Create a unique index per course to prevent slug collisions
CREATE UNIQUE INDEX IF NOT EXISTS idx_master_course_items_course_slug
  ON master_course_items (master_course_id, slug)
  WHERE slug IS NOT NULL;

-- 5. Add a regular index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_master_course_items_slug
  ON master_course_items (slug)
  WHERE slug IS NOT NULL;
