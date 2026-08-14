-- ============================================================================
-- 00300_lesson_quiz_system.sql
-- Dedicated lesson quiz system for the course curriculum.
--
-- This replaces the old assessment-based quiz approach with a purpose-built
-- lesson quiz feature linked through master_course_items.quiz_id.
--
-- SAFETY: This migration is backward-compatible. It only ADDS new tables,
-- columns, indexes, and policies. It does NOT modify or drop any existing
-- tables, columns, or policies.
--
-- DO NOT run this migration until it has been reviewed and approved.
--
-- Pre-flight checks before running:
--   1. Verify master_course_items.quiz_id does NOT already exist
--      (query: SELECT column_name FROM information_schema.columns
--       WHERE table_name='master_course_items' AND column_name='quiz_id';)
--   2. Verify master_course_items.assessment_id does NOT exist
--      (query: SELECT column_name FROM information_schema.columns
--       WHERE table_name='master_course_items' AND column_name='assessment_id';)
--   3. If quiz_id already exists, confirm it is uuid type and references
--      public.lesson_quizzes(id) before running.
-- ============================================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. lesson_quizzes
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_quizzes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_course_id uuid NOT NULL
    REFERENCES public.master_courses(id) ON DELETE CASCADE,
  module_id       uuid NOT NULL
    REFERENCES public.master_course_modules(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  instructions_md text,
  publish_status  text NOT NULL DEFAULT 'draft'
    CHECK (publish_status IN ('draft', 'published', 'unpublished', 'archived')),
  passing_percentage numeric(5,2) NOT NULL DEFAULT 0
    CHECK (passing_percentage >= 0 AND passing_percentage <= 100),
  max_attempts    integer
    CHECK (max_attempts IS NULL OR max_attempts > 0),
  time_limit_minutes integer
    CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
  shuffle_questions boolean NOT NULL DEFAULT false,
  shuffle_options   boolean NOT NULL DEFAULT false,
  show_result_after_submit boolean NOT NULL DEFAULT true,
  show_correct_answers     boolean NOT NULL DEFAULT true,
  completion_rule text NOT NULL DEFAULT 'submit'
    CHECK (completion_rule IN ('submit', 'pass')),
  version         integer NOT NULL DEFAULT 1
    CHECK (version > 0),
  parent_quiz_id  uuid
    REFERENCES public.lesson_quizzes(id) ON DELETE SET NULL,
  locked_at       timestamptz,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.lesson_quizzes
  IS 'Lesson quiz definitions scoped to a master course and module. Linked from master_course_items via quiz_id.';

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. lesson_quiz_questions
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_quiz_questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id       uuid NOT NULL
    REFERENCES public.lesson_quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'single_choice'
    CHECK (question_type IN ('single_choice', 'multiple_choice', 'true_false')),
  explanation   text,
  points        numeric(8,2) NOT NULL DEFAULT 1
    CHECK (points > 0),
  sort_order    integer NOT NULL DEFAULT 0,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.lesson_quiz_questions
  IS 'Questions belonging to a lesson quiz. Ordered by sort_order.';

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. lesson_quiz_options
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_quiz_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL
    REFERENCES public.lesson_quiz_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct  boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.lesson_quiz_options
  IS 'Answer options for a lesson quiz question. is_correct marks the correct answer(s).';

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Add quiz_id to master_course_items
--
-- REVIEW CHECK: Before running, verify this column does not already exist.
-- If it exists, confirm it is uuid and references lesson_quizzes(id).
-- Old assessment_id must NOT remain on this table.
-- Uses ON DELETE RESTRICT: deleting a quiz should not silently break a
-- curriculum item. SuperAdmin must explicitly unpublish/remove/relink first.
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'master_course_items'
      AND column_name = 'quiz_id'
  ) THEN
    ALTER TABLE public.master_course_items
      ADD COLUMN quiz_id uuid REFERENCES public.lesson_quizzes(id) ON DELETE RESTRICT;
  END IF;
END
$$;

COMMENT ON COLUMN public.master_course_items.quiz_id
  IS 'Nullable FK to lesson_quizzes. Set when item_type = quiz_placeholder. Uses ON DELETE RESTRICT to avoid silently breaking curriculum items.';

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. lesson_quiz_attempts
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_quiz_attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id         uuid NOT NULL
    REFERENCES public.lesson_quizzes(id) ON DELETE RESTRICT,
  student_id      uuid NOT NULL
    REFERENCES public.students(id) ON DELETE CASCADE,
  college_id      uuid
    REFERENCES public.colleges(id) ON DELETE SET NULL,
  master_course_id uuid NOT NULL
    REFERENCES public.master_courses(id) ON DELETE CASCADE,
  item_id         uuid NOT NULL
    REFERENCES public.master_course_items(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'abandoned')),
  attempt_no      integer NOT NULL DEFAULT 1
    CHECK (attempt_no > 0),
  score           numeric(10,2) NOT NULL DEFAULT 0
    CHECK (score >= 0),
  max_score       numeric(10,2) NOT NULL DEFAULT 0
    CHECK (max_score >= 0),
  percentage      numeric(5,2) NOT NULL DEFAULT 0
    CHECK (percentage >= 0 AND percentage <= 100),
  passed          boolean NOT NULL DEFAULT false,
  started_at      timestamptz NOT NULL DEFAULT now(),
  submitted_at    timestamptz,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, student_id, attempt_no)
);

