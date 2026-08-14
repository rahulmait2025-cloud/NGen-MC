-- Manual SQL to sync videos to lessons for existing published courses
-- Run this in Supabase SQL Editor if courses show 0 lessons/videos

-- This creates master_course_items (lessons) for videos that are attached to modules
-- but haven't been synced yet.

-- Step 1: Create items for videos that are linked to modules but not yet in master_course_items
INSERT INTO master_course_items (
  id,
  master_course_id,
  module_id,
  title,
  item_type,
  sort_order,
  publish_status,
  video_asset_id,
  is_preview,
  is_required,
  duration_seconds,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  va.master_course_id,
  va.master_course_module_id,
  COALESCE(va.title, 'Video') as title,
  'video' as item_type,
  COALESCE(va.sort_order, 0) as sort_order,
  'published' as publish_status,
  va.id as video_asset_id,
  false as is_preview,
  true as is_required,
  va.duration_seconds,
  now() as created_at,
  now() as updated_at
FROM video_assets va
WHERE va.master_course_id IN (
  SELECT id FROM master_courses WHERE publish_status = 'published'
)
AND va.sync_status = 'active'
AND va.processing_status = 'completed'
AND va.removed_at IS NULL
AND va.master_course_module_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM master_course_items mci 
  WHERE mci.video_asset_id = va.id
);

-- Step 2: Verify the sync worked
SELECT 
  mc.title as course_title,
  COUNT(DISTINCT mcm.id) as modules,
  COUNT(DISTINCT mci.id) as lessons,
  COUNT(DISTINCT CASE WHEN mci.item_type = 'video' THEN mci.id END) as videos
FROM master_courses mc
LEFT JOIN master_course_modules mcm ON mcm.master_course_id = mc.id AND mcm.publish_status = 'published'
LEFT JOIN master_course_items mci ON mci.master_course_id = mc.id AND mci.publish_status = 'published'
WHERE mc.publish_status = 'published'
GROUP BY mc.id, mc.title;
