-- =====================================================================
-- Migration: 00229_video_analytics_cumulative_tracking.sql
-- Description: Adds session_count and completed_at columns to
--              student_video_progress for cumulative analytics tracking.
--              Backfills from existing video_watch_sessions data.
--              Idempotent: uses IF NOT EXISTS / WHERE NOT NULL guards.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. Add session_count and completed_at to student_video_progress
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.student_video_progress
  ADD COLUMN IF NOT EXISTS session_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

COMMENT ON COLUMN public.student_video_progress.session_count IS 'Total number of video_watch_sessions for this student+lesson.';
COMMENT ON COLUMN public.student_video_progress.completed_at IS 'Timestamp of first completion. Never overwritten once set.';

-- ─────────────────────────────────────────────────────────────────────
-- 2. Backfill session_count from video_watch_sessions
-- ─────────────────────────────────────────────────────────────────────

UPDATE public.student_video_progress svp
SET session_count = sub.cnt
FROM (
  SELECT student_id, lesson_id, COUNT(*) AS cnt
  FROM public.video_watch_sessions
  GROUP BY student_id, lesson_id
) sub
WHERE svp.student_id = sub.student_id
  AND svp.lesson_id = sub.lesson_id
  AND svp.session_count = 0;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Backfill completed_at from first completed session
-- ─────────────────────────────────────────────────────────────────────

UPDATE public.student_video_progress svp
SET completed_at = sub.first_completed_at
FROM (
  SELECT student_id, lesson_id, MIN(ended_at) AS first_completed_at
  FROM public.video_watch_sessions
  WHERE completed = true AND ended_at IS NOT NULL
  GROUP BY student_id, lesson_id
) sub
WHERE svp.student_id = sub.student_id
  AND svp.lesson_id = sub.lesson_id
  AND svp.completed = true
  AND svp.completed_at IS NULL;
