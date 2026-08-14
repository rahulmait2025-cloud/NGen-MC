-- Migration: 00264_preserve_watch_time_on_content_deletion.sql
-- Description: Change ON DELETE CASCADE to ON DELETE SET NULL on analytics FK columns
--              so student watch time data is preserved when courses, modules, or
--              lesson items are deleted. Watch time should be permanent — it represents
--              learning activity that actually happened and must survive content lifecycle.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- 1. student_video_progress: Make course_id, module_id, lesson_id nullable
--    and switch from CASCADE to SET NULL
-- ═══════════════════════════════════════════════════════════════════════

-- 1a. Drop existing FK constraints
ALTER TABLE public.student_video_progress
  DROP CONSTRAINT IF EXISTS student_video_progress_course_id_fkey;

ALTER TABLE public.student_video_progress
  DROP CONSTRAINT IF EXISTS student_video_progress_module_id_fkey;

ALTER TABLE public.student_video_progress
  DROP CONSTRAINT IF EXISTS student_video_progress_lesson_id_fkey;

-- 1b. Make columns nullable (required for SET NULL)
ALTER TABLE public.student_video_progress
  ALTER COLUMN course_id DROP NOT NULL;

ALTER TABLE public.student_video_progress
  ALTER COLUMN module_id DROP NOT NULL;

ALTER TABLE public.student_video_progress
  ALTER COLUMN lesson_id DROP NOT NULL;

-- 1c. Re-add FK constraints with ON DELETE SET NULL
ALTER TABLE public.student_video_progress
  ADD CONSTRAINT student_video_progress_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES public.master_courses(id) ON DELETE SET NULL;

ALTER TABLE public.student_video_progress
  ADD CONSTRAINT student_video_progress_module_id_fkey
    FOREIGN KEY (module_id) REFERENCES public.master_course_modules(id) ON DELETE SET NULL;

ALTER TABLE public.student_video_progress
  ADD CONSTRAINT student_video_progress_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.master_course_items(id) ON DELETE SET NULL;

-- 1d. Drop the UNIQUE constraint on (student_id, lesson_id) and recreate it
--     to allow multiple NULL lesson_ids per student (partial unique index)
ALTER TABLE public.student_video_progress
  DROP CONSTRAINT IF EXISTS student_video_progress_student_id_lesson_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_video_progress_student_lesson
  ON public.student_video_progress (student_id, lesson_id)
  WHERE lesson_id IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════
-- 2. video_watch_sessions: Make course_id, module_id, lesson_id nullable
--    and switch from CASCADE to SET NULL
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.video_watch_sessions
  DROP CONSTRAINT IF EXISTS video_watch_sessions_course_id_fkey;

ALTER TABLE public.video_watch_sessions
  DROP CONSTRAINT IF EXISTS video_watch_sessions_module_id_fkey;

ALTER TABLE public.video_watch_sessions
  DROP CONSTRAINT IF EXISTS video_watch_sessions_lesson_id_fkey;

ALTER TABLE public.video_watch_sessions
  ALTER COLUMN course_id DROP NOT NULL;

ALTER TABLE public.video_watch_sessions
  ALTER COLUMN module_id DROP NOT NULL;

ALTER TABLE public.video_watch_sessions
  ALTER COLUMN lesson_id DROP NOT NULL;

ALTER TABLE public.video_watch_sessions
  ADD CONSTRAINT video_watch_sessions_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES public.master_courses(id) ON DELETE SET NULL;

ALTER TABLE public.video_watch_sessions
  ADD CONSTRAINT video_watch_sessions_module_id_fkey
    FOREIGN KEY (module_id) REFERENCES public.master_course_modules(id) ON DELETE SET NULL;

ALTER TABLE public.video_watch_sessions
  ADD CONSTRAINT video_watch_sessions_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.master_course_items(id) ON DELETE SET NULL;


-- ═══════════════════════════════════════════════════════════════════════
-- 3. video_watch_segments: Make course_id, module_id, lesson_id nullable
--    and switch from CASCADE to SET NULL
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.video_watch_segments
  DROP CONSTRAINT IF EXISTS video_watch_segments_course_id_fkey;

