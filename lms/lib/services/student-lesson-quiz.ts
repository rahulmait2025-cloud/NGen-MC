import 'server-only';

import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveAccessibleLesson, type StudentAccessContext } from '@/lib/services/course-access-manager';

const getCachedQuizStructureInternal = unstable_cache(
  async (quizId: string) => {
    const sb = createAdminClient();
    const quizQuery = sb
      .from('lesson_quizzes')
      .select(`
        *,
        questions:lesson_quiz_questions(
          *,
          options:lesson_quiz_options(*)
        )
      `)
      .eq('id', quizId)
      .eq('publish_status', 'published');

    const { data, error } = await quizQuery.single();
    if (error || !data) {
      throw new Error('Quiz not found or not published.');
    }
    return data;
  },
  ['quiz-structure-by-id'],
  {
    revalidate: 604800, // 7 days
    tags: ['quiz-structure'],
  }
);

export function getCachedQuizStructure(quizId: string) {
  return getCachedQuizStructureInternal(quizId);
}

import type {
  LessonQuiz,
  LessonQuizQuestion,
  LessonQuizOption,
  LessonQuizAttempt,
  LessonQuizAttemptAnswer,
  LessonQuizPayload,
  LessonQuizQuestionPayload,
  LessonQuizAttemptResult,
  GetLessonQuizPayloadInput,
  StartLessonQuizAttemptInput,
  SubmitLessonQuizAttemptInput,
} from '@/types/lesson-quiz';

// ─── getLessonQuizPayloadForItem ─────────────────────────────────────────────

/**
 * OPTIMIZATION: Lean function to get just attempt count for a student + quiz.
 * Used by getQuizHistory to avoid fetching entire quiz payload just for attempts.
 */
export async function getLessonQuizAttemptCount(
  quizId: string,
  studentId: string,
): Promise<number> {
  const sb = createAdminClient();
  const { count } = await sb
    .from('lesson_quiz_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('quiz_id', quizId)
    .eq('student_id', studentId);
  return count ?? 0;
}

/**
 * OPTIMIZATION: Lean function to get just the quiz_id for an item.
 * Used by getQuizHistory to get attempts without fetching full quiz.
 */
export async function getQuizIdForItem(
  courseId: string,
  itemId: string,
): Promise<string | null> {
  const sb = createAdminClient();

  const query = sb
    .from('master_course_items')
    .select('quiz_id')
    .eq('id', itemId)
    .eq('master_course_id', courseId)
    .eq('item_type', 'quiz_placeholder')
    .eq('publish_status', 'published');

  const { data } = await query.maybeSingle();
  return data?.quiz_id ?? null;
}

/**
 * Resolves the quiz payload for a given curriculum item.
 *
 * 1. Verifies student access & item validity in parallel
 * 2. Fetches cached quiz structure (0ms memory cache) & student attempt history in parallel
 * 3. Returns student-safe payload WITHOUT is_correct
 */
export async function getLessonQuizPayloadForItem(
  input: GetLessonQuizPayloadInput & { skipAccessValidation?: boolean },
): Promise<LessonQuizPayload> {
  const { studentId, collegeId, isGlobal, courseId, itemId, skipAccessValidation } = input;
  const sb = createAdminClient();

  // 1. Parallelize access check and item query
  const itemQuery = sb
    .from('master_course_items')
    .select('id, item_type, quiz_id, master_course_id, module_id')
    .eq('id', itemId)
    .eq('master_course_id', courseId)
    .eq('publish_status', 'published')
    .single();

  let item;
  if (!skipAccessValidation) {
    const context: StudentAccessContext = { isGlobal, collegeId };
    const [access, itemRes] = await Promise.all([
      resolveAccessibleLesson(studentId, courseId, itemId, context),
      itemQuery,
    ]);
    if (!access) {
      throw new Error('Unauthorized: You do not have access to this course item.');
    }
    if (itemRes.error || !itemRes.data) {
      throw new Error('Item not found.');
    }
    item = itemRes.data;
  } else {
    const { data, error } = await itemQuery;
    if (error || !data) {
      throw new Error('Item not found.');
    }
    item = data;
  }

  if (item.item_type !== 'quiz_placeholder') {
    throw new Error('Item is not a quiz.');
  }
  if (!item.quiz_id) {
    throw new Error('Quiz is not linked to this item.');
  }

  // 2. Fetch module-cached quiz structure (0ms DB cost) and student attempt history in parallel
  const [quiz, attemptsRes] = await Promise.all([
    getCachedQuizStructure(item.quiz_id),
    sb
      .from('lesson_quiz_attempts')
      .select('id, attempt_no, status')
      .eq('quiz_id', item.quiz_id)
      .eq('student_id', studentId),
  ]);

  const attempts = attemptsRes.data ?? [];
  const attemptsUsed = attempts.length;
  const inProgressAttempt = attempts.find((a) => a.status === 'in_progress');

  // 3. Build questions payload (strip is_correct)
  const rawQuestions = (quiz.questions ?? []) as (LessonQuizQuestion & {
    options: LessonQuizOption[];
  })[];

  const questions: LessonQuizQuestionPayload[] = rawQuestions
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((q) => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      explanation: q.explanation ?? null,
      points: q.points,
      sort_order: q.sort_order,
      options: q.options
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((o) => ({
          id: o.id,
          option_text: o.option_text,
          sort_order: o.sort_order,
        })),
    }));

  const maxAttempts = (quiz as LessonQuiz).max_attempts;
  const attemptsRemaining = maxAttempts !== null ? Math.max(0, maxAttempts - attemptsUsed) : null;

  const quizRow = quiz as unknown as LessonQuiz;
  const payload: LessonQuizPayload = {
    quiz: quizRow,
    questions,
    attempts_used: attemptsUsed,
    attempts_remaining: attemptsRemaining,
  };

  if (inProgressAttempt) {
    payload.attempt = inProgressAttempt as unknown as LessonQuizAttempt;
  }

  return payload;
}

