'use client';

/**
 * Quiz Player — main orchestrator.
 *
 * Renders start screen → attempt screen → result screen.
 * Uses courseId + itemId (not raw quizId) for all operations.
 *
 * Performance optimizations:
 * - Accepts initialPayload prop to skip client-side fetch (prefetched by shell bundle)
 * - Deduplicates fetch logic: one fetchQuizData() function used by all call sites
 * - Race condition guard: generation counter prevents stale responses overwriting newer ones
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getQuizPayload, startAttempt, submitAttempt } from '@/app/c/[collegeSlug]/student/(authenticated)/learn/quiz-actions';
import type { LessonQuizPayload as QuizPayload, LessonQuizAttempt, LessonQuizAttemptResult, LessonQuizQuestionPayload } from '@/types/lesson-quiz';
import { QuizStartScreen } from './quiz-start-screen';
import { QuizAttemptScreen } from './quiz-attempt-screen';
import { QuizResultScreen } from './quiz-result-screen';

interface QuizPlayerProps {
  courseId: string;
  itemId: string;
  collegeSlug: string;
  onComplete?: () => void;
  /** Pre-fetched payload from shell bundle — skips client-side fetch when provided */
  initialPayload?: QuizPayload | null;
}

type QuizState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'start'; quiz: QuizPayload; history: { attempts: number; bestScore: number | null; bestPercentage: number | null; latestPassed: boolean | null } | null }
  | { phase: 'attempt'; quiz: QuizPayload; attempt: LessonQuizAttempt; shuffledQuestions: LessonQuizQuestionPayload[]; shuffledOptionOrders: Record<string, number[]> }
  | { phase: 'result'; result: LessonQuizAttemptResult; quiz: QuizPayload };

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildHistory(quiz: QuizPayload) {
  return {
    attempts: quiz.attempts_used,
    bestScore: null,
    bestPercentage: null,
    latestPassed: null,
  };
}

