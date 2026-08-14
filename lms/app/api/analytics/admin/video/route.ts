import { NextResponse } from 'next/server';
import { z } from 'zod';
import { consumeRateLimit, getRequestIp } from '@/lib/security/rate-limit';
import { requireAdmin } from '@/lib/auth/require-admin';
import { AdminVideoAnalyticsService } from '@/lib/analytics/admin-video-analytics-service';

const querySchema = z.object({
  collegeSlug: z.string().min(1, 'College slug is required'),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Must be YYYY-MM').optional(),
  courseId: z.uuid('Invalid course ID').optional(),
});

export async function GET(request: Request) {
  try {
    const ip = getRequestIp(request);
    const limited = await consumeRateLimit({
      key: `admin-video-analytics-get:${ip}`,
      limit: 120,
      windowMs: 60 * 1000,
      failClosed: true,
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
      collegeSlug: searchParams.get('collegeSlug') || '',
      weekStart: searchParams.get('weekStart') || todayStr,
      month: searchParams.get('month') || currentMonthStr,
      courseId: searchParams.get('courseId') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { collegeSlug, weekStart, month, courseId } = parsed.data;

    let adminContext;
    try {
      adminContext = await requireAdmin(collegeSlug, { forApi: true });
    } catch (authErr: unknown) {
      return NextResponse.json(
        { ok: false, error: authErr instanceof Error ? authErr.message : 'Unauthorized access to college analytics' },
        { status: 403 }
      );
    }

    const collegeId = adminContext.collegeId;

    const [overview, courseWise, dailyAnalytics, weeklyAnalytics, pieChart, moduleAnalytics] = await Promise.all([
      AdminVideoAnalyticsService.getOverview(collegeId),
      AdminVideoAnalyticsService.getCourseWiseAnalytics(collegeId),
      AdminVideoAnalyticsService.getDailyAnalytics(collegeId, weekStart!, courseId),
      AdminVideoAnalyticsService.getWeeklyAnalytics(collegeId, month!, courseId),
      AdminVideoAnalyticsService.getPieChartData(collegeId, courseId),
      courseId ? AdminVideoAnalyticsService.getModuleAnalytics(collegeId, courseId) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      ok: true,
      analytics: {
        overview,
        courseWise,
        dailyAnalytics,
        weeklyAnalytics,
        pieChart,
        moduleAnalytics,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
