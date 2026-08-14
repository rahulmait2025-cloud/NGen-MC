'use server';

/**
 * Student Quiz Attempt Server Actions
 *
 * Handles loading quiz data, starting attempts, submitting answers,
 * and fetching results for the in-player quiz experience.
 * Uses the lesson_quiz_* tables (not the old assessment system).
 */

import { requireAuth } from '@/lib/auth/require-student-action';
import { getLessonQuizPayloadForItem, startLessonQuizAttempt, submitLessonQuizAttempt } from '@/lib/services/student-lesson-quiz';
import type { LessonQuizPayload, LessonQuizAttempt, LessonQuizAttemptResult } from '@/types/lesson-quiz';


// ─── Get Quiz Payload ─────────────────────────────────────────────────────────

export async function getQuizPayload(input: {
  courseId: string;
  itemId: string;
  collegeSlug: string;
}): Promise<{ success: boolean; data: LessonQuizPayload | null; error?: string }> {
  try {
    const auth = await requireAuth(input.collegeSlug);
    if (!auth) return { success: false, data: null, error: 'Unauthorized' };

    const isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(auth.tenant.slug.toLowerCase());
    const collegeId = isGlobal ? null : auth.tenant.id;

    const payload = await getLessonQuizPayloadForItem({
      studentId: auth.studentId,
      collegeId,
      isGlobal,
      courseId: input.courseId,
      itemId: input.itemId,
    });
    return { success: true, data: payload };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load quiz.';
    return { success: false, data: null, error: message };
  }
}

// ─── Start Attempt ────────────────────────────────────────────────────────────

export async function startAttempt(input: {
  courseId: string;
  itemId: string;
  collegeSlug: string;
}): Promise<{ success: boolean; attempt: LessonQuizAttempt | null; error?: string }> {
  try {
    const { requireSensitiveStudentRuntime } = await import('@/lib/student-runtime/runtime');
    const runtime = await requireSensitiveStudentRuntime(input.collegeSlug);
    if (!runtime) return { success: false, attempt: null, error: 'Unauthorized' };

    const isGlobal = runtime.tenant.isGlobal;
    const collegeId = isGlobal ? null : runtime.tenant.collegeId;

    const attempt = await startLessonQuizAttempt({
      studentId: runtime.student.studentId,
      collegeId,
      courseId: input.courseId,
      itemId: input.itemId,
    });
    return { success: true, attempt };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start attempt.';
    return { success: false, attempt: null, error: message };
  }
}

// ─── Submit Attempt ───────────────────────────────────────────────────────────

export async function submitAttempt(input: {
  attemptId: string;
  itemId: string;
  courseId: string;
  collegeSlug: string;
  answers: Array<{ questionId: string; selectedOptionIds: string[] }>;
}): Promise<{ success: boolean; result: LessonQuizAttemptResult | null; error?: string }> {
  try {
    const { requireSensitiveStudentRuntime } = await import('@/lib/student-runtime/runtime');
    const runtime = await requireSensitiveStudentRuntime(input.collegeSlug);
    if (!runtime) return { success: false, result: null, error: 'Unauthorized' };

    const isGlobal = runtime.tenant.isGlobal;
    const collegeId = isGlobal ? null : runtime.tenant.collegeId;

    const result = await submitLessonQuizAttempt({
      studentId: runtime.student.studentId,
      collegeId,
      isGlobal,
      courseId: input.courseId,
      attemptId: input.attemptId,
      itemId: input.itemId,
      answers: input.answers,
    });
    return { success: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit quiz.';
    return { success: false, result: null, error: message };
  }
}


export async function getQuizHistory(input: {
  courseId: string;
  itemId: string;
  collegeSlug: string;
}): Promise<{
  attempts: number;
  bestScore: number | null;
  bestPercentage: number | null;
  latestPassed: boolean | null;
} | null> {
  try {
    const auth = await requireAuth(input.collegeSlug);
    if (!auth) return null;

    const { getQuizIdForItem, getLessonQuizAttemptCount } = await import('@/lib/services/student-lesson-quiz');
    const quizId = await getQuizIdForItem(input.courseId, input.itemId);
    if (!quizId) return null;

    const attempts = await getLessonQuizAttemptCount(quizId, auth.studentId);

    return {
      attempts,
      bestScore: null,
      bestPercentage: null,
      latestPassed: null,
    };
  } catch {
    return null;
  }
}
