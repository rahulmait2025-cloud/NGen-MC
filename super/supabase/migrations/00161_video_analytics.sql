-- =====================================================================
-- Migration: 00059_video_analytics.sql
-- Description: Production-ready database schema for tracking student video
--              analytics, segments, progress, and events.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────
-- 1. Table: video_watch_sessions
-- Purpose: One row per student video viewing session.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.video_watch_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    pillar_id uuid REFERENCES public.master_course_pillars(id) ON DELETE SET NULL,
    course_id uuid NOT NULL REFERENCES public.master_courses(id) ON DELETE CASCADE,
    module_id uuid NOT NULL REFERENCES public.master_course_modules(id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL REFERENCES public.master_course_items(id) ON DELETE CASCADE,
    tpstreams_asset_id text NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    last_position_seconds numeric(10, 2) DEFAULT 0.0,
    max_position_seconds numeric(10, 2) DEFAULT 0.0,
    total_video_seconds_watched numeric(10, 2) DEFAULT 0.0,
    unique_watched_seconds numeric(10, 2) DEFAULT 0.0,
    repeat_watched_seconds numeric(10, 2) DEFAULT 0.0,
    wall_clock_seconds numeric(10, 2) DEFAULT 0.0,
    completion_percentage numeric(5, 2) DEFAULT 0.0,
    completed boolean DEFAULT false,
    play_count integer DEFAULT 0,
    pause_count integer DEFAULT 0,
    seek_count integer DEFAULT 0,
    rate_change_count integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.video_watch_sessions IS 'Individual video viewing sessions for students.';

-- ─────────────────────────────────────────────────────────────────────
-- 2. Table: video_watch_segments
-- Purpose: Stores original video timeline ranges watched.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.video_watch_segments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.video_watch_sessions(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    pillar_id uuid REFERENCES public.master_course_pillars(id) ON DELETE SET NULL,
    course_id uuid NOT NULL REFERENCES public.master_courses(id) ON DELETE CASCADE,
    module_id uuid NOT NULL REFERENCES public.master_course_modules(id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL REFERENCES public.master_course_items(id) ON DELETE CASCADE,
    tpstreams_asset_id text NOT NULL,
    start_second numeric(10, 2) NOT NULL,
    end_second numeric(10, 2) NOT NULL,
    playback_rate numeric(3, 2) DEFAULT 1.0,
    wall_clock_seconds numeric(10, 2) DEFAULT 0.0,
    source text DEFAULT 'play',
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.video_watch_segments IS 'Continuous time chunks watched within a video session.';

-- ─────────────────────────────────────────────────────────────────────
-- 3. Table: student_video_progress
-- Purpose: Fast source-of-truth summary per student per video.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_video_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    pillar_id uuid REFERENCES public.master_course_pillars(id) ON DELETE SET NULL,
    course_id uuid NOT NULL REFERENCES public.master_courses(id) ON DELETE CASCADE,
    module_id uuid NOT NULL REFERENCES public.master_course_modules(id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL REFERENCES public.master_course_items(id) ON DELETE CASCADE,
    tpstreams_asset_id text NOT NULL,
    video_duration_seconds numeric(10, 2) DEFAULT 0.0,
    total_video_seconds_watched numeric(10, 2) DEFAULT 0.0,
    unique_watched_seconds numeric(10, 2) DEFAULT 0.0,
    repeat_watched_seconds numeric(10, 2) DEFAULT 0.0,
    wall_clock_seconds numeric(10, 2) DEFAULT 0.0,
    completion_percentage numeric(5, 2) DEFAULT 0.0,
    completed boolean DEFAULT false,
    first_started_at timestamptz NOT NULL DEFAULT now(),
    last_watched_at timestamptz NOT NULL DEFAULT now(),
    last_position_seconds numeric(10, 2) DEFAULT 0.0,
    max_position_seconds numeric(10, 2) DEFAULT 0.0,
    play_count integer DEFAULT 0,
    pause_count integer DEFAULT 0,
    seek_count integer DEFAULT 0,
    rate_change_count integer DEFAULT 0,
    UNIQUE (student_id, lesson_id)
);

COMMENT ON TABLE public.student_video_progress IS 'Current aggregate progress and status for a student per video/lesson.';

-- ─────────────────────────────────────────────────────────────────────
-- 4. Table: video_watch_events
-- Purpose: Granular analytics events (play, pause, seek, ratechange, ended).
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.video_watch_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.video_watch_sessions(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    course_id uuid NOT NULL REFERENCES public.master_courses(id) ON DELETE CASCADE,
    module_id uuid NOT NULL REFERENCES public.master_course_modules(id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL REFERENCES public.master_course_items(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    current_time_seconds numeric(10, 2) NOT NULL,
    playback_rate numeric(3, 2) DEFAULT 1.0,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.video_watch_events IS 'Player interaction events during a session.';

-- ─────────────────────────────────────────────────────────────────────
-- 5. Indexes for Dashboard Queries & Performance
-- ─────────────────────────────────────────────────────────────────────
-- video_watch_sessions indexes
CREATE INDEX IF NOT EXISTS idx_vws_student_id ON public.video_watch_sessions (student_id);
CREATE INDEX IF NOT EXISTS idx_vws_course_id ON public.video_watch_sessions (course_id);
CREATE INDEX IF NOT EXISTS idx_vws_module_id ON public.video_watch_sessions (module_id);
CREATE INDEX IF NOT EXISTS idx_vws_lesson_id ON public.video_watch_sessions (lesson_id);
CREATE INDEX IF NOT EXISTS idx_vws_created_at ON public.video_watch_sessions (created_at);
CREATE INDEX IF NOT EXISTS idx_vws_student_created ON public.video_watch_sessions (student_id, created_at);
CREATE INDEX IF NOT EXISTS idx_vws_course_created ON public.video_watch_sessions (course_id, created_at);
CREATE INDEX IF NOT EXISTS idx_vws_module_created ON public.video_watch_sessions (module_id, created_at);

-- video_watch_segments indexes
CREATE INDEX IF NOT EXISTS idx_seg_session_id ON public.video_watch_segments (session_id);
CREATE INDEX IF NOT EXISTS idx_seg_student_lesson ON public.video_watch_segments (student_id, lesson_id);

-- student_video_progress indexes
CREATE INDEX IF NOT EXISTS idx_svp_student_id ON public.student_video_progress (student_id);
CREATE INDEX IF NOT EXISTS idx_svp_course_id ON public.student_video_progress (course_id);
CREATE INDEX IF NOT EXISTS idx_svp_last_watched ON public.student_video_progress (last_watched_at);

-- video_watch_events indexes
CREATE INDEX IF NOT EXISTS idx_vwe_session_id ON public.video_watch_events (session_id);
CREATE INDEX IF NOT EXISTS idx_vwe_student_created ON public.video_watch_events (student_id, created_at);

-- ─────────────────────────────────────────────────────────────────────
-- 6. Trigger for Updated At
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_vws_updated_at ON public.video_watch_sessions;
CREATE TRIGGER trg_vws_updated_at
BEFORE UPDATE ON public.video_watch_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────
-- 7. Row Level Security (RLS) Policies
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.video_watch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_watch_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_watch_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated students to view their own analytics
DROP POLICY IF EXISTS "Students can view their own sessions" ON public.video_watch_sessions;
CREATE POLICY "Students can view their own sessions" ON public.video_watch_sessions
    FOR SELECT TO authenticated USING (
        student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Students can view their own segments" ON public.video_watch_segments;
CREATE POLICY "Students can view their own segments" ON public.video_watch_segments
    FOR SELECT TO authenticated USING (
        student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Students can view their own video progress" ON public.student_video_progress;
CREATE POLICY "Students can view their own video progress" ON public.student_video_progress
    FOR SELECT TO authenticated USING (
        student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Students can view their own events" ON public.video_watch_events;
CREATE POLICY "Students can view their own events" ON public.video_watch_events
    FOR SELECT TO authenticated USING (
        student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    );

-- Note: Backend services use service_role key to bypass RLS when performing upserts/syncs.

-- ─────────────────────────────────────────────────────────────────────
-- 8. Views for Dashboard Aggregations
-- ─────────────────────────────────────────────────────────────────────
-- Daily Aggregation View
CREATE OR REPLACE VIEW public.v_daily_watch_analytics AS
SELECT
    date_trunc('day', created_at) AS report_date,
    student_id,
    course_id,
    module_id,
    sum(unique_watched_seconds) / 3600.0 AS hours_watched,
    count(NULLIF(completed, false)) AS lectures_completed,
    sum(total_video_seconds_watched) AS total_seconds_watched
FROM public.video_watch_sessions
GROUP BY date_trunc('day', created_at), student_id, course_id, module_id;

-- Weekly Aggregation View
CREATE OR REPLACE VIEW public.v_weekly_watch_analytics AS
SELECT
    date_trunc('week', created_at) AS report_week,
    student_id,
    course_id,
    sum(unique_watched_seconds) / 3600.0 AS hours_watched,
    count(NULLIF(completed, false)) AS lectures_completed
FROM public.video_watch_sessions
GROUP BY date_trunc('week', created_at), student_id, course_id;

-- Course Summary View (For Pie Charts)
CREATE OR REPLACE VIEW public.v_course_watch_summary AS
SELECT
    p.student_id,
    p.course_id,
    count(p.lesson_id) AS total_lessons,
    count(NULLIF(p.completed, false)) AS completed_lessons,
    CASE
        WHEN count(NULLIF(p.completed, false)) = count(p.lesson_id) AND count(p.lesson_id) > 0 THEN 'completed'
        WHEN sum(p.unique_watched_seconds) > 0 THEN 'started'
        ELSE 'not_started'
    END AS course_status
FROM public.student_video_progress p
GROUP BY p.student_id, p.course_id;
