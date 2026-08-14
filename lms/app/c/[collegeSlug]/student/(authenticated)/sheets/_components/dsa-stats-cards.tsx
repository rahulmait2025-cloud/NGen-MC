'use client';

import React, { useMemo } from 'react';
import { useDsaProgress } from './dsa-progress-provider';
import { BookOpen, CheckCircle2, Zap, Flame, BarChart3 } from 'lucide-react';
import type { DsaCategoryWithProblems } from '@/types/dsa';
import { cn } from '@/lib/utils';

interface Props {
  totalProblems: number;
  categories: DsaCategoryWithProblems[];
}

export const DsaStatsCards = React.memo(function DsaStatsCards({ totalProblems, categories }: Props) {
  const { completedProblemIds } = useDsaProgress();

  const stats = useMemo(() => {
    let easy = 0,
      medium = 0,
      hard = 0;
    for (const cat of categories) {
      for (const p of cat.problems) {
        if (p.difficulty === 'Easy') easy++;
        else if (p.difficulty === 'Medium') medium++;
        else hard++;
      }
    }

    let solvedEasy = 0,
      solvedMedium = 0,
      solvedHard = 0;
    for (const cat of categories) {
      for (const p of cat.problems) {
        if (completedProblemIds.has(p.id)) {
          if (p.difficulty === 'Easy') solvedEasy++;
          else if (p.difficulty === 'Medium') solvedMedium++;
          else solvedHard++;
        }
      }
    }

    const solved = solvedEasy + solvedMedium + solvedHard;
    const pct = totalProblems > 0 ? Math.round((solved / totalProblems) * 100) : 0;

    return { easy, medium, hard, solved, pct, solvedEasy, solvedMedium, solvedHard };
  }, [categories, completedProblemIds, totalProblems]);

  const cards = useMemo(() => [
    {
      label: 'Total',
      value: totalProblems,
      icon: BookOpen,
      color: 'text-primary font-bold',
      bg: 'bg-primary/15 border border-primary/30',
      barColor: 'bg-primary',
      pct: 100,
    },
    {
      label: 'Easy',
      value: `${stats.solvedEasy}/${stats.easy}`,
      icon: Zap,
      color: 'text-emerald-500 dark:text-emerald-400 font-bold',
      bg: 'bg-emerald-500/15 border border-emerald-500/30',
      barColor: 'bg-emerald-500',
      pct: stats.easy > 0 ? Math.round((stats.solvedEasy / stats.easy) * 100) : 0,
    },
    {
      label: 'Medium',
      value: `${stats.solvedMedium}/${stats.medium}`,
      icon: Flame,
      color: 'text-amber-500 dark:text-amber-400 font-bold',
      bg: 'bg-amber-500/15 border border-amber-500/30',
      barColor: 'bg-amber-500',
      pct: stats.medium > 0 ? Math.round((stats.solvedMedium / stats.medium) * 100) : 0,
    },
    {
      label: 'Hard',
      value: `${stats.solvedHard}/${stats.hard}`,
      icon: Flame,
      color: 'text-rose-500 dark:text-rose-400 font-bold',
      bg: 'bg-rose-500/15 border border-rose-500/30',
      barColor: 'bg-rose-500',
      pct: stats.hard > 0 ? Math.round((stats.solvedHard / stats.hard) * 100) : 0,
    },
    {
      label: 'Solved',
      value: stats.solved,
      icon: CheckCircle2,
      color: 'text-emerald-500 dark:text-emerald-400 font-bold',
      bg: 'bg-emerald-500/15 border border-emerald-500/30',
      barColor: 'bg-emerald-500',
      pct: stats.pct,
    },
    {
      label: 'Progress',
      value: `${stats.pct}%`,
      icon: BarChart3,
      color: 'text-primary font-bold',
      bg: 'bg-primary/15 border border-primary/30',
      barColor: 'bg-primary',
      pct: stats.pct,
    },
  ], [totalProblems, stats]);

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5"
      role="group"
      aria-label="DSA progress statistics"
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs hover:border-border transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', card.bg)}>
              <card.icon className={cn('w-4 h-4', card.color)} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{card.label}</p>
              <p className="text-xl font-bold font-heading tabular-nums text-foreground tracking-tight mt-0.5">
                {card.value}
              </p>
            </div>
          </div>

          <div
            className="mt-3.5"
            role="progressbar"
            aria-valuenow={card.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${card.label}: ${card.pct}%`}
          >
            <div className="h-1.5 bg-muted/80 border border-border/40 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-300 ease-out', card.barColor)}
                style={{ width: `${card.pct}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});
