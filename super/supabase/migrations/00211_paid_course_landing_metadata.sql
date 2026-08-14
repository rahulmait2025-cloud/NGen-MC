-- Canonical paid course landing presentation metadata for both source types:
-- pillar master courses (show_as_paid_course) and Paid Course Builder courses.

CREATE TABLE IF NOT EXISTS public.paid_course_landing_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('master_course', 'paid_course_builder')),
  source_id uuid NOT NULL REFERENCES public.master_courses(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  subtitle text,
  short_description text,
  description text,
  cover_image_url text,
  thumbnail_url text,
  preview_video_url text,
  level text,
  language text,
  category text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  best_for jsonb NOT NULL DEFAULT '[]'::jsonb,
  outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  what_you_will_learn jsonb NOT NULL DEFAULT '[]'::jsonb,
  included_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  prerequisites jsonb NOT NULL DEFAULT '[]'::jsonb,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT paid_course_landing_metadata_source_unique UNIQUE (source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_paid_course_landing_metadata_source_id
  ON public.paid_course_landing_metadata (source_id);

CREATE INDEX IF NOT EXISTS idx_paid_course_landing_metadata_slug
  ON public.paid_course_landing_metadata (slug);

CREATE INDEX IF NOT EXISTS idx_paid_course_landing_metadata_visible
  ON public.paid_course_landing_metadata (is_visible, is_published)
  WHERE is_visible = true AND is_published = true;

COMMENT ON TABLE public.paid_course_landing_metadata IS
  'Presentation metadata for Student LMS individual paid course landing pages. Content/curriculum remains on master_courses modules/items.';

-- Backfill from existing master courses (Paid Course Builder + paid pillar courses)
INSERT INTO public.paid_course_landing_metadata (
  source_type,
  source_id,
  slug,
  title,
  subtitle,
  short_description,
  description,
  cover_image_url,
  thumbnail_url,
  preview_video_url,
  outcomes,
  what_you_will_learn,
  included_features,
  prerequisites,
  faqs,
  is_published,
  is_visible
)
SELECT
  CASE
    WHEN mc.catalog_type = 'bootcamp' OR mc.bootcamp_id IS NOT NULL THEN 'paid_course_builder'
    ELSE 'master_course'
  END AS source_type,
  mc.id AS source_id,
  COALESCE(NULLIF(TRIM(mc.slug), ''), mc.id::text) AS slug,
  mc.title,
  COALESCE(
    mc.metadata->'landing_page'->'hero'->>'subtitle',
    NULL
  ) AS subtitle,
  mc.short_description,
  mc.description,
  COALESCE(
    mc.metadata->'landing_page'->'hero'->>'image_url',
    mc.metadata->>'cover_image_url',
    NULL
  ) AS cover_image_url,
  COALESCE(
    mc.metadata->>'thumbnail_url',
    mc.metadata->'landing_page'->'hero'->>'image_url',
    NULL
  ) AS thumbnail_url,
  mc.metadata->'landing_page'->'hero'->>'video_url' AS preview_video_url,
  COALESCE(mc.metadata->'landing_page'->'learning_outcomes', '[]'::jsonb) AS outcomes,
  COALESCE(mc.metadata->'landing_page'->'learning_outcomes', '[]'::jsonb) AS what_you_will_learn,
  '[]'::jsonb AS included_features,
  '[]'::jsonb AS prerequisites,
  COALESCE(
    mc.metadata->'landing_page'->'faq',
    mc.metadata->'faqs',
    mc.metadata->'faq',
    '[]'::jsonb
  ) AS faqs,
  (mc.publish_status = 'published') AS is_published,
  (
    mc.catalog_type = 'bootcamp'
    OR mc.bootcamp_id IS NOT NULL
    OR COALESCE(mc.show_as_paid_course, false) = true
  ) AS is_visible
FROM public.master_courses mc
WHERE
  mc.catalog_type = 'bootcamp'
  OR mc.bootcamp_id IS NOT NULL
  OR COALESCE(mc.show_as_paid_course, false) = true
ON CONFLICT (source_type, source_id) DO NOTHING;