export function QuizPlayer({ courseId, itemId, collegeSlug, onComplete, initialPayload }: QuizPlayerProps) {
  // Track which itemId the initialPayload was for — if the user navigates to a
  // different quiz via pushState, initialPayload is stale and we must re-fetch.
  const initialPayloadForItemRef = useRef<string | null>(null);

  const [state, setState] = useState<QuizState>(() => {
    if (initialPayload) {
      return { phase: 'start', quiz: initialPayload, history: buildHistory(initialPayload) };
    }
    return { phase: 'loading' };
  });

  // Record which itemId the initialPayload belongs to (after first render).
  useEffect(() => {
    if (initialPayload) {
      initialPayloadForItemRef.current = itemId;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchGeneration = useRef(0);

  const fetchQuizData = useCallback(async (showLoading = false) => {
    if (showLoading) setState({ phase: 'loading' });

    const generation = ++fetchGeneration.current;

    try {
      const quizRes = await getQuizPayload({ courseId, itemId, collegeSlug });

      if (generation !== fetchGeneration.current) return;

      if (!quizRes || !quizRes.success || !quizRes.data) {
        setState({ phase: 'error', message: quizRes?.error || 'Quiz not found or not published yet.' });
        return;
      }

      setState({ phase: 'start', quiz: quizRes.data, history: buildHistory(quizRes.data) });
    } catch (err: unknown) {
      if (generation !== fetchGeneration.current) return;
      const message = err instanceof Error ? err.message : 'Could not load this quiz. Try again.';
      setState({ phase: 'error', message });
    }
  }, [courseId, itemId, collegeSlug]);

  useEffect(() => {
    // Skip fetch only if the initialPayload is fresh for THIS specific itemId.
    // After pushState navigation, initialPayload is stale (belongs to the previous item).
    if (initialPayload && initialPayloadForItemRef.current === itemId) return;

    let cancelled = false;
    const generation = ++fetchGeneration.current;

    async function load() {
      try {
        const quizRes = await getQuizPayload({ courseId, itemId, collegeSlug });
        if (cancelled || generation !== fetchGeneration.current) return;

        if (!quizRes || !quizRes.success || !quizRes.data) {
          setState({ phase: 'error', message: quizRes?.error || 'Quiz not found or not published yet.' });
          return;
        }

        setState({ phase: 'start', quiz: quizRes.data, history: buildHistory(quizRes.data) });
      } catch (err: unknown) {
        if (cancelled || generation !== fetchGeneration.current) return;
        const message = err instanceof Error ? err.message : 'Could not load this quiz. Try again.';
        setState({ phase: 'error', message });
      }
    }

    load();
    return () => { cancelled = true; };
  }, [courseId, itemId, collegeSlug, initialPayload]);

  const handleStart = useCallback(async () => {
    const quiz = state.phase === 'start' ? state.quiz : null;
    if (!quiz) return;

    const attemptResult = await startAttempt({ courseId, itemId, collegeSlug });
    if (!attemptResult.success || !attemptResult.attempt) {
      setState({ phase: 'error', message: attemptResult.error || 'Failed to start quiz attempt.' });
      return;
    }

    const shuffledQuestions = quiz.quiz.shuffle_questions
      ? fisherYatesShuffle(quiz.questions)
      : [...quiz.questions];

    const shuffledOptionOrders: Record<string, number[]> = {};
    for (const q of shuffledQuestions) {
      const indices = q.options.map((_, i) => i);
      shuffledOptionOrders[q.id] = quiz.quiz.shuffle_options
        ? fisherYatesShuffle(indices)
        : indices;
    }

    setState({
      phase: 'attempt',
      quiz,
      attempt: attemptResult.attempt,
      shuffledQuestions,
      shuffledOptionOrders,
    });
  }, [courseId, itemId, collegeSlug, state]);

  const handleSubmit = useCallback(async (answers: Record<string, string[]>) => {
    if (state.phase !== 'attempt') return;

    const answerArray = Object.entries(answers).map(([questionId, selectedOptionIds]) => ({
      questionId,
      selectedOptionIds,
    }));

    const result = await submitAttempt({
      attemptId: state.attempt.id,
      itemId,
      courseId,
      collegeSlug,
      answers: answerArray,
    });

    if (result.success && result.result) {
      try {
        localStorage.removeItem(`quiz_draft_${state.attempt.id}`);
      } catch {}
      setState({ phase: 'result', result: result.result, quiz: state.quiz });
    }
  }, [courseId, itemId, collegeSlug, state]);

  const handleRetry = useCallback(async () => {
    await fetchQuizData(false);
  }, [fetchQuizData]);

  if (state.phase === 'loading') {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 space-y-8 animate-in fade-in duration-300">
        <div className="mx-auto size-16 rounded-2xl bg-muted animate-pulse" />
        <div className="space-y-2 text-center">
          <div className="h-7 w-48 mx-auto bg-muted rounded-md animate-pulse" />
          <div className="h-4 w-64 mx-auto bg-muted/60 rounded-md animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <div className="h-3 w-14 mx-auto bg-muted rounded animate-pulse" />
              <div className="h-6 w-10 mx-auto bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <div className="h-11 w-36 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (state.phase === 'start') {
    return (
      <QuizStartScreen
        quiz={state.quiz}
        history={state.history}
        onStart={handleStart}
      />
    );
  }

  if (state.phase === 'attempt') {
    return (
      <QuizAttemptScreen
        quiz={state.quiz}
        attempt={state.attempt}
        shuffledQuestions={state.shuffledQuestions}
        shuffledOptionOrders={state.shuffledOptionOrders}
        onSubmit={handleSubmit}
      />
    );
  }

  if (state.phase === 'result') {
    return (
      <QuizResultScreen
        result={state.result}
        quiz={state.quiz}
        onRetry={handleRetry}
        onComplete={onComplete}
      />
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertCircle className="size-6 text-destructive" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">Could not load quiz</p>
          <p className="text-sm text-muted-foreground max-w-md">{state.message}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchQuizData(false)}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
