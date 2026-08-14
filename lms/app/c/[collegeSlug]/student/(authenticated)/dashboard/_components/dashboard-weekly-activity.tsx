'use client';

import React from 'react';
import { Bar, BarChart, XAxis, CartesianGrid, LabelList, Cell } from 'recharts';
import { StaggerReveal, StaggerChild } from '@/components/_animations/stagger-reveal';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

import { BarChart3, TrendingUp } from 'lucide-react';
import type { DashboardWeeklyAnalyticsData } from '@/lib/services/dashboard-data';
import { formatLearningTimeCompact } from '@/lib/format/learning-time';

interface DashboardWeeklyActivityProps {
  analytics: DashboardWeeklyAnalyticsData;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const chartConfig = {
  hours: {
    label: 'Watch time',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

function getBarColor(index: number, hasValue: boolean, isToday: boolean): string {
  if (isToday) return 'var(--primary)';
  if (hasValue) return 'oklch(0.72 0.19 45 / 0.7)';
  return 'oklch(0.72 0.19 45 / 0.12)';
}

function getTodayIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

function DashboardWeeklyActivityBase({ analytics }: DashboardWeeklyActivityProps) {
  const todayIdx = getTodayIndex();

  const chartData = analytics.dailyActivity.map((row, i) => ({
    day: DAY_LABELS[i] ?? '',
    seconds: row.watchedSeconds,
    localDate: row.localDate,
    isToday: i === todayIdx,
  }));

  const totalLabel = formatLearningTimeCompact(analytics.weeklyWatchedSeconds);
  const totalLectures = analytics.weeklyDistinctLessons;
  const hasData = analytics.weeklyWatchedSeconds > 0;

  return (
    <StaggerReveal stagger={0.06} delay={0.2}>
      <StaggerChild>
        <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 dashboard-card-hover">
          <div className="flex items-start justify-between mb-5">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground tracking-tight">This Week</h2>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp className="size-3.5 text-primary/60" />
                <span>
                  <span className="font-medium text-foreground/80">{totalLabel}</span>
                  {' '}watched ·{' '}
                  <span className="font-medium text-foreground/80">{totalLectures}</span>
                  {' '}lessons
                </span>
              </div>
            </div>
          </div>

          {hasData ? (
            <div className="relative">
              <ChartContainer config={chartConfig} className="h-[180px] w-full">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="oklch(0 0 0 / 0.04)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tick={({ x, y, payload }) => {
                      const isToday = payload.index === todayIdx;
                      return (
                        <text
                          x={x}
                          y={Number(y) + 12}
                          textAnchor="middle"
                          className={[
                            'text-[11px] font-medium',
                            isToday ? 'fill-primary font-semibold' : 'fill-muted-foreground',
                          ].join(' ')}
                        >
                          {payload.value}
                        </text>
                      );
                    }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value) => {
                          const seconds = Number(value);
                          return [formatLearningTimeCompact(seconds), 'Watch time'];
                        }}
                      />
                    }
                  />
                  <Bar
                    dataKey="seconds"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                    animationDuration={600}
                    animationEasing="ease-out"
                  >
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={getBarColor(i, entry.seconds > 0, entry.isToday)}
                        className="transition-opacity duration-200"
                      />
                    ))}
                    <LabelList
                      position="top"
                      offset={6}
                      className="fill-muted-foreground"
                      fontSize={10}
                      fontWeight={500}
                      formatter={(value) => {
                        const seconds = Number(value);
                        if (seconds === 0) return '';
                        return formatLearningTimeCompact(seconds);
                      }}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          ) : (
            <div className="h-[180px] flex flex-col items-center justify-center text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 mb-3">
                <BarChart3 className="size-5 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium text-foreground/70">No activity this week</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">
                Start watching to see your progress here
              </p>
            </div>
          )}
        </div>
      </StaggerChild>
    </StaggerReveal>
  );
}

export const DashboardWeeklyActivity = React.memo(DashboardWeeklyActivityBase);
