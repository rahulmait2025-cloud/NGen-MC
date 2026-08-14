'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown, Heart } from 'lucide-react';

interface Props {
  stats: Array<{
    problemId: string;
    name: string;
    category: string;
    solvedCount: number;
    favoritedCount: number;
  }>;
}

type SortKey = 'name' | 'category' | 'solvedCount' | 'favoritedCount';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-40" />;
  return sortDir === 'asc' ? (
    <ArrowUp className="size-3 text-primary" />
  ) : (
    <ArrowDown className="size-3 text-primary" />
  );
}

export function DsaProblemStats({ stats }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('solvedCount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...stats].sort((a, b) => {
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

  const maxSolved = Math.max(...stats.map((s) => s.solvedCount), 1);

  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-4 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground">Problem Statistics</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {stats.length} problems sorted by popularity
        </p>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-2 h-8 text-xs font-semibold text-muted-foreground"
                  onClick={() => toggleSort('name')}
                >
                  Problem <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
                </Button>
              </th>
              <th className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-2 h-8 text-xs font-semibold text-muted-foreground"
                  onClick={() => toggleSort('category')}
                >
                  Category <SortIcon col="category" sortKey={sortKey} sortDir={sortDir} />
                </Button>
              </th>
              <th className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-2 h-8 text-xs font-semibold text-muted-foreground"
                  onClick={() => toggleSort('solvedCount')}
                >
                  Solved <SortIcon col="solvedCount" sortKey={sortKey} sortDir={sortDir} />
                </Button>
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center">
                Popularity
              </th>
              <th className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-2 h-8 text-xs font-semibold text-muted-foreground"
                  onClick={() => toggleSort('favoritedCount')}
                >
                  <Heart className="size-3" /> <SortIcon col="favoritedCount" sortKey={sortKey} sortDir={sortDir} />
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr
                key={s.problemId}
                className="border-t border-border/20 hover:bg-primary/[0.03]"
              >
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                  {s.category}
                </td>
                <td className="px-4 py-3 text-center font-semibold">{s.solvedCount}</td>
                <td className="px-4 py-3">
                  <div className="w-full h-1.5 bg-primary/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full transition-[width] ease-[var(--ease-out)]"
                      style={{
                        width: `${(s.solvedCount / maxSolved) * 100}%`,
                      }}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Heart className="size-3" />
                    {s.favoritedCount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
