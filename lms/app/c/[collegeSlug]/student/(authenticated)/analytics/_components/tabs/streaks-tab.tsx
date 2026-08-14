'use client';

import React from 'react';
import { Flame, Sun, Calendar, Zap } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Cell } from '@/lib/recharts-client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { TransitionItem } from '@/components/student/page-transition';
import type { TimeOfDayAnalytics, HeatmapData } from '@/lib/analytics/student-video-analytics-service';
import type { DailyStreakResult } from '@/lib/streak/daily-streak';
import { StreakCalendar } from '../streak-calendar';
import { Milestones } from '../milestones';
import { INTERACTIVE_CHART_CONFIG } from '../unified-analytics';

export function StreaksTabContent({
  kpis,
  streakResult,
  heatmapData,
  timeOfDay,
}: {
  kpis: {
    totalHours: number;
    completedCourses: number;
    totalWatchSeconds: number;
  };
  streakResult: DailyStreakResult;
  heatmapData: HeatmapData;
  timeOfDay: TimeOfDayAnalytics;
}) {
  const useMinutes = kpis.totalWatchSeconds < 3600;

  return (
    <div className="space-y-8 mt-0 animate-in fade-in duration-300">
      <TransitionItem index={1}>
        <div className="border border-border/60 bg-card rounded-2xl p-8 text-center space-y-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/8 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-center gap-3">
              <span className="text-6xl font-bold tracking-tight tabular-nums text-foreground">
                {streakResult.currentStreak}
              </span>
              <Flame className="size-12 animate-burn shrink-0 overflow-visible" />
            </div>
            <div className="text-lg font-semibold text-muted-foreground mt-2">day streak</div>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              {streakResult.currentStreak > 0
                ? `Keep going to beat your personal best of ${streakResult.longestStreak} days!`
                : 'Start a learning streak today by watching a video!'}
            </p>
            <div className="flex justify-center gap-3 mt-4 flex-wrap">
              <div className="px-4 py-2 rounded-xl bg-muted/30 border border-border/30 text-xs min-w-[100px]">
                <span className="text-muted-foreground">Best streak</span>
                <span className="block text-lg font-bold mt-0.5">{streakResult.longestStreak}d</span>
              </div>
              <div className="px-4 py-2 rounded-xl bg-muted/30 border border-border/30 text-xs min-w-[100px]">
                <span className="text-muted-foreground">Total days</span>
                <span className="block text-lg font-bold mt-0.5">{(streakResult.activeDates ?? []).length}d</span>
              </div>
              <div className="px-4 py-2 rounded-xl bg-muted/30 border border-border/30 text-xs min-w-[100px]">
                <span className="text-muted-foreground">This month</span>
                <span className="block text-lg font-bold text-success mt-0.5">
                  {(streakResult.activeDates ?? []).filter(d => d.startsWith(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)).length}d
                </span>
              </div>
            </div>
          </div>
        </div>
      </TransitionItem>

      <TransitionItem index={2}>
        <div className="border border-border/60 bg-card rounded-2xl p-6">
          <StreakCalendar activeDays={streakResult.activeDates ?? []} />
        </div>
      </TransitionItem>

      <TransitionItem index={3}>
        <div className="border border-border/60 bg-card rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Weekly study trend</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your weekly {useMinutes ? 'minutes' : 'hours'} over the past 6 months
            </p>
          </div>
          <div className="h-[200px]">
            <ChartContainer config={INTERACTIVE_CHART_CONFIG} className="h-full w-full">
              <BarChart
                data={Array.from({ length: 26 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (25 - i) * 7);
                  const weekData = heatmapData.days.filter(hd => {
                    const hdDate = new Date(hd.date);
                    const weekStart = new Date(d);
                    const weekEnd = new Date(d);
                    weekEnd.setDate(weekEnd.getDate() + 6);
                    return hdDate >= weekStart && hdDate <= weekEnd;
                  });
                  const hoursVal = weekData.reduce((s, hd) => s + hd.hours, 0);
                  return {
                    label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    [useMinutes ? 'minutes' : 'hours']: useMinutes ? Math.round(hoursVal * 60) : Math.round(hoursVal * 10) / 10,
                  };
                })}
                margin={{ left: -20, right: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} interval={3} angle={-30} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey={useMinutes ? 'minutes' : 'hours'} radius={[4, 4, 0, 0]} maxBarSize={24}>
                  {Array.from({ length: 26 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (25 - i) * 7);
                    const weekData = heatmapData.days.filter(hd => {
                      const hdDate = new Date(hd.date);
                      const weekStart = new Date(d);
                      const weekEnd = new Date(d);
                      weekEnd.setDate(weekEnd.getDate() + 6);
                      return hdDate >= weekStart && hdDate <= weekEnd;
                    });
                    const _val = weekData.reduce((s, hd) => s + hd.hours, 0);
                    const isCurrentWeek = i === 25;
                    return <Cell key={i} fill={isCurrentWeek ? 'var(--primary)' : 'var(--chart-1)'} opacity={isCurrentWeek ? 1 : 0.7} />;
                  })}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </TransitionItem>

      <TransitionItem index={4}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="border border-border/60 bg-card rounded-2xl p-6 space-y-4">
            <div><h2 className="text-sm font-semibold">Milestones</h2><p className="text-xs text-muted-foreground mt-0.5">Achievements unlocked</p></div>
            <Milestones currentStreak={streakResult.currentStreak} totalHours={kpis.totalHours} completedCourses={kpis.completedCourses} />
          </div>

          <div className="border border-border/60 bg-card rounded-2xl p-6 space-y-4">
            <div><h2 className="text-sm font-semibold">Study insights</h2><p className="text-xs text-muted-foreground mt-0.5">Patterns in your learning</p></div>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <Sun className="size-4 text-amber-500" />
                  <span className="text-xs font-semibold">Peak hour</span>
                </div>
                <p className="text-sm font-bold text-foreground">{timeOfDay.peakHour.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You study most at {timeOfDay.peakHour.label} — try scheduling hard content here.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="size-4 text-primary" />
                  <span className="text-xs font-semibold">Best day</span>
                </div>
                <p className="text-sm font-bold text-foreground">{timeOfDay.peakDay.day}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {timeOfDay.peakDay.day} is your most active day — {useMinutes ? `${Math.round(timeOfDay.peakDay.hours * 60)}m` : `${timeOfDay.peakDay.hours.toFixed(1)}h`} of study.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="size-4 text-primary" />
                  <span className="text-xs font-semibold">Best period</span>
                </div>
                <p className="text-sm font-bold text-foreground">{timeOfDay.dominantPeriod.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {timeOfDay.dominantPeriod.range} — {useMinutes ? `${Math.round(timeOfDay.dominantPeriod.hours * 60)}m` : `${timeOfDay.dominantPeriod.hours.toFixed(1)}h`} total study.
                </p>
              </div>
            </div>
          </div>
        </div>
      </TransitionItem>
    </div>
  );
}
