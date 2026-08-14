'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  leaderboard: Array<{
    studentId: string;
    name: string;
    college: string;
    easy: number;
    medium: number;
    hard: number;
    total: number;
    pct: number;
    lastActive: string;
  }>;
  totalProblems: number;
}

type SortKey = 'name' | 'total' | 'easy' | 'medium' | 'hard' | 'pct';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-40" />;
  return sortDir === 'asc' ? (
    <ArrowUp className="size-3 text-primary" />
  ) : (
    <ArrowDown className="size-3 text-primary" />
  );
}

export function DsaStudentLeaderboard({ leaderboard, totalProblems: _totalProblems }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...leaderboard].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'string') {
      return sortDir === 'asc'
        ? aVal.localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal);
    }
    return sortDir === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-4 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground">Student Leaderboard</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {leaderboard.length} registered students
        </p>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="px-4 py-3 text-muted-foreground w-8">#</th>
              <th>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-2 h-8 text-xs font-semibold text-muted-foreground"
                  onClick={() => toggleSort('name')}
                >
                  Student <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
                </Button>
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">College</th>
              <th className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-2 h-8 text-xs font-semibold text-emerald-600"
                  onClick={() => toggleSort('easy')}
                >
                  Easy <SortIcon col="easy" sortKey={sortKey} sortDir={sortDir} />
                </Button>
              </th>
              <th className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-2 h-8 text-xs font-semibold text-amber-600"
                  onClick={() => toggleSort('medium')}
                >
                  Med <SortIcon col="medium" sortKey={sortKey} sortDir={sortDir} />
                </Button>
              </th>
              <th className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-2 h-8 text-xs font-semibold text-red-600"
                  onClick={() => toggleSort('hard')}
                >
                  Hard <SortIcon col="hard" sortKey={sortKey} sortDir={sortDir} />
                </Button>
              </th>
              <th className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-2 h-8 text-xs font-semibold text-muted-foreground"
                  onClick={() => toggleSort('total')}
                >
                  Total <SortIcon col="total" sortKey={sortKey} sortDir={sortDir} />
                </Button>
              </th>
              <th className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-2 h-8 text-xs font-semibold text-muted-foreground"
                  onClick={() => toggleSort('pct')}
                >
                  % <SortIcon col="pct" sortKey={sortKey} sortDir={sortDir} />
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground text-sm">
                  No student progress data yet
                </td>
              </tr>
            ) : (
              sorted.map((s, i) => (
                <tr
                  key={s.studentId}
                  className="border-t border-border/20 hover:bg-primary/[0.03]"
                >
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{s.college}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 text-xs dark:text-emerald-400 dark:bg-emerald-500/10">
                      {s.easy}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 text-xs dark:text-amber-400 dark:bg-amber-500/10">
                      {s.medium}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="secondary" className="bg-red-500/10 text-red-700 text-xs dark:text-red-400 dark:bg-red-500/10">
                      {s.hard}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{s.total}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-12 h-1.5 bg-primary/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-[width] ease-[var(--ease-out)]"
                          style={{ width: `${s.pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-7 text-right">
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