// ─── startLessonQuizAttempt ──────────────────────────────────────────────────

/**
 * Creates a new quiz attempt for the student.
 *
 * 1. Verifies access
 * 2. Verifies quiz is published
 * 3. Checks max_attempts
 * 4. Reuses in-progress attempt if one exists
 * 5. Creates attempt row with status = 'in_progress'
 */
export async function startLessonQuizAttempt(
  input: StartLessonQuizAttemptInput,
): Promise<LessonQuizAttempt> {
  const { studentId, collegeId, courseId, itemId } = input;
  const sb = createAdminClient();

  // 1. Verify student access and fetch curriculum item in parallel
  const context: StudentAccessContext = { isGlobal: !collegeId, collegeId };
  const [access, itemRes] = await Promise.all([
    resolveAccessibleLesson(studentId, courseId, itemId, context),
    sb
      .from('master_course_items')
      .select('id, item_type, quiz_id, master_course_id')
      .eq('id', itemId)
      .eq('master_course_id', courseId)
      .eq('publish_status', 'published')
      .single(),
  ]);

  if (!access) {
    throw new Error('Unauthorized: You do not have access to this course item.');
  }

  const item = itemRes.data;
  if (!item || item.item_type !== 'quiz_placeholder' || !item.quiz_id) {
    throw new Error('Quiz not found or not linked to this item.');
  }

  // 2. Fetch module-cached quiz structure and student's attempt rows in parallel
  const [quiz, attemptsRes] = await Promise.all([
    getCachedQuizStructure(item.quiz_id),
    sb
      .from('lesson_quiz_attempts')
      .select('id, quiz_id, student_id, college_id, master_course_id, item_id, status, attempt_no, score, max_score, percentage, passed, started_at, submitted_at, metadata, created_at, updated_at')
      .eq('quiz_id', item.quiz_id)
      .eq('student_id', studentId),
  ]);

  if (!quiz) {
    throw new Error('Quiz not found or not published.');
  }

  const attempts = attemptsRes.data ?? [];
  const existingInProgress = attempts.find((a) => a.status === 'in_progress');
  if (existingInProgress) {
    return existingInProgress as unknown as LessonQuizAttempt;
  }

  const submittedCount = attempts.filter((a) => a.status === 'submitted').length;

  // 3. Enforce max_attempts
  const maxAttempts = (quiz as unknown as LessonQuiz).max_attempts;
  if (maxAttempts !== null && submittedCount >= maxAttempts) {
    throw new Error('Maximum attempts reached.');
  }

  // 4. Calculate max_score from cached quiz questions
  const rawQuestions = (quiz.questions ?? []) as LessonQuizQuestion[];
  const maxScore = rawQuestions.reduce((sum, q) => sum + (q.points ?? 0), 0);

  // 5. Create attempt row
  const attemptNo = submittedCount + 1;
  const { data: attempt, error } = await sb
    .from('lesson_quiz_attempts')
    .insert({
      quiz_id: item.quiz_id,
      student_id: studentId,
      college_id: collegeId ?? null,
      master_course_id: courseId,
      item_id: itemId,
      attempt_no: attemptNo,
      status: 'in_progress',
      max_score: maxScore,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !attempt) {
    throw new Error(`Failed to create attempt: ${error?.message ?? 'unknown error'}`);
  }

  return attempt as unknown as LessonQuizAttempt;
}

// ─── submitLessonQuizAttempt ─────────────────────────────────────────────────

/**
 * Submits a quiz attempt with the student's answers.
 *
 * 1. Verifies attempt ownership and status
 * 2. Fetches quiz config + questions with correct options
 * 3. Grades each answer
 * 4. Saves answer rows with snapshots
 * 5. Updates attempt with score
 * 6. Updates student_progress based on completion_rule
 * 7. Returns result
 */
export async function submitLessonQuizAttempt(
  input: SubmitLessonQuizAttemptInput,
): Promise<LessonQuizAttemptResult> {
  const { studentId, collegeId, isGlobal, courseId, attemptId, itemId: inputItemId, answers } = input;
  const sb = createAdminClient();

  // 0. Verify access and course entitlement
  const access = await resolveAccessibleLesson(studentId, courseId, inputItemId, { isGlobal, collegeId });
  if (!access) {
    throw new Error('Unauthorized: You do not have access to this course item.');
  }

  // 1. Verify attempt ownership and state
  const { data: attempt } = await sb
    .from('lesson_quiz_attempts')
    .select('id, quiz_id, student_id, college_id, master_course_id, item_id, status, attempt_no, score, max_score, percentage, passed, started_at, submitted_at, metadata, created_at, updated_at')
    .eq('id', attemptId)
    .maybeSingle();

  const isDebug =
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_DEBUG_REQUESTS === 'true';

  const safeId = (id?: string | null) => (id ? `${id.slice(0, 8)}...` : null);

  if (!attempt) {
    if (isDebug) {
      console.info('[request-audit]', {
        action: 'quiz-attempt-ownership-denied',
        attemptId: safeId(attemptId),
      });
    }
    throw new Error('No active attempt found or access denied.');
  }

  // 1b. Verify attempt ownership
  if (attempt.student_id !== studentId) {
    if (isDebug) {
      console.info('[request-audit]', {
        action: 'quiz-attempt-ownership-denied',
        attemptId: safeId(attemptId),
      });
    }
    throw new Error('Unauthorized: Attempt does not belong to you.');
  }

  // 1c. Handle idempotent duplicate final submission
  if (attempt.status === 'submitted') {
    if (isDebug) {
      console.info('[request-audit]', {
        action: 'quiz-submission-duplicate',
        attemptId: safeId(attemptId),
      });
    }
    const { data: existingAnswers } = await sb
      .from('lesson_quiz_attempt_answers')
      .select('*')
      .eq('attempt_id', attemptId);

    return {
      attempt: attempt as unknown as LessonQuizAttempt,
      answers: (existingAnswers ?? []) as unknown as LessonQuizAttemptAnswer[],
      score: attempt.score ?? 0,
      maxScore: attempt.max_score ?? 0,
      percentage: attempt.percentage ?? 0,
      passed: attempt.passed ?? false,
    };
  }

  if (attempt.status !== 'in_progress') {
    if (isDebug) {
      console.info('[request-audit]', {
        action: 'quiz-attempt-finalized',
        attemptId: safeId(attemptId),
      });
    }
    throw new Error('Attempt is already finalized.');
  }

  if (attempt.item_id !== inputItemId) {
    throw new Error('Attempt does not belong to this item.');
  }
  if (attempt.master_course_id !== courseId) {
    throw new Error('Attempt does not belong to this course.');
  }

  const quizId = attempt.quiz_id;
  const itemId = attempt.item_id;

  // 2. Fetch quiz config (including time_limit_minutes for server-side enforcement)
  const { data: quiz } = await sb
    .from('lesson_quizzes')
    .select('passing_percentage, completion_rule, show_result_after_submit, show_correct_answers, time_limit_minutes')
    .eq('id', quizId)
    .single();

  if (!quiz) {
    throw new Error('Quiz not found.');
  }

  // 2b. Enforce time_limit_minutes server-side
  if (quiz.time_limit_minutes && attempt.started_at) {
    const startedAt = new Date(attempt.started_at).getTime();
    const expiresAt = startedAt + quiz.time_limit_minutes * 60 * 1000;
    // Provide a safe 30-second grace period for latency
    if (Date.now() > expiresAt + 30000) {
      await sb
        .from('lesson_quiz_attempts')
        .update({ status: 'abandoned' })
        .eq('id', attemptId);
      throw new Error('Time limit has expired. Your attempt has been marked as abandoned.');
    }
  }

  // 3. Fetch questions with correct options
  const { data: questions } = await sb
    .from('lesson_quiz_questions')
    .select(`
      id, question_text, question_type, points, sort_order, explanation,
      options:lesson_quiz_options(id, option_text, is_correct, sort_order)
    `)
    .eq('quiz_id', quizId)
    .order('sort_order');

  if (!questions?.length) {
    throw new Error('Quiz has no questions.');
  }

  // 3b. Build valid question and option sets for validation
  const validQuestionIds = new Set(questions.map((q) => q.id));
  const optionsByQuestion = new Map<string, Set<string>>();
  for (const q of questions) {
    const qWithOpts = q as LessonQuizQuestion & { options: LessonQuizOption[] };
    optionsByQuestion.set(
      qWithOpts.id,
      new Set(qWithOpts.options.map((o) => o.id)),
    );
  }

  // 3c. Validate submitted answers: every questionId must belong to quiz, every optionId must belong to its question
  for (const answer of answers) {
    if (!validQuestionIds.has(answer.questionId)) {
      if (isDebug) console.info('[request-audit]', { action: 'quiz-answer-rejected', attemptId: safeId(attemptId) });
      throw new Error(`Invalid submission: Question ${answer.questionId} does not belong to this quiz.`);
    }
    const validOptions = optionsByQuestion.get(answer.questionId);
    if (!validOptions) {
      if (isDebug) console.info('[request-audit]', { action: 'quiz-answer-rejected', attemptId: safeId(attemptId) });
      throw new Error(`Invalid submission: Options for question ${answer.questionId} not found.`);
    }
    // Normalize: deduplicate and assert options belong to the question
    const uniqueSelected = [...new Set(answer.selectedOptionIds)];
    for (const optId of uniqueSelected) {
      if (!validOptions.has(optId)) {
        if (isDebug) console.info('[request-audit]', { action: 'quiz-answer-rejected', attemptId: safeId(attemptId) });
        throw new Error(`Invalid submission: Option ${optId} does not belong to question ${answer.questionId}.`);
      }
    }
    answer.selectedOptionIds = uniqueSelected;
  }

  // 4. Grade each answer
  const answerRows: Array<{
    attempt_id: string;
    question_id: string;
    selected_option_ids: string[];
    is_correct: boolean;
    points_awarded: number;
    question_snapshot: Record<string, unknown>;
    selected_snapshot: unknown[];
    correct_snapshot: unknown[];
  }> = [];

  let totalScore = 0;
  let maxScore = 0;

  for (const q of questions) {
    const qWithOpts = q as LessonQuizQuestion & {
      options: LessonQuizOption[];
    };
    maxScore += qWithOpts.points;

    const answer = answers.find((a) => a.questionId === qWithOpts.id);
    const selectedIds = answer?.selectedOptionIds ?? [];
    const correctOptionIds = qWithOpts.options
      .filter((o) => o.is_correct)
      .map((o) => o.id);

    let isCorrect = false;

    if (qWithOpts.question_type === 'single_choice' || qWithOpts.question_type === 'true_false') {
      // Single correct: selected set must exactly match correct set
      isCorrect =
        selectedIds.length === 1 &&
        correctOptionIds.length === 1 &&
        selectedIds[0] === correctOptionIds[0];
    } else if (qWithOpts.question_type === 'multiple_choice') {
      // Multiple correct: selected set must exactly equal correct set
      const selectedSet = new Set(selectedIds);
      const correctSet = new Set(correctOptionIds);
      isCorrect =
        selectedSet.size === correctSet.size &&
        [...selectedSet].every((id) => correctSet.has(id));
    }

    const pointsAwarded = isCorrect ? qWithOpts.points : 0;
    totalScore += pointsAwarded;

    // Build snapshots for audit trail
    const questionSnapshot = {
      id: qWithOpts.id,
      question_text: qWithOpts.question_text,
      question_type: qWithOpts.question_type,
      explanation: qWithOpts.explanation,
      points: qWithOpts.points,
    };

    const selectedSnapshot = qWithOpts.options
      .filter((o) => selectedIds.includes(o.id))
      .map((o) => ({ id: o.id, option_text: o.option_text }));

    const correctSnapshot = qWithOpts.options
      .filter((o) => o.is_correct)
      .map((o) => ({ id: o.id, option_text: o.option_text }));

    answerRows.push({
      attempt_id: attemptId,
      question_id: qWithOpts.id,
      selected_option_ids: selectedIds,
      is_correct: isCorrect,
      points_awarded: pointsAwarded,
      question_snapshot: questionSnapshot,
      selected_snapshot: selectedSnapshot,
      correct_snapshot: correctSnapshot,
    });
  }

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : 0;
  const passed = percentage >= (quiz.passing_percentage ?? 0);

  // 5. Save answer rows
  const { error: answersErr } = await sb
    .from('lesson_quiz_attempt_answers')
    .insert(answerRows);

  if (answersErr) {
    throw new Error(`Failed to save answers: ${answersErr.message}`);
  }

  // 6. Update attempt
  const { error: attemptErr } = await sb
    .from('lesson_quiz_attempts')
    .update({
      score: totalScore,
      max_score: maxScore,
      percentage,
      passed,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', attemptId);

  if (attemptErr) {
    throw new Error(`Failed to update attempt: ${attemptErr.message}`);
  }

  // 7. Update student_progress based on completion_rule
  if (quiz.completion_rule === 'submit' || (quiz.completion_rule === 'pass' && passed)) {
    await sb
      .from('student_progress')
      .upsert(
        {
          student_id: studentId,
          item_id: itemId,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,item_id' },
      );
  }

  // 8. Build result
  const updatedAttempt: LessonQuizAttempt = {
    ...(attempt as unknown as LessonQuizAttempt),
    score: totalScore,
    max_score: maxScore,
    percentage,
    passed,
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  };

  const savedAnswers: LessonQuizAttemptAnswer[] = answerRows.map((row) => ({
    id: '',
    ...row,
    created_at: new Date().toISOString(),
  }));

  return {
    attempt: updatedAttempt,
    answers: savedAnswers,
    score: totalScore,
    maxScore,
    percentage,
    passed,
  };
}
