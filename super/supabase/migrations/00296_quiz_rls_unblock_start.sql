-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 00296: Quiz RLS Unblock Start Screen
--
-- Unblocks loading the quiz start screen for students by allowing authenticated
-- users to select published assessments, sections, questions, and options
-- if they are linked to a published master course item.
-- ──────────────────────────────────────────────────────────────────────────────

-- Allow students to read published assessments linked to a published master course item or if they have a session
DROP POLICY IF EXISTS "Students can view quiz assessments via sessions" ON public.assessments;
CREATE POLICY "Students can view quiz assessments via sessions" ON public.assessments
  FOR SELECT TO authenticated
  USING (
    assessments.status = 'published'
    AND (
      EXISTS (
        SELECT 1
        FROM public.master_course_items mci
        WHERE mci.assessment_id = assessments.id
          AND mci.publish_status = 'published'
      )
      OR EXISTS (
        SELECT 1
        FROM public.assessment_sessions s
        WHERE s.assessment_id = assessments.id
          AND s.student_id = auth.uid()
      )
    )
  );

-- Allow students to read sections of quiz assessments linked to a published master course item or if they have a session
DROP POLICY IF EXISTS "Students can view quiz sections via sessions" ON public.assessment_sections;
CREATE POLICY "Students can view quiz sections via sessions" ON public.assessment_sections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assessments a
      LEFT JOIN public.master_course_items mci ON mci.assessment_id = a.id
      WHERE a.id = assessment_sections.assessment_id
        AND a.status = 'published'
        AND (
          mci.publish_status = 'published'
          OR EXISTS (
            SELECT 1
            FROM public.assessment_sessions s
            WHERE s.assessment_id = a.id
              AND s.student_id = auth.uid()
          )
        )
    )
  );

-- Allow students to read questions of quiz assessments linked to a published master course item or if they have a session
DROP POLICY IF EXISTS "Students can view quiz questions via sessions" ON public.assessment_questions;
CREATE POLICY "Students can view quiz questions via sessions" ON public.assessment_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assessment_sections sec
      JOIN public.assessments a ON a.id = sec.assessment_id
      LEFT JOIN public.master_course_items mci ON mci.assessment_id = a.id
      WHERE sec.id = assessment_questions.section_id
        AND a.status = 'published'
        AND (
          mci.publish_status = 'published'
          OR EXISTS (
            SELECT 1
            FROM public.assessment_sessions s
            WHERE s.assessment_id = a.id
              AND s.student_id = auth.uid()
          )
        )
    )
  );

-- Allow students to read options of quiz assessments linked to a published master course item or if they have a session
DROP POLICY IF EXISTS "Students can view quiz options via sessions" ON public.assessment_options;
CREATE POLICY "Students can view quiz options via sessions" ON public.assessment_options
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assessment_questions q
      JOIN public.assessment_sections sec ON sec.id = q.section_id
      JOIN public.assessments a ON a.id = sec.assessment_id
      LEFT JOIN public.master_course_items mci ON mci.assessment_id = a.id
      WHERE q.id = assessment_options.question_id
        AND a.status = 'published'
        AND (
          mci.publish_status = 'published'
          OR EXISTS (
            SELECT 1
            FROM public.assessment_sessions s
            WHERE s.assessment_id = a.id
              AND s.student_id = auth.uid()
          )
        )
    )
  );
