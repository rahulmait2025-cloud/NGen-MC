-- Migration 00195: Replace analytics views to use rich video analytics tables
-- Replaces reads from legacy `student_video_sessions` / `student_progress`
-- with the new `video_watch_sessions` / `student_video_progress` tables.
-- No new views created — existing views are replaced in-place.

-- ─────────────────────────────────────────────────────────────────────
-- 1. v_college_weekly_engagement
-- Source: video_watch_sessions (was student_video_sessions)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_college_weekly_engagement
WITH (security_invoker = true)
AS
SELECT
    s.college_id,
    DATE_TRUNC('week', vws.started_at) AS week_start,
    DATE_TRUNC('day', vws.started_at) AS report_day,
    COUNT(DISTINCT vws.student_id) AS active_students
FROM public.video_watch_sessions vws
JOIN public.students s ON vws.student_id = s.id
GROUP BY 1, 2, 3;

COMMENT ON VIEW public.v_college_weekly_engagement IS 'College weekly engagement using rich analytics (video_watch_sessions).';

-- ─────────────────────────────────────────────────────────────────────
-- 2. v_student_learning_hours
-- Source: video_watch_sessions (was student_video_sessions)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_student_learning_hours
WITH (security_invoker = true)
AS
SELECT
    student_id,
    DATE_TRUNC('day', started_at) AS report_date,
    (SUM(total_video_seconds_watched) / 3600.0)::double precision AS hours_logged
FROM public.video_watch_sessions
GROUP BY 1, 2;

COMMENT ON VIEW public.v_student_learning_hours IS 'Student daily learning hours using rich analytics (video_watch_sessions).';

-- ─────────────────────────────────────────────────────────────────────
-- 3. v_student_course_progress
-- Source: student_video_progress (was student_progress)
-- Hours: video_watch_sessions (was student_progress.watched_seconds)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_student_course_progress
WITH (security_invoker = true)
AS
SELECT
    se.student_id,
    se.master_course_id,
    mc.title AS course_title,
    COUNT(mci.id) AS total_items,
    SUM(CASE WHEN svp.completed THEN 1 ELSE 0 END) AS completed_items,
    (COALESCE(SUM(svp.unique_watched_seconds), 0) / 3600.0)::double precision AS hours_invested
FROM public.student_entitlements se
JOIN public.master_courses mc ON se.master_course_id = mc.id
JOIN public.master_course_items mci ON mc.id = mci.master_course_id
LEFT JOIN public.student_video_progress svp
    ON se.student_id = svp.student_id AND mci.id = svp.lesson_id
WHERE se.status = 'active'
GROUP BY 1, 2, 3;

COMMENT ON VIEW public.v_student_course_progress IS 'Student course progress using rich analytics (student_video_progress).';

-- ─────────────────────────────────────────────────────────────────────
-- 4. v_student_risk_profile
-- Source: video_watch_sessions + v_student_course_progress (updated)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_student_risk_profile
WITH (security_invoker = true)
AS
WITH student_latest_activity AS (
    SELECT
        student_id,
        MAX(started_at) AS last_active_at
    FROM public.video_watch_sessions
    GROUP BY student_id
),
student_avg_scores AS (
    SELECT
        att.student_id,
        AVG(ar.score) AS avg_score
    FROM public.assessment_results ar
    JOIN public.assessment_attempts att ON ar.attempt_id = att.id
    GROUP BY att.student_id
),
student_enrollment_age AS (
    SELECT
        student_id,
        MIN(created_at) AS first_enrollment_at
    FROM public.student_entitlements
    WHERE status = 'active'
    GROUP BY student_id
),
student_progress_summary AS (
    SELECT
        student_id,
        SUM(total_items) AS total_items,
        SUM(completed_items) AS completed_items
    FROM public.v_student_course_progress
    GROUP BY student_id
)
SELECT
    s.id AS student_id,
    s.college_id,
    p.full_name AS student_name,
    p.email AS student_email,
    sla.last_active_at,
    sas.avg_score,
    sea.first_enrollment_at,
    sps.completed_items,
    sps.total_items,
    COALESCE(
        CASE
            WHEN (sla.last_active_at IS NULL OR sla.last_active_at < NOW() - INTERVAL '14 days')
                 AND sea.first_enrollment_at < NOW() - INTERVAL '14 days' THEN 'Inactive (14d+)'
            WHEN sas.avg_score < 40 THEN 'Low Performance'
            WHEN COALESCE(sps.completed_items, 0) = 0 AND sea.first_enrollment_at < NOW() - INTERVAL '14 days' THEN 'No Progress'
            ELSE 'On Track'
        END,
        'On Track'
    ) AS risk_status,
    CASE
        WHEN ((sla.last_active_at IS NULL OR sla.last_active_at < NOW() - INTERVAL '14 days') AND sea.first_enrollment_at < NOW() - INTERVAL '14 days')
             OR (sas.avg_score < 40)
             OR (COALESCE(sps.completed_items, 0) = 0 AND sea.first_enrollment_at < NOW() - INTERVAL '14 days')
        THEN TRUE
        ELSE FALSE
    END AS is_at_risk
FROM public.students s
JOIN public.profiles p ON s.user_id = p.id
LEFT JOIN student_latest_activity sla ON s.id = sla.student_id
LEFT JOIN student_avg_scores sas ON s.id = sas.student_id
LEFT JOIN student_enrollment_age sea ON s.id = sea.student_id
LEFT JOIN student_progress_summary sps ON s.id = sps.student_id;

COMMENT ON VIEW public.v_student_risk_profile IS 'Student risk profile using rich analytics (video_watch_sessions + v_student_course_progress).';
