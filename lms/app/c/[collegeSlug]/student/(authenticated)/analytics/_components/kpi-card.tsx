'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedCounter } from '@/components/student/gsap-animation';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  subtext?: string;
  accent?: boolean;
  index?: number;
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  subtext,
  accent = false,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        'group relative min-w-0 overflow-hidden rounded-2xl border border-border/50 bg-card p-0 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        accent ? 'border-amber-500/30 bg-amber-500/[0.02] dark:bg-amber-500/[0.04]' : 'hover:border-primary/30'
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'size-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105',
              accent
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {label}
            </p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <AnimatedCounter
                value={value}
                suffix={suffix}
                className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums"
              />
            </div>
            {subtext && (
              <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">
                {subtext}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
