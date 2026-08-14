'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DsaSheetWithData, DsaCategoryWithProblems, DsaProblem } from '@/types/dsa';

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

interface ProgressEntry {
  studentId: string;
  name: string;
  easy: number;
  medium: number;
  hard: number;
  total: number;
  pct: number;
  lastActive: string;
}

interface Props {
  sheet: DsaSheetWithData | null;
  progress: ProgressEntry[];
}

export function DsaSheetCollegeView({ sheet, progress }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {sheet?.title || 'DSA Pattern Sheet'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View the DSA sheet and track your students&apos; progress
        </p>
      </div>

      <Tabs defaultValue="progress" className="space-y-6">
        <TabsList>
          <TabsTrigger value="progress">Student Progress</TabsTrigger>
          <TabsTrigger value="sheet">Sheet View</TabsTrigger>
        </TabsList>

        <TabsContent value="progress">
          <ProgressTable progress={progress} />
        </TabsContent>

        <TabsContent value="sheet">
          <SheetReadOnly sheet={sheet} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CategorySectionReadOnly({ category }: { category: DsaCategoryWithProblems }) {
  const [isOpen, setIsOpen] = useState(false);

  const easy = category.problems.filter((p: DsaProblem) => p.difficulty === 'Easy').length;
  const medium = category.problems.filter((p: DsaProblem) => p.difficulty === 'Medium').length;
  const hard = category.problems.filter((p: DsaProblem) => p.difficulty === 'Hard').length;

  const difficultyColor = {
    Easy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20 hover:bg-emerald-500/10 border-none',
    Medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:bg-amber-500/20 hover:bg-amber-500/10 border-none',
    Hard: 'bg-red-500/10 text-red-600 dark:text-red-400 dark:bg-red-500/20 hover:bg-red-500/10 border-none',
  };

  return (
    <>
      <TableRow
        className={cn(
          'transition-colors cursor-pointer select-none border-b border-black',
          isOpen && 'bg-muted/10'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell className="pl-5 py-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'size-2.5 rounded-full shrink-0 shadow-sm',
                colorDotMap[category.color] || 'bg-primary'
              )}
            />
            <span className="font-semibold text-foreground text-sm truncate max-w-[240px]">
              {category.name}
            </span>
          </div>
        </TableCell>

        <TableCell className="py-3 text-sm text-muted-foreground">
          {category.problems.length} {category.problems.length === 1 ? 'problem' : 'problems'}
        </TableCell>

        <TableCell className="py-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {easy > 0 && (
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20 hover:bg-emerald-500/15 border-none font-medium text-[11px] px-2 py-0.5"
              >
                {easy} easy
              </Badge>
            )}
            {medium > 0 && (
              <Badge
                variant="secondary"
                className="bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:bg-amber-500/20 hover:bg-amber-500/15 border-none font-medium text-[11px] px-2 py-0.5"
              >
                {medium} medium
              </Badge>
            )}
            {hard > 0 && (
              <Badge
                variant="secondary"
                className="bg-red-500/10 text-red-600 dark:text-red-400 dark:bg-red-500/20 hover:bg-red-500/15 border-none font-medium text-[11px] px-2 py-0.5"
              >
                {hard} hard
              </Badge>
            )}
            {easy === 0 && medium === 0 && hard === 0 && (
              <span className="text-xs text-muted-foreground italic">—</span>
            )}
          </div>
        </TableCell>

        <TableCell className="py-3 text-right pr-5">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
          >
            <ChevronDown
              className={cn(
                'size-4 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </Button>
        </TableCell>
      </TableRow>

      {isOpen && (
        <TableRow className="bg-muted/5 hover:bg-transparent">
          <TableCell colSpan={4} className="p-0 border-t border-border/30">
            <div className="bg-muted/15 p-4 pl-12 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Problems in {category.name}
                </h4>
              </div>

              {category.problems.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border/60 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground">
                    No problems in this category yet.
                  </p>
                </div>
              ) : (
                <Card className="border border-border/40 shadow-none overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-12 h-8 text-[11px] py-1.5 pl-4">#</TableHead>
                        <TableHead className="h-8 text-[11px] py-1.5">Problem</TableHead>
                        <TableHead className="w-24 h-8 text-[11px] py-1.5">Difficulty</TableHead>
                        <TableHead className="w-24 h-8 text-[11px] py-1.5">LeetCode</TableHead>
                        <TableHead className="w-24 h-8 text-[11px] py-1.5">YouTube</TableHead>
                        <TableHead className="h-8 text-[11px] py-1.5">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {category.problems.map((problem: DsaProblem, idx: number) => (
                        <TableRow key={problem.id} className="border-t border-border/20 hover:bg-muted/10 transition-colors">
                          <TableCell className="px-4 py-2.5 text-xs text-muted-foreground pl-4">{idx + 1}</TableCell>
                          <TableCell className="px-4 py-2.5 font-semibold text-sm text-foreground">{problem.name}</TableCell>
                          <TableCell className="px-4 py-2.5">
                            <Badge
                              variant="secondary"
                              className={cn('text-xs font-semibold px-2 py-0.5', difficultyColor[problem.difficulty as 'Easy' | 'Medium' | 'Hard'])}
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
                                Solve
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
                          <TableCell className="px-4 py-2.5 max-w-[200px] truncate pr-4">
                            <span className="text-xs text-muted-foreground leading-relaxed">
                              {problem.notes || '—'}
                            </span>
                          </TableCell>
                        </TableRow>
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
}

function ProgressTable({ progress }: { progress: ProgressEntry[] }) {
  return (
    <Card className="border border-border/50 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted/40 border-b border-border/20">
              <th className="text-xs font-semibold text-muted-foreground px-6 py-3">Student</th>
              <th className="text-xs font-semibold text-muted-foreground px-6 py-3 text-center w-24">Easy</th>
              <th className="text-xs font-semibold text-muted-foreground px-6 py-3 text-center w-24">Medium</th>
              <th className="text-xs font-semibold text-muted-foreground px-6 py-3 text-center w-24">Hard</th>
              <th className="text-xs font-semibold text-muted-foreground px-6 py-3 text-center w-24">Total</th>
              <th className="text-xs font-semibold text-muted-foreground px-6 py-3">Progress</th>
            </tr>
          </thead>
          <tbody>
            {progress.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                  No student progress recorded yet
                </td>
              </tr>
            ) : (
              progress.map((s) => (
                <tr key={s.studentId} className="border-t border-border/20 hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-3">
                    <div>
                      <div className="font-semibold text-foreground text-sm">{s.name}</div>
                      {s.lastActive && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Active {new Date(s.lastActive).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 text-xs">
                      {s.easy}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 text-xs">
                      {s.medium}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <Badge variant="secondary" className="bg-red-500/10 text-red-700 text-xs">
                      {s.hard}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-center font-semibold text-sm">{s.total}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden w-24">
                        <div
                          className="h-full bg-primary rounded-full transition-[width]"
                          style={{ width: `${s.pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8">
                        {s.pct}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SheetReadOnly({ sheet }: { sheet: DsaSheetWithData | null }) {
  if (!sheet) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground text-sm">No DSA sheet available</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {sheet.description_md && (
        <Card className="p-5 sm:p-6">
          <div className="prose prose-sm prose-neutral max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {sheet.description_md}
            </ReactMarkdown>
          </div>
        </Card>
      )}

      <Card className="border border-border/50 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-5 font-semibold text-foreground">Category</TableHead>
              <TableHead className="w-[140px] font-semibold text-foreground">Problems</TableHead>
              <TableHead className="w-[300px] font-semibold text-foreground">Difficulty Breakdown</TableHead>
              <TableHead className="w-[80px] text-right pr-5 font-semibold text-foreground"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sheet.categories.map((category) => (
              <CategorySectionReadOnly key={category.id} category={category} />
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
