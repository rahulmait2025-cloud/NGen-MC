-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 00299: Rollback Quiz System Only
--
-- Removes only quiz-system related changes from:
-- 00292_quiz_system.sql
-- 00294_course_player_quiz_resolution.sql
-- 00295_quiz_rls_fix.sql
-- 00296_quiz_rls_unblock_start.sql
-- 00297_quiz_rls_recursion_fix.sql
--
-- IMPORTANT:
-- This does NOT touch campus_ambassadors.access_enabled from 00293.
-- This does NOT revoke profile helper grants from 00298.
-- ──────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Remove quiz assessment read policies added on existing assessment tables
--    These policies reference master_course_items.assessment_id, so drop them
--    before dropping the assessment_id column.
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Students can view quiz assessments via sessions"
  ON public.assessments;

DROP POLICY IF EXISTS "Students can view quiz sections via sessions"
  ON public.assessment_sections;

DROP POLICY IF EXISTS "Students can view quiz questions via sessions"
  ON public.assessment_questions;

DROP POLICY IF EXISTS "Students can view quiz options via sessions"
  ON public.assessment_options;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Patch get_student_course_player_payload so it no longer references
--    master_course_items.assessment_id.
--
--    We patch the current function instead of replacing it with an old full body,
--    so any unrelated improvements made to this function are preserved.
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_proc regprocedure;
  v_sql text;
BEGIN
  v_proc := to_regprocedure(
    'public.get_student_course_player_payload(uuid, uuid, uuid, uuid, uuid, text)'
  );

  IF v_proc IS NOT NULL THEN
    v_sql := pg_get_functiondef(v_proc::oid);

    -- Remove JSON output pair:
    -- 'assessment_id', it.assessment_id,
    v_sql := regexp_replace(
      v_sql,
      E'\\s*''assessment_id''\\s*,\\s*it\\.assessment_id\\s*,',
      '',
      'g'
    );

    -- Remove items_data selected column:
    -- ci.assessment_id,
    v_sql := regexp_replace(
      v_sql,
      E'\\s*ci\\.assessment_id\\s*,',
      '',
      'g'
    );

    -- Remove active item selected column:
    -- , assessment_id
    v_sql := regexp_replace(
      v_sql,
      E'\\s*,\\s*assessment_id',
      '',
      'g'
    );

    IF position('assessment_id' in v_sql) > 0 THEN
      RAISE EXCEPTION
        'Rollback stopped: get_student_course_player_payload still contains assessment_id. Restore/patch the function manually before dropping master_course_items.assessment_id.';
    END IF;

    EXECUTE v_sql;

    REVOKE EXECUTE ON FUNCTION public.get_student_course_player_payload(uuid, uuid, uuid, uuid, uuid, text)
      FROM public, anon;

    GRANT EXECUTE ON FUNCTION public.get_student_course_player_payload(uuid, uuid, uuid, uuid, uuid, text)
      TO authenticated;

    ALTER FUNCTION public.get_student_course_player_payload(uuid, uuid, uuid, uuid, uuid, text)
      SECURITY DEFINER;
  END IF;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Drop direct quiz attempt/session tables from 00292.
--    Policies, triggers, grants, indexes on these tables are removed automatically.
-- ──────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.assessment_session_results;
DROP TABLE IF EXISTS public.assessment_session_responses;
DROP TABLE IF EXISTS public.assessment_sessions;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Drop quiz link column from course items.
-- ──────────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS public.idx_master_course_items_assessment;

ALTER TABLE public.master_course_items
  DROP COLUMN IF EXISTS assessment_id;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Drop quiz configuration columns added to assessments.
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.assessments
  DROP COLUMN IF EXISTS shuffle_questions,
  DROP COLUMN IF EXISTS shuffle_options,
  DROP COLUMN IF EXISTS show_correct_answers;

COMMIT;