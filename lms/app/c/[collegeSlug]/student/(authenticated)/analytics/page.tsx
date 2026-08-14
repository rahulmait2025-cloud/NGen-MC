import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { StudentRouteLoadingShell } from '@/components/student/student-route-loading-shell';
import { requireStudent } from '@/lib/auth/require-student';
import { StudentVideoAnalyticsService } from '@/lib/analytics/student-video-analytics-service';
import { StudentProgressService } from '@/lib/lms/analytics/services/progress';
import { getDailyStreakCached } from '@/lib/streak/daily-streak';
import { Flame } from 'lucide-react';

import { UnifiedAnalyticsShell } from './_components/unified-analytics-shell';
import { RiskBadge } from './_components/risk-badge';
import {
  OverviewSkeleton,
  CoursesSkeleton,
  VideosSkeleton,
  StreaksSkeleton,
} from './_components/page-skeleton';

import { OverviewTabContent } from './_components/tabs/overview-tab';
import { CoursesTabContent } from './_components/tabs/courses-tab';
import { VideosTabContent } from './_components/tabs/videos-tab';
import { StreaksTabContent } from './_components/tabs/streaks-tab';

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().split('T')[0];
}

// Cached wrappers for database-driven service queries (10-minute TTL)
const getCachedOverview = unstable_cache(
  async (studentId: string, options: { isGlobal: boolean; collegeId: string | null }) => {
    return StudentVideoAnalyticsService.getOverview(studentId, options);
  },
  ['student-video-overview'],
  { revalidate: 600, tags: ['progress'] }
);

const getCachedCourseProgress = unstable_cache(
  async (studentId: string) => {
    return StudentProgressService.getCourseCompletionSummaries(studentId);
  },
  ['student-course-progress'],
  { revalidate: 600, tags: ['progress'] }
);

const getCachedHoursTrend = unstable_cache(
  async (studentId: string) => {
    return StudentProgressService.getLearningHoursTrend(studentId);
  },
  ['student-hours-trend'],
  { revalidate: 600, tags: ['progress'] }
);

const getCachedRiskProfile = unstable_cache(
  async (studentId: string) => {
    return StudentProgressService.getStudentRiskProfile(studentId);
  },
  ['student-risk-profile'],
  { revalidate: 600, tags: ['progress'] }
);

const getCachedDailyAnalytics = unstable_cache(
  async (studentId: string, weekStart: string, options: { isGlobal: boolean; collegeId: string | null }) => {
    return StudentVideoAnalyticsService.getDailyAnalytics(studentId, weekStart, options);
  },
  ['student-daily-analytics'],
  { revalidate: 600, tags: ['progress'] }
);

const getCachedPieChart = unstable_cache(
  async (studentId: string, options: { isGlobal: boolean; collegeId: string | null }) => {
    return StudentVideoAnalyticsService.getPieChartData(studentId, options);
  },
  ['student-pie-chart'],
  { revalidate: 600, tags: ['progress'] }
);

const getCachedAccessibleCourses = unstable_cache(
  async (studentId: string, options: { isGlobal: boolean; collegeId: string | null }) => {
    return StudentVideoAnalyticsService.getAccessibleCourseList(studentId, options);
  },
  ['student-accessible-courses'],
  { revalidate: 600, tags: ['progress'] }
);

const getCachedModuleAnalytics = unstable_cache(
  async (studentId: string, courseId: string, options: { isGlobal: boolean; collegeId: string | null }) => {
    return StudentVideoAnalyticsService.getModuleAnalytics(studentId, courseId, options);
  },
  ['student-module-analytics'],
  { revalidate: 600, tags: ['progress'] }
);

const getCachedTimeOfDay = unstable_cache(
  async (studentId: string, options: { isGlobal: boolean; collegeId: string | null }) => {
    return StudentVideoAnalyticsService.getTimeOfDayAnalytics(studentId, { ...options, days: 90 });
  },
  ['student-time-of-day'],
  { revalidate: 600, tags: ['progress'] }
);

const getCachedHeatmapData = unstable_cache(
  async (studentId: string, options: { isGlobal: boolean; collegeId: string | null }) => {
    return StudentVideoAnalyticsService.getHeatmapData(studentId, 16, options);
  },
  ['student-heatmap-data'],
  { revalidate: 600, tags: ['progress'] }
);

