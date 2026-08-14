-- Migration: 00109_fix_published_courses_cascade_publish_status.sql
-- Purpose: Fix existing published courses by cascading publish_status to modules and items
-- Issue: When courses were published, modules and items remained in 'draft' status,
--        causing CollegeAdmin and LMS to show 0 modules/videos even though content exists.

-- Update all modules to 'published' if their parent course is 'published'
UPDATE master_course_modules
SET 
  publish_status = 'published',
  visible_to_students = true,
  updated_at = now()
WHERE master_course_id IN (
  SELECT id FROM master_courses WHERE publish_status = 'published'
)
AND publish_status != 'published';

-- Update all items to 'published' if their parent course is 'published'
UPDATE master_course_items
SET 
  publish_status = 'published',
  updated_at = now()
WHERE master_course_id IN (
  SELECT id FROM master_courses WHERE publish_status = 'published'
)
AND publish_status != 'published';

-- Add comment explaining the fix
COMMENT ON TABLE master_course_modules IS 'Modules are auto-published when parent course is published (see migration 00109)';
COMMENT ON TABLE master_course_items IS 'Items are auto-published when parent course is published (see migration 00109)';
