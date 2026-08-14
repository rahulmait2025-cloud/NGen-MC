'use client';

import React, { useMemo } from 'react';
import {
  PlayCircle,
  FileCheck,
  Flame,
  Calendar,
  Clock,
  BookOpen,
} from 'lucide-react';
import type { StudentLearningActivity } from '@/lib/activity/student-learning-activity';
import { ContributionHeatmap } from '@/components/activity/contribution-heatmap';
import { BentoCard, BentoCardBody } from '@/components/student/bento-card';
import { PageTransition, TransitionItem } from '@/components/student/page-transition';
import { AnimatedCounter } from '@/components/student/gsap-animation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from '@/lib/recharts-client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

export type StudentActivityStats = {
  videosWatched: number;
  assignmentsCompleted: number;
  dayStreak: number;
  totalWatchHours: number;
  coursesActive: number;
};

const weeklyChartConfig = {
  count: {
    label: 'Activities',
    color: 'oklch(0.72 0.19 45)',
  },
} satisfies ChartConfig;

function KpiCard({
  icon: Icon,
  label,
  value,
  suffix = '',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="group relative min-w-0 rounded-2xl border border-border/60 bg-card px-4 py-4 text-card-foreground shadow-sm transition duration-200 hover:shadow-md hover:border-border sm:px-5">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 transition-colors group-hover:bg-primary/15">
          <Icon className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground font-medium leading-snug uppercase tracking-wide">
            {label}
          </p>
          <div className="flex items-baseline gap-1.5">
            <AnimatedCounter
              value={value}
              suffix={suffix}
              className="text-xl font-bold text-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const EMPTY_ACTIVITY_COUNTS: Record<string, number> = {};

export function StudentActivityDashboard({
  allActivities,
  dailyActivityCounts = EMPTY_ACTIVITY_COUNTS,
  stats: statsFromServer,
  watchSuffix = 'h',
}: {
  allActivities: StudentLearningActivity[];
  dailyActivityCounts?: Record<string, number>;
  stats?: StudentActivityStats;
  watchSuffix?: string;
}) {
  const derivedStats = useMemo(() => {
    const videoCount = allActivities.filter((a) => a.kind === 'video_watched').length;
    const assignmentCount = allActivities.filter(
      (a) => a.kind === 'assignment_done' || a.kind === 'quiz_taken',
    ).length;

    return {
      videosWatched: videoCount,
      assignmentsCompleted: assignmentCount,
      dayStreak: 0,
      totalWatchHours: 0,
      coursesActive: 0,
    };
  }, [allActivities]);

  const stats = statsFromServer ?? derivedStats;

  const weekDays = useMemo(() => {
    const today = new Date();
    const days: { day: string; count: number; fullDate: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        count: dailyActivityCounts[key] ?? 0,
        fullDate: key,
      });
    }
    return days;
  }, [dailyActivityCounts]);

  return (
    <PageTransition>
      <div className="space-y-6">
        <TransitionItem index={0}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <KpiCard icon={PlayCircle} label="Videos Watched" value={stats.videosWatched} />
            <KpiCard icon={FileCheck} label="Assignments" value={stats.assignmentsCompleted} />
            <KpiCard icon={Flame} label="Day Streak" value={stats.dayStreak} suffix="d" />
            <KpiCard icon={Clock} label="Watch Time" value={stats.totalWatchHours} suffix={watchSuffix} />
            <KpiCard icon={BookOpen} label="Active Courses" value={stats.coursesActive} />
          </div>
        </TransitionItem>

        <TransitionItem index={1}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BentoCard>
              <BentoCardBody>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-card-foreground">This Week</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Daily activity count (last 7 days)
                  </p>
                </div>
                {weekDays.some((d) => d.count > 0) ? (
                  <ChartContainer
                    config={weeklyChartConfig}
                    className="h-[140px] sm:h-[180px] w-full"
                  >
                    <BarChart
                      accessibilityLayer
                      data={weekDays}
                      margin={{
                        left: 12,
                        right: 12,
                        top: 12,
                        bottom: 12,
                      }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        allowDecimals={false}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Bar
                        dataKey="count"
                        fill="var(--color-count)"
                        radius={6}
                      />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[140px] sm:h-[180px] items-center justify-center text-xs text-muted-foreground">
                    No activity this week yet
                  </div>
                )}
              </BentoCardBody>
            </BentoCard>

            <BentoCard>
              <BentoCardBody className="!p-0">
                <div className="px-6 pt-5 pb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
                    <Calendar className="size-4 text-primary" />
                    Yearly Activity
                  </h3>
                </div>
                <div className="px-6 pb-6">
                  <ContributionHeatmap dailyCounts={dailyActivityCounts} />
                </div>
              </BentoCardBody>
            </BentoCard>
          </div>
        </TransitionItem>
      </div>
    </PageTransition>
  );
}
