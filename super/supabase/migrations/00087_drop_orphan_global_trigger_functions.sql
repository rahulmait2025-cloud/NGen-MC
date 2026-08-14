-- Phase: Drop Orphan Global_* Trigger Helper Functions
-- 
-- Purpose:
--   Remove leftover orphan global_* trigger helper functions that remained 
--   after global legacy table cleanup in migration 00084.
--
-- Important:
--   - These functions are orphaned trigger helpers no longer needed
--   - All global_* tables were already dropped in migration 00084
--   - This is cleanup only - no data impact
--
-- What is NOT affected:
--   - TPStreams upload flow (master_courses, video_assets)
--   - Canonical course system (course_variants, course_bundles, content_assignments, student_entitlements)

-- ===============================================================================
-- STEP 1: Drop orphaned trigger helper functions
-- ===============================================================================

DROP FUNCTION IF EXISTS public.trg_global_course_college_assignments_refresh_enrollment_window() CASCADE;

DROP FUNCTION IF EXISTS public.trg_global_course_enrollments_apply_access_window() CASCADE;

DROP FUNCTION IF EXISTS public.trg_global_courses_refresh_enrollment_windows() CASCADE;

-- Log completion
do $$
begin
  raise notice 'Cleanup complete: Orphan global_* trigger helper functions dropped';
  raise notice '  - trg_global_course_college_assignments_refresh_enrollment_window() removed';
  raise notice '  - trg_global_course_enrollments_apply_access_window() removed';
  raise notice '  - trg_global_courses_refresh_enrollment_windows() removed';
  raise notice '  - Canonical TPStreams architecture untouched';
end $$;