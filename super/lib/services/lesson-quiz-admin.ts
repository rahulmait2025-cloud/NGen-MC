import 'server-only';

/**
 * Lesson Quiz Admin Service
 *
 * Handles CRUD operations for lesson quizzes from the SuperAdmin dashboard.
 * Manages quiz creation, draft saving, validation, versioning, and publishing.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateCourseStructure } from '@/lib/cache/invalidate-course';
import type {
  LessonQuizQuestion,
  LessonQuizOption,
  LessonQuizWithQuestions,
  CreateLessonQuizInput,
  SaveLessonQuizDraftInput,
  ValidateLessonQuizInput,
  CloneLessonQuizVersionInput,
  PublishLessonQuizInput,
  UnpublishLessonQuizInput,
  CreateLessonQuizResult,
  ValidateLessonQuizResult,
  CloneLessonQuizVersionResult,
} from '@/types/lesson-quiz';

// ─── createLessonQuizCurriculumItem ──────────────────────────────────────────

/**
 * Creates a new lesson quiz and its matching curriculum item.
 * If item insert fails, deletes the orphan quiz.
 */
export async function createLessonQuizCurriculumItem(
  input: CreateLessonQuizInput,
): Promise<CreateLessonQuizResult> {
  const admin = createAdminClient();

  // 1. Create lesson_quizzes row
  const { data: quiz, error: quizError } = await admin
    .from('lesson_quizzes')
    .insert({
      master_course_id: input.master_course_id,
      module_id: input.module_id,
      title: input.title,
      description: input.description ?? null,
      instructions_md: input.instructions_md ?? null,
      passing_percentage: input.passing_percentage ?? 0,
      max_attempts: input.max_attempts ?? null,
      time_limit_minutes: input.time_limit_minutes ?? null,
      shuffle_questions: input.shuffle_questions ?? false,
      shuffle_options: input.shuffle_options ?? false,
      show_result_after_submit: input.show_result_after_submit ?? true,
      show_correct_answers: input.show_correct_answers ?? true,
      completion_rule: input.completion_rule ?? 'submit',
      metadata: input.metadata ?? {},
      created_by: input.created_by ?? null,
    })
    .select()
    .single();

  if (quizError || !quiz) {
    throw new Error(`Failed to create quiz: ${quizError?.message ?? 'No data returned'}`);
  }

  // 2. Calculate sort_order if not provided
  let sortOrder = input.sort_order ?? 0;
  if (input.sort_order === undefined) {
    const { data: latest } = await admin
      .from('master_course_items')
      .select('sort_order')
      .eq('module_id', input.module_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    sortOrder = latest ? latest.sort_order + 10 : 0;
  }

  // 3. Create master_course_items row
  const { data: item, error: itemError } = await admin
    .from('master_course_items')
    .insert({
      master_course_id: input.master_course_id,
      module_id: input.module_id,
      title: input.title,
      item_type: 'quiz_placeholder',
      quiz_id: quiz.id,
      sort_order: sortOrder,
      publish_status: 'draft',
      metadata: { kind: 'lesson_quiz' },
    })
    .select('id, quiz_id, item_type, sort_order')
    .single();

  if (itemError || !item) {
    // Cleanup: delete orphan quiz
    await admin.from('lesson_quizzes').delete().eq('id', quiz.id);
    throw new Error(`Failed to create curriculum item: ${itemError?.message ?? 'No data returned'}`);
  }

  // 4. Revalidate cache
  await revalidateCourseStructure(input.master_course_id);

  return { item, quiz };
}

// ─── getLessonQuizForAdmin ───────────────────────────────────────────────────

/**
 * Fetches a quiz with all questions and options for the editor.
 */
export async function getLessonQuizForAdmin(
  quizId: string,
): Promise<LessonQuizWithQuestions> {
  const admin = createAdminClient();

  const { data: quiz, error } = await admin
    .from('lesson_quizzes')
    .select(`
      *,
      questions:lesson_quiz_questions(
        *,
        options:lesson_quiz_options(*)
      )
    `)
    .eq('id', quizId)
    .single();

  if (error || !quiz) {
    throw new Error('Quiz not found');
  }

  // Sort questions by sort_order, options by sort_order
  const questions = (quiz.questions ?? [])
    .sort((a: LessonQuizQuestion, b: LessonQuizQuestion) => a.sort_order - b.sort_order)
    .map((q: LessonQuizQuestion & { options?: LessonQuizOption[] }) => ({
      ...q,
      options: (q.options ?? []).sort(
        (a: LessonQuizOption, b: LessonQuizOption) => a.sort_order - b.sort_order,
      ),
    }));

  return { ...quiz, questions } as LessonQuizWithQuestions;
}

// ─── getLessonQuizForItemAdmin ───────────────────────────────────────────────

/**
 * Fetches quiz data by curriculum item ID.
 */
export async function getLessonQuizForItemAdmin(
  itemId: string,
): Promise<LessonQuizWithQuestions> {
  const admin = createAdminClient();

  // Fetch the curriculum item
  const { data: item, error: itemErr } = await admin
    .from('master_course_items')
    .select('id, item_type, quiz_id')
    .eq('id', itemId)
    .single();

  if (itemErr || !item) {
    throw new Error('Item not found');
  }

  if (item.item_type !== 'quiz_placeholder') {
    throw new Error('Item is not a quiz');
  }

  if (!item.quiz_id) {
    throw new Error('No quiz linked to this item');
  }

  return getLessonQuizForAdmin(item.quiz_id);
}

// ─── saveLessonQuizDraft ─────────────────────────────────────────────────────

/**
 * Saves quiz metadata and replaces draft questions/options.
 * If submitted attempts exist, clones to a new version instead of destructive edit.
 */
export async function saveLessonQuizDraft(
  input: SaveLessonQuizDraftInput,
): Promise<LessonQuizWithQuestions & { versioned: boolean }> {
  const admin = createAdminClient();

  // 1. Check for submitted attempts
  const { count } = await admin
    .from('lesson_quiz_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('quiz_id', input.quizId)
    .eq('status', 'submitted');

  if ((count ?? 0) > 0) {
    // Clone to new version instead of destructive edit
    const cloned = await cloneLessonQuizVersion({
      quizId: input.quizId,
      title: input.title,
    });

    // Save the draft data to the new quiz
    const newQuiz = await saveQuizDraftData(cloned.quiz.id, input);

    return { ...newQuiz, versioned: true };
  }

  // 2. No submitted attempts — destructive edit is safe
  const quiz = await saveQuizDraftData(input.quizId, input);

  return { ...quiz, versioned: false };
}

/**
 * Internal: saves quiz metadata and replaces questions/options.
 */
async function saveQuizDraftData(
  quizId: string,
  input: SaveLessonQuizDraftInput,
): Promise<LessonQuizWithQuestions> {
  const admin = createAdminClient();

  // Update quiz metadata
  const updatePayload: Record<string, unknown> = {};
  if (input.title !== undefined) updatePayload.title = input.title;
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.instructions_md !== undefined) updatePayload.instructions_md = input.instructions_md;
  if (input.passing_percentage !== undefined) updatePayload.passing_percentage = input.passing_percentage;
  if (input.max_attempts !== undefined) updatePayload.max_attempts = input.max_attempts;
  if (input.time_limit_minutes !== undefined) updatePayload.time_limit_minutes = input.time_limit_minutes;
  if (input.shuffle_questions !== undefined) updatePayload.shuffle_questions = input.shuffle_questions;
  if (input.shuffle_options !== undefined) updatePayload.shuffle_options = input.shuffle_options;
  if (input.show_result_after_submit !== undefined) updatePayload.show_result_after_submit = input.show_result_after_submit;
  if (input.show_correct_answers !== undefined) updatePayload.show_correct_answers = input.show_correct_answers;
  if (input.completion_rule !== undefined) updatePayload.completion_rule = input.completion_rule;
  if (input.metadata !== undefined) updatePayload.metadata = input.metadata;
  if (input.publish_status !== undefined) updatePayload.publish_status = input.publish_status;

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await admin
      .from('lesson_quizzes')
      .update(updatePayload)
      .eq('id', quizId);

    if (error) throw new Error(`Failed to update quiz: ${error.message}`);
  }

  // Replace questions and options if provided
  if (input.questions) {
    // Delete existing questions (cascade deletes options)
    await admin.from('lesson_quiz_questions').delete().eq('quiz_id', quizId);

    // Insert new questions and options
    for (let qi = 0; qi < input.questions.length; qi++) {
      const q = input.questions[qi];

      const { data: question, error: qErr } = await admin
        .from('lesson_quiz_questions')
        .insert({
          quiz_id: quizId,
          question_text: q.question_text,
          question_type: q.question_type,
          explanation: q.explanation ?? null,
          points: q.points ?? 1,
          sort_order: q.sort_order ?? qi,
        })
        .select('id')
        .single();

      if (qErr || !question) {
        throw new Error(`Failed to create question ${qi + 1}: ${qErr?.message}`);
      }

      // Insert options
      const optionRows = q.options.map((o, oi) => ({
        question_id: question.id,
        option_text: o.option_text,
        is_correct: o.is_correct,
        sort_order: o.sort_order ?? oi,
      }));

      if (optionRows.length > 0) {
        const { error: oErr } = await admin.from('lesson_quiz_options').insert(optionRows);
        if (oErr) {
          throw new Error(`Failed to create options for question ${qi + 1}: ${oErr.message}`);
        }
      }
    }
  }

  // Revalidate cache
  const { data: quiz } = await admin
    .from('lesson_quizzes')
    .select('master_course_id')
    .eq('id', quizId)
    .single();

  if (quiz) {
    await revalidateCourseStructure(quiz.master_course_id);
  }

  return getLessonQuizForAdmin(quizId);
}

