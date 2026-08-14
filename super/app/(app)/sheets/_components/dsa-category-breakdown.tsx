'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  breakdown: Array<{
    category: string;
    problemCount: number;
    avgCompletion: number;
    easy: number;
    medium: number;
    hard: number;
  }>;
}

export const DsaCategoryBreakdown = React.memo(function DsaCategoryBreakdown({ breakdown }: Props) {
  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-4 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground">Category Breakdown</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-primary/[0.04]">
              <th className="px-6 py-3 font-semibold text-muted-foreground">Category</th>
              <th className="px-6 py-3 font-semibold text-muted-foreground text-center">
                Problems
              </th>
              <th className="px-6 py-3 font-semibold text-muted-foreground text-center">
                Easy
              </th>
              <th className="px-6 py-3 font-semibold text-muted-foreground text-center">
                Medium
              </th>
              <th className="px-6 py-3 font-semibold text-muted-foreground text-center">
                Hard
              </th>
              <th className="px-6 py-3 font-semibold text-muted-foreground text-center">
                Avg Completion
              </th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((cat) => (
              <tr key={cat.category} className="border-t border-border/20 hover:bg-primary/[0.03]">
                <td className="px-6 py-3 font-medium">{cat.category}</td>
                <td className="px-6 py-3 text-center">{cat.problemCount}</td>
                <td className="px-6 py-3 text-center">
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 text-xs dark:text-emerald-400 dark:bg-emerald-500/10">
                    {cat.easy}
                  </Badge>
                </td>
                <td className="px-6 py-3 text-center">
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 text-xs dark:text-amber-400 dark:bg-amber-500/10">
                    {cat.medium}
                  </Badge>
                </td>
                <td className="px-6 py-3 text-center">
                  <Badge variant="secondary" className="bg-red-500/10 text-red-700 text-xs dark:text-red-400 dark:bg-red-500/10">
                    {cat.hard}
                  </Badge>
                </td>
                <td className="px-6 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-16 h-1.5 bg-primary/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-[width] ease-[var(--ease-out)]"
                        style={{ width: `${cat.avgCompletion}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {cat.avgCompletion}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
});
