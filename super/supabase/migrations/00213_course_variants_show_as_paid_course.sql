-- Course variants can be sold/assigned as individual paid courses in Student LMS.

ALTER TABLE course_variants
  ADD COLUMN IF NOT EXISTS show_as_paid_course boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN course_variants.show_as_paid_course IS
  'When true, variant appears in Student LMS paid catalog as its own paid course product.';

CREATE INDEX IF NOT EXISTS idx_course_variants_show_as_paid_course
  ON course_variants (show_as_paid_course)
  WHERE show_as_paid_course = true;
