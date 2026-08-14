import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { consumeRateLimit, getRequestIp } from '@/lib/security/rate-limit';
import { StudentVideoAnalyticsService } from '@/lib/analytics/student-video-analytics-service';
import { resolveAnalyticsStudent } from '@/lib/analytics/resolve-analytics-student';

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

const querySchema = z.object({
  rangeType: z.enum(['week', 'month']).default('week'),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Must be YYYY-MM').optional(),
  courseId: z.uuid('Invalid course ID').optional(),
  pillarId: z.uuid('Invalid pillar ID').optional(),
  collegeSlug: z.string().trim().min(1).optional(),
});

export async function GET(request: Request) {
  try {
    const ip = getRequestIp(request);
    const limited = await consumeRateLimit({
      key: `student-analytics-get:${ip}`,
      limit: 120,
      windowMs: 60 * 1000,
      failClosed: false,
    });

    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
      );
    }

    const { searchParams } = new URL(request.url);
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.slice(0, 7);

    const parsed = querySchema.safeParse({
      rangeType: searchParams.get('rangeType') || undefined,
      weekStart: searchParams.get('weekStart') || todayStr,
      month: searchParams.get('month') || currentMonthStr,
      courseId: searchParams.get('courseId') || undefined,
      pillarId: searchParams.get('pillarId') || undefined,
      collegeSlug: searchParams.get('collegeSlug') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const studentCtx = await resolveAnalyticsStudent(parsed.data.collegeSlug);
    if (!studentCtx) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: Student record not found.' },
        { status: 403 },
      );
    }

    const { weekStart, month, courseId, pillarId } = parsed.data;

    const { isGlobal, collegeId } = studentCtx;
 
    const [overview, pieChart, dailyAnalytics, weeklyAnalytics, moduleAnalytics, availableCourses] = await Promise.all([
      getCachedOverview(studentCtx.studentId, isGlobal, collegeId, courseId, pillarId),
      getCachedPieChart(studentCtx.studentId, isGlobal, collegeId, courseId, pillarId),
      getCachedDailyAnalytics(studentCtx.studentId, weekStart!, isGlobal, collegeId, courseId, pillarId),
      getCachedWeeklyAnalytics(studentCtx.studentId, month!, isGlobal, collegeId, courseId, pillarId),
      courseId
        ? getCachedModuleAnalytics(studentCtx.studentId, courseId, isGlobal, collegeId)
        : Promise.resolve([]),
      getCachedAccessibleCourses(studentCtx.studentId, isGlobal, collegeId),
    ]);

    return NextResponse.json(
      {
        ok: true,
        analytics: {
          overview,
          pieChart,
          dailyAnalytics,
          weeklyAnalytics,
          moduleAnalytics,
          availableCourses,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
