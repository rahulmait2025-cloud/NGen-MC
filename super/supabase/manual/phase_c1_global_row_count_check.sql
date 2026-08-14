-- Phase C1: Row Count Verification for Global_* Legacy Tables
-- This is a VERIFICATION script only - NOT a destructive migration
-- Run this in Supabase SQL Editor to check data before any cleanup

SELECT 'global_courses' AS table_name, count(*) AS row_count FROM public.global_courses
UNION ALL SELECT 'global_course_modules', count(*) FROM public.global_course_modules
UNION ALL SELECT 'global_course_lessons', count(*) FROM public.global_course_lessons
UNION ALL SELECT 'global_course_lesson_resources', count(*) FROM public.global_course_lesson_resources
UNION ALL SELECT 'global_course_assignment_blocks', count(*) FROM public.global_course_assignment_blocks
UNION ALL SELECT 'global_course_college_assignments', count(*) FROM public.global_course_college_assignments
UNION ALL SELECT 'global_course_enrollments', count(*) FROM public.global_course_enrollments
UNION ALL SELECT 'global_course_order_intents', count(*) FROM public.global_course_order_intents
ORDER BY table_name;

-- Additional verification queries for data analysis:

-- Check publish_status distribution in global_courses
SELECT publish_status, count(*) as count FROM public.global_courses GROUP BY publish_status;

-- Check active enrollments in global_course_enrollments
SELECT status, count(*) as count FROM public.global_course_enrollments GROUP BY status;

-- Check active assignments in global_course_college_assignments
SELECT status, count(*) as count FROM public.global_course_college_assignments GROUP BY status;

-- Check order intent status distribution
SELECT status, count(*) as count FROM public.global_course_order_intents GROUP BY status;

-- Cross-check: Compare global_courses count to master_courses count
SELECT 
  (SELECT count(*) FROM public.global_courses) as global_courses_count,
  (SELECT count(*) FROM public.master_courses) as master_courses_count;

-- Cross-check: Compare global_course_enrollments to student_entitlements
SELECT 
  (SELECT count(*) FROM public.global_course_enrollments) as global_enrollments_count,
  (SELECT count(*) FROM public.student_entitlements) as student_entitlements_count;