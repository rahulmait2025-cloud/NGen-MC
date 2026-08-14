import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { Skeleton } from '@/components/ui/skeleton';
import { requireStudent } from '@/lib/auth/require-student';
import { StudentVideoAnalyticsService } from '@/lib/analytics/student-video-analytics-service';
import { VideoAnalyticsDashboardLazy } from '../analytics/_components/video-analytics-dashboard-lazy';

const getCachedOverview = unstable_cache(
  async (studentId: string, isGlobal: boolean, collegeId: string | null, courseId?: string, pillarId?: string) => {
    return StudentVideoAnalyticsService.getOverview(studentId, { isGlobal, collegeId, courseId, pillarId });
  },
  ['api-student-video-overview'],
  { revalidate: 300, tags: ['progress'] }
);

const getCachedPieChart = unstable_cache(
  async (studentId: string, isGlobal: boolean, collegeId: string | null, courseId?: string, pillarId?: string) => {
    return StudentVideoAnalyticsService.getPieChartData(studentId, { isGlobal, collegeId, pillarId });
  },
  ['api-student-video-pie-chart'],
  { revalidate: 300, tags: ['progress'] }
);

const getCachedDailyAnalytics = unstable_cache(
  async (studentId: string, weekStart: string, isGlobal: boolean, collegeId: string | null, courseId?: string, pillarId?: string) => {
    return StudentVideoAnalyticsService.getDailyAnalytics(studentId, weekStart, { isGlobal, collegeId, courseId, pillarId });
  },
  ['api-student-video-daily-analytics'],
  { revalidate: 300, tags: ['progress'] }
);

const getCachedWeeklyAnalytics = unstable_cache(
  async (studentId: string, month: string, isGlobal: boolean, collegeId: string | null, courseId?: string, pillarId?: string) => {
    return StudentVideoAnalyticsService.getWeeklyAnalytics(studentId, month, { isGlobal, collegeId, courseId, pillarId });
  },
  ['api-student-video-weekly-analytics'],
  { revalidate: 300, tags: ['progress'] }
);

const getCachedModuleAnalytics = unstable_cache(
  async (studentId: string, courseId: string, isGlobal: boolean, collegeId: string | null) => {
    return StudentVideoAnalyticsService.getModuleAnalytics(studentId, courseId, { isGlobal, collegeId });
  },
  ['api-student-video-module-analytics'],
  { revalidate: 300, tags: ['progress'] }
);

const getCachedAccessibleCourses = unstable_cache(
  async (studentId: string, isGlobal: boolean, collegeId: string | null) => {
    return StudentVideoAnalyticsService.getAccessibleCourseList(studentId, { isGlobal, collegeId });
  },
  ['api-student-video-accessible-courses'],
  { revalidate: 300, tags: ['progress'] }
);

function VideoAnalyticsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-[1.25rem]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[340px] rounded-[2.5rem]" />
        <Skeleton className="h-[340px] rounded-[2.5rem]" />
      </div>
      <Skeleton className="h-[400px] rounded-[2.5rem]" />
    </div>
  );
}

export default async function VideoAnalyticsPageRoute({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">Video Engagement Analytics</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Track your learning video watch time and completion metrics.</p>
        </div>
      </div>

      <Suspense fallback={<VideoAnalyticsSkeleton />}>
        <VideoAnalyticsDashboardLoader collegeSlug={collegeSlug} />
      </Suspense>
    </div>
  );
}

async function VideoAnalyticsDashboardLoader({ collegeSlug }: { collegeSlug: string }) {
  const ctx = await requireStudent(collegeSlug);
  const { studentId, isGlobal, membership } = ctx;
  const collegeId = membership?.collegeId ?? null;

  const todayStr = new Date().toISOString().split('T')[0];
  const month = todayStr.slice(0, 7);

  // Compute Monday of the current week (ISO format yyyy-mm-dd)
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(d.setDate(diff)).toISOString().split('T')[0];

  const [overview, pieChart, dailyAnalytics, weeklyAnalytics, availableCourses] = await Promise.all([
    getCachedOverview(studentId, isGlobal, collegeId),
    getCachedPieChart(studentId, isGlobal, collegeId),
    getCachedDailyAnalytics(studentId, weekStart, isGlobal, collegeId),
    getCachedWeeklyAnalytics(studentId, month, isGlobal, collegeId),
    getCachedAccessibleCourses(studentId, isGlobal, collegeId),
  ]);

  const firstCourseId = availableCourses[0]?.id;
  const moduleAnalytics = firstCourseId
    ? await getCachedModuleAnalytics(studentId, firstCourseId, isGlobal, collegeId)
    : [];

  const initialData = {
    overview,
    pieChart,
    dailyAnalytics,
    weeklyAnalytics,
    moduleAnalytics,
    availableCourses,
  };

  return <VideoAnalyticsDashboardLazy initialData={initialData} />;
}
