-- =====================================================================
-- Migration: 00235_fix_video_progress_total_watched.sql
-- Description: Updates student_video_progress.total_video_seconds_watched
--              for all students and lessons by summing the session totals
--              from video_watch_sessions. Also aligns repeat_watched_seconds.
-- =====================================================================

UPDATE public.student_video_progress svp
SET
    total_video_seconds_watched = GREATEST(COALESCE(agg.total_watched, 0), svp.unique_watched_seconds),
    repeat_watched_seconds      = GREATEST(0, GREATEST(COALESCE(agg.total_watched, 0), svp.unique_watched_seconds) - svp.unique_watched_seconds)
FROM (
    SELECT
        vws.student_id,
        vws.lesson_id,
        SUM(vws.total_video_seconds_watched) AS total_watched
      FROM public.video_watch_sessions vws
     GROUP BY vws.student_id, vws.lesson_id
) agg
WHERE svp.student_id = agg.student_id
  AND svp.lesson_id  = agg.lesson_id;
