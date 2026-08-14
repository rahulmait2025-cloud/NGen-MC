-- 00079_analytics_performance_indexes.sql
-- Missing indexes to optimize advanced analytics views

-- 1. Assessment Assignments tenant_id (used in v_college_weekly_performance)
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_tenant ON public.assessment_assignments(tenant_id);

-- 2. Student Video Sessions started_at (used in v_student_learning_hours and v_college_weekly_engagement)
-- Including student_id for better composite lookup
CREATE INDEX IF NOT EXISTS idx_video_sessions_student_started ON public.student_video_sessions(student_id, started_at DESC);

-- 3. Student Entitlements status filter (used in v_student_course_progress)
-- Already has idx_student_entitlements_status on (student_id, status) in 00072. Perfect.

-- 4. Assessment Results created_at (used in v_college_weekly_performance)
CREATE INDEX IF NOT EXISTS idx_assessment_results_created_at ON public.assessment_results(created_at DESC);

-- 5. Master Course Items master_course_id (used in v_student_course_progress)
CREATE INDEX IF NOT EXISTS idx_master_course_items_course_id ON public.master_course_items(master_course_id);
