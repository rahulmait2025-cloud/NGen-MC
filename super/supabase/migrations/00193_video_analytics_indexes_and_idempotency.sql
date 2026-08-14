-- =====================================================================
-- Migration: 00193_video_analytics_indexes_and_idempotency.sql
-- Description: Performance indexes + partial unique index on
--              video_watch_sessions to enforce at most one open
--              session per (student_id, lesson_id).
--              Idempotent: uses IF NOT EXISTS / DROP IF EXISTS.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. Additional performance indexes for the analytics read path.
--    These accelerate per-day and per-week rollups queried by the
--    student/admin dashboards.
-- ─────────────────────────────────────────────────────────────────────

-- video_watch_sessions: composite index for daily rollups by student.
-- These were originally declared in 00161_video_analytics.sql on
-- `(student_id, created_at)` / `(course_id, created_at)`. We re-declare
-- them here under the same name with `IF NOT EXISTS` so that this
-- migration is safe to re-apply and self-documenting. The plain
-- `created_at` (timestamptz) index is what we want — `created_at::date`
-- is a STABLE cast (timezone-dependent) and PostgreSQL rejects STABLE
-- expressions in index predicates. Range scans on `created_at` still
-- serve per-day and per-week rollups efficiently.
CREATE INDEX IF NOT EXISTS idx_vws_student_created
    ON public.video_watch_sessions (student_id, created_at);

CREATE INDEX IF NOT EXISTS idx_vws_course_created
    ON public.video_watch_sessions (course_id, created_at);

-- video_watch_sessions: lesson-scoped lookups
CREATE INDEX IF NOT EXISTS idx_vws_lesson_student
    ON public.video_watch_sessions (lesson_id, student_id);

-- video_watch_sessions: pillar filter
CREATE INDEX IF NOT EXISTS idx_vws_pillar_id
    ON public.video_watch_sessions (pillar_id)
    WHERE pillar_id IS NOT NULL;

-- video_watch_segments: lesson + student lookups (heatmap / per-lesson history)
CREATE INDEX IF NOT EXISTS idx_seg_lesson_student_start
    ON public.video_watch_segments (lesson_id, student_id, start_second);

-- student_video_progress: course + module scoped reads
CREATE INDEX IF NOT EXISTS idx_svp_course_id
    ON public.student_video_progress (course_id);

CREATE INDEX IF NOT EXISTS idx_svp_module_id
    ON public.student_video_progress (module_id);

-- student_video_progress: course + completion filter for pie chart
CREATE INDEX IF NOT EXISTS idx_svp_course_completed
    ON public.student_video_progress (course_id, completed);

-- video_watch_events: event-type filters for "replay this lecture" flows
CREATE INDEX IF NOT EXISTS idx_vwe_event_type
    ON public.video_watch_events (event_type);

CREATE INDEX IF NOT EXISTS idx_vwe_lesson_created
    ON public.video_watch_events (lesson_id, created_at);

-- ─────────────────────────────────────────────────────────────────────
-- 2. Idempotency: at most one OPEN session per (student, lesson).
--    Ended sessions (ended_at IS NOT NULL) are allowed to coexist
--    with new open sessions — history is preserved.
-- ─────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS uq_vws_one_open_per_lesson
    ON public.video_watch_sessions (student_id, lesson_id)
    WHERE ended_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Helper RPC: get-or-create an open video_watch_sessions row.
--    Returns the existing open session for the (student, lesson) tuple
--    if one exists, otherwise inserts a new row and returns it.
--    This makes session start naturally idempotent across retries,
--    duplicate tabs, and component remounts.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_or_open_video_watch_session(
    p_student_id uuid,
    p_pillar_id uuid,
    p_course_id uuid,
    p_module_id uuid,
    p_lesson_id uuid,
    p_tpstreams_asset_id text,
    p_video_duration_seconds numeric
)
RETURNS TABLE (
    session_id uuid,
    already_open boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session_id uuid;
    v_already_open boolean := false;
BEGIN
    -- Look for an existing open session for this student+lesson.
    SELECT id
      INTO v_session_id
      FROM public.video_watch_sessions
     WHERE student_id = p_student_id
       AND lesson_id  = p_lesson_id
       AND ended_at IS NULL
     ORDER BY started_at DESC
     LIMIT 1
       FOR UPDATE SKIP LOCKED;

    IF v_session_id IS NOT NULL THEN
        v_already_open := true;
    ELSE
        -- No open session: create a new one. The partial unique index
        -- uq_vws_one_open_per_lesson guards against rare race conditions;
        -- if a concurrent insert wins, we fall back to re-selecting.
        BEGIN
            INSERT INTO public.video_watch_sessions (
                student_id,
                pillar_id,
                course_id,
                module_id,
                lesson_id,
                tpstreams_asset_id,
                started_at,
                last_position_seconds,
                max_position_seconds,
                total_video_seconds_watched,
                unique_watched_seconds,
                repeat_watched_seconds,
                wall_clock_seconds,
                completion_percentage,
                completed,
                play_count
            ) VALUES (
                p_student_id,
                p_pillar_id,
                p_course_id,
                p_module_id,
                p_lesson_id,
                p_tpstreams_asset_id,
                now(),
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                false,
                1
            )
            RETURNING id INTO v_session_id;
        EXCEPTION WHEN unique_violation THEN
            -- Another transaction inserted concurrently. Re-select.
            SELECT id
              INTO v_session_id
              FROM public.video_watch_sessions
             WHERE student_id = p_student_id
               AND lesson_id  = p_lesson_id
               AND ended_at IS NULL
             ORDER BY started_at DESC
             LIMIT 1;
            v_already_open := true;
        END;
    END IF;

    -- Ensure a student_video_progress row exists for the lesson.
    INSERT INTO public.student_video_progress (
        student_id,
        pillar_id,
        course_id,
        module_id,
        lesson_id,
        tpstreams_asset_id,
        video_duration_seconds
    ) VALUES (
        p_student_id,
        p_pillar_id,
        p_course_id,
        p_module_id,
        p_lesson_id,
        p_tpstreams_asset_id,
        COALESCE(p_video_duration_seconds, 0)
    )
    ON CONFLICT (student_id, lesson_id) DO NOTHING;

    RETURN QUERY SELECT v_session_id, v_already_open;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_open_video_watch_session(
    uuid, uuid, uuid, uuid, uuid, text, numeric
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_or_open_video_watch_session(
    uuid, uuid, uuid, uuid, uuid, text, numeric
) TO service_role;
