'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ChevronDown,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DsaProblemRow } from './dsa-problem-row';
import { DsaAddEditProblemDialog } from './dsa-add-edit-problem-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import type { DsaCategoryWithProblems } from '@/types/dsa';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const colorDotMap: Record<string, string> = {
  primary: 'bg-primary',
  'blue-600': 'bg-blue-600',
  'violet-600': 'bg-violet-600',
  'amber-600': 'bg-amber-600',
  'emerald-600': 'bg-emerald-600',
  'rose-600': 'bg-rose-600',
  'cyan-600': 'bg-cyan-600',
  'orange-600': 'bg-orange-600',
  'teal-600': 'bg-teal-600',
  'pink-600': 'bg-pink-600',
  'indigo-600': 'bg-indigo-600',
  'lime-600': 'bg-lime-600',
  'yellow-600': 'bg-yellow-600',
  'fuchsia-600': 'bg-fuchsia-600',
  'sky-600': 'bg-sky-600',
  'red-600': 'bg-red-600',
  // Legacy mappings fallback
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
};

const COLORS: { name: string; hex: string }[] = [
  { name: 'primary', hex: 'var(--primary)' },
  { name: 'blue-600', hex: '#2563eb' },
  { name: 'violet-600', hex: '#7c3aed' },
  { name: 'amber-600', hex: '#d97706' },
  { name: 'emerald-600', hex: '#059669' },
  { name: 'rose-600', hex: '#e11d48' },
  { name: 'cyan-600', hex: '#0891b2' },
  { name: 'orange-600', hex: '#ea580c' },
  { name: 'teal-600', hex: '#0d9488' },
  { name: 'pink-600', hex: '#db2777' },
  { name: 'indigo-600', hex: '#4f46e5' },
  { name: 'lime-600', hex: '#65a30d' },
  { name: 'yellow-600', hex: '#ca8a04' },
  { name: 'fuchsia-600', hex: '#c026d3' },
  { name: 'sky-600', hex: '#0284c7' },
  { name: 'red-600', hex: '#dc2626' },
];

