-- Migration 00327: Unschedules stale materialized view KPI refresh cron jobs
-- Removes refresh_mv_college_kpis, refresh_mv_student_kpis, refresh_mv_platform_kpis from pg_cron

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('refresh_mv_college_kpis') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh_mv_college_kpis');
    PERFORM cron.unschedule('refresh_mv_student_kpis') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh_mv_student_kpis');
    PERFORM cron.unschedule('refresh_mv_platform_kpis') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh_mv_platform_kpis');
  END IF;
END $$;