COMMENT ON TABLE public.lesson_quiz_attempts
  IS 'Student attempts at a lesson quiz. attempt_no is scoped per (quiz_id, student_id).';

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. lesson_quiz_attempt_answers
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_quiz_attempt_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id      uuid NOT NULL
    REFERENCES public.lesson_quiz_attempts(id) ON DELETE CASCADE,
  question_id     uuid NOT NULL
    REFERENCES public.lesson_quiz_questions(id) ON DELETE RESTRICT,
  selected_option_ids uuid[] NOT NULL DEFAULT '{}',
  is_correct      boolean NOT NULL DEFAULT false,
  points_awarded  numeric(8,2) NOT NULL DEFAULT 0
    CHECK (points_awarded >= 0),
  question_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  selected_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_snapshot  jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

COMMENT ON TABLE public.lesson_quiz_attempt_answers
  IS 'Individual answers within a quiz attempt. Snapshots preserve question state at time of submission.';

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. Indexes
-- ──────────────────────────────────────────────────────────────────────────────

-- One quiz definition cannot be linked to multiple curriculum items
CREATE UNIQUE INDEX IF NOT EXISTS idx_master_course_items_quiz_id_unique
  ON public.master_course_items (quiz_id)
  WHERE quiz_id IS NOT NULL;

-- Quiz listing by course/module
CREATE INDEX IF NOT EXISTS idx_lesson_quizzes_course_module
  ON public.lesson_quizzes (master_course_id, module_id, publish_status);

-- Questions ordered within a quiz
CREATE INDEX IF NOT EXISTS idx_lesson_quiz_questions_quiz_order
  ON public.lesson_quiz_questions (quiz_id, sort_order);

-- Options ordered within a question
CREATE INDEX IF NOT EXISTS idx_lesson_quiz_options_question_order
  ON public.lesson_quiz_options (question_id, sort_order);

-- Attempt lookups by student + item
CREATE INDEX IF NOT EXISTS idx_lesson_quiz_attempts_student_item
  ON public.lesson_quiz_attempts (student_id, item_id, created_at DESC);

-- Attempt lookups by college + quiz (admin analytics)
CREATE INDEX IF NOT EXISTS idx_lesson_quiz_attempts_college_quiz
  ON public.lesson_quiz_attempts (college_id, quiz_id, status, created_at DESC);

-- Answer lookup by attempt
CREATE INDEX IF NOT EXISTS idx_lesson_quiz_attempt_answers_attempt
  ON public.lesson_quiz_attempt_answers (attempt_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. Updated_at triggers
-- Uses the existing public.set_updated_at() function from 00001_initial_schema.
-- Idempotent: drops existing trigger before creating.
-- ──────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_lesson_quizzes_updated_at ON public.lesson_quizzes;
CREATE TRIGGER trg_lesson_quizzes_updated_at
  BEFORE UPDATE ON public.lesson_quizzes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_lesson_quiz_questions_updated_at ON public.lesson_quiz_questions;
CREATE TRIGGER trg_lesson_quiz_questions_updated_at
  BEFORE UPDATE ON public.lesson_quiz_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_lesson_quiz_options_updated_at ON public.lesson_quiz_options;
CREATE TRIGGER trg_lesson_quiz_options_updated_at
  BEFORE UPDATE ON public.lesson_quiz_options
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_lesson_quiz_attempts_updated_at ON public.lesson_quiz_attempts;
CREATE TRIGGER trg_lesson_quiz_attempts_updated_at
  BEFORE UPDATE ON public.lesson_quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- 9. Row Level Security
--
-- RLS is enabled on all new tables. Policies are intentionally minimal.
-- Student-facing access will be handled by server-side service-role clients
-- (createAdminClient) in LMS server actions, which bypass RLS.
--
-- No complex recursive policies. No joins through entitlements, memberships,
-- or content_assignments inside RLS.
--
-- CollegeAdmin quiz analytics are intentionally NOT exposed via direct table RLS.
-- The CollegeAdmin app already has a Quizzes section/routes. Those existing
-- pages will be reused in the final milestone of this same end-to-end quiz
-- implementation, after SuperAdmin creation, LMS rendering, attempts, and
-- progress completion are working.
-- CollegeAdmin access must go through scoped server-side services using
-- requireCollegeAdmin(collegeSlug) and lesson_quiz_attempts.college_id = tenant.id.
-- Do not expose lesson_quiz_options directly to CollegeAdmin because it contains is_correct.
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.lesson_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_quiz_attempt_answers ENABLE ROW LEVEL SECURITY;

-- Superadmin full access on quiz definition tables
DROP POLICY IF EXISTS "Superadmin full access lesson_quizzes" ON public.lesson_quizzes;
CREATE POLICY "Superadmin full access lesson_quizzes"
  ON public.lesson_quizzes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND global_role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND global_role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Superadmin full access lesson_quiz_questions" ON public.lesson_quiz_questions;
CREATE POLICY "Superadmin full access lesson_quiz_questions"
  ON public.lesson_quiz_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND global_role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND global_role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Superadmin full access lesson_quiz_options" ON public.lesson_quiz_options;
CREATE POLICY "Superadmin full access lesson_quiz_options"
  ON public.lesson_quiz_options FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND global_role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND global_role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Superadmin full access lesson_quiz_attempts" ON public.lesson_quiz_attempts;
CREATE POLICY "Superadmin full access lesson_quiz_attempts"
  ON public.lesson_quiz_attempts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND global_role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND global_role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Superadmin full access lesson_quiz_attempt_answers" ON public.lesson_quiz_attempt_answers;
CREATE POLICY "Superadmin full access lesson_quiz_attempt_answers"
  ON public.lesson_quiz_attempt_answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND global_role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND global_role = 'superadmin'
    )
  );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

COMMIT;
