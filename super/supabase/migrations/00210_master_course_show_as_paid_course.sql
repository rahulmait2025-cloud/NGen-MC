-- Allow pillar master courses to appear in the Student LMS paid course catalog
-- independently of pillar browse pages. Bootcamp (Paid Course Builder) courses
-- are backfilled as always visible in the paid catalog.

ALTER TABLE master_courses
  ADD COLUMN IF NOT EXISTS show_as_paid_course boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN master_courses.show_as_paid_course IS
  'When true, this master course appears in the Student LMS paid course catalog. Toggle controls discoverability only; existing entitlements are preserved.';

-- Paid Course Builder courses (catalog_type = bootcamp) are always paid catalog items
UPDATE master_courses
SET show_as_paid_course = true
WHERE catalog_type = 'bootcamp';

-- Preserve existing paid pillar course catalog visibility
UPDATE master_courses mc
SET show_as_paid_course = true
WHERE mc.catalog_type = 'pillar'
  AND mc.pillar_id IS NOT NULL
  AND mc.publish_status = 'published'
  AND COALESCE(mc.is_free, false) = false
  AND COALESCE(mc.pricing_model, '') <> 'free'
  AND (
    (mc.selling_price IS NOT NULL AND mc.selling_price > 0)
    OR EXISTS (
      SELECT 1
      FROM course_price_plans cpp
      WHERE cpp.master_course_id = mc.id
        AND cpp.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_master_courses_show_as_paid_course
  ON master_courses (show_as_paid_course)
  WHERE show_as_paid_course = true;