const getCachedRecentActivity = unstable_cache(
  async (studentId: string, options: { isGlobal: boolean; collegeId: string | null }) => {
    return StudentVideoAnalyticsService.getRecentActivity(studentId, 10, options);
  },
  ['student-recent-activity'],
  { revalidate: 600, tags: ['progress'] }
);

const getCachedVideoWatchHistory = unstable_cache(
  async (studentId: string, options: { isGlobal: boolean; collegeId: string | null }) => {
    return StudentVideoAnalyticsService.getVideoWatchHistory(studentId, options);
  },
  ['student-video-history'],
  { revalidate: 600, tags: ['progress'] }
);

const getCachedStreak = unstable_cache(
  async (studentId: string) => getDailyStreakCached(studentId),
  ['student-daily-streak'],
  { revalidate: 600, tags: ['progress'] },
);

/* Sub-sections that fetch data independently for granular streaming */

async function HeaderBadgesSection({ studentId }: { studentId: string }) {
  const [riskProfile, streakResult] = await Promise.all([
    getCachedRiskProfile(studentId),
    getCachedStreak(studentId),
  ]);

  return (
    <>
      {riskProfile.risk_status && <RiskBadge status={riskProfile.risk_status} />}
      {streakResult.currentStreak > 0 && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 w-fit shrink-0">
          <Flame className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          {streakResult.currentStreak}-day streak
        </div>
      )}
    </>
  );
}

async function OverviewTabSection({
  studentId,
  isGlobal,
  collegeId,
}: {
  studentId: string;
  isGlobal: boolean;
  collegeId: string | null;
}) {
  const options = { isGlobal, collegeId };
  const weekStart = getCurrentWeekStart();

  const [
    overview,
    hoursTrend,
    dailyAnalytics,
    pieChart,
    heatmapData,
    recentActivity,
    timeOfDay,
    riskProfile,
    streakResult,
  ] = await Promise.all([
    getCachedOverview(studentId, options),
    getCachedHoursTrend(studentId),
    getCachedDailyAnalytics(studentId, weekStart, options),
    getCachedPieChart(studentId, options),
    getCachedHeatmapData(studentId, options),
    getCachedRecentActivity(studentId, options),
    getCachedTimeOfDay(studentId, options),
    getCachedRiskProfile(studentId),
    getCachedStreak(studentId),
  ]);

  const kpis = {
    totalHours: Math.round((overview.totalWatchSeconds / 3600) * 10) / 10,
    totalWatchSeconds: overview.totalWatchSeconds,
    lecturesWatched: overview.totalLecturesWatched,
    totalAvailableLectures: overview.totalAvailableLectures,
    learningStreak: riskProfile.is_at_risk ? 0 : streakResult.currentStreak,
    longestStreak: riskProfile.is_at_risk ? 0 : streakResult.longestStreak,
    avgCompletion: overview.averageCompletionPercentage,
  };

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

  return (
    <OverviewTabContent
      kpis={kpis}
      learningHours={learningHours}
      dailyAnalytics={dailyAnalytics.map((d) => ({
        day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
        hours: d.watchedHours,
        lectures: d.lecturesWatched,
      }))}
      pieChart={pieChart}
      heatmapData={heatmapData}
      recentActivity={recentActivity}
      timeOfDay={timeOfDay}
    />
  );
}

async function CoursesTabSection({
  studentId,
  isGlobal,
  collegeId,
}: {
  studentId: string;
  isGlobal: boolean;
  collegeId: string | null;
}) {
  const options = { isGlobal, collegeId };

  const [overview, courseProgress, availableCourses] = await Promise.all([
    getCachedOverview(studentId, options),
    getCachedCourseProgress(studentId),
    getCachedAccessibleCourses(studentId, options),
  ]);

  const kpis = {
    coursesEnrolled: overview.totalAvailableCourses,
    completedCourses: overview.completedCourses,
    startedCourses: overview.startedCourses,
    avgCompletion: overview.averageCompletionPercentage,
    totalWatchSeconds: overview.totalWatchSeconds,
  };

  const courseProgressData = courseProgress.map((cp) => ({
    course: cp.course_title,
    progress: Math.round((Number(cp.completed_items) / Number(cp.total_items)) * 100),
    totalHours: Math.round(Number(cp.hours_invested) * 10) / 10,
    completedLectures: Number(cp.completed_items),
    totalLectures: Number(cp.total_items),
  }));

  const firstCourse = availableCourses[0];
  const initialModules = firstCourse
    ? await getCachedModuleAnalytics(studentId, firstCourse.id, { isGlobal, collegeId })
    : [];

  return (
    <CoursesTabContent
      kpis={kpis}
      courseProgress={courseProgressData}
      availableCourses={availableCourses}
      initialModules={initialModules}
    />
  );
}

