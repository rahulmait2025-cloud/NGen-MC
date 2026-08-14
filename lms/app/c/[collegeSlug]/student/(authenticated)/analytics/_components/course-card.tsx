'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export function CourseCard({ name, progress, displayTime, lessons, status, color, modules }: {
  name: string;
  progress: number;
  displayTime: string;
  lessons: string;
  status: 'complete' | 'active' | 'not-started';
  color: string;
  modules: { name: string; done: number; total: number }[];
}) {
  const circ = 2 * Math.PI * 36;
  const offset = circ - (progress / 100) * circ;
  return (
    <div className="border border-border/60 bg-card rounded-2xl p-6 space-y-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 active:translate-y-0">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold truncate">{name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{lessons} lessons · {displayTime}</p>
          <div className="mt-2">
            {status === 'complete' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-success/15 text-success"><CheckCircle2 className="size-3" />Complete</span>}
            {status === 'active' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">In progress</span>}
            {status === 'not-started' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted/50 text-muted-foreground">Not started</span>}
          </div>
        </div>
        <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0" role="img" aria-label={`${progress}% complete`}>
          <circle cx="40" cy="40" r="36" fill="none" stroke="var(--muted)" strokeWidth="5" />
          <circle
            cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${circ}`} strokeDashoffset={`${offset}`}
            transform="rotate(-90 40 40)" strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-300 ease-[var(--ease-out)]"
          />
          <text x="40" y="40" textAnchor="middle" dominantBaseline="central" fill="currentColor" fontSize="14" fontWeight="800">{progress}%</text>
        </svg>
      </div>
      {modules && modules.length > 1 && (
        <div className="space-y-1.5">
          {modules.slice(0, 3).map((m) => {
            const mp = Math.round((m.done / m.total) * 100);
            return (
              <div key={m.name} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground truncate w-28">{m.name}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${mp}%`, background: color }}
                  />
                </div>
                <span className="font-medium w-8 text-right">{mp}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
