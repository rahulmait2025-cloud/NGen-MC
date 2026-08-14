'use client';

import React from 'react';
import { Trophy, Zap, Target, Crown, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Milestones({ currentStreak, totalHours, completedCourses }: { currentStreak: number; totalHours: number; completedCourses: number }) {
  const milestones = [
    { key: 'streak-7', label: '7-Day Starter', icon: Trophy, desc: 'Study 7 days in a row', progress: Math.min(currentStreak / 7, 1), earned: currentStreak >= 7 },
    { key: 'streak-14', label: '14-Day Builder', icon: Zap, desc: 'Study 14 days in a row', progress: Math.min(currentStreak / 14, 1), earned: currentStreak >= 14 },
    { key: 'streak-21', label: '21-Day Consistent', icon: Target, desc: 'Study 21 days in a row', progress: Math.min(currentStreak / 21, 1), earned: currentStreak >= 21 },
    { key: 'streak-30', label: '30-Day Dedicated', icon: Crown, desc: 'Study 30 days in a row', progress: Math.min(currentStreak / 30, 1), earned: currentStreak >= 30 },
    { key: 'hours-10', label: '10 Hours In', icon: Clock, desc: 'Watch 10 hours of content', progress: Math.min(totalHours / 10, 1), earned: totalHours >= 10 },
    { key: 'hours-50', label: '50 Hours In', icon: Clock, desc: 'Watch 50 hours of content', progress: Math.min(totalHours / 50, 1), earned: totalHours >= 50 },
    { key: 'course-1', label: 'First Course Done', icon: CheckCircle2, desc: 'Complete your first course', progress: Math.min(completedCourses / 1, 1), earned: completedCourses >= 1 },
  ];

  return (
    <div className="space-y-2">
      {milestones.map((m) => {
        const Icon = m.icon;
        const pct = Math.round(m.progress * 100);
        return (
          <div
            key={m.key}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl border transition-colors',
              m.earned
                ? 'bg-success/10 border-success/20'
                : 'bg-muted/20 border-border/40',
            )}
          >
            <div className={cn('size-9 rounded-lg flex items-center justify-center shrink-0', m.earned ? 'bg-success/15' : 'bg-muted/30')}>
              <Icon className={cn('size-4.5', m.earned ? 'text-success' : 'text-muted-foreground')} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-xs font-semibold', m.earned ? 'text-foreground' : 'text-muted-foreground')}>{m.label}</p>
              <p className="text-[10px] text-muted-foreground">{m.desc}</p>
              {!m.earned && (
                <div className="mt-1.5">
                  <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                    <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
            </div>
            <span className={cn('text-[10px] font-semibold shrink-0', m.earned ? 'text-success' : 'text-muted-foreground')}>
              {m.earned ? 'Earned' : `${pct}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
