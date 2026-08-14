import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireStudentRuntime } from '@/lib/student-runtime/runtime';
import type {
  AssessmentRow,
  AssessmentSectionRow,
  AssessmentQuestionRow,
  AssessmentOptionRow,
  AssessmentAssignmentRow,
  AssessmentAttemptRow,
  AssessmentResponseRow,
} from '@/types/database';

export interface AssignedAssessmentView extends AssessmentAssignmentRow {
  assessment: AssessmentRow;
  attempts: AssessmentAttemptRow[];
}

export interface AttemptStateView extends AssessmentAttemptRow {
  assessment: AssessmentRow & {
    sections: (AssessmentSectionRow & {
      questions: (AssessmentQuestionRow & {
        options: AssessmentOptionRow[];
      })[];
    })[];
  };
  responses: AssessmentResponseRow[];
}

/** Get all assessments assigned to a student (either direct, via cohort, or tenant-wide). */
export async function getAssignedAssessments(collegeSlug: string): Promise<AssignedAssessmentView[]> {
  const runtime = await requireStudentRuntime(collegeSlug);
  const admin = createAdminClient();

  const { data: assignments, error } = await admin
    .from('assessment_assignments')
    .select(`
      *,
      assessment:assessments(*),
      attempts:assessment_attempts(*)
    `)
    .eq('student_id', runtime.student.studentId)
    .eq('assessment.status', 'published')
    .order('due_date', { ascending: true });
    
  if (error) return [];
  return (assignments ?? []) as AssignedAssessmentView[];
}

/** Start a new attempt for a specific assignment. */
export async function startAttempt(collegeSlug: string, assignmentId: string): Promise<AssessmentAttemptRow | null> {
  const runtime = await requireStudentRuntime(collegeSlug);
  const admin = createAdminClient();

  // Verify assignment belongs to this student and max attempts not reached
  const { data: assignment } = await admin
    .from('assessment_assignments')
    .select('*, assessment:assessments(time_limit_minutes, max_attempts)')
    .eq('id', assignmentId)
    .eq('student_id', runtime.student.studentId)
    .maybeSingle();
    
  if (!assignment) return null;

  const { data: previousAttempts } = await admin
    .from('assessment_attempts')
    .select('id')
    .eq('assignment_id', assignmentId)
    .eq('student_id', runtime.student.studentId);

  const maxAttempts = (assignment.assessment as { max_attempts?: number } | null)?.max_attempts ?? 1;
  const currentAttemptsCount = previousAttempts?.length || 0;
  
  if (currentAttemptsCount >= maxAttempts) {
     throw new Error("Max attempts reached");
  }

  // Create new attempt
  const { data, error } = await admin
    .from('assessment_attempts')
    .insert({
      assignment_id: assignmentId,
      student_id: runtime.student.studentId,
      status: 'in_progress',
      start_time: new Date().toISOString(),
    })
    .select('id, assignment_id, student_id, status, start_time, end_time, created_at')
    .single();

  if (error) return null;
  return data as AssessmentAttemptRow;
}

/** Fetch live state of an attempt to render in the UI (SPA). */
export async function getAttemptState(collegeSlug: string, attemptId: string): Promise<AttemptStateView | null> {
  const runtime = await requireStudentRuntime(collegeSlug);
  const admin = createAdminClient();

  // First fetch attempt ensuring it belongs to this student
  const { data: attempt, error: attemptErr } = await admin
    .from('assessment_attempts')
    .select('*, assignment:assessment_assignments(assessment_id)')
    .eq('id', attemptId)
    .eq('student_id', runtime.student.studentId)
    .maybeSingle();
    
  if (attemptErr || !attempt) return null;

  const assessmentId = (attempt.assignment as { assessment_id: string } | null)?.assessment_id;
  if (!assessmentId) return null;

  // Parallel fetch: assessment, sections, and responses
  const [assessmentRes, sectionsRes, responsesRes] = await Promise.all([
    admin.from('assessments').select('id, title, description, time_limit_minutes, max_attempts, status, created_at, updated_at').eq('id', assessmentId).single(),
    admin.from('assessment_sections').select('id, assessment_id, title, description, order_index, created_at').eq('assessment_id', assessmentId).order('order_index'),
    admin.from('assessment_responses').select('id, attempt_id, question_id, selected_option_id, text_answer, is_correct, created_at').eq('attempt_id', attemptId),
  ]);

  const assessment = assessmentRes.data;
  const sections = sectionsRes.data ?? [];

  if (!assessment) return null;

  // Parallel fetch: questions and options based on fetched sections
  const sectionIds = sections.map(s => s.id);
  const { data: questions } = sectionIds.length > 0
    ? await admin.from('assessment_questions').select('id, section_id, type, text, points, order_index, created_at, updated_at').in('section_id', sectionIds).order('order_index')
    : { data: [] as Record<string, unknown>[] };

  const questionIds = (questions ?? []).map(q => q.id);
  const { data: options } = questionIds.length > 0
    ? await admin.from('assessment_options').select('id, question_id, text, is_correct, order_index, created_at, updated_at').in('question_id', questionIds).order('order_index')
    : { data: [] as Record<string, unknown>[] };

  // Group options by question
  const optionsByQuestion = new Map<string, AssessmentOptionRow[]>();
  for (const opt of options ?? []) {
    const list = optionsByQuestion.get(opt.question_id) ?? [];
    list.push(opt as AssessmentOptionRow);
    optionsByQuestion.set(opt.question_id, list);
  }

  // Group questions by section
  const questionsBySection = new Map<string, (AssessmentQuestionRow & { options: AssessmentOptionRow[] })[]>();
  for (const q of questions ?? []) {
    const list = questionsBySection.get(q.section_id) ?? [];
    list.push({ ...(q as AssessmentQuestionRow), options: optionsByQuestion.get(q.id) ?? [] });
    questionsBySection.set(q.section_id, list);
  }

  const structuredAssessment = {
    ...assessment,
    sections: sections.map(s => ({
      ...s,
      questions: questionsBySection.get(s.id) ?? []
    }))
  };

  return {
    ...attempt,
    assessment: structuredAssessment,
    responses: responsesRes.data ?? []
  } as AttemptStateView;
}
