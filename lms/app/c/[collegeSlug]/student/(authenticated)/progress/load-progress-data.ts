import 'server-only';

import { StudentVideoAnalyticsService } from '@/lib/analytics/student-video-analytics-service';
import { StudentProgressService } from '@/lib/lms/analytics/services/progress';
import { listStudentEntitledCoursesGroupedByPillar } from '@/lib/services/student-courses';
import { loadContinueLearningForStudent } from '../home/load-continue-learning';
import { buildLearnHref } from '@/lib/utils/variant-learn-url';
import { getDailyStreakCached } from '@/lib/streak/daily-streak';
import type { ContinueLearningCard } from '../home/_components/landing-data-types';
import type { EntitledPillarGroup } from '@/lib/services/student-courses';
import type { DailyAnalyticsRow } from '@/lib/analytics/student-video-analytics-service';

function getPastDateString(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

export interface ProgressSummaryMetric {
  label: string;
  value: string;
  unit: string;
  description: string;
}

export interface SuggestedGoal {
  label: string;
  current: number;
  target: number;
}

export interface ProgressCourseRow {
  id: string;
  title: string;
  pillarTitle: string;
  progressPercentage: number;
  moduleCount: number;
  videoCount: number;
  learnHref: string;
}

export interface ProgressPageData {
  summaryMetrics: ProgressSummaryMetric[];
  programmePct: number;
  suggestedGoals: SuggestedGoal[];
  continueLearning: ContinueLearningCard | null;
  courses: ProgressCourseRow[];
  learningHours: { date: string; hours: number }[];
  activityDays: { day: string; hours: number }[];
  hasChartData: boolean;
}

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[progress] ${label} failed:`, error);
    }
    return fallback;
  }
}

function formatWatchTime(totalWatchSeconds: number, totalHoursWatched: number): {
  value: string;
  unit: string;
} {
  if (totalWatchSeconds < 60) {
    return { value: `${Math.round(totalWatchSeconds)}`, unit: 'sec' };
  }
  if (totalWatchSeconds < 3600) {
    return { value: `${Math.round(totalWatchSeconds / 60)}`, unit: 'min' };
  }
  return { value: totalHoursWatched.toFixed(1), unit: 'hrs' };
}

function mapDailyToActivityDays(daily: DailyAnalyticsRow[]): { day: string; hours: number }[] {
  return daily.map((row) => ({
    day: new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' }),
    hours: row.watchedHours,
  }));
}

export async function loadProgressPageData(
  collegeSlug: string,
  studentId: string,
  isGlobal: boolean,
  collegeId: string | null,
): Promise<ProgressPageData> {
  const options = { isGlobal, collegeId };

  const entitledGroups = await safe(
    'entitledCourses',
    () => listStudentEntitledCoursesGroupedByPillar(collegeSlug),
    [] as EntitledPillarGroup[],
  );

  const [overview, daily, hoursTrend, completionCounts, streakResult, continueLearning] =
    await Promise.all([
      safe(
        'overview',
        () => StudentVideoAnalyticsService.getOverview(studentId, options),
        null,
      ),
      safe(
        'dailyAnalytics',
        () =>
          StudentVideoAnalyticsService.getDailyAnalytics(
            studentId,
            getPastDateString(6),
            options,
          ),
        [] as DailyAnalyticsRow[],
      ),
      safe(
        'hoursTrend',
        () => StudentProgressService.getLearningHoursTrend(studentId),
        [] as { report_date: string; hours_logged: number }[],
      ),
      safe(
        'completionCounts',
        () => StudentProgressService.getCompletionCountsByType(studentId),
        { videosCompleted: 0, assignmentsCompleted: 0, quizzesCompleted: 0 },
      ),
      safe('streak', () => getDailyStreakCached(studentId), {
        currentStreak: 0,
        longestStreak: 0,
        lastVisitDate: '',
        today: '',
        incrementedToday: false,
      }),
      safe(
        'continueLearning',
        () => loadContinueLearningForStudent(collegeSlug, studentId, entitledGroups),
        null,
      ),
    ]);

  const lecturesThisWeek = daily.reduce((acc, d) => acc + d.lecturesWatched, 0);
  const programmePct = overview ? Math.round(overview.averageCompletionPercentage) : 0;

  const summaryMetrics: ProgressSummaryMetric[] = [];

  if (overview) {
    const watch = formatWatchTime(overview.totalWatchSeconds, overview.totalHoursWatched);
    summaryMetrics.push({
      label: 'Watch time',
      value: watch.value,
      unit: watch.unit,
      description: 'Lifetime lecture watch time',
    });
    summaryMetrics.push({
      label: 'Lessons watched',
      value: `${overview.totalLecturesWatched}`,
      unit: '',
      description: 'Videos with recorded progress',
    });
    summaryMetrics.push({
      label: 'Courses in progress',
      value: `${overview.startedCourses}`,
      unit: '',
      description: 'Started but not fully completed',
    });
    summaryMetrics.push({
      label: 'Avg completion',
      value: `${programmePct}`,
      unit: '%',
      description: 'Across enrolled courses',
    });
  }

  if (completionCounts.videosCompleted > 0) {
    summaryMetrics.push({
      label: 'Videos completed',
      value: `${completionCounts.videosCompleted}`,
      unit: '',
      description: 'Marked complete in your progress',
    });
  }

  if (streakResult.currentStreak > 0) {
    summaryMetrics.push({
      label: 'Visit streak',
      value: `${streakResult.currentStreak}`,
      unit: 'days',
      description: 'Consecutive days you opened the LMS',
    });
  }

  const suggestedGoals: SuggestedGoal[] = [
    {
      label: 'Watch at least 1 lesson this week',
      current: Math.min(lecturesThisWeek, 1),
      target: 1,
    },
    {
      label: 'Complete 3 lessons this week',
      current: Math.min(lecturesThisWeek, 3),
      target: 3,
    },
    {
      label: 'Finish one course',
      current: overview ? Math.min(overview.completedCourses, 1) : 0,
      target: 1,
    },
  ];

  const courses: ProgressCourseRow[] = entitledGroups.flatMap((group) =>
    group.courses.map((course) => ({
      id: course.variant_id ? `variant:${course.variant_id}` : course.id,
      title: course.variant_title ?? course.title,
      pillarTitle: group.pillar.title,
      progressPercentage: course.progress_percentage ?? 0,
      moduleCount: course.module_count,
      videoCount: course.video_count,
      learnHref: buildLearnHref(collegeSlug, course.id, { variantId: course.variant_id }),
    })),
  );

  const learningHours = hoursTrend.reduce((acc: Array<{ date: string; hours: number }>, row: { report_date: string; hours_logged: number }) => {
    if (Number(row.hours_logged) > 0) {
      acc.push({
        date: new Date(row.report_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        hours: Number(row.hours_logged),
      });
    }
    return acc;
  }, [] as Array<{ date: string; hours: number }>);

  const activityDays = mapDailyToActivityDays(daily);
  const hasChartData = learningHours.length > 0 || activityDays.some((d) => d.hours > 0);

  return {
    summaryMetrics,
    programmePct,
    suggestedGoals,
    continueLearning,
    courses,
    learningHours,
    activityDays,
    hasChartData,
  };
}
