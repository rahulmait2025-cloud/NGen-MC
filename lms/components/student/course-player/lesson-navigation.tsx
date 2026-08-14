'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PlayerLessonItem } from '@/lib/utils/player-lessons';
import { useCoursePlayer } from './context';

interface LessonNavigationProps {
  prevLesson: PlayerLessonItem | null;
  nextLesson: PlayerLessonItem | null;
  currentItemId: string;
  isCompleted: boolean;
  markingComplete: boolean;
  onMarkComplete: () => void;
  hideMarkComplete?: boolean;
}

export function LessonNavigation({
  prevLesson,
  nextLesson,
  currentItemId: _currentItemId,
  isCompleted,
  markingComplete,
  onMarkComplete,
  hideMarkComplete,
}: LessonNavigationProps) {
  const { navigateToLesson } = useCoursePlayer();

  return (
    <div className="flex flex-col items-stretch gap-3 border-t border-border/30 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between">
      <Button
        asChild
        variant="ghost"
        disabled={!prevLesson}
        className="min-h-11 h-11 w-full gap-1.5 rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:w-auto sm:px-5"
      >
        {prevLesson ? (
          <Link
            href={prevLesson.href}
            prefetch={false}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey) return;
              e.preventDefault();
              navigateToLesson(prevLesson.id, prevLesson.href);
            }}
          >
            <ChevronLeft className="size-4" />
            Back
          </Link>
        ) : (
          <div className="pointer-events-none flex items-center gap-1.5 opacity-40">
            <ChevronLeft className="size-4" />
            Back
          </div>
        )}
      </Button>

      <div className="flex w-full items-center gap-2.5 sm:w-auto sm:justify-end">
        {!hideMarkComplete && (
          <Button
            variant="outline"
            onClick={onMarkComplete}
            disabled={markingComplete || isCompleted}
            className={cn(
              "min-h-11 h-11 flex-1 gap-1.5 rounded-lg border px-4 text-sm font-semibold transition sm:flex-none sm:px-5",
              isCompleted
                ? "border-emerald-300/60 bg-emerald-50 text-emerald-600 dark:border-emerald-700/40 dark:bg-emerald-950/50 dark:text-emerald-400"
                 : "border-border/60 hover:border-emerald-300/60 hover:bg-emerald-50 hover:text-emerald-600",
            )}
          >
            {markingComplete ? (
              <div className="animate-spin"><Loader2 className="size-4" /></div>
            ) : isCompleted ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <Circle className="size-4 opacity-40" />
            )}
            {isCompleted ? "Completed" : "Mark as Complete"}
          </Button>
        )}

        {nextLesson ? (
          <Button
            asChild
            className="min-h-11 h-11 flex-1 gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98] sm:flex-none sm:px-5"
          >
            <Link
              href={nextLesson.href}
              prefetch={false}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey) return;
                e.preventDefault();
                navigateToLesson(nextLesson.id, nextLesson.href);
              }}
            >
              Next Lesson
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
