'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, HelpCircle, Trophy, Play } from 'lucide-react';
import type { LessonQuizPayload as QuizPayload } from '@/types/lesson-quiz';

interface QuizStartScreenProps {
  quiz: QuizPayload;
  history: { attempts: number; bestScore: number | null; bestPercentage: number | null; latestPassed: boolean | null } | null;
  onStart: () => void;
}

export function QuizStartScreen({ quiz, history, onStart }: QuizStartScreenProps) {
  const quizData = quiz.quiz;
  const questions = quiz.questions;
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
  const attemptsRemaining = quiz.attempts_remaining;

  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center space-y-8">
      {/* Icon */}
      <div className="mx-auto size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <HelpCircle className="size-8 text-primary" />
      </div>

      {/* Title */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{quizData.title || 'Quiz'}</h1>
        {quizData.description && (
          <p className="text-muted-foreground">{quizData.description}</p>
        )}
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border p-3 space-y-1">
          <div className="flex items-center justify-center gap-1 text-muted-foreground">
            <HelpCircle className="size-3.5" />
            <span>Questions</span>
          </div>
          <p className="text-xl font-bold">{questions.length}</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <div className="flex items-center justify-center gap-1 text-muted-foreground">
            <Clock className="size-3.5" />
            <span>Time</span>
          </div>
          <p className="text-xl font-bold">
            {quizData.time_limit_minutes ? `${quizData.time_limit_minutes}m` : 'None'}
          </p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <div className="flex items-center justify-center gap-1 text-muted-foreground">
            <Trophy className="size-3.5" />
            <span>Points</span>
          </div>
          <p className="text-xl font-bold">{totalPoints}</p>
        </div>
      </div>

      {/* Previous attempt */}
      {history && history.attempts > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <p className="text-sm font-medium">Previous Attempts: {history.attempts}</p>
          {history.bestPercentage != null && (
            <p className="text-sm text-muted-foreground">
              Best Score:{' '}
              <span className="font-semibold text-foreground">
                {history.bestPercentage}%
              </span>
              {history.bestScore != null && (
                <span className="text-muted-foreground"> ({history.bestScore} pts)</span>
              )}
              {quizData.passing_percentage != null && (
                <Badge
                  className={`ml-2 text-xs ${
                    history.latestPassed
                      ? 'bg-success/10 text-success border-success/30'
                      : 'bg-primary/10 text-primary border-primary/30'
                  }`}
                >
                  {history.latestPassed ? 'Passed' : 'Not Passed'}
                </Badge>
              )}
            </p>
          )}
        </div>
      )}

      {/* Rules */}
      <div className="text-left rounded-lg border p-4 space-y-2 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Before you begin:</p>
        <ul className="space-y-1 list-disc list-inside">
          {quizData.shuffle_questions && <li>Question order will be randomized</li>}
          {quizData.shuffle_options && <li>Option order will be randomized</li>}
          {quizData.time_limit_minutes && (
            <li>Time limit: {quizData.time_limit_minutes} minutes (auto-submits on expiry)</li>
          )}
          {quizData.passing_percentage != null && (
            <li>Passing score: {quizData.passing_percentage}%</li>
          )}
          {attemptsRemaining !== null && (
            <li>Attempts remaining: {attemptsRemaining}</li>
          )}
          {attemptsRemaining === null && (
            <li>Unlimited attempts</li>
          )}
        </ul>
      </div>

      {/* Start button */}
      <Button
        size="lg"
        className="px-8 gap-2"
        onClick={onStart}
        disabled={attemptsRemaining !== null && attemptsRemaining <= 0}
      >
        <Play className="size-4" />
        {attemptsRemaining !== null && attemptsRemaining <= 0 ? 'No Attempts Left' : 'Start Quiz'}
      </Button>
    </div>
  );
}