interface Props {
  category: DsaCategoryWithProblems;
  index: number;
  totalCategories: number;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  onUpdate: (id: string, data: { name?: string; color?: string }) => void;
  onDelete: (id: string) => void;
  onAddProblem: (
    categoryId: string,
    data: {
      name: string;
      difficulty: string;
      lc_url: string;
      yt_url: string;
      resource_url?: string;
      notes: string;
    }
  ) => void;
  onUpdateProblem: (
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
  onDeleteProblem: (problemId: string, categoryId: string) => void;
  onReorderProblem: (problemId: string, categoryId: string, direction: 'up' | 'down') => void;
}

export function DsaCategoryCard({
  category,
  index,
  totalCategories,
  onReorder,
  onUpdate,
  onDelete,
  onAddProblem,
  onUpdateProblem,
  onDeleteProblem,
  onReorderProblem,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editColor, setEditColor] = useState(category.color);
  const [showAddProblem, setShowAddProblem] = useState(false);

  const easy = category.problems.filter((p) => p.difficulty === 'Easy').length;
  const medium = category.problems.filter((p) => p.difficulty === 'Medium').length;
  const hard = category.problems.filter((p) => p.difficulty === 'Hard').length;

  const handleSaveName = useCallback(async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) return;

    const nameChanged = trimmedName !== category.name;
    const colorChanged = editColor !== category.color;

    if (nameChanged || colorChanged) {
      await onUpdate(category.id, {
        name: nameChanged ? trimmedName : undefined,
        color: colorChanged ? editColor : undefined,
      });
      toast.success('Category updated');
    }
    setIsEditing(false);
  }, [editName, editColor, category.id, category.name, category.color, onUpdate]);

  const handleDelete = useCallback(async () => {
    await onDelete(category.id);
  }, [category.id, onDelete]);

  return (
    <>
      <TableRow
        className={cn(
          'transition-colors cursor-pointer select-none border-b border-black',
          isOpen && 'bg-primary/[0.04]'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Order Controls */}
        <TableCell className="pl-5 py-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:bg-muted"
              onClick={() => onReorder(category.id, 'up')}
              disabled={index === 0}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:bg-muted"
              onClick={() => onReorder(category.id, 'down')}
              disabled={index === totalCategories - 1}
            >
              <ArrowDown className="size-3.5" />
            </Button>
          </div>
        </TableCell>

        {/* Category Indicator & Name */}
        <TableCell className="py-2.5">
          <div className="flex items-center gap-3">
            {isEditing ? (
              <div onClick={(e) => e.stopPropagation()}>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'size-4 rounded-full shrink-0 shadow-sm border border-foreground/20 hover:scale-110 transition-transform cursor-pointer focus:outline-none',
                        colorDotMap[editColor] || 'bg-primary'
                      )}
                      title="Change category color"
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3 bg-popover border border-border/80 shadow-md rounded-lg" align="start">
                    <div className="text-[11px] font-semibold text-muted-foreground mb-2">Category Color</div>
                    <div className="grid grid-cols-4 gap-2">
                      {COLORS.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          className={cn(
                            'size-6 rounded-full border transition-[border-color,transform] ease-out',
                            editColor === c.name ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                          )}
                          style={{ backgroundColor: c.hex }}
                          onClick={() => setEditColor(c.name)}
                        >
                          <span className="sr-only">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <span
                className={cn(
                  'size-2.5 rounded-full shrink-0 shadow-sm',
                  colorDotMap[category.color] || 'bg-primary'
                )}
              />
            )}
            {isEditing ? (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 max-w-[240px] font-medium"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') {
                      setEditName(category.name);
                      setEditColor(category.color);
                      setIsEditing(false);
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={handleSaveName}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-muted-foreground"
                  onClick={() => {
                    setEditName(category.name);
                    setEditColor(category.color);
                    setIsEditing(false);
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title">
                <span className="font-semibold text-foreground text-sm truncate max-w-[240px]">
                  {category.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 opacity-0 group-hover/title:opacity-100 transition-opacity hover:bg-muted/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditName(category.name);
                    setEditColor(category.color);
                    setIsEditing(true);
                  }}
                >
                  <Pencil className="size-3 text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>
        </TableCell>

        {/* Total Problems count */}
        <TableCell className="py-2.5">
          <Badge
            variant="secondary"
            className="font-semibold px-2 py-0.5 text-xs bg-muted/60 text-muted-foreground hover:bg-muted/60 border border-border/10"
          >
            {category.problems.length} {category.problems.length === 1 ? 'problem' : 'problems'}
          </Badge>
        </TableCell>

        {/* Difficulty breakdown */}
        <TableCell className="py-2.5">
          <div className="flex items-center gap-1.5">
            {easy > 0 && (
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-700 border-none font-medium text-[11px] px-2 py-0.5 dark:text-emerald-400 dark:bg-emerald-500/10"
              >
                {easy} easy
              </Badge>
            )}
            {medium > 0 && (
              <Badge
                variant="secondary"
                className="bg-amber-500/10 text-amber-700 border-none font-medium text-[11px] px-2 py-0.5 dark:text-amber-400 dark:bg-amber-500/10"
              >
                {medium} medium
              </Badge>
            )}
            {hard > 0 && (
              <Badge
                variant="secondary"
                className="bg-red-500/10 text-red-700 border-none font-medium text-[11px] px-2 py-0.5 dark:text-red-400 dark:bg-red-500/10"
              >
                {hard} hard
              </Badge>
            )}
            {easy === 0 && medium === 0 && hard === 0 && (
              <span className="text-xs text-muted-foreground italic">—</span>
            )}
          </div>
        </TableCell>

        {/* Action Controls */}
        <TableCell className="py-2.5 text-right pr-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setShowAddProblem(true)}
            >
              <Plus className="size-3.5" />
              Add Problem
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-muted"
              onClick={() => setIsOpen(!isOpen)}
            >
              <ChevronDown
                className={cn(
                  'size-4 text-muted-foreground transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
              />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded Problems Sub-Table */}
      {isOpen && (
        <TableRow className="bg-primary/[0.03] hover:bg-transparent">
          <TableCell colSpan={5} className="p-0 border-t border-border/30">
            <div className="bg-primary/[0.03] p-4 pl-12 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground">
                  {category.name}
                </h4>
                {category.problems.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => setShowAddProblem(true)}
                  >
                    <Plus className="size-3" />
                    Add Problem
                  </Button>
                )}
              </div>

              {category.problems.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-primary/15 rounded-lg bg-primary/[0.02] flex flex-col items-center justify-center gap-3">
                  <p className="text-xs text-muted-foreground">No problems in this category yet.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5"
                    onClick={() => setShowAddProblem(true)}
                  >
                    <Plus className="size-3.5" />
                    Add Problem
                  </Button>
                </div>
              ) : (
                <Card className="border border-border/40 shadow-none overflow-hidden">
                  <Table>
                    <TableHeader className="bg-primary/[0.04]">
                      <TableRow>
                        <TableHead className="w-12 h-8 text-xs py-1.5 pl-4 font-semibold text-foreground/80">#</TableHead>
                        <TableHead className="h-8 text-xs py-1.5 font-semibold text-foreground/80">Problem</TableHead>
                        <TableHead className="w-24 h-8 text-xs py-1.5 font-semibold text-foreground/80">Difficulty</TableHead>
                        <TableHead className="w-24 h-8 text-xs py-1.5 font-semibold text-foreground/80">Practice</TableHead>
                        <TableHead className="w-24 h-8 text-xs py-1.5 font-semibold text-foreground/80">YouTube</TableHead>
                        <TableHead className="w-24 h-8 text-xs py-1.5 font-semibold text-foreground/80">Resource</TableHead>
                        <TableHead className="h-8 text-xs py-1.5 font-semibold text-foreground/80">Notes</TableHead>
                        <TableHead className="w-32 h-8 text-xs py-1.5 text-right pr-4 font-semibold text-foreground/80">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {category.problems.map((problem, pIdx) => (
                        <DsaProblemRow
                          key={problem.id}
                          problem={problem}
                          index={pIdx}
                          totalProblems={category.problems.length}
                          categoryId={category.id}
                          onUpdate={onUpdateProblem}
                          onDelete={onDeleteProblem}
                          onReorder={onReorderProblem}
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

      <DsaAddEditProblemDialog
        open={showAddProblem}
        onOpenChange={setShowAddProblem}
        onAdd={(data) => {
          onAddProblem(category.id, data);
          setShowAddProblem(false);
        }}
      />
    </>
  );
}
