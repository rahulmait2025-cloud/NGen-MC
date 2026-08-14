'use server';

/**
 * Quiz CRUD Server Actions
 *
 * Handles creating, reading, updating, and deleting lesson quizzes
 * linked to master_course_items (quiz_placeholder type).
 *
 * Replaces the old assessment-based quiz system.
 */

import { requireAuth } from '@/lib/auth/require-superadmin-action';
import {
  getLessonQuizForItemAdmin,
  saveLessonQuizDraft,
  deleteLessonQuiz,
  publishLessonQuizItem,
  unpublishLessonQuizItem,
  getLessonQuizStatuses,
} from '@/lib/services/lesson-quiz-admin';
import {
  formatSaveQuizErrors,
  saveQuizInputSchema,
} from '@/lib/validation/lesson-quiz';
import type { LessonQuizWithQuestions } from '@/types/lesson-quiz';

interface ActionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuizData = LessonQuizWithQuestions;

// ─── Get Quiz for Item ────────────────────────────────────────────────────────

export async function getQuizForItem(itemId: string): Promise<ActionResponse<QuizData>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const data = await getLessonQuizForItemAdmin(itemId);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Save Quiz (Create or Update) ─────────────────────────────────────────────

export async function saveQuiz(input: {
  itemId: string;
  masterCourseId: string;
  title: string;
  description?: string;
  timeLimitMinutes?: number | null;
  passingScore?: number | null;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showCorrectAnswers?: boolean;
  sort_order?: number | null;
  status?: 'draft' | 'published';
  linkedVideoId?: string | null;
  questions: Array<{
    id?: string;
    text: string;
    type: 'single_select' | 'multi_select' | 'true_false' | 'single_choice' | 'multiple_choice';
    points: number;
    explanation?: string;
    options: Array<{
      id?: string;
      text: string;
      is_correct: boolean;
    }>;
  }>;
}): Promise<ActionResponse<{ quizId: string; versioned: boolean }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const validation = saveQuizInputSchema.safeParse(input);
  if (!validation.success) {
    const messages = formatSaveQuizErrors(validation.error);
    const summary = messages
      .slice(0, 5)
      .map((m) => `${m.field}: ${m.message}`)
      .join('; ');
    return {
      ok: false,
      error: summary || 'Quiz validation failed.',
    };
  }

  try {
    const admin = (await import('@/lib/supabase/admin')).createAdminClient();
    const { updateItem } = await import('@/lib/services/master-course-structure');

    // Get item's current quiz_id and metadata
    const { data: item } = await admin
      .from('master_course_items')
      .select('quiz_id, metadata, module_id')
      .eq('id', input.itemId)
      .single();

    const existingQuizId = item?.quiz_id as string | null;
    const existingMetadata = (item?.metadata as Record<string, unknown>) || {};
    
    // Construct new metadata by updating linked_video_id and placement
    const placement =
      input.linkedVideoId
        ? 'after_video'
        : input.sort_order === 999999
          ? 'end'
          : input.sort_order === -1
            ? 'start'
            : 'custom';
    const newMetadata = {
      ...existingMetadata,
      linked_video_id: input.linkedVideoId || null,
      placement,
    };

    if (existingQuizId) {
      // Update existing quiz
      const result = await saveLessonQuizDraft({
        quizId: existingQuizId,
        title: input.title,
        description: input.description,
        passing_percentage: input.passingScore ?? undefined,
        time_limit_minutes: input.timeLimitMinutes ?? undefined,
        shuffle_questions: input.shuffleQuestions,
        shuffle_options: input.shuffleOptions,
        show_correct_answers: input.showCorrectAnswers,
        publish_status: input.status,
        questions: input.questions.map((q, qi) => ({
          question_text: q.text,
          question_type: q.type === 'single_select' || q.type === 'single_choice' ? 'single_choice' as const
            : q.type === 'multi_select' || q.type === 'multiple_choice' ? 'multiple_choice' as const
            : 'true_false' as const,
          points: q.points,
          explanation: q.explanation,
          sort_order: qi,
          options: q.options.map((o, oi) => ({
            option_text: o.text,
            is_correct: o.is_correct,
            sort_order: oi,
          })),
        })),
      });

      // Update the master_course_items title, publish_status, metadata, and sort_order using updateItem service
      await updateItem(input.itemId, {
        quiz_id: result.id,
        title: input.title,
        publish_status: input.status ?? 'published',
        metadata: newMetadata,
        ...(input.sort_order != null ? { sort_order: input.sort_order } : {}),
      });

      return { ok: true, data: { quizId: result.id, versioned: result.versioned } };
    } else {
      // Create new quiz in lesson_quizzes table first (this avoids duplicate master_course_items rows!)
      const { data: quiz, error: quizError } = await admin
        .from('lesson_quizzes')
        .insert({
          master_course_id: input.masterCourseId,
          module_id: item?.module_id ?? '',
          title: input.title,
          description: input.description ?? null,
          passing_percentage: input.passingScore ?? 0,
          time_limit_minutes: input.timeLimitMinutes ?? null,
          shuffle_questions: input.shuffleQuestions ?? false,
          shuffle_options: input.shuffleOptions ?? false,
          show_result_after_submit: true,
          show_correct_answers: input.showCorrectAnswers ?? true,
          completion_rule: 'submit',
          publish_status: input.status ?? 'published',
        })
        .select()
        .single();

      if (quizError || !quiz) {
        throw new Error(`Failed to create quiz: ${quizError?.message ?? 'Unknown error'}`);
      }

      // Link the quiz to the existing item and update title, status, metadata, sort_order
      await updateItem(input.itemId, {
        quiz_id: quiz.id,
        title: input.title,
        publish_status: input.status ?? 'published',
        metadata: newMetadata,
        ...(input.sort_order != null ? { sort_order: input.sort_order } : {}),
      });

      // Now save the questions/options to the new quiz
      await saveLessonQuizDraft({
        quizId: quiz.id,
        title: input.title,
        description: input.description,
        passing_percentage: input.passingScore ?? undefined,
        time_limit_minutes: input.timeLimitMinutes ?? undefined,
        shuffle_questions: input.shuffleQuestions,
        shuffle_options: input.shuffleOptions,
        show_correct_answers: input.showCorrectAnswers,
        publish_status: input.status ?? 'published',
        questions: input.questions.map((q, qi) => ({
          question_text: q.text,
          question_type: q.type === 'single_select' || q.type === 'single_choice' ? 'single_choice' as const
            : q.type === 'multi_select' || q.type === 'multiple_choice' ? 'multiple_choice' as const
            : 'true_false' as const,
          points: q.points,
          explanation: q.explanation,
          sort_order: qi,
          options: q.options.map((o, oi) => ({
            option_text: o.text,
            is_correct: o.is_correct,
            sort_order: oi,
          })),
        })),
      });

      return { ok: true, data: { quizId: quiz.id, versioned: false } };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Delete Quiz ──────────────────────────────────────────────────────────────

export async function deleteQuiz(itemId: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    await deleteLessonQuiz(itemId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Get Quiz Statuses (batch) ──────────────────────────────────────────────

export async function getQuizStatuses(quizIds: string[]): Promise<ActionResponse<Record<string, { publish_status: string; title: string }>>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const data = await getLessonQuizStatuses(quizIds);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Toggle Quiz Publish (FormData action) ───────────────────────────────────

export async function toggleQuizPublishAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const itemId = formData.get('item_id') as string;
  const status = formData.get('status') as string;

  if (!itemId || !status) return { ok: false, error: 'Missing parameters' };

  try {
    if (status === 'published') {
      const result = await publishLessonQuizItem({ itemId });
      if (!result.ok) return { ok: false, error: result.errors?.join(', ') ?? 'Failed to publish' };
    } else {
      const result = await unpublishLessonQuizItem({ itemId });
      if (!result.ok) return { ok: false, error: result.error ?? 'Failed to unpublish' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
