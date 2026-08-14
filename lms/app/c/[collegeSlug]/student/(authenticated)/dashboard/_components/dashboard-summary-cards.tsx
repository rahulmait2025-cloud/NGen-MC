'use client';

import React from 'react';
import { Clock, BookOpen, CheckCircle2, Flame } from 'lucide-react';
import { AnimatedCounter } from '@/components/student/gsap-animation';
import { StaggerReveal, StaggerChild } from '@/components/_animations/stagger-reveal';
import { cn } from '@/lib/utils';
import type { DashboardSummaryMetric } from '../page';

interface DashboardSummaryCardsProps {
  metrics: DashboardSummaryMetric[];
}

const metricIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Hours watched': Clock,
  'Courses enrolled': BookOpen,
  'Lessons completed': CheckCircle2,
  'Day streak': Flame,
};

const metricAccents: Record<string, string> = {
  'Day streak': 'bg-primary/10 text-primary',
};

function isNumericValue(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.replace(/[+,]/g, ''));
}

function DashboardSummaryCardsBase({ metrics }: DashboardSummaryCardsProps) {
  if (metrics.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
        Your learning stats will appear here once you start watching lessons.
      </div>
    );
  }

  return (
    <StaggerReveal
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      stagger={0.06}
      delay={0.1}
    >
      {metrics.map((metric) => {
        const Icon = metricIcons[metric.label] ?? BookOpen;
        const accent = metricAccents[metric.label];

        return (
          <StaggerChild key={metric.label}>
            <div
              className={cn(
                'group rounded-2xl border border-border/60 bg-card p-4 sm:p-5',
                'dashboard-card-hover hover:border-primary/20',
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl',
                    accent || 'bg-primary/10 text-primary',
                  )}
                >
                  <Icon className="size-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-[28px] font-bold tracking-tight tabular-nums leading-none text-foreground">
                  {isNumericValue(metric.value) ? (
                    <AnimatedCounter
                      value={parseFloat(metric.value.replace(/[+,]/g, ''))}
                      decimals={metric.value.includes('.') ? 1 : 0}
                    />
                  ) : (
                    metric.value
                  )}
                </span>
                {metric.unit ? (
                  <span className="text-xs font-medium text-muted-foreground">
                    {metric.unit}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                {metric.label}
              </p>
            </div>
          </StaggerChild>
        );
      })}
    </StaggerReveal>
  );
}

export const DashboardSummaryCards = React.memo(DashboardSummaryCardsBase);
