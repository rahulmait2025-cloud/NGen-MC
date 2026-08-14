-- Migration: Backfill missing master_course_items for active, completed video_assets
-- Problem: Videos synced to video_assets were not automatically creating master_course_items rows.
-- LMS/College count videos from master_course_items, causing count mismatches.
-- This migration backfills missing items for all courses. Idempotent.

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
  COALESCE(va.title, 'Video'),
  'video',
  10,
  'published',
  va.id,
  false,
  true,
  va.duration_seconds,
  NOW(),
  NOW()
FROM video_assets va
WHERE va.sync_status = 'active'
  AND va.processing_status = 'completed'
  AND va.master_course_module_id IS NOT NULL
  AND va.id NOT IN (
    SELECT video_asset_id
    FROM master_course_items
    WHERE video_asset_id IS NOT NULL
  );
