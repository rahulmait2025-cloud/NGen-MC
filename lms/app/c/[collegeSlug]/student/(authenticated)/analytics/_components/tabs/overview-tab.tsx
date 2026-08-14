'use client';

import React, { useMemo, useState } from 'react';
import { Clock, BookOpen, Flame, Timer, Target, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from '@/lib/recharts-client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TransitionItem } from '@/components/student/page-transition';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import type {
  CoursePieChartData,
  TimeOfDayAnalytics,
  HeatmapData,
  RecentActivityItem,
} from '@/lib/analytics/student-video-analytics-service';
import { KpiCard } from '../kpi-card';
import { ActivityHeatmap } from '../activity-heatmap';
import { StudyTimesChart } from '../study-times-chart';
import { RecentActivityFeed } from '../recent-activity-feed';
import {
  INTERACTIVE_CHART_CONFIG,
  COURSE_PROGRESS_CONFIG,
  type LearningHoursDatum,
  type DailyDatum,
} from '../unified-analytics';

export function OverviewTabContent({
  kpis,
  learningHours,
  dailyAnalytics,
  pieChart: _pieChart,
  heatmapData,
  recentActivity,
  timeOfDay,
}: {
  kpis: {
    totalHours: number;
    totalWatchSeconds: number;
    lecturesWatched: number;
    totalAvailableLectures: number;
    learningStreak: number;
    longestStreak: number;
    avgCompletion: number;
  };
  learningHours: LearningHoursDatum[];
  dailyAnalytics: DailyDatum[];
  pieChart: CoursePieChartData;
  heatmapData: HeatmapData;
  recentActivity: RecentActivityItem[];
  timeOfDay: TimeOfDayAnalytics;
}) {
  const useMinutes = kpis.totalWatchSeconds < 3600;
  const [timeRange, setTimeRange] = useState('90d');

  const filteredChartData = useMemo(() => {
    const rawData = timeRange === '7d'
      ? dailyAnalytics.map(d => ({ date: d.day, val: d.hours }))
      : learningHours.map(d => ({ date: d.date, val: d.hours }));

    return rawData.map(d => ({
      date: d.date,
      [useMinutes ? 'minutes' : 'hours']: useMinutes ? Math.round(d.val * 60) : d.val,
    }));
  }, [timeRange, dailyAnalytics, learningHours, useMinutes]);

  const pieChartData = useMemo(() => {
    const completed = kpis.lecturesWatched;
    const total = kpis.totalAvailableLectures;
    const remaining = Math.max(0, total - completed);
    return [
      { name: 'Completed (Paid)', value: completed, fill: 'var(--success)' },
      { name: 'Remaining', value: remaining, fill: 'var(--muted)' },
    ];
  }, [kpis.lecturesWatched, kpis.totalAvailableLectures]);

  const peakHourIndex = useMemo(() => timeOfDay.hourly.reduce((max, curr, idx) => curr.hours > timeOfDay.hourly[max].hours ? idx : max, 0), [timeOfDay]);

  const weeklyPattern = useMemo(() => {
    return [
      { day: 'Mon', hours: 0 }, { day: 'Tue', hours: 0 }, { day: 'Wed', hours: 0 },
      { day: 'Thu', hours: 0 }, { day: 'Fri', hours: 0 }, { day: 'Sat', hours: 0 }, { day: 'Sun', hours: 0 },
    ].map(w => {
      const match = dailyAnalytics.filter(d => d.day?.toLowerCase().startsWith(w.day.toLowerCase()));
      const total = match.reduce((s, d) => s + d.hours, 0);
      const val = Math.round(total * 10) / 10;
      return {
        day: w.day,
        minutes: Math.round(val * 60),
        hours: val,
      };
    });
  }, [dailyAnalytics]);

  const hasWeeklyData = useMemo(() => {
    return weeklyPattern.some(w => (w[useMinutes ? 'minutes' : 'hours'] ?? 0) > 0);
  }, [weeklyPattern, useMinutes]);

  const avgSession = kpis.lecturesWatched > 0
    ? Math.round((kpis.totalWatchSeconds / kpis.lecturesWatched) / 60)
    : 0;

  return (
    <div className="space-y-8 mt-0 animate-in fade-in duration-300">
      {/* KPIs */}
      <TransitionItem index={1}>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard icon={Clock} label={useMinutes ? "Total minutes" : "Total hours"} value={useMinutes ? Math.round(kpis.totalWatchSeconds / 60) : kpis.totalHours} suffix={useMinutes ? "m" : "h"} subtext={useMinutes ? "Total study time" : `${Math.round(kpis.totalWatchSeconds / 60)}m total`} index={0} />
          <KpiCard icon={BookOpen} label="Lessons done" value={kpis.lecturesWatched} subtext={`of ${kpis.totalAvailableLectures} available`} index={1} />
          <KpiCard icon={Flame} label="Current streak" value={kpis.learningStreak} suffix="d" subtext={`Best: ${kpis.longestStreak}d`} accent={kpis.learningStreak > 0} index={2} />
          <KpiCard icon={Timer} label="Avg. session" value={avgSession} suffix="min" subtext={kpis.lecturesWatched > 0 ? 'per lesson' : ''} index={3} />
          <KpiCard icon={Target} label="Avg completion" value={kpis.avgCompletion} suffix="%" index={4} />
        </div>
      </TransitionItem>

      {/* Learning Hours + Course Progress */}
      <TransitionItem index={2}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 border border-border/60 bg-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">{useMinutes ? "Learning minutes" : "Learning hours"}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Daily study time</p>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs rounded-lg">
                  <SelectValue placeholder="30 days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="90d" className="text-xs">Last 90 days</SelectItem>
                  <SelectItem value="30d" className="text-xs">Last 30 days</SelectItem>
                  <SelectItem value="7d" className="text-xs">Last 7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filteredChartData.length > 0 ? (
              <div className="h-[220px] w-full">
                <ChartContainer config={INTERACTIVE_CHART_CONFIG} className="h-full w-full">
                  <AreaChart data={filteredChartData} margin={{ left: -20, right: 10 }}>
                    <defs>
                      <linearGradient id="hoursGradO" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey={useMinutes ? "minutes" : "hours"} stroke="var(--chart-1)" strokeWidth={2} fill="url(#hoursGradO)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--card)' }} />
                  </AreaChart>
                </ChartContainer>
              </div>
            ) : (
                <Empty className="h-[220px]">
                <EmptyHeader><EmptyMedia variant="icon"><BarChart3 className="size-6" /></EmptyMedia><EmptyTitle>No learning hours yet</EmptyTitle><EmptyDescription>Start a course and watch your first lecture to see your hours build up here.</EmptyDescription></EmptyHeader>
              </Empty>
            )}
          </div>

          <div className="border border-border/60 bg-card rounded-2xl p-6 space-y-4">
            <div><h2 className="text-sm font-semibold">Completed paid courses</h2><p className="text-xs text-muted-foreground mt-0.5">{kpis.lecturesWatched} of {kpis.totalAvailableLectures} videos completed</p></div>
            {kpis.totalAvailableLectures > 0 ? (
              <>
                <div className="flex items-center justify-center h-[180px]">
                  <ChartContainer config={COURSE_PROGRESS_CONFIG} className="h-full w-full max-w-[200px]">
                    <PieChart>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel className="min-w-[11rem]" />} />
                      <Pie data={pieChartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} strokeWidth={2} stroke="var(--background)">
                        {pieChartData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </div>
                <div className="space-y-2">
                  {pieChartData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="size-2.5 rounded-sm shrink-0" style={{ background: d.fill }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Empty className="py-8"><EmptyHeader><EmptyMedia variant="icon"><PieChartIcon className="size-6" /></EmptyMedia><EmptyTitle>No paid courses yet</EmptyTitle><EmptyDescription>Enroll in a paid course to track your completion progress here.</EmptyDescription></EmptyHeader></Empty>
            )}
          </div>
        </div>
      </TransitionItem>

      {/* Heatmap + Weekly Pattern */}
      <TransitionItem index={3}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 border border-border/60 bg-card rounded-2xl p-6 space-y-4">
            <div><h2 className="text-sm font-semibold">Activity heatmap</h2><p className="text-xs text-muted-foreground mt-0.5">Daily learning activity — {heatmapData.rangeText || '16 weeks'}</p></div>
            <ActivityHeatmap days={heatmapData.days} useMinutes={useMinutes} />
            <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground justify-end">
              <span>Less</span>
              <div className="flex" style={{ gap: '3px' }}>
                <span className="size-3.5 rounded-[3px] ring-1 ring-inset ring-black/[0.04]" style={{ background: 'var(--muted)' }} />
                <span className="size-3.5 rounded-[3px] ring-1 ring-inset ring-black/[0.04]" style={{ background: 'color-mix(in oklch, var(--primary) 20%, transparent)' }} />
                <span className="size-3.5 rounded-[3px] ring-1 ring-inset ring-black/[0.04]" style={{ background: 'color-mix(in oklch, var(--primary) 45%, transparent)' }} />
                <span className="size-3.5 rounded-[3px] ring-1 ring-inset ring-black/[0.04]" style={{ background: 'color-mix(in oklch, var(--primary) 70%, transparent)' }} />
                <span className="size-3.5 rounded-[3px] ring-1 ring-inset ring-black/[0.04]" style={{ background: 'var(--primary)' }} />
              </div>
              <span>More</span>
            </div>
          </div>

          <div className="lg:col-span-2 border border-border/60 bg-card rounded-2xl p-6 space-y-4">
            <div><h2 className="text-sm font-semibold">Weekly pattern</h2><p className="text-xs text-muted-foreground mt-0.5">Average {useMinutes ? 'minutes' : 'hours'} per weekday</p></div>
            {hasWeeklyData ? (
              <div className="h-[180px]">
                <ChartContainer config={INTERACTIVE_CHART_CONFIG} className="h-full w-full">
                  <BarChart data={weeklyPattern} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey={useMinutes ? "minutes" : "hours"} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ChartContainer>
              </div>
            ) : (
              <Empty className="h-[180px] py-0 flex items-center justify-center">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><BarChart3 className="size-6" /></EmptyMedia>
                  <EmptyTitle>No study data</EmptyTitle>
                  <EmptyDescription>Start watching videos to track your weekly pattern.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </div>
      </TransitionItem>

      {/* Recent Activity */}
      <TransitionItem index={4}>
        <div className="border border-border/60 bg-card rounded-2xl p-6 space-y-4">
          <div><h2 className="text-sm font-semibold">Recent activity</h2><p className="text-xs text-muted-foreground mt-0.5">Your latest learning actions</p></div>
          <RecentActivityFeed items={recentActivity} />
        </div>
      </TransitionItem>

      {/* Best Study Times */}
      <TransitionItem index={5}>
        <div className="border border-border/60 bg-card rounded-2xl p-6 space-y-4">
          <div><h2 className="text-sm font-semibold">Best study times</h2><p className="text-xs text-muted-foreground mt-0.5">When you&apos;re most productive</p></div>
          <StudyTimesChart hourly={timeOfDay.hourly} peakHourIndex={peakHourIndex} />
        </div>
      </TransitionItem>
    </div>
  );
}
