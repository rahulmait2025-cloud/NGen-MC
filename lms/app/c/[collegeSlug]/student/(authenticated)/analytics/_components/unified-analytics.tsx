'use client';

import React from 'react';
import { Flame } from 'lucide-react';
import type { ChartConfig } from '@/components/ui/chart';
import type {
  CoursePieChartData,
  TimeOfDayAnalytics,
  HeatmapData,
  HeatmapDay,
  RecentActivityItem,
  VideoWatchHistoryItem,
  ModuleAnalyticsDetail,
} from '@/lib/analytics/student-video-analytics-service';
import type { DailyStreakResult } from '@/lib/streak/daily-streak';

export type {
  CoursePieChartData,
  TimeOfDayAnalytics,
  HeatmapData,
  HeatmapDay,
  RecentActivityItem,
  VideoWatchHistoryItem,
};

// Re-export tab and shell components for complete backward compatibility
import { UnifiedAnalyticsShell } from './unified-analytics-shell';
import { OverviewTabContent } from './tabs/overview-tab';
import { CoursesTabContent } from './tabs/courses-tab';
import { VideosTabContent } from './tabs/videos-tab';
import { StreaksTabContent } from './tabs/streaks-tab';
import { RiskBadge } from './risk-badge';

// ── Module-level constants ──

export const INTERACTIVE_CHART_CONFIG = {
  hours: { label: 'Hours', color: 'var(--chart-1)' },
  minutes: { label: 'Minutes', color: 'var(--chart-1)' },
} satisfies ChartConfig;

export const COURSE_PROGRESS_CONFIG = {
  completed: { label: 'Completed (Paid)', color: 'var(--success)' },
  remaining: { label: 'Remaining', color: 'var(--muted)' },
} satisfies ChartConfig;

export const SUBJECT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export const VIDEO_COMPLETION_CONFIG = {
  completed: { label: 'Completed', color: 'var(--success)' },
  inProgress: { label: 'In Progress', color: 'var(--chart-1)' },
  notStarted: { label: 'Not Started', color: 'var(--chart-5)' },
} satisfies ChartConfig;

export const WATCH_DEPTH_CONFIG = {
  '0–25%': { label: '0–25%', color: 'oklch(0.7 0.2 25)' },
  '25–50%': { label: '25–50%', color: 'oklch(0.75 0.18 55)' },
  '50–75%': { label: '50–75%', color: 'oklch(0.7 0.2 145)' },
  '75–100%': { label: '75–100%', color: 'oklch(0.65 0.22 160)' },
} satisfies ChartConfig;

export const ENGAGEMENT_CONFIG = {
  hours: { label: 'Hours', color: 'var(--chart-1)' },
  completion: { label: 'Completion %', color: 'var(--success)' },
} satisfies ChartConfig;

// ── Interfaces ──

export interface CourseProgressDatum {
  course: string;
  progress: number;
  totalHours: number;
  completedLectures: number;
  totalLectures: number;
}

export interface LearningHoursDatum {
  date: string;
  hours: number;
}

export interface DailyDatum {
  day: string;
  hours: number;
  lectures: number;
}

export interface WeeklyDatum {
  week: string;
  hours: number;
  lectures: number;
}

export interface AvailableCourse {
  id: string;
  title: string;
}

export interface UnifiedAnalyticsProps {
  kpis: {
    totalHours: number;
    totalWatchSeconds: number;
    lecturesWatched: number;
    totalAvailableLectures: number;
    coursesEnrolled: number;
    startedCourses: number;
    completedCourses: number;
    notStartedCourses: number;
    avgCompletion: number;
    videosCompleted: number;
    assignmentsCompleted: number;
    quizzesCompleted: number;
    learningStreak: number;
    longestStreak: number;
    riskStatus: string;
  };
  courseProgress: CourseProgressDatum[];
  learningHours: LearningHoursDatum[];
  dailyAnalytics: DailyDatum[];
  weeklyAnalytics: WeeklyDatum[];
  pieChart: CoursePieChartData;
  availableCourses: AvailableCourse[];
  timeOfDay: TimeOfDayAnalytics;
  heatmapData: HeatmapData;
  recentActivity: RecentActivityItem[];
  videoWatchHistory: VideoWatchHistoryItem[];
  streakResult: DailyStreakResult;
}

// ── Helpers ──

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);
  if (diffHrs < 1) return `${Math.round(diffHrs * 60)}m ago`;
  if (diffHrs < 24) return `${Math.round(diffHrs)}h ago`;
  if (diffHrs < 48) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Legacy container wrapper for full backward compatibility
export function UnifiedAnalytics({
  kpis,
  courseProgress,
  learningHours,
  dailyAnalytics,
  weeklyAnalytics: _weeklyAnalytics,
  pieChart,
  availableCourses,
  timeOfDay,
  heatmapData,
  recentActivity,
  videoWatchHistory,
  streakResult,
  allModules = [],
}: UnifiedAnalyticsProps & { allModules?: { courseId: string; courseName: string; modules: ModuleAnalyticsDetail[] }[] }) {
  return (
    <UnifiedAnalyticsShell
      headerBadges={
        <div className="flex items-center gap-3">
          {kpis.riskStatus && <RiskBadge status={kpis.riskStatus} />}
          {kpis.learningStreak > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 w-fit">
              <Flame className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              {kpis.learningStreak}-day streak
            </div>
          )}
        </div>
      }
      overviewTab={
        <OverviewTabContent
          kpis={kpis}
          learningHours={learningHours}
          dailyAnalytics={dailyAnalytics}
          pieChart={pieChart}
          heatmapData={heatmapData}
          recentActivity={recentActivity}
          timeOfDay={timeOfDay}
        />
      }
      coursesTab={
        <CoursesTabContent
          kpis={{
            coursesEnrolled: kpis.coursesEnrolled,
            completedCourses: kpis.completedCourses,
            startedCourses: kpis.startedCourses,
            avgCompletion: kpis.avgCompletion,
            totalWatchSeconds: kpis.totalWatchSeconds,
          }}
          courseProgress={courseProgress}
          availableCourses={availableCourses}
          initialModules={allModules.flatMap(g => g.modules)}
        />
      }
      videosTab={
        <VideosTabContent
          kpis={kpis}
          videoWatchHistory={videoWatchHistory}
          timeOfDay={timeOfDay}
        />
      }
      streaksTab={
        <StreaksTabContent
          kpis={kpis}
          streakResult={streakResult}
          heatmapData={heatmapData}
          timeOfDay={timeOfDay}
        />
      }
    />
  );
}
