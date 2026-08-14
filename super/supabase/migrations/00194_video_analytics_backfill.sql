-- =====================================================================
-- Migration: 00194_video_analytics_backfill.sql
-- Description: One-shot backfill from the legacy tables
--              (student_video_sessions, student_progress) into the
--              rich analytics tables (video_watch_sessions,
--              student_video_progress).
--              Idempotent: ON CONFLICT DO NOTHING.
--              Does NOT delete or modify the legacy tables.
-- =====================================================================

-- Legacy schema relationships used by this migration:
--   student_progress.item_id         → master_course_items.id
--   student_video_sessions.item_id   → master_course_items.id
--   student_video_sessions.video_asset_id → video_assets.id
--   master_course_items.video_asset_id   → video_assets.id
--   master_course_items.master_course_id → master_courses.id
--   master_course_items.module_id        → master_course_modules.id
--   video_assets.tp_asset_id             → TPStreams asset id
--
-- The bridge is master_course_items — there is no `master_course_item_id`
-- column on video_assets. The CTE below materializes the lesson → asset /
-- course / module mapping once and is reused by both INSERTs.

-- ─────────────────────────────────────────────────────────────────────
-- 0. Lesson mapping CTE: one row per master_course_items with
--    TPStreams asset id, course id, and module id pre-resolved.
-- ─────────────────────────────────────────────────────────────────────
WITH lesson_map AS (
    SELECT
        mci.id              AS lesson_id,
        mci.master_course_id AS course_id,
        mci.module_id        AS module_id,
        va.tp_asset_id       AS tpstreams_asset_id
      FROM public.master_course_items mci
      LEFT JOIN public.video_assets va
             ON va.id = mci.video_asset_id
)

-- ─────────────────────────────────────────────────────────────────────
-- 1. Backfill student_video_progress from student_progress
--    One row per (student_id, lesson_id) in the legacy progress table.
--    We copy total_seconds, watched_seconds, last_position_seconds,
--    completed, and stamp first_started_at from the earliest legacy
--    session for that (student, lesson).
-- ─────────────────────────────────────────────────────────────────────
,progress_insert AS (
INSERT INTO public.student_video_progress (
    student_id,
    pillar_id,
    course_id,
    module_id,
    lesson_id,
    tpstreams_asset_id,
    video_duration_seconds,
    total_video_seconds_watched,
    unique_watched_seconds,
    repeat_watched_seconds,
    wall_clock_seconds,
    completion_percentage,
    completed,
    first_started_at,
    last_watched_at,
    last_position_seconds,
    max_position_seconds,
    play_count
)
SELECT
    sp.student_id,
    NULL::uuid                                AS pillar_id,
    lm.course_id                              AS course_id,
    lm.module_id                              AS module_id,
    sp.item_id                                AS lesson_id,
    COALESCE(lm.tpstreams_asset_id, '')       AS tpstreams_asset_id,
    COALESCE(sp.total_seconds, 0)::numeric    AS video_duration_seconds,
    COALESCE(sp.watched_seconds, 0)::numeric  AS total_video_seconds_watched,
    COALESCE(sp.watched_seconds, 0)::numeric  AS unique_watched_seconds,
    0::numeric                                AS repeat_watched_seconds,
    0::numeric                                AS wall_clock_seconds,
    CASE
        WHEN COALESCE(sp.total_seconds, 0) > 0
        THEN LEAST(100, ROUND((sp.watched_seconds / sp.total_seconds) * 100)::numeric)
        ELSE 0
    END                                       AS completion_percentage,
    COALESCE(sp.completed, false)             AS completed,
    COALESCE(
        (SELECT MIN(svs.started_at)
           FROM public.student_video_sessions svs
          WHERE svs.student_id = sp.student_id
            AND svs.item_id    = sp.item_id),
        sp.created_at,
        now()
    )                                         AS first_started_at,
    COALESCE(sp.updated_at, sp.created_at, now()) AS last_watched_at,
    COALESCE(sp.last_position_seconds, 0)::numeric AS last_position_seconds,
    COALESCE(sp.last_position_seconds, 0)::numeric AS max_position_seconds,
    0                                         AS play_count
FROM public.student_progress sp
JOIN lesson_map lm
       ON lm.lesson_id = sp.item_id
ON CONFLICT (student_id, lesson_id) DO NOTHING
RETURNING 1
)

