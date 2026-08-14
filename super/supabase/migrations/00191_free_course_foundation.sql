-- ============================================================
-- 00191: Free course foundation (course_kind + YouTube item metadata)
--
-- Adds course_kind on master_courses and video_source / YouTube
-- metadata on master_course_items. Idempotent; existing platform
-- courses remain course_kind = 'platform'.
-- ============================================================

BEGIN;

-- ─── master_courses.course_kind ─────────────────────────────────────────────

ALTER TABLE public.master_courses
  ADD COLUMN IF NOT EXISTS course_kind text;

UPDATE public.master_courses
SET course_kind = 'platform'
WHERE course_kind IS NULL;

ALTER TABLE public.master_courses
  ALTER COLUMN course_kind SET DEFAULT 'platform';

ALTER TABLE public.master_courses
  ALTER COLUMN course_kind SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'master_courses_course_kind_check'
      AND conrelid = 'public.master_courses'::regclass
  ) THEN
    ALTER TABLE public.master_courses
      ADD CONSTRAINT master_courses_course_kind_check
      CHECK (course_kind IN ('platform', 'free_course'));
  END IF;
END $$;

COMMENT ON COLUMN public.master_courses.course_kind IS
  'Distinguishes platform master courses from curated free courses (free_course).';

CREATE INDEX IF NOT EXISTS idx_master_courses_course_kind
  ON public.master_courses (course_kind);

-- ─── master_course_items.video_source + YouTube metadata ───────────────────

ALTER TABLE public.master_course_items
  ADD COLUMN IF NOT EXISTS video_source text,
  ADD COLUMN IF NOT EXISTS youtube_video_id text,
  ADD COLUMN IF NOT EXISTS youtube_playlist_id text,
  ADD COLUMN IF NOT EXISTS youtube_original_title text,
  ADD COLUMN IF NOT EXISTS youtube_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS youtube_position integer,
  ADD COLUMN IF NOT EXISTS youtube_channel_id text,
  ADD COLUMN IF NOT EXISTS youtube_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_metadata jsonb;

UPDATE public.master_course_items
SET video_source = 'tpstreams'
WHERE video_source IS NULL;

UPDATE public.master_course_items
SET external_metadata = '{}'::jsonb
WHERE external_metadata IS NULL;

ALTER TABLE public.master_course_items
  ALTER COLUMN video_source SET DEFAULT 'tpstreams';

ALTER TABLE public.master_course_items
  ALTER COLUMN video_source SET NOT NULL;

ALTER TABLE public.master_course_items
  ALTER COLUMN external_metadata SET DEFAULT '{}'::jsonb;

ALTER TABLE public.master_course_items
  ALTER COLUMN external_metadata SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'master_course_items_video_source_check'
      AND conrelid = 'public.master_course_items'::regclass
  ) THEN
    ALTER TABLE public.master_course_items
      ADD CONSTRAINT master_course_items_video_source_check
      CHECK (video_source IN ('tpstreams', 'youtube'));
  END IF;
END $$;

COMMENT ON COLUMN public.master_course_items.video_source IS
  'tpstreams = platform-hosted video asset; youtube = external YouTube lecture reference.';

CREATE INDEX IF NOT EXISTS idx_master_course_items_video_source
  ON public.master_course_items (video_source);

CREATE INDEX IF NOT EXISTS idx_master_course_items_youtube_video_id
  ON public.master_course_items (youtube_video_id)
  WHERE youtube_video_id IS NOT NULL;

COMMIT;
