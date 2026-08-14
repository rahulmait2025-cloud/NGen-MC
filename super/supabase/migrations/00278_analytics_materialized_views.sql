-- Migration: 00278_analytics_materialized_views.sql
-- Description: Materialized views for expensive analytics queries — replaces 8-pass JS scan in learning analytics

BEGIN;

-- Materialized view: Student engagement daily summary
CREATE MATERIALIZED VIEW IF NOT EXISTS v_student_engagement_daily AS
SELECT
  svp.student_id,
  svp.lesson_id,
  date_trunc('day', svp.last_watched_at) AS activity_date,
  svp.total_video_seconds_watched AS watch_seconds,
  svp.unique_watched_seconds AS unique_seconds,
  svp.completion_percentage AS progress_pct,
  svp.completed AS is_completed
FROM student_video_progress svp
WHERE svp.last_watched_at >= (now() - INTERVAL '90 days');

CREATE UNIQUE INDEX IF NOT EXISTS idx_v_student_engagement_daily_pk
  ON v_student_engagement_daily (student_id, lesson_id, activity_date);

-- Materialized view: Course funnel summary
CREATE MATERIALIZED VIEW IF NOT EXISTS v_course_funnel_summary AS
SELECT
  svp.student_id,
  s.college_id,
  svp.course_id,
  CASE
    WHEN svp.completed THEN 'completed'
    WHEN svp.completion_percentage > 0 THEN 'in_progress'
    ELSE 'not_started'
  END AS status,
  svp.completion_percentage AS progress_pct,
  svp.total_video_seconds_watched AS watch_seconds,
  svp.last_watched_at
FROM student_video_progress svp
JOIN public.students s ON s.id = svp.student_id;

CREATE INDEX IF NOT EXISTS idx_v_course_funnel_summary_college
  ON v_course_funnel_summary (college_id);

-- Materialized view: Weekly performance aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS v_weekly_performance AS
SELECT
  svp.student_id,
  svp.course_id,
  s.college_id,
  date_trunc('week', svp.last_watched_at) AS week_start,
  SUM(svp.total_video_seconds_watched) AS total_watch_seconds,
  AVG(svp.completion_percentage) AS avg_progress,
  COUNT(*) FILTER (WHERE svp.completed) AS completed_count,
  COUNT(*) AS total_lessons
FROM student_video_progress svp
JOIN public.students s ON s.id = svp.student_id
WHERE svp.last_watched_at >= (now() - INTERVAL '90 days')
GROUP BY svp.student_id, svp.course_id, s.college_id, date_trunc('week', svp.last_watched_at);

CREATE INDEX IF NOT EXISTS idx_v_weekly_performance_college
  ON v_weekly_performance (college_id, week_start);

-- Refresh function for all materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_student_engagement_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_course_funnel_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_weekly_performance;
END;
$$;

-- Schedule refresh every 15 minutes via pg_cron (if available)
-- SELECT cron.schedule('refresh-analytics-views', '*/15 * * * *', 'SELECT refresh_analytics_views()');

COMMIT;
