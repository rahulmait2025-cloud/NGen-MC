-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 00293: Quiz RLS - Allow students to read assessments via sessions
--
-- The existing assessment RLS policy requires assessment_assignments rows.
-- Quiz-linked assessments use assessment_sessions directly, so students
-- need a separate policy to read them.
-- ──────────────────────────────────────────────────────────────────────────────

-- Allow students to read published assessments they have a session for
DROP POLICY IF EXISTS "Students can view quiz assessments via sessions" ON public.assessments;
CREATE POLICY "Students can view quiz assessments via sessions" ON public.assessments
  FOR SELECT TO authenticated
  USING (
    assessments.status = 'published'
    AND EXISTS (
      SELECT 1
      FROM public.assessment_sessions s
      WHERE s.assessment_id = assessments.id
        AND s.student_id = auth.uid()
    )
  );

-- Allow students to read sections of quiz assessments they have a session for
DROP POLICY IF EXISTS "Students can view quiz sections via sessions" ON public.assessment_sections;
CREATE POLICY "Students can view quiz sections via sessions" ON public.assessment_sections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assessment_sessions s
      JOIN public.assessments a ON a.id = s.assessment_id
      WHERE a.id = assessment_sections.assessment_id
        AND s.student_id = auth.uid()
        AND a.status = 'published'
    )
  );

-- Allow students to read questions of quiz assessments they have a session for
DROP POLICY IF EXISTS "Students can view quiz questions via sessions" ON public.assessment_questions;
CREATE POLICY "Students can view quiz questions via sessions" ON public.assessment_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assessment_sessions s
      JOIN public.assessments a ON a.id = s.assessment_id
      JOIN public.assessment_sections sec ON sec.assessment_id = a.id
      WHERE sec.id = assessment_questions.section_id
        AND s.student_id = auth.uid()
        AND a.status = 'published'
    )
  );

-- Allow students to read options of quiz assessments they have a session for
DROP POLICY IF EXISTS "Students can view quiz options via sessions" ON public.assessment_options;
CREATE POLICY "Students can view quiz options via sessions" ON public.assessment_options
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assessment_sessions s
      JOIN public.assessments a ON a.id = s.assessment_id
      JOIN public.assessment_sections sec ON sec.assessment_id = a.id
      JOIN public.assessment_questions q ON q.section_id = sec.id
      WHERE q.id = assessment_options.question_id
        AND s.student_id = auth.uid()
        AND a.status = 'published'
    )
  );
