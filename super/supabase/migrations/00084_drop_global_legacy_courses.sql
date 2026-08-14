-- Phase C: Drop Global_* Legacy Course System
-- 
-- Purpose:
--   Permanently drop the entire global_* legacy course system.
--   This global_* system was the original platform course catalog - now superseded by
--   the canonical TPStreams-first architecture (master_courses, video_assets, etc.).
--
-- Important:
--   - global_* rows were confirmed as test/legacy dummy data only
--   - No runtime code references global_* (only 1 comment in sidebar-metrics.ts)
--   - Data is intentionally NOT archived or migrated (confirmed test rows)
--   - This is safe because no production data was ever written to global_*
--
-- What is NOT affected:
--   - TPStreams upload flow (master_courses, video_assets, master_course_modules, master_course_items)
--   - Canonical course system (course_variants, course_bundles, content_assignments, student_entitlements)
--   - No runtime code references global_* anywhere in the codebase
--
-- References:
--   - Phase B audit: tiered_* dropped in migration 00083
--   - Phase A audit: z_backup_* dropped in migration 00082

-- ===============================================================================
-- STEP 1: Drop student auto-enrollment trigger
-- ===============================================================================

DROP TRIGGER IF EXISTS students_global_course_auto_enrollment ON public.students;

-- ===============================================================================
-- STEP 2: Drop global legacy functions (in reverse order of dependencies)
-- ===============================================================================

DROP FUNCTION IF EXISTS public.unassign_course_from_college(uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.assign_course_to_college(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.list_published_assignable_courses(uuid);
DROP FUNCTION IF EXISTS public.handle_student_global_course_auto_enrollment();
DROP FUNCTION IF EXISTS public.auto_enroll_new_student_into_assigned_courses(uuid);
DROP FUNCTION IF EXISTS public.enroll_existing_students_of_college_into_assigned_course(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_current_user_view_global_course(uuid);
DROP FUNCTION IF EXISTS public.list_college_assigned_global_courses(uuid);

-- ===============================================================================
-- STEP 3: Drop global legacy views (if they exist)
-- ===============================================================================

DROP VIEW IF EXISTS public.v_global_course_assignment_summary;
DROP VIEW IF EXISTS public.v_global_course_structure_counts;

-- ===============================================================================
-- STEP 4: Drop global_* tables in safe dependency order
-- ===============================================================================

-- Junction/child tables first (no children depend on them)

DROP TABLE IF EXISTS public.global_course_enrollments;
DROP TABLE IF EXISTS public.global_course_order_intents;

-- Assignment tables

DROP TABLE IF EXISTS public.global_course_college_assignments;

-- Lesson resources and assignment blocks

DROP TABLE IF EXISTS public.global_course_lesson_resources;
DROP TABLE IF EXISTS public.global_course_assignment_blocks;

-- Lessons and modules

DROP TABLE IF EXISTS public.global_course_lessons;
DROP TABLE IF EXISTS public.global_course_modules;

-- Main course table last

DROP TABLE IF EXISTS public.global_courses;

-- Log completion
do $$
begin
  raise notice 'Phase C complete: global_* legacy course system dropped';
  raise notice '  - Student auto-enrollment trigger removed';
  raise notice '  - 8 SQL functions dropped';
  raise notice '  - 8 global_* tables dropped';
  raise notice '  - Data intentionally not archived (confirmed test/legacy data)';
  raise notice '  - TPStreams canonical architecture untouched';
end $$;