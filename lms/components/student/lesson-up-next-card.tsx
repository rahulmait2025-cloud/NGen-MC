'use client';

import * as React from 'react';
import { Play, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LessonUpNextCardData = {
  id: string;
  slug?: string | null;
  title: string;
  /** Duration in seconds (video lessons) */
  durationSeconds?: number | null;
  /** Whether the user has a resume position on this lesson (from progress). */
  hasResumePosition?: boolean;
  /** Resume position in seconds (when `hasResumePosition` is true). */
  resumePositionSeconds?: number | null;
  /** Item type — affects the icon + label. */
  itemType?: 'video' | 'document' | 'note' | 'worksheet' | string;
};

export interface LessonUpNextCardProps {
  /** The next lesson to play. If `null`, the card collapses to a "Course complete" state. */
  nextItem: LessonUpNextCardData | null;
  /** Click handler — typically navigates to the next lesson. */
  onPlay: (itemId: string, itemSlug?: string | null) => void;
  className?: string;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '';
  const totalSecs = Math.floor(seconds);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return s > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${m}:00`;
}

function formatTimestamp(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const TYPE_LABEL: Record<string, string> = {
  video: 'Video',
  document: 'Reading',
  note: 'Note',
  worksheet: 'Worksheet',
};

/**
 * Compact "Up Next" row at the top of the playlist sidebar.
 * No card wrapper — just a flat row that looks like the first item in the list.
 */
export function LessonUpNextCard({ nextItem, onPlay, className }: LessonUpNextCardProps) {
  if (!nextItem) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 text-success',
          className,
        )}
      >
        <Sparkles className="size-3 shrink-0" aria-hidden />
        <span className="text-xs font-medium">Course completed</span>
      </div>
    );
  }

  const showResume = nextItem.hasResumePosition && (nextItem.resumePositionSeconds ?? 0) > 0;
  const duration = formatDuration(nextItem.durationSeconds);

  return (
    <button
      type="button"
      onClick={() => onPlay(nextItem.id, nextItem.slug)}
      className={cn(
        'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50',
        className,
      )}
    >
      <div className="grid size-6 shrink-0 place-items-center rounded bg-muted/50 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        <Play className="size-2.5 fill-current" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-xs font-semibold text-foreground">
          {nextItem.title}
        </p>
        <div className="flex items-center gap-1 text-xs text-foreground/60">
          <span>{TYPE_LABEL[nextItem.itemType ?? 'video'] ?? 'Lesson'}</span>
          {duration ? (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">{duration}</span>
            </>
          ) : null}
          {showResume ? (
            <>
              <span aria-hidden>·</span>
              <span className="text-primary/80">Resume {formatTimestamp(nextItem.resumePositionSeconds)}</span>
            </>
          ) : null}
        </div>
      </div>
    </button>
  );
}