-- ─────────────────────────────────────────────────────────────────────
-- 2. Backfill video_watch_sessions from student_video_sessions
--    For each legacy session row we synthesize a corresponding
--    rich-table session row. We do NOT recreate segments (the legacy
--    table stores no segment data). All aggregate counters are copied
--    from the legacy row.
-- ─────────────────────────────────────────────────────────────────────
,session_insert AS (
INSERT INTO public.video_watch_sessions (
    student_id,
    pillar_id,
    course_id,
    module_id,
    lesson_id,
    tpstreams_asset_id,
    started_at,
    ended_at,
    last_position_seconds,
    max_position_seconds,
    total_video_seconds_watched,
    unique_watched_seconds,
    repeat_watched_seconds,
    wall_clock_seconds,
    completion_percentage,
    completed,
    play_count,
    pause_count,
    seek_count,
    rate_change_count
)
SELECT
    svs.student_id,
    NULL::uuid                                AS pillar_id,
    COALESCE(lm.course_id, NULL::uuid)        AS course_id,
    COALESCE(lm.module_id, NULL::uuid)        AS module_id,
    svs.item_id                               AS lesson_id,
    COALESCE(va.tp_asset_id, lm.tpstreams_asset_id, '') AS tpstreams_asset_id,
    svs.started_at                            AS started_at,
    COALESCE(svs.ended_at, now())             AS ended_at,
    COALESCE(svs.watched_duration_seconds, 0)::numeric AS last_position_seconds,
    COALESCE(svs.watched_duration_seconds, 0)::numeric AS max_position_seconds,
    COALESCE(svs.watched_duration_seconds, 0)::numeric AS total_video_seconds_watched,
    COALESCE(svs.watched_duration_seconds, 0)::numeric AS unique_watched_seconds,
    0::numeric                                AS repeat_watched_seconds,
    0::numeric                                AS wall_clock_seconds,
    CASE
        WHEN COALESCE(sp.total_seconds, 0) > 0
        THEN LEAST(100, ROUND((sp.watched_seconds / sp.total_seconds) * 100)::numeric)
        ELSE 0
    END                                       AS completion_percentage,
    COALESCE(sp.completed, false)             AS completed,
    1                                         AS play_count,
    0                                         AS pause_count,
    0                                         AS seek_count,
    0                                         AS rate_change_count
FROM public.student_video_sessions svs
LEFT JOIN public.student_progress sp
       ON sp.student_id = svs.student_id
      AND sp.item_id    = svs.item_id
LEFT JOIN public.video_assets va
       ON va.id = svs.video_asset_id
JOIN lesson_map lm
       ON lm.lesson_id = svs.item_id
WHERE NOT EXISTS (
    SELECT 1
      FROM public.video_watch_sessions vws
     WHERE vws.student_id = svs.student_id
       AND vws.lesson_id  = svs.item_id
       AND vws.started_at = svs.started_at
)
RETURNING 1
)

-- ─────────────────────────────────────────────────────────────────────
-- 3. Refresh student_video_progress aggregates from the
--    newly-inserted video_watch_sessions for backfilled lessons
--    (in case the legacy row was created without a progress row).
-- ─────────────────────────────────────────────────────────────────────
SELECT 1 FROM progress_insert
UNION ALL
SELECT 1 FROM session_insert;

-- The aggregates UPDATE is intentionally a separate statement because
-- CTEs in PostgreSQL cannot contain both INSERT ... RETURNING and a
-- subsequent UPDATE that depends on the inserted rows. We re-aggregate
-- only where the new total is greater than the existing one, so this
-- is safe to re-run.

UPDATE public.student_video_progress svp
SET
    total_video_seconds_watched = COALESCE(agg.total_watched, 0),
    unique_watched_seconds      = COALESCE(agg.unique_watched, 0),
    repeat_watched_seconds      = GREATEST(0, COALESCE(agg.total_watched, 0) - COALESCE(agg.unique_watched, 0)),
    completion_percentage       = CASE
        WHEN COALESCE(svp.video_duration_seconds, 0) > 0
        THEN LEAST(100, ROUND((COALESCE(agg.unique_watched, 0) / svp.video_duration_seconds) * 100)::numeric)
        ELSE 0
    END,
    last_watched_at             = GREATEST(svp.last_watched_at, COALESCE(agg.last_seen, svp.last_watched_at))
FROM (
    SELECT
        vws.student_id,
        vws.lesson_id,
        SUM(vws.total_video_seconds_watched) AS total_watched,
        SUM(vws.unique_watched_seconds)      AS unique_watched,
        MAX(vws.created_at)                  AS last_seen
      FROM public.video_watch_sessions vws
     GROUP BY vws.student_id, vws.lesson_id
) agg
WHERE svp.student_id = agg.student_id
  AND svp.lesson_id  = agg.lesson_id
  AND COALESCE(agg.total_watched, 0) > COALESCE(svp.total_video_seconds_watched, 0);
