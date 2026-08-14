-- Diagnostic query to check course/module/item state
-- Run this to see why pillar landing page shows 0 counts

SELECT 
  mc.title as course_title,
  mc.publish_status as course_status,
  mc.visible_to_college_students,
  mc.visible_to_global_students,
  COUNT(DISTINCT mcm.id) as total_modules,
  COUNT(DISTINCT CASE WHEN mcm.publish_status = 'published' THEN mcm.id END) as published_modules,
  COUNT(DISTINCT CASE WHEN mcm.publish_status = 'published' AND mcm.visible_to_students = true THEN mcm.id END) as visible_modules,
  COUNT(DISTINCT mci.id) as total_items,
  COUNT(DISTINCT CASE WHEN mci.publish_status = 'published' THEN mci.id END) as published_items,
  COUNT(DISTINCT CASE WHEN mci.publish_status = 'published' AND mci.item_type = 'video' THEN mci.id END) as published_videos
FROM master_courses mc
LEFT JOIN master_course_modules mcm ON mcm.master_course_id = mc.id
LEFT JOIN master_course_items mci ON mci.master_course_id = mc.id
WHERE mc.publish_status = 'published'
GROUP BY mc.id, mc.title, mc.publish_status, mc.visible_to_college_students, mc.visible_to_global_students
ORDER BY mc.title;
