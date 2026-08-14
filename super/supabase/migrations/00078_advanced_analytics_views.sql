-- 00078_advanced_analytics_views.sql
-- Advanced analytics views for CollegeAdmin and Student dashboards

-- 1. College Weekly Performance View (Average Score & Submissions)
CREATE OR REPLACE VIEW public.v_college_weekly_performance AS
SELECT 
    aa.tenant_id AS college_id,
    DATE_TRUNC('week', ar.created_at) AS week_start,
    AVG(ar.score) AS avg_score,
    COUNT(ar.id) AS submissions_count
FROM public.assessment_results ar
JOIN public.assessment_attempts att ON ar.attempt_id = att.id
JOIN public.assessment_assignments aa ON att.assignment_id = aa.id
GROUP BY 1, 2;

-- 2. College Score Distribution View
CREATE OR REPLACE VIEW public.v_college_score_distribution AS
SELECT 
    aa.tenant_id AS college_id,
    CASE 
        WHEN ar.score < 20 THEN '0-20'
        WHEN ar.score < 40 THEN '20-40'
        WHEN ar.score < 60 THEN '40-60'
        WHEN ar.score < 80 THEN '60-80'
        ELSE '80-100'
    END AS score_range,
    COUNT(DISTINCT att.student_id) AS student_count
FROM public.assessment_results ar
JOIN public.assessment_attempts att ON ar.attempt_id = att.id
JOIN public.assessment_assignments aa ON att.assignment_id = aa.id
GROUP BY 1, 2;

-- 3. College Weekly Engagement View (DAU)
CREATE OR REPLACE VIEW public.v_college_weekly_engagement AS
SELECT 
    s.college_id,
    DATE_TRUNC('week', svs.started_at) AS week_start,
    DATE_TRUNC('day', svs.started_at) AS report_day,
    COUNT(DISTINCT svs.student_id) AS active_students
FROM public.student_video_sessions svs
JOIN public.students s ON svs.student_id = s.id
GROUP BY 1, 2, 3;

-- 4. Student Daily Learning Hours View
CREATE OR REPLACE VIEW public.v_student_learning_hours AS
SELECT 
    student_id,
    DATE_TRUNC('day', started_at) AS report_date,
    SUM(watched_duration_seconds) / 3600.0 AS hours_logged
FROM public.student_video_sessions
GROUP BY 1, 2;

-- 5. Student Course Progress View (Detailed)
CREATE OR REPLACE VIEW public.v_student_course_progress AS
SELECT 
    se.student_id,
    se.master_course_id,
    mc.title AS course_title,
    COUNT(mci.id) AS total_items,
    SUM(CASE WHEN sp.completed THEN 1 ELSE 0 END) AS completed_items,
    SUM(sp.watched_seconds) / 3600.0 AS hours_invested
FROM public.student_entitlements se
JOIN public.master_courses mc ON se.master_course_id = mc.id
JOIN public.master_course_items mci ON mc.id = mci.master_course_id
LEFT JOIN public.student_progress sp ON se.student_id = sp.student_id AND mci.id = sp.item_id
WHERE se.status = 'active'
GROUP BY 1, 2, 3;

-- Grants
GRANT SELECT ON public.v_college_weekly_performance TO authenticated;
GRANT SELECT ON public.v_college_score_distribution TO authenticated;
GRANT SELECT ON public.v_college_weekly_engagement TO authenticated;
GRANT SELECT ON public.v_student_learning_hours TO authenticated;
GRANT SELECT ON public.v_student_course_progress TO authenticated;
