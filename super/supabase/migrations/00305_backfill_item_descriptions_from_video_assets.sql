-- 00305: Backfill master_course_items.description from video_assets.description
--
-- Root cause: When videos were uploaded and linked to course items, the
-- description was saved to video_assets.description but not propagated to
-- master_course_items.description. The LMS reads description from
-- master_course_items, so the Overview tab appeared empty.

BEGIN;

UPDATE public.master_course_items mci
SET description = va.description
FROM public.video_assets va
WHERE mci.video_asset_id = va.id
  AND va.description IS NOT NULL
  AND trim(va.description) <> ''
  AND (mci.description IS NULL OR trim(mci.description) = '');

COMMIT;
