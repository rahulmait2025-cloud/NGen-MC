-- 00208_rebackfill_item_slugs.sql
-- Re-backfill item slugs with corrected Unicode-aware slugify.
-- Fixes fullwidth characters (｜, 、, 。, etc.) eating the first letter of each word.

-- 1. Drop the unique constraint so we can overwrite freely
DROP INDEX IF EXISTS idx_master_course_items_course_slug;

-- Helper: Unicode-aware slugify
CREATE OR REPLACE FUNCTION _slugify_item_title(t text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT REGEXP_REPLACE(
           REGEXP_REPLACE(
             REGEXP_REPLACE(
               REGEXP_REPLACE(LOWER(t),
                 '[\uFF5C\uFF0F\uFF1A\uFF1B\uFF0C\uFF0E\u3001\u3002]+', ' ', 'g'
               ),
               '[^a-z0-9]+', '-', 'g'
             ),
             '-+', '-', 'g'
           ),
           '^-|-$', '', 'g'
         );
$$;

-- 2. Clear all existing slugs so the CTE picks them all up
UPDATE master_course_items SET slug = NULL;

-- 3. Re-backfill all items
WITH slugs AS (
  SELECT
    id,
    master_course_id,
    _slugify_item_title(title) AS raw_slug,
    ROW_NUMBER() OVER (
      PARTITION BY master_course_id, _slugify_item_title(title)
      ORDER BY sort_order, created_at
    ) AS rn
  FROM master_course_items
),
final_slugs AS (
  SELECT
    id,
    CASE
      WHEN rn = 1 THEN raw_slug
      WHEN raw_slug = '' THEN 'lesson-' || rn
      ELSE raw_slug || '-' || rn
    END AS slug
  FROM slugs
)
UPDATE master_course_items i
SET slug = f.slug
FROM final_slugs f
WHERE i.id = f.id;

-- 4. Safety: ensure no NULLs remain
UPDATE master_course_items
SET slug = 'lesson-' || sort_order
WHERE slug IS NULL OR slug = '';

-- 5. Recreate the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_master_course_items_course_slug
  ON master_course_items (master_course_id, slug)
  WHERE slug IS NOT NULL;

DROP FUNCTION IF EXISTS _slugify_item_title(text);
