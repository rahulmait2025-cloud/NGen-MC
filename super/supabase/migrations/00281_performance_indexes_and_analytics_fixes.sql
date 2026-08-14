-- Migration: 00281_performance_indexes_and_analytics_fixes.sql
-- Description: Deploy remaining performance indexes for high-frequency query paths

BEGIN;

-- 1. student_video_progress: lesson_id lookups (progress reads per lesson)
CREATE INDEX IF NOT EXISTS idx_svp_lesson_student
  ON public.student_video_progress (lesson_id, student_id);

-- 2. student_video_progress: last_watched_at for analytics time-range queries
CREATE INDEX IF NOT EXISTS idx_svp_last_watched_at
  ON public.student_video_progress (last_watched_at DESC);

-- 3. student_video_progress: course_id + last_watched_at for admin analytics scans
CREATE INDEX IF NOT EXISTS idx_svp_course_last_watched
  ON public.student_video_progress (course_id, last_watched_at DESC);

-- 4. orders: entity lookups (course/bundle access checks)
CREATE INDEX IF NOT EXISTS idx_orders_entity
  ON public.orders (entity_type, entity_id);

-- 5. orders: status + created_at for admin order list queries
CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON public.orders (status, created_at DESC);

-- 6. student_daily_visits: student_id + visit_date for streak/visit queries
CREATE INDEX IF NOT EXISTS idx_sdv_student_date
  ON public.student_daily_visits (student_id, visit_date DESC);

-- 7. student_progress: student_id + completed for batch completion queries
CREATE INDEX IF NOT EXISTS idx_sp_student_completed
  ON public.student_progress (student_id, completed);

-- 8. student_entitlements: student_id + status for active-entitlement lookups
CREATE INDEX IF NOT EXISTS idx_se_student_status
  ON public.student_entitlements (student_id, status);

-- 9. student_content_entitlements: student_id for content-level access checks
CREATE INDEX IF NOT EXISTS idx_sce_student
  ON public.student_content_entitlements (student_id);

-- 10. dsa_progress: student_id for DSA progress lookups
CREATE INDEX IF NOT EXISTS idx_dsa_progress_student
  ON public.dsa_progress (student_id);

-- 11. dsa_enrollments: student_id for DSA enrollment lookups
CREATE INDEX IF NOT EXISTS idx_dsa_enrollments_student
  ON public.dsa_enrollments (student_id);

-- 12. college_memberships: user_id + college_id for auth guard queries
CREATE INDEX IF NOT EXISTS idx_cm_user_college
  ON public.college_memberships (user_id, college_id);

-- 13. email_campaigns: status + schedule_status for admin filtering
CREATE INDEX IF NOT EXISTS idx_ec_status_schedule
  ON public.email_campaigns (status, schedule_status);

-- 14. video_watch_sessions: student_id + course_id for analytics joins
CREATE INDEX IF NOT EXISTS idx_vws_student_course
  ON public.video_watch_sessions (student_id, course_id);

-- 15. video_watch_segments: student_id for timeline queries
CREATE INDEX IF NOT EXISTS idx_vws_segments_student
  ON public.video_watch_segments (student_id);

-- 16. students: user_id + college_id for multi-tenant lookups
CREATE INDEX IF NOT EXISTS idx_students_user_college
  ON public.students (user_id, college_id);

COMMIT;
