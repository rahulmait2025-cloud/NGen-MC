-- 00080_at_risk_analytics.sql
-- At-risk student detection logic and views

-- Student Risk Profile View
-- Analyzes engagement, performance, and progress to determine risk status.
CREATE OR REPLACE VIEW public.v_student_risk_profile AS
WITH student_latest_activity AS (
    SELECT 
        student_id,
        MAX(started_at) as last_active_at
    FROM public.student_video_sessions
    GROUP BY student_id
),
student_avg_scores AS (
    SELECT 
        att.student_id,
        AVG(ar.score) as avg_score
    FROM public.assessment_results ar
    JOIN public.assessment_attempts att ON ar.attempt_id = att.id
    GROUP BY att.student_id
),
student_enrollment_age AS (
    SELECT 
        student_id,
        MIN(created_at) as first_enrollment_at
    FROM public.student_entitlements
    WHERE status = 'active'
    GROUP BY student_id
),
student_progress_summary AS (
    -- Using the existing course progress view to aggregate
    SELECT 
        student_id,
        SUM(total_items) as total_items,
        SUM(completed_items) as completed_items
    FROM public.v_student_course_progress
    GROUP BY student_id
)
SELECT 
    s.id as student_id,
    s.college_id,
    p.full_name as student_name,
    p.email as student_email,
    sla.last_active_at,
    sas.avg_score,
    sea.first_enrollment_at,
    sps.completed_items,
    sps.total_items,
    COALESCE(
        CASE 
            -- Signal 1: Inactive for 14+ days after being enrolled for at least 14 days
            WHEN (sla.last_active_at IS NULL OR sla.last_active_at < NOW() - INTERVAL '14 days') 
                 AND sea.first_enrollment_at < NOW() - INTERVAL '14 days' THEN 'Inactive (14d+)'
            
            -- Signal 2: Low average assessment performance (< 40%)
            WHEN sas.avg_score < 40 THEN 'Low Performance'
            
            -- Signal 3: No progress after 14 days of enrollment
            WHEN COALESCE(sps.completed_items, 0) = 0 AND sea.first_enrollment_at < NOW() - INTERVAL '14 days' THEN 'No Progress'
            
            ELSE 'On Track'
        END,
        'On Track'
    ) as risk_status,
    CASE 
        WHEN ((sla.last_active_at IS NULL OR sla.last_active_at < NOW() - INTERVAL '14 days') AND sea.first_enrollment_at < NOW() - INTERVAL '14 days')
             OR (sas.avg_score < 40)
             OR (COALESCE(sps.completed_items, 0) = 0 AND sea.first_enrollment_at < NOW() - INTERVAL '14 days')
        THEN true
        ELSE false
    END as is_at_risk
FROM public.students s
JOIN public.profiles p ON s.user_id = p.id
LEFT JOIN student_latest_activity sla ON s.id = sla.student_id
LEFT JOIN student_avg_scores sas ON s.id = sas.student_id
LEFT JOIN student_enrollment_age sea ON s.id = sea.student_id
LEFT JOIN student_progress_summary sps ON s.id = sps.student_id;

-- Grant access
GRANT SELECT ON public.v_student_risk_profile TO authenticated;
