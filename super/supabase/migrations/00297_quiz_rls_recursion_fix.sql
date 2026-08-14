-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 00297: Quiz RLS Recursion Fix
--
-- Replaces RLS policies with simplified, non-recursive versions that authorize
-- students to read assessments, sections, questions, and options based on
-- their association with a published master course item.
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. assessments policy
DROP POLICY IF EXISTS "Students can view quiz assessments via sessions" ON public.assessments;
CREATE POLICY "Students can view quiz assessments via sessions" ON public.assessments
  FOR SELECT TO authenticated
  USING (
    assessments.status = 'published'
    AND EXISTS (
      SELECT 1
      FROM public.master_course_items mci
      WHERE mci.assessment_id = assessments.id
        AND mci.publish_status = 'published'
    )
  );

-- 2. assessment_sections policy
DROP POLICY IF EXISTS "Students can view quiz sections via sessions" ON public.assessment_sections;
CREATE POLICY "Students can view quiz sections via sessions" ON public.assessment_sections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assessments a
      JOIN public.master_course_items mci ON mci.assessment_id = a.id
      WHERE a.id = assessment_sections.assessment_id
        AND a.status = 'published'
        AND mci.publish_status = 'published'
    )
  );

-- 3. assessment_questions policy
DROP POLICY IF EXISTS "Students can view quiz questions via sessions" ON public.assessment_questions;
CREATE POLICY "Students can view quiz questions via sessions" ON public.assessment_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assessment_sections sec
      JOIN public.assessments a ON a.id = sec.assessment_id
      JOIN public.master_course_items mci ON mci.assessment_id = a.id
      WHERE sec.id = assessment_questions.section_id
        AND a.status = 'published'
        AND mci.publish_status = 'published'
    )
  );

-- 4. assessment_options policy
DROP POLICY IF EXISTS "Students can view quiz options via sessions" ON public.assessment_options;
CREATE POLICY "Students can view quiz options via sessions" ON public.assessment_options
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assessment_questions q
      JOIN public.assessment_sections sec ON sec.id = q.section_id
      JOIN public.assessments a ON a.id = sec.assessment_id
      JOIN public.master_course_items mci ON mci.assessment_id = a.id
      WHERE q.id = assessment_options.question_id
        AND a.status = 'published'
        AND mci.publish_status = 'published'
    )
  );