async function VideosTabSection({
  studentId,
  isGlobal,
  collegeId,
}: {
  studentId: string;
  isGlobal: boolean;
  collegeId: string | null;
}) {
  const options = { isGlobal, collegeId };

  const [overview, videoWatchHistory, timeOfDay] = await Promise.all([
    getCachedOverview(studentId, options),
    getCachedVideoWatchHistory(studentId, options),
    getCachedTimeOfDay(studentId, options),
  ]);

  const kpis = {
    totalWatchSeconds: overview.totalWatchSeconds,
  };

  return (
    <VideosTabContent
      kpis={kpis}
      videoWatchHistory={videoWatchHistory}
      timeOfDay={timeOfDay}
    />
  );
}

async function StreaksTabSection({
  studentId,
  isGlobal,
  collegeId,
}: {
  studentId: string;
  isGlobal: boolean;
  collegeId: string | null;
}) {
  const options = { isGlobal, collegeId };

  const [overview, streakResult, heatmapData, timeOfDay] = await Promise.all([
    getCachedOverview(studentId, options),
    getCachedStreak(studentId),
    getCachedHeatmapData(studentId, options),
    getCachedTimeOfDay(studentId, options),
  ]);

  const kpis = {
    totalHours: Math.round((overview.totalWatchSeconds / 3600) * 10) / 10,
    completedCourses: overview.completedCourses,
    totalWatchSeconds: overview.totalWatchSeconds,
  };

  return (
    <StreaksTabContent
      kpis={kpis}
      streakResult={streakResult}
      heatmapData={heatmapData}
      timeOfDay={timeOfDay}
    />
  );
}

export default async function StudentAnalyticsPage({
  params,
}: {
  params: Promise<{
    collegeSlug: string;
  }>;
}): Promise<ReactNode> {
  const { collegeSlug } = await params;

  return (
    <Suspense fallback={<StudentRouteLoadingShell />}>
      <StudentAnalyticsPageContent collegeSlug={collegeSlug} />
    </Suspense>
  );
}

async function StudentAnalyticsPageContent({
  collegeSlug,
}: {
  collegeSlug: string;
}): Promise<ReactNode> {
  const ctx = await requireStudent(collegeSlug);
  const { studentId, isGlobal, membership } = ctx;
  const collegeId = membership?.collegeId ?? null;

  return (
    <div className="space-y-6">
      <a
        href="#analytics-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground focus:outline-none"
      >
        Skip to content
      </a>

      <UnifiedAnalyticsShell
        headerBadges={
          <Suspense fallback={<div className="h-7 w-24 bg-muted/40 rounded-full animate-pulse" />}>
            <HeaderBadgesSection studentId={studentId} />
          </Suspense>
        }
        overviewTab={
          <Suspense fallback={<OverviewSkeleton />}>
            <OverviewTabSection studentId={studentId} isGlobal={isGlobal} collegeId={collegeId} />
          </Suspense>
        }
        coursesTab={
          <Suspense fallback={<CoursesSkeleton />}>
            <CoursesTabSection studentId={studentId} isGlobal={isGlobal} collegeId={collegeId} />
          </Suspense>
        }
        videosTab={
          <Suspense fallback={<VideosSkeleton />}>
            <VideosTabSection studentId={studentId} isGlobal={isGlobal} collegeId={collegeId} />
          </Suspense>
        }
        streaksTab={
          <Suspense fallback={<StreaksSkeleton />}>
            <StreaksTabSection studentId={studentId} isGlobal={isGlobal} collegeId={collegeId} />
          </Suspense>
        }
      />
    </div>
  );
}
