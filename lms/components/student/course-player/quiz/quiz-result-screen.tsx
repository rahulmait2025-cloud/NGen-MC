'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Trophy, RotateCcw, Eye, ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react';
import type { LessonQuizPayload as QuizPayload, LessonQuizAttemptResult, LessonQuizAttemptAnswer } from '@/types/lesson-quiz';

interface QuizResultScreenProps {
  result: LessonQuizAttemptResult;
  quiz: QuizPayload;
  onRetry: () => void;
  onComplete?: () => void;
}

export function QuizResultScreen({ result, quiz, onRetry, onComplete: _onComplete }: QuizResultScreenProps) {
  const { answers, score, maxScore, percentage, passed } = result;
  const quizData = quiz.quiz;
  const [viewMode, setViewMode] = useState<'summary' | 'review'>('summary');
  const [currentIdx, setCurrentIdx] = useState(0);

  const showCorrectAnswers = quizData.show_correct_answers;
  const canRetry = quizData.max_attempts === null || quiz.attempts_used < quizData.max_attempts;

  // Breakdown counts
  const totalQ = answers.length;
  const attemptedCount = answers.filter(
    (a) => Array.isArray(a.selected_snapshot) && a.selected_snapshot.length > 0
  ).length;
  const correctCount = answers.filter((a) => a.is_correct).length;
  const wrongCount = attemptedCount - correctCount;
  const unattemptedCount = totalQ - attemptedCount;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6 hide-scrollbar">
      {/* Score Card */}
      <Card className="overflow-hidden">
        <div className={`p-8 text-center ${passed ? 'bg-emerald-500/5' : 'bg-amber-500/5'}`}>
          <div className="flex justify-center mb-4">
            <div className={`size-16 rounded-full flex items-center justify-center ${passed ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
              <Trophy className={`size-8 ${passed ? 'text-emerald-600' : 'text-amber-600'}`} />
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-1 tabular-nums">
            {percentage}%
          </h2>
          <p className="text-sm text-muted-foreground">
            {score} / {maxScore} points
          </p>
          <Badge
            className={`mt-3 ${
              passed
                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25'
                : 'bg-amber-500/10 text-amber-700 border-amber-500/25'
            }`}
          >
            {passed ? 'Passed' : 'Not Passed'}
          </Badge>
          {quizData.passing_percentage != null && (
            <p className="text-xs text-muted-foreground mt-2">
              Passing threshold: {quizData.passing_percentage}%
            </p>
          )}
        </div>
      </Card>

      {/* Breakdown Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-xl border border-border/60 p-4 text-center bg-card">
          <p className="text-3xl font-bold tabular-nums">{totalQ}</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Total</p>
        </div>
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-center">
          <p className="text-3xl font-bold text-emerald-700 tabular-nums">{correctCount}</p>
          <p className="text-xs text-emerald-600 font-medium mt-0.5">Correct</p>
        </div>
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-center">
          <p className="text-3xl font-bold text-red-700 tabular-nums">{wrongCount}</p>
          <p className="text-xs text-red-600 font-medium mt-0.5">Wrong</p>
        </div>
        <div className="rounded-xl border border-muted bg-muted/30 p-4 text-center">
          <p className="text-3xl font-bold text-muted-foreground tabular-nums">{unattemptedCount}</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Skipped</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        {answers.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'summary' ? 'review' : 'summary')} className="gap-2">
            {viewMode === 'summary' ? (
              <><Eye className="size-4" /> View Answers</>
            ) : (
              <><ChevronLeft className="size-4" /> Back to Summary</>
            )}
          </Button>
        )}
        {canRetry && (
          <Button onClick={onRetry} size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <RotateCcw className="size-4" /> Re-attempt
          </Button>
        )}
      </div>

      {/* Review Mode */}
      {viewMode === 'review' && (
        <div className="space-y-4">
          {/* Question nav */}
          <div className="flex flex-wrap gap-1.5">
            {answers.map((a, i) => {
              const wasAttempted = Array.isArray(a.selected_snapshot) && a.selected_snapshot.length > 0;
              return (
                <button
                  key={a.id || i}
                  onClick={() => setCurrentIdx(i)}
                  className={`size-7 rounded-lg text-xs font-medium transition-all ${
                    i === currentIdx
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 scale-105'
                      : a.is_correct
                        ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 hover:bg-emerald-500/15'
                        : wasAttempted
                          ? 'bg-red-500/10 text-red-700 border border-red-500/20 hover:bg-red-500/15'
                          : 'bg-muted text-muted-foreground border border-border/50 hover:bg-muted/80'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Current answer */}
          {answers[currentIdx] && (
            <AnswerCard
              answer={answers[currentIdx]}
              showCorrectAnswers={showCorrectAnswers}
              questionText={(answers[currentIdx].question_snapshot as Record<string, unknown>)?.question_text as string ?? `Question ${currentIdx + 1}`}
              currentIdx={currentIdx}
              total={answers.length}
              onPrev={() => setCurrentIdx((i) => i - 1)}
              onNext={() => setCurrentIdx((i) => i + 1)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function AnswerCard({
  answer,
  showCorrectAnswers,
  questionText,
  currentIdx,
  total,
  onPrev,
  onNext,
}: {
  answer: LessonQuizAttemptAnswer;
  showCorrectAnswers: boolean;
  questionText: string;
  currentIdx: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const selectedSnapshot = (answer.selected_snapshot as Array<{ id: string; option_text: string }>) ?? [];
  const correctSnapshot = (answer.correct_snapshot as Array<{ id: string; option_text: string }>) ?? [];
  const maxPoints = (answer.question_snapshot as { points?: number }).points;
  const explanation = (answer.question_snapshot as { explanation?: string | null }).explanation;
  const wasAttempted = selectedSnapshot.length > 0;

  const status = answer.is_correct ? 'correct' : wasAttempted ? 'incorrect' : 'skipped';

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <CardHeader className={`border-b ${
        status === 'correct'
          ? 'bg-emerald-500/5 border-emerald-500/15'
          : status === 'incorrect'
            ? 'bg-red-500/5 border-red-500/15'
            : 'bg-muted/30 border-border/50'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base font-semibold leading-snug">
            {questionText}
          </CardTitle>
          {status === 'correct' ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/25 gap-1 shrink-0">
              <Check className="size-3" /> Correct
            </Badge>
          ) : status === 'incorrect' ? (
            <Badge className="bg-red-500/10 text-red-700 border-red-500/25 gap-1 shrink-0">
              <X className="size-3" /> Incorrect
            </Badge>
          ) : (
            <Badge className="bg-muted text-muted-foreground border-border/50 gap-1 shrink-0">
              Skipped
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Your Answer */}
        <div className={`px-5 py-4 ${
          status === 'incorrect' ? 'bg-red-500/3' : ''
        }`}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Your Answer</p>
          {wasAttempted ? (
            <ul className="space-y-1">
              {selectedSnapshot.map((s) => (
                <li key={s.id} className={`text-sm flex items-start gap-2 ${
                  status === 'incorrect' ? 'text-red-700' : ''
                }`}>
                  <span className="size-1.5 rounded-full bg-current mt-1.5 shrink-0" />
                  {s.option_text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">No answer selected</p>
          )}
        </div>

        {/* Correct Answer (only when wrong or skipped) */}
        {showCorrectAnswers && !answer.is_correct && (
          <div className="px-5 py-4 bg-emerald-500/3 border-t border-emerald-500/10">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1.5">Correct Answer</p>
            <ul className="space-y-1">
              {correctSnapshot.map((c) => (
                <li key={c.id} className="text-sm text-emerald-700 flex items-start gap-2">
                  <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  {c.option_text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Points + Explanation */}
        <div className="px-5 py-4 space-y-3 border-t">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Points</span>
            <Badge variant="outline" className={`text-xs tabular-nums ${
              answer.points_awarded > 0
                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25'
                : 'bg-red-500/10 text-red-600 border-red-500/25'
            }`}>
              {answer.points_awarded} / {maxPoints ?? '?'}
            </Badge>
          </div>

          {explanation && (
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 p-4 space-y-1.5">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                <Lightbulb className="size-3.5" /> Explanation
              </p>
              <p className="text-sm text-amber-800/80 leading-relaxed">{explanation}</p>
            </div>
          )}
        </div>

        {/* Nav Footer */}
        <div className="flex justify-between border-t px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentIdx === 0}
            onClick={onPrev}
            className="gap-1 text-muted-foreground"
          >
            <ChevronLeft className="size-4" /> Prev
          </Button>
          <span className="text-xs text-muted-foreground self-center tabular-nums">
            {currentIdx + 1} / {total}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={currentIdx === total - 1}
            onClick={onNext}
            className="gap-1 text-muted-foreground"
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
