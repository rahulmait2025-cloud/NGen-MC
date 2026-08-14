-- Manual SQL to fix existing published courses
-- Run this in your Supabase SQL Editor if you want to fix the data immediately
-- without waiting for the migration to be deployed.

-- This fixes the issue where CollegeAdmin and LMS show 0 modules/videos
-- even though SuperAdmin shows content exists.

-- Step 1: Publish all modules for published courses
UPDATE master_course_modules
SET 
  publish_status = 'published',
  visible_to_students = true,
  updated_at = now()
WHERE master_course_id IN (
  SELECT id FROM master_courses WHERE publish_status = 'published'
)
AND publish_status != 'published';

-- Step 2: Publish all items (lessons) for published courses
UPDATE master_course_items
SET 
  publish_status = 'published',
  updated_at = now()
WHERE master_course_id IN (
  SELECT id FROM master_courses WHERE publish_status = 'published'
)
AND publish_status != 'published';

-- Verify the fix
SELECT 
  mc.title as course_title,
  mc.publish_status as course_status,
  COUNT(DISTINCT mcm.id) as module_count,
  COUNT(DISTINCT mci.id) as item_count,
  COUNT(DISTINCT CASE WHEN mcm.publish_status = 'published' THEN mcm.id END) as published_modules,
  COUNT(DISTINCT CASE WHEN mci.publish_status = 'published' THEN mci.id END) as published_items
FROM master_courses mc
LEFT JOIN master_course_modules mcm ON mcm.master_course_id = mc.id
LEFT JOIN master_course_items mci ON mci.master_course_id = mc.id
WHERE mc.publish_status = 'published'
GROUP BY mc.id, mc.title, mc.publish_status;
