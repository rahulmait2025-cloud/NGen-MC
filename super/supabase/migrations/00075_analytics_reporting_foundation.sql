-- 00075_analytics_reporting_foundation.sql
-- Phase 7A: Analytics Data Layer / Reporting Services / KPI Foundation

-- 1. SuperAdmin Revenue Analytics View
CREATE OR REPLACE VIEW public.analytics_revenue_summary AS
SELECT 
    DATE_TRUNC('day', o.created_at) AS report_date,
    o.source,
    o.entity_type,
    o.status,
    COUNT(o.id) AS total_orders,
    SUM(o.base_amount_minor) AS total_base_revenue_minor,
    SUM(o.discount_amount_minor) AS total_discount_minor,
    SUM(o.total_amount_minor) AS total_net_revenue_minor
FROM public.orders o
GROUP BY 1, 2, 3, 4;

-- 2. SuperAdmin Enrollment Analytics View
CREATE OR REPLACE VIEW public.analytics_enrollment_summary AS
SELECT 
    DATE_TRUNC('day', se.created_at) AS report_date,
    se.source_type,
    se.status,
    se.master_course_id,
    se.college_id,
    COUNT(se.id) AS total_entitlements
FROM public.student_entitlements se
GROUP BY 1, 2, 3, 4, 5;

-- 3. Content Performance Analytics View
CREATE OR REPLACE VIEW public.analytics_content_performance AS
SELECT 
    sp.item_id,
    mci.title AS item_title,
    COUNT(DISTINCT sp.student_id) AS total_students_started,
    SUM(CASE WHEN sp.completed THEN 1 ELSE 0 END) AS total_students_completed,
    SUM(sp.watched_seconds) AS total_watched_seconds
FROM public.student_progress sp
LEFT JOIN public.master_course_items mci ON sp.item_id = mci.id
GROUP BY 1, 2;

-- 4. College Performance Analytics View
CREATE OR REPLACE VIEW public.analytics_college_performance AS
SELECT 
    se.college_id,
    c.name AS college_name,
    COUNT(DISTINCT se.student_id) AS active_students,
    COUNT(se.id) AS total_entitlements,
    COUNT(DISTINCT se.master_course_id) AS unique_courses_assigned
FROM public.student_entitlements se
LEFT JOIN public.colleges c ON se.college_id = c.id
WHERE se.status = 'active' AND se.college_id IS NOT NULL
GROUP BY 1, 2;

-- Grants for views
GRANT SELECT ON public.analytics_revenue_summary TO authenticated;
GRANT SELECT ON public.analytics_enrollment_summary TO authenticated;
GRANT SELECT ON public.analytics_content_performance TO authenticated;
GRANT SELECT ON public.analytics_college_performance TO authenticated;
