-- Backfill LMS visibility + card metadata for existing published bundles.
-- Safe to re-run: only updates rows missing catalog visibility or curated picks.

BEGIN;

-- Ensure published bundles are active for LMS catalog queries
UPDATE public.course_bundles
SET lifecycle_status = 'active'
WHERE publish_status = 'published'
  AND lifecycle_status = 'draft';

-- Catalog visibility + fallback card metadata
UPDATE public.course_bundles
SET
  show_on_lms_catalog = true,
  catalog_sort_order = COALESCE(catalog_sort_order, 100),
  landing_card_title = COALESCE(NULLIF(TRIM(landing_card_title), ''), title),
  landing_card_description = COALESCE(
    NULLIF(TRIM(landing_card_description), ''),
    NULLIF(TRIM(description), ''),
    'Premium learning bundle curated by CTO Bhaiya.'
  ),
  landing_badge_label = COALESCE(NULLIF(TRIM(landing_badge_label), ''), 'Bundle')
WHERE publish_status = 'published'
  AND lifecycle_status = 'active'
  AND COALESCE(show_on_lms_catalog, false) = false;

-- Curated picks: only seed when none configured yet
WITH has_curated AS (
  SELECT EXISTS (
    SELECT 1
    FROM public.course_bundles
    WHERE publish_status = 'published'
      AND lifecycle_status = 'active'
      AND show_on_lms_curated = true
  ) AS exists_curated
),
ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY COALESCE(curated_sort_order, 9999), created_at DESC) AS rn
  FROM public.course_bundles
  WHERE publish_status = 'published'
    AND lifecycle_status = 'active'
    AND COALESCE(show_on_lms_catalog, true) = true
)
UPDATE public.course_bundles cb
SET
  show_on_lms_curated = true,
  curated_sort_order = COALESCE(cb.curated_sort_order, ranked.rn)
FROM ranked, has_curated
WHERE cb.id = ranked.id
  AND has_curated.exists_curated = false
  AND ranked.rn <= 3;

COMMIT;
