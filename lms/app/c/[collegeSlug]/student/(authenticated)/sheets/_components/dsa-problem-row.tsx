'use client';

import React, { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDsaProgress } from './dsa-progress-provider';
import { TableRow, TableCell } from '@/components/ui/table';
import type { DsaProblem } from '@/types/dsa';
import { CheckDelight, useJustCompleted } from './dsa-delight';

interface Props {
  problem: DsaProblem;
  index: number;
  collegeSlug: string;
  sheetSlug: string;
}

export const DsaProblemRow = React.memo(function DsaProblemRow({ problem, index, collegeSlug, sheetSlug }: Props) {
  const {
    completedProblemIds,
    favoritedProblemIds,
    toggleCompleted,
    toggleFavorited,
  } = useDsaProgress();

  const isDone = completedProblemIds.has(problem.id);
  const isFav = favoritedProblemIds.has(problem.id);
  const justCompleted = useJustCompleted(isDone);

  const handleToggleDone = useCallback(() => {
    toggleCompleted(problem.id);
  }, [problem.id, toggleCompleted]);

  const handleToggleFav = useCallback(() => {
    toggleFavorited(problem.id);
  }, [problem.id, toggleFavorited]);

  const difficultyColor = {
    Easy: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    Medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    Hard: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  };

  return (
    <TableRow
      className="border-t border-border/20 hover:bg-primary/[0.03] transition-colors duration-150"
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '0 60px',
      }}
    >
      <TableCell className="px-4 py-2.5 text-xs text-muted-foreground pl-4 tabular-nums">{index + 1}</TableCell>
      <TableCell className="px-4 py-2.5">
        <span
          className={cn(
            'text-sm font-medium transition-colors duration-200',
            isDone ? 'text-muted-foreground line-through decoration-muted-foreground/30' : 'text-foreground'
          )}
        >
          {problem.name}
        </span>
      </TableCell>
      <TableCell className="px-4 py-2.5">
        <Badge
          variant="secondary"
          className={cn('text-xs font-semibold px-2 py-0.5 border', difficultyColor[problem.difficulty])}
        >
          {problem.difficulty}
        </Badge>
      </TableCell>
      <TableCell className="px-4 py-2.5 text-center">
        <div className="flex justify-center relative">
          <CheckDelight justCompleted={justCompleted} />
          <button
            onClick={handleToggleDone}
            className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 relative z-10 cursor-pointer',
              isDone
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30 scale-105'
                : 'border-muted-foreground/50 dark:border-muted-foreground/60 hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-500/10'
            )}
            aria-label={isDone ? 'Mark as not done' : 'Mark as done'}
          >
            {isDone && (
              <svg
                className="size-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>
      </TableCell>
      <TableCell className="px-4 py-2.5 text-center">
        <div className="flex justify-center">
          <button
            onClick={handleToggleFav}
            className="group/fav focus:outline-none transition-transform duration-100 active:scale-95"
            aria-label={isFav ? 'Remove from revision' : 'Mark for revision'}
          >
            <Star
              className={cn(
                'size-4 transition-colors duration-200',
                isFav
                  ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                  : 'text-muted-foreground/40 group-hover/fav:text-amber-400/70'
              )}
            />
          </button>
        </div>
      </TableCell>
      <TableCell className="px-4 py-2.5">
        {problem.lc_url ? (
          <a
            href={problem.lc_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-2"
          >
            <ExternalLink className="size-3" />
            Solve
          </a>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-2.5">
        {problem.yt_url ? (
          <a
            href={problem.yt_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline underline-offset-2"
          >
            <ExternalLink className="size-3" />
            Watch
          </a>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-2.5">
        {problem.resource_url ? (
          <a
            href={`/c/${collegeSlug}/student/sheets/problem-resource/${problem.id}?fromSheet=${encodeURIComponent(sheetSlug)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline underline-offset-2"
          >
            <ExternalLink className="size-3" />
            Open
          </a>
        ) : (
          <span className="text-xs text-muted-foreground/60">None</span>
        )}
      </TableCell>
    </TableRow>
  );
});