ALTER TABLE public.video_watch_segments
  DROP CONSTRAINT IF EXISTS video_watch_segments_module_id_fkey;

ALTER TABLE public.video_watch_segments
  DROP CONSTRAINT IF EXISTS video_watch_segments_lesson_id_fkey;

ALTER TABLE public.video_watch_segments
  ALTER COLUMN course_id DROP NOT NULL;

ALTER TABLE public.video_watch_segments
  ALTER COLUMN module_id DROP NOT NULL;

ALTER TABLE public.video_watch_segments
  ALTER COLUMN lesson_id DROP NOT NULL;

ALTER TABLE public.video_watch_segments
  ADD CONSTRAINT video_watch_segments_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES public.master_courses(id) ON DELETE SET NULL;

ALTER TABLE public.video_watch_segments
  ADD CONSTRAINT video_watch_segments_module_id_fkey
    FOREIGN KEY (module_id) REFERENCES public.master_course_modules(id) ON DELETE SET NULL;

ALTER TABLE public.video_watch_segments
  ADD CONSTRAINT video_watch_segments_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.master_course_items(id) ON DELETE SET NULL;


-- ═══════════════════════════════════════════════════════════════════════
-- 4. video_watch_events: Make course_id, module_id, lesson_id nullable
--    and switch from CASCADE to SET NULL
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.video_watch_events
  DROP CONSTRAINT IF EXISTS video_watch_events_course_id_fkey;

ALTER TABLE public.video_watch_events
  DROP CONSTRAINT IF EXISTS video_watch_events_module_id_fkey;

ALTER TABLE public.video_watch_events
  DROP CONSTRAINT IF EXISTS video_watch_events_lesson_id_fkey;

ALTER TABLE public.video_watch_events
  ALTER COLUMN course_id DROP NOT NULL;

ALTER TABLE public.video_watch_events
  ALTER COLUMN module_id DROP NOT NULL;

ALTER TABLE public.video_watch_events
  ALTER COLUMN lesson_id DROP NOT NULL;

ALTER TABLE public.video_watch_events
  ADD CONSTRAINT video_watch_events_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES public.master_courses(id) ON DELETE SET NULL;

ALTER TABLE public.video_watch_events
  ADD CONSTRAINT video_watch_events_module_id_fkey
    FOREIGN KEY (module_id) REFERENCES public.master_course_modules(id) ON DELETE SET NULL;

ALTER TABLE public.video_watch_events
  ADD CONSTRAINT video_watch_events_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.master_course_items(id) ON DELETE SET NULL;


-- ═══════════════════════════════════════════════════════════════════════
-- 5. Add comments explaining the design decision
-- ═══════════════════════════════════════════════════════════════════════

COMMENT ON COLUMN public.student_video_progress.course_id IS 'Nullable: SET NULL on course deletion. Watch time rows are preserved forever.';
COMMENT ON COLUMN public.student_video_progress.module_id IS 'Nullable: SET NULL on module deletion. Watch time rows are preserved forever.';
COMMENT ON COLUMN public.student_video_progress.lesson_id IS 'Nullable: SET NULL on lesson deletion. Watch time rows are preserved forever.';

COMMENT ON COLUMN public.video_watch_sessions.course_id IS 'Nullable: SET NULL on course deletion. Session records are preserved forever.';
COMMENT ON COLUMN public.video_watch_sessions.module_id IS 'Nullable: SET NULL on module deletion. Session records are preserved forever.';
COMMENT ON COLUMN public.video_watch_sessions.lesson_id IS 'Nullable: SET NULL on lesson deletion. Session records are preserved forever.';

COMMENT ON COLUMN public.video_watch_segments.course_id IS 'Nullable: SET NULL on course deletion. Segment records are preserved forever.';
COMMENT ON COLUMN public.video_watch_segments.module_id IS 'Nullable: SET NULL on module deletion. Segment records are preserved forever.';
COMMENT ON COLUMN public.video_watch_segments.lesson_id IS 'Nullable: SET NULL on lesson deletion. Segment records are preserved forever.';

COMMIT;
