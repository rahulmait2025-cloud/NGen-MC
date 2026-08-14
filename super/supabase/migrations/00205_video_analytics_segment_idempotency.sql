-- =====================================================================
-- Migration: 00205_video_analytics_segment_idempotency.sql
-- Description: Adds client-side idempotency columns to video_watch_segments
--              and performance indexes for the hardened analytics pipeline.
--              Idempotent: all operations use IF NOT EXISTS patterns.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. Add idempotency columns to video_watch_segments
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.video_watch_segments
  ADD COLUMN IF NOT EXISTS client_segment_id text,
  ADD COLUMN IF NOT EXISTS player_instance_id text,
  ADD COLUMN IF NOT EXISTS client_sequence integer,
  ADD COLUMN IF NOT EXISTS segment_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS segment_ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS calculation_version integer NOT NULL DEFAULT 2;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Unique index: prevent duplicate segments per (student, lesson, client_segment_id)
--    Only enforced when client_segment_id is NOT NULL (partial unique index).
-- ─────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS uq_seg_client_segment_id
    ON public.video_watch_segments (student_id, lesson_id, client_segment_id)
    WHERE client_segment_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Performance indexes for analytics read path
-- ─────────────────────────────────────────────────────────────────────

-- Segments: per-student per-lesson time-series queries
CREATE INDEX IF NOT EXISTS idx_seg_student_lesson_created
    ON public.video_watch_segments (student_id, lesson_id, created_at);

-- Segments: per-course per-lesson cohort queries
CREATE INDEX IF NOT EXISTS idx_seg_course_lesson_created
    ON public.video_watch_segments (course_id, lesson_id, created_at);

-- Progress: per-student per-lesson fast lookup (already has UNIQUE constraint,
-- but this explicit index covers the common read pattern)
CREATE INDEX IF NOT EXISTS idx_svp_student_lesson
    ON public.student_video_progress (student_id, lesson_id);

-- Progress: course-level completion queries (pie charts, cohort stats)
CREATE INDEX IF NOT EXISTS idx_svp_course_completed
    ON public.student_video_progress (course_id, completed);

-- ─────────────────────────────────────────────────────────────────────
-- 4. Backfill safe defaults for existing rows
--    client_segment_id stays NULL for pre-existing rows (the partial
--    unique index does not enforce uniqueness for NULL values).
-- ─────────────────────────────────────────────────────────────────────

UPDATE public.video_watch_segments
SET calculation_version = 2
WHERE calculation_version IS DISTINCT FROM 2;
