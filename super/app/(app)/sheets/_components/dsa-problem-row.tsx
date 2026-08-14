'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Pencil,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DsaAddEditProblemDialog } from './dsa-add-edit-problem-dialog';
import { DsaDeleteConfirmDialog } from './dsa-delete-confirm-dialog';
import { TableRow, TableCell } from '@/components/ui/table';
import type { DsaProblem } from '@/types/dsa';

interface Props {
  problem: DsaProblem;
  index: number;
  totalProblems: number;
  categoryId: string;
  onUpdate: (
    problemId: string,
    data: Partial<{
      name: string;
      difficulty: string;
      lc_url: string;
      yt_url: string;
      resource_url: string;
      notes: string;
    }>
  ) => void;
  onDelete: (problemId: string, categoryId: string) => void;
  onReorder: (problemId: string, categoryId: string, direction: 'up' | 'down') => void;
}

export const DsaProblemRow = React.memo(function DsaProblemRow({
  problem,
  index,
  totalProblems,
  categoryId,
  onUpdate,
  onDelete,
  onReorder,
}: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleReorderUp = useCallback(() => {
    onReorder(problem.id, categoryId, 'up');
  }, [problem.id, categoryId, onReorder]);

  const handleReorderDown = useCallback(() => {
    onReorder(problem.id, categoryId, 'down');
  }, [problem.id, categoryId, onReorder]);

  const difficultyColor = {
    Easy: 'bg-emerald-500/10 text-emerald-700 border-none dark:text-emerald-400 dark:bg-emerald-500/10',
    Medium: 'bg-amber-500/10 text-amber-700 border-none dark:text-amber-400 dark:bg-amber-500/10',
    Hard: 'bg-red-500/10 text-red-700 border-none dark:text-red-400 dark:bg-red-500/10',
  };

  return (
    <>
      <TableRow className="border-t border-border/20 hover:bg-primary/[0.03] transition-colors">
        <TableCell className="px-4 py-2.5 text-xs text-muted-foreground pl-4">{index + 1}</TableCell>
        <TableCell className="px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">{problem.name}</span>
        </TableCell>
        <TableCell className="px-4 py-2.5">
          <Badge
            variant="secondary"
            className={cn('text-xs font-semibold px-2 py-0.5', difficultyColor[problem.difficulty])}
          >
            {problem.difficulty}
          </Badge>
        </TableCell>
        <TableCell className="px-4 py-2.5">
          {problem.lc_url ? (
            <a
              href={problem.lc_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-3" />
              Link
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="px-4 py-2.5">
          {problem.yt_url ? (
            <a
              href={problem.yt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
            >
              <ExternalLink className="size-3" />
              Watch
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="px-4 py-2.5">
          {problem.resource_url ? (
            <a
              href={problem.resource_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
            >
              <ExternalLink className="size-3" />
              Open
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </TableCell>
        <TableCell className="px-4 py-2.5 max-w-[200px] truncate">
          <span className="text-xs text-muted-foreground leading-relaxed">
            {problem.notes || 'None'}
          </span>
        </TableCell>
        <TableCell className="px-4 py-2.5 text-right pr-4">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:bg-muted"
              onClick={handleReorderUp}
              disabled={index === 0}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:bg-muted"
              onClick={handleReorderDown}
              disabled={index === totalProblems - 1}
            >
              <ArrowDown className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:bg-muted"
              onClick={() => setShowEdit(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDelete(true)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <DsaAddEditProblemDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        problem={problem}
        onAdd={(data) => {
          onUpdate(problem.id, data);
          setShowEdit(false);
        }}
      />

      <DsaDeleteConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={() => {
          onDelete(problem.id, categoryId);
          setShowDelete(false);
        }}
        title="Delete Problem"
        description={`Are you sure you want to delete "${problem.name}"? This cannot be undone.`}
      />
    </>
  );
});
