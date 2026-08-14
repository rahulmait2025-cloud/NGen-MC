'use client';

import React, { useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDsaProgress } from './dsa-progress-provider';
import { DsaProblemRow } from './dsa-problem-row';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DsaCategoryWithProblems } from '@/types/dsa';
import { CategoryCelebration, useCategoryJustCompleted } from './dsa-delight';

const colorDotMap: Record<string, string> = {
  orange: 'bg-orange-500',
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-500',
  teal: 'bg-teal-500',
  green: 'bg-green-500',
  rose: 'bg-rose-500',
  pink: 'bg-pink-500',
  indigo: 'bg-indigo-500',
  primary: 'bg-primary',
};

interface Props {
  category: DsaCategoryWithProblems;
  collegeSlug: string;
  sheetSlug: string;
  isOpen: boolean;
  onToggle: () => void;
  filter: 'all' | 'todo' | 'done' | 'favorites';
  difficultyFilter: 'all' | 'easy' | 'medium' | 'hard';
  search: string;
}

export const DsaCategorySection = React.memo(function DsaCategorySection({
  category,
  collegeSlug,
  sheetSlug,
  isOpen,
  onToggle,
  filter,
  difficultyFilter,
  search,
}: Props) {
  const { completedProblemIds, favoritedProblemIds } = useDsaProgress();

  const filteredProblems = useMemo(() => {
    let problems = category.problems;

    if (search) {
      const q = search.toLowerCase();
      problems = problems.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.resource_url.toLowerCase().includes(q) ||
          p.notes.toLowerCase().includes(q)
      );
    }

    if (filter === 'done') {
      problems = problems.filter((p) => completedProblemIds.has(p.id));
    } else if (filter === 'todo') {
      problems = problems.filter((p) => !completedProblemIds.has(p.id));
    } else if (filter === 'favorites') {
      problems = problems.filter((p) => favoritedProblemIds.has(p.id));
    }

    if (difficultyFilter !== 'all') {
      problems = problems.filter((p) => p.difficulty.toLowerCase() === difficultyFilter);
    }

    return problems;
  }, [category.problems, filter, difficultyFilter, search, completedProblemIds, favoritedProblemIds]);

  const stats = useMemo(() => {
    const solvedCount = category.problems.filter((p) =>
      completedProblemIds.has(p.id)
    ).length;
    const allDone = solvedCount === category.problems.length && category.problems.length > 0;
    const notStarted = solvedCount === 0;
    let easy = 0;
    let medium = 0;
    let hard = 0;
    for (const p of category.problems) {
      if (p.difficulty === 'Easy') easy++;
      else if (p.difficulty === 'Medium') medium++;
      else if (p.difficulty === 'Hard') hard++;
    }

    return { solvedCount, allDone, notStarted, easy, medium, hard };
  }, [category.problems, completedProblemIds]);

  const justCategoryCompleted = useCategoryJustCompleted(stats.solvedCount, category.problems.length);

  const handleToggleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  }, [onToggle]);

  return (
    <>
      <TableRow
        className={cn(
          'transition-colors duration-150 cursor-pointer select-none border-b border-border/40',
          isOpen && 'bg-muted/30',
          stats.allDone && 'bg-emerald-500/[0.04]'
        )}
        onClick={onToggle}
      >
        {/* Category Dot & Name */}
        <TableCell className="pl-5 py-3">
          <div className="flex items-center gap-3 relative">
            <span className="relative">
              <CategoryCelebration trigger={justCategoryCompleted} />
              <span
                className={cn(
                  'size-2.5 rounded-full shrink-0 shadow-sm relative z-10',
                  colorDotMap[category.color] || 'bg-primary'
                )}
              />
            </span>
            <span className="font-semibold text-foreground text-sm truncate max-w-[240px]">
              {category.name}
            </span>
          </div>
        </TableCell>

        {/* Status */}
        <TableCell className="py-3">
          {stats.allDone ? (
            <Badge
              variant="secondary"
              className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/15 text-xs gap-1 py-0.5"
            >
              <CheckCircle2 className="size-3" />
              Complete
            </Badge>
          ) : stats.notStarted ? (
            <Badge
              variant="secondary"
              className="text-xs text-muted-foreground bg-muted/40 border border-border/20 py-0.5"
            >
              Not started
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="bg-amber-500/10 text-amber-700 border border-amber-500/15 text-xs py-0.5"
            >
              In progress ({stats.solvedCount}/{category.problems.length})
            </Badge>
          )}
        </TableCell>

        {/* Total Problems count */}
        <TableCell className="py-3">
          <span className="text-xs text-muted-foreground font-medium tabular-nums">
            {filteredProblems.length} {filteredProblems.length === 1 ? 'problem' : 'problems'}
          </span>
        </TableCell>

        {/* Difficulty breakdown */}
        <TableCell className="py-3">
          <div className="flex items-center gap-1.5">
            {stats.easy > 0 && (
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/15 font-medium text-[11px] px-2 py-0.5"
              >
                {stats.easy} easy
              </Badge>
            )}
            {stats.medium > 0 && (
              <Badge
                variant="secondary"
                className="bg-amber-500/10 text-amber-700 border border-amber-500/15 font-medium text-[11px] px-2 py-0.5"
              >
                {stats.medium} medium
              </Badge>
            )}
            {stats.hard > 0 && (
              <Badge
                variant="secondary"
                className="bg-red-500/10 text-red-700 border border-red-500/15 font-medium text-[11px] px-2 py-0.5"
              >
                {stats.hard} hard
              </Badge>
            )}
            {stats.easy === 0 && stats.medium === 0 && stats.hard === 0 && (
              <span className="text-xs text-muted-foreground/50 italic">—</span>
            )}
          </div>
        </TableCell>

        {/* Toggle Chevron */}
        <TableCell className="py-3 text-right pr-5">
          <Button variant="ghost" size="icon" className="size-8 hover:bg-muted/60" onClick={handleToggleClick}>
            <ChevronDown
              className={cn(
                'size-4 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </Button>
        </TableCell>
      </TableRow>

      {/* Expanded Problems Sub-Table */}
      {isOpen && (
        <TableRow className="bg-muted/20 hover:bg-transparent">
          <TableCell colSpan={5} className="p-0 border-t border-border/30">
            <div className="bg-muted/10 p-4 pl-12 space-y-3">
              {filteredProblems.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border rounded-lg bg-muted/10">
                  <p className="text-xs text-muted-foreground font-medium">
                    {search
                      ? 'No problems match your search'
                      : filter === 'done'
                      ? 'No completed problems in this category'
                      : filter === 'todo'
                      ? 'All problems completed!'
                      : filter === 'favorites'
                      ? 'No problems marked for revision in this category'
                      : 'No problems in this category'}
                  </p>
                </div>
              ) : (
                <Card className="border border-border/60 rounded-2xl shadow-2xs overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40 border-b border-border/60">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-12 h-9 text-[11px] py-2 pl-4 font-semibold text-muted-foreground uppercase tracking-wider">#</TableHead>
                        <TableHead className="h-9 text-[11px] py-2 font-semibold text-muted-foreground uppercase tracking-wider">Problem</TableHead>
                        <TableHead className="w-24 h-9 text-[11px] py-2 font-semibold text-muted-foreground uppercase tracking-wider">Difficulty</TableHead>
                        <TableHead className="w-24 h-9 text-[11px] py-2 text-center font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                        <TableHead className="w-24 h-9 text-[11px] py-2 text-center font-semibold text-muted-foreground uppercase tracking-wider">Revision</TableHead>
                        <TableHead className="w-24 h-9 text-[11px] py-2 font-semibold text-muted-foreground uppercase tracking-wider">Practice</TableHead>
                        <TableHead className="w-24 h-9 text-[11px] py-2 font-semibold text-muted-foreground uppercase tracking-wider">YouTube</TableHead>
                        <TableHead className="w-24 h-9 text-[11px] py-2 font-semibold text-muted-foreground uppercase tracking-wider">Resource</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProblems.map((problem, idx) => (
                        <DsaProblemRow
                          key={problem.id}
                          problem={problem}
                          index={idx}
                          collegeSlug={collegeSlug}
                          sheetSlug={sheetSlug}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});