// ─── validateLessonQuizForPublish ────────────────────────────────────────────

/**
 * Validates that a quiz is ready to be published.
 */
export async function validateLessonQuizForPublish(
  input: ValidateLessonQuizInput,
): Promise<ValidateLessonQuizResult> {
  const admin = createAdminClient();
  const errors: string[] = [];

  const { data: quiz } = await admin
    .from('lesson_quizzes')
    .select(`
      id, title, passing_percentage, max_attempts, time_limit_minutes,
      questions:lesson_quiz_questions(
        id, question_text, question_type, explanation, points,
        options:lesson_quiz_options(id, option_text, is_correct)
      )
    `)
    .eq('id', input.quizId)
    .single();

  if (!quiz) {
    return { valid: false, errors: ['Quiz not found'] };
  }

  // Title
  if (!quiz.title?.trim()) {
    errors.push('Quiz title is required');
  }

  // Passing percentage
  if (quiz.passing_percentage < 0 || quiz.passing_percentage > 100) {
    errors.push('Passing percentage must be between 0 and 100');
  }

  // Max attempts
  if (quiz.max_attempts !== null && quiz.max_attempts <= 0) {
    errors.push('Max attempts must be null or greater than 0');
  }

  // Time limit
  if (quiz.time_limit_minutes !== null && quiz.time_limit_minutes <= 0) {
    errors.push('Time limit must be null or greater than 0');
  }

  // Questions
  const questions = quiz.questions ?? [];
  if (questions.length === 0) {
    errors.push('At least one question is required');
  }

  for (const q of questions) {
    const qNum = `Question "${q.question_text?.slice(0, 30) ?? q.id}"`;

    if (!q.question_text?.trim()) {
      errors.push(`${qNum}: text is required`);
    }

    if (!q.explanation?.trim()) {
      errors.push(`${qNum}: answer explanation is required before publishing`);
    }

    if (q.points <= 0) {
      errors.push(`${qNum}: points must be greater than 0`);
    }

    if (!q.explanation?.trim()) {
      errors.push(`${qNum}: answer explanation is required before publishing`);
    }

    const options = q.options ?? [];

    if (q.question_type === 'true_false') {
      // true_false: exactly 2 options
      if (options.length !== 2) {
        errors.push(`${qNum}: true/false must have exactly 2 options`);
      }
    } else {
      // single_choice / multiple_choice: at least 2 options
      if (options.length < 2) {
        errors.push(`${qNum}: must have at least 2 options`);
      }
    }

    // Check option text
    for (const o of options) {
      if (!o.option_text?.trim()) {
        errors.push(`${qNum}: option text is required`);
      }
    }

    // Check correct answers
    const correctCount = options.filter((o) => o.is_correct).length;

    if (q.question_type === 'single_choice' || q.question_type === 'true_false') {
      if (correctCount !== 1) {
        errors.push(`${qNum}: must have exactly 1 correct answer`);
      }
    } else if (q.question_type === 'multiple_choice') {
      if (correctCount < 1) {
        errors.push(`${qNum}: must have at least 1 correct answer`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── publishLessonQuizItem ───────────────────────────────────────────────────

/**
 * Publishes a quiz and its curriculum item after validation.
 */
export async function publishLessonQuizItem(
  input: PublishLessonQuizInput,
): Promise<{ ok: boolean; errors?: string[] }> {
  const admin = createAdminClient();

  // Fetch item
  const { data: item, error: itemErr } = await admin
    .from('master_course_items')
    .select('id, item_type, quiz_id, master_course_id')
    .eq('id', input.itemId)
    .single();

  if (itemErr || !item) {
    return { ok: false, errors: ['Item not found'] };
  }

  if (item.item_type !== 'quiz_placeholder') {
    return { ok: false, errors: ['Item is not a quiz'] };
  }

  if (!item.quiz_id) {
    return { ok: false, errors: ['No quiz linked to this item'] };
  }

  // Validate
  const validation = await validateLessonQuizForPublish({ quizId: item.quiz_id });
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  // Publish quiz
  const { error: quizErr } = await admin
    .from('lesson_quizzes')
    .update({ publish_status: 'published' })
    .eq('id', item.quiz_id);

  if (quizErr) {
    return { ok: false, errors: [`Failed to publish quiz: ${quizErr.message}`] };
  }

  // Publish curriculum item
  const { error: itemErr2 } = await admin
    .from('master_course_items')
    .update({ publish_status: 'published' })
    .eq('id', input.itemId);

  if (itemErr2) {
    return { ok: false, errors: [`Failed to publish item: ${itemErr2.message}`] };
  }

  // Revalidate
  await revalidateCourseStructure(item.master_course_id);

  return { ok: true };
}

// ─── unpublishLessonQuizItem ─────────────────────────────────────────────────

/**
 * Unpublishes a quiz and its curriculum item.
 */
export async function unpublishLessonQuizItem(
  input: UnpublishLessonQuizInput,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();

  const { data: item, error: itemErr } = await admin
    .from('master_course_items')
    .select('id, item_type, quiz_id, master_course_id')
    .eq('id', input.itemId)
    .single();

  if (itemErr || !item) {
    return { ok: false, error: 'Item not found' };
  }

  if (item.item_type !== 'quiz_placeholder' || !item.quiz_id) {
    return { ok: false, error: 'Item is not a quiz' };
  }

  // Unpublish quiz
  await admin
    .from('lesson_quizzes')
    .update({ publish_status: 'unpublished' })
    .eq('id', item.quiz_id);

  // Unpublish curriculum item
  await admin
    .from('master_course_items')
    .update({ publish_status: 'unpublished' })
    .eq('id', input.itemId);

  // Revalidate
  await revalidateCourseStructure(item.master_course_id);

  return { ok: true };
}

// ─── cloneLessonQuizVersion ──────────────────────────────────────────────────

/**
 * Creates a new version of a quiz by cloning its structure.
 */
export async function cloneLessonQuizVersion(
  input: CloneLessonQuizVersionInput,
): Promise<CloneLessonQuizVersionResult> {
  const admin = createAdminClient();

  // Fetch existing quiz with questions and options
  const { data: oldQuiz, error } = await admin
    .from('lesson_quizzes')
    .select(`
      *,
      questions:lesson_quiz_questions(
        *,
        options:lesson_quiz_options(*)
      )
    `)
    .eq('id', input.quizId)
    .single();

  if (error || !oldQuiz) {
    throw new Error('Quiz not found');
  }

  // Create cloned quiz
  const newVersion = oldQuiz.version + 1;
  const { data: newQuiz, error: createErr } = await admin
    .from('lesson_quizzes')
    .insert({
      master_course_id: oldQuiz.master_course_id,
      module_id: oldQuiz.module_id,
      title: input.title ?? `Copy of ${oldQuiz.title}`,
      description: oldQuiz.description,
      instructions_md: oldQuiz.instructions_md,
      passing_percentage: oldQuiz.passing_percentage,
      max_attempts: oldQuiz.max_attempts,
      time_limit_minutes: oldQuiz.time_limit_minutes,
      shuffle_questions: oldQuiz.shuffle_questions,
      shuffle_options: oldQuiz.shuffle_options,
      show_result_after_submit: oldQuiz.show_result_after_submit,
      show_correct_answers: oldQuiz.show_correct_answers,
      completion_rule: oldQuiz.completion_rule,
      version: newVersion,
      parent_quiz_id: oldQuiz.id,
      metadata: oldQuiz.metadata,
      created_by: oldQuiz.created_by,
    })
    .select()
    .single();

  if (createErr || !newQuiz) {
    throw new Error(`Failed to create quiz clone: ${createErr?.message}`);
  }

  // Clone questions and options
  let questionCount = 0;
  let optionCount = 0;

  for (const q of oldQuiz.questions ?? []) {
    const { data: newQ, error: qErr } = await admin
      .from('lesson_quiz_questions')
      .insert({
        quiz_id: newQuiz.id,
        question_text: q.question_text,
        question_type: q.question_type,
        explanation: q.explanation,
        points: q.points,
        sort_order: q.sort_order,
        metadata: q.metadata,
      })
      .select('id')
      .single();

    if (qErr || !newQ) continue;
    questionCount++;

    const optionRows = (q.options ?? []).map((o: LessonQuizOption) => ({
      question_id: newQ.id,
      option_text: o.option_text,
      is_correct: o.is_correct,
      sort_order: o.sort_order,
    }));

    if (optionRows.length > 0) {
      const { error: oErr } = await admin.from('lesson_quiz_options').insert(optionRows);
      if (!oErr) optionCount += optionRows.length;
    }
  }

  // Relink master_course_items.quiz_id to new quiz
  await admin
    .from('master_course_items')
    .update({ quiz_id: newQuiz.id })
    .eq('quiz_id', input.quizId);

  // Lock old quiz
  await admin
    .from('lesson_quizzes')
    .update({ locked_at: new Date().toISOString() })
    .eq('id', input.quizId);

  // Revalidate
  await revalidateCourseStructure(oldQuiz.master_course_id);

  return { quiz: newQuiz, questionCount, optionCount };
}

// ─── deleteLessonQuiz ────────────────────────────────────────────────────────

/**
 * Fully deletes a quiz and its curriculum item from the course.
 * Order matters due to FK RESTRICT on quiz_id / attempt.quiz_id / answer.question_id:
 * 1) delete attempts (answers cascade via attempt_id)
 * 2) delete curriculum item (progress cascades)
 * 3) delete quiz (questions/options cascade)
 */
export async function deleteLessonQuiz(itemId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: item } = await admin
    .from('master_course_items')
    .select('id, quiz_id, master_course_id, item_type')
    .eq('id', itemId)
    .single();

  if (!item) {
    throw new Error('Curriculum item not found');
  }

  const quizId = item.quiz_id;
  const masterCourseId = item.master_course_id;

  if (quizId) {
    // Remove attempts first so quiz delete is not blocked by ON DELETE RESTRICT
    const { error: attemptsError } = await admin
      .from('lesson_quiz_attempts')
      .delete()
      .eq('quiz_id', quizId);
    if (attemptsError) {
      throw new Error(`Failed to delete quiz attempts: ${attemptsError.message}`);
    }
  }

  // Remove curriculum placeholder so LMS no longer lists the quiz
  const { error: itemError } = await admin
    .from('master_course_items')
    .delete()
    .eq('id', itemId);
  if (itemError) {
    throw new Error(`Failed to delete curriculum item: ${itemError.message}`);
  }

  if (quizId) {
    const { error: quizError } = await admin
      .from('lesson_quizzes')
      .delete()
      .eq('id', quizId);
    if (quizError) {
      throw new Error(`Failed to delete quiz: ${quizError.message}`);
    }
  }

  if (masterCourseId) {
    await revalidateCourseStructure(masterCourseId);
  }
}

// ─── getLessonQuizStatuses ───────────────────────────────────────────────────

/**
 * Batch fetch of quiz publish statuses for multiple quiz IDs.
 */
export async function getLessonQuizStatuses(
  quizIds: string[],
): Promise<Record<string, { publish_status: string; title: string }>> {
  if (quizIds.length === 0) return {};

  const admin = createAdminClient();

  const { data } = await admin
    .from('lesson_quizzes')
    .select('id, publish_status, title')
    .in('id', quizIds);

  const map: Record<string, { publish_status: string; title: string }> = {};
  for (const q of data ?? []) {
    map[q.id] = {
      publish_status: q.publish_status,
      title: q.title || '',
    };
  }
  return map;
}
