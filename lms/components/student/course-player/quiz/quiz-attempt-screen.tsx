'use client';

import { useState, useEffect, useCallback, useRef, useMemo, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Clock, ChevronRight, ChevronLeft, Send, AlertCircle } from 'lucide-react';
import type { LessonQuizPayload as QuizPayload, LessonQuizAttempt, LessonQuizQuestionPayload } from '@/types/lesson-quiz';

interface QuizAttemptScreenProps {
  quiz: QuizPayload;
  attempt: LessonQuizAttempt;
  shuffledQuestions: LessonQuizQuestionPayload[];
  shuffledOptionOrders: Record<string, number[]>;
  onSubmit: (answers: Record<string, string[]>) => void;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const DRAFT_KEY_PREFIX = 'lms_v1:quiz_draft:';

function readQuizDraft(attemptId: string): { responses: Record<string, string[]>; currentIndex: number } | null {
  try {
    const draft = localStorage.getItem(DRAFT_KEY_PREFIX + attemptId);
    if (!draft) return null;
    const parsed = JSON.parse(draft) as { responses?: unknown; currentIndex?: unknown };
    return {
      responses: parsed.responses && typeof parsed.responses === 'object'
        ? parsed.responses as Record<string, string[]>
        : {},
      currentIndex: typeof parsed.currentIndex === 'number' ? parsed.currentIndex : 0,
    };
  } catch {
    return null;
  }
}

const questionTypeLabel = (type: string) => {
  switch (type) {
    case 'single_choice': return 'Pick one answer';
    case 'true_false': return 'True or False';
    case 'multiple_choice': return 'Pick all that apply';
    default: return '';
  }
};

export function QuizAttemptScreen({
  quiz,
  attempt,
  shuffledQuestions,
  shuffledOptionOrders,
  onSubmit,
}: QuizAttemptScreenProps) {
  const quizData = quiz.quiz;
  const initialDraft = useMemo(() => readQuizDraft(attempt.id), [attempt.id]);
  const [currentIndex, setCurrentIndex] = useState<number>(() => initialDraft?.currentIndex ?? 0);
  const [responses, setResponses] = useState<Record<string, string[]>>(() => initialDraft?.responses ?? {});
  const [timeLeft, setTimeLeft] = useState<number | null>(
    quizData.time_limit_minutes ? quizData.time_limit_minutes * 60 : null,
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const [unansweredIds, setUnansweredIds] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const responsesRef = useRef(responses);
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  // Save draft with debounce to avoid excessive localStorage writes
  useEffect(() => {
    if (attempt.status !== 'in_progress') return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY_PREFIX + attempt.id,
          JSON.stringify({ responses, currentIndex }),
        );
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [responses, currentIndex, attempt.id, attempt.status]);

  // Timer
  const timerEnabled = timeLeft !== null;
  useEffect(() => {
    if (!timerEnabled) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        const next = prev - 1;
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          onSubmitRef.current(responsesRef.current);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerEnabled]);

  const isWarning = timeLeft !== null && timeLeft > 0 && timeLeft <= 300;

  const activeQuestion = shuffledQuestions[currentIndex];

  const toggleSingle = useCallback((questionId: string, optionId: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: [optionId] }));
  }, []);

  const toggleMulti = useCallback((questionId: string, optionId: string) => {
    setResponses((prev) => {
      const current = prev[questionId] ?? [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: next };
    });
  }, []);

  const [, startTransition] = useTransition();

  const handleSubmitClick = useCallback(() => {
    const unanswered: string[] = [];
    for (const q of shuffledQuestions) {
      if (!responses[q.id] || responses[q.id].length === 0) {
        unanswered.push(q.id);
      }
    }
    setUnansweredIds(unanswered);
    setShowConfirm(true);
  }, [shuffledQuestions, responses]);

  const confirmSubmit = useCallback(() => {
    setShowConfirm(false);
    onSubmit(responses);
  }, [responses, onSubmit]);

  const getOptionOrder = useCallback(
    (questionId: string) => shuffledOptionOrders[questionId] ?? shuffledQuestions.find((q) => q.id === questionId)?.options.map((_, i) => i) ?? [],
    [shuffledOptionOrders, shuffledQuestions],
  );

  const orderedOptions = useMemo(
    () => {
      if (!activeQuestion) return [];
      const options = [];
      for (const index of getOptionOrder(activeQuestion.id)) {
        const option = activeQuestion.options[index];
        if (option) options.push(option);
      }
      return options;
    },
    [getOptionOrder, activeQuestion],
  );
  const answeredCount = useMemo(
    () => shuffledQuestions.filter((q) => responses[q.id]?.length > 0).length,
    [shuffledQuestions, responses],
  );

  const isLastQuestion = currentIndex === shuffledQuestions.length - 1;
  const isFirstQuestion = currentIndex === 0;

  if (!activeQuestion) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="size-10 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold">No Questions Found</h3>
      </div>
    );
  }

  const selected = responses[activeQuestion.id] ?? [];
  const typeLabel = questionTypeLabel(activeQuestion.question_type);

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-8">
      {/* Header with nav */}
      <div className="bg-card/80 backdrop-blur-sm border rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className="font-semibold text-lg truncate">{quizData.title}</h1>
            <p className="text-xs text-muted-foreground">
              Question {currentIndex + 1} of {shuffledQuestions.length}
              <span className="mx-1.5">·</span>
              {answeredCount} answered
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {timeLeft !== null && (
            <div
              className={`flex items-center gap-2 font-mono text-lg font-bold px-3 py-1.5 rounded-lg border mr-2 ${
                isWarning
                  ? 'text-destructive border-destructive/30 bg-destructive/10 animate-pulse'
                  : 'bg-muted'
              }`}
            >
              <Clock className="size-4" />
              {formatTime(timeLeft)}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={isFirstQuestion}
            onClick={() => startTransition(() => setCurrentIndex((i) => i - 1))}
            className="gap-1"
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>
          {isLastQuestion ? (
            <Button size="sm" onClick={handleSubmitClick} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Send className="size-4" /> Submit
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => startTransition(() => setCurrentIndex((i) => i + 1))}
              className="gap-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex flex-wrap gap-1.5 px-1">
        {shuffledQuestions.map((q, i) => {
          const isAnswered = responses[q.id]?.length > 0;
          const isCurrent = i === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => startTransition(() => setCurrentIndex(i))}
              className={`size-7 rounded-md text-xs font-medium transition ${
                isCurrent
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : isAnswered
                    ? 'bg-success/10 text-success border border-success/30'
                    : 'bg-muted text-muted-foreground border border-border/50 hover:border-primary/30'
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Question Card */}
      <Card className="min-h-[350px] flex flex-col">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex justify-between items-start gap-4">
            <CardTitle className="leading-relaxed font-semibold text-lg">
              {activeQuestion.question_text}
            </CardTitle>
            <Badge variant="outline" className="shrink-0 text-xs tabular-nums">
              {activeQuestion.points} pt{activeQuestion.points !== 1 ? 's' : ''}
            </Badge>
          </div>
          {typeLabel && (
            <p className="text-xs text-muted-foreground pt-1">
              {typeLabel}
            </p>
          )}
        </CardHeader>

        <CardContent className="flex-1 py-6 space-y-3">
          {orderedOptions.map((opt) => {
            const isSelected = selected.includes(opt.id);
            return (
              <div
                key={opt.id}
                className={`flex items-center gap-3 border p-4 rounded-lg transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-primary/5 border-primary/30'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => {
                  if (activeQuestion.question_type === 'single_choice' || activeQuestion.question_type === 'true_false') {
                    toggleSingle(activeQuestion.id, opt.id);
                  } else {
                    toggleMulti(activeQuestion.id, opt.id);
                  }
                }}
              >
                {activeQuestion.question_type === 'single_choice' || activeQuestion.question_type === 'true_false' ? (
                  <RadioGroup
                    value={selected[0] ?? ''}
                    onValueChange={(val) => toggleSingle(activeQuestion.id, val)}
                  >
                    <RadioGroupItem value={opt.id} id={opt.id} />
                  </RadioGroup>
                ) : (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleMulti(activeQuestion.id, opt.id)}
                  />
                )}
                <Label htmlFor={opt.id} className="cursor-pointer flex-1 font-normal text-base">
                  {opt.option_text}
                </Label>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Confirm Submit Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Quiz?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            {unansweredIds.length > 0 && (
              <p className="text-primary font-medium">
                {unansweredIds.length} question{unansweredIds.length !== 1 ? 's' : ''} unanswered
              </p>
            )}
            <p>
              You have answered {answeredCount} of {shuffledQuestions.length} questions.
            </p>
            {quizData.passing_percentage != null && (
              <p>Passing score: {quizData.passing_percentage}%</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowConfirm(false)}>
              Go Back
            </Button>
            <Button onClick={confirmSubmit} className="gap-2">
              <Send className="size-4" /> Confirm Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
