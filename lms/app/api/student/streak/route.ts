import { NextResponse } from 'next/server';
import { z } from 'zod';
import { consumeRateLimit, getRequestIp } from '@/lib/security/rate-limit';
import { resolveAnalyticsStudent } from '@/lib/analytics/resolve-analytics-student';
import { recordDailyVisitAndGetStreak } from '@/lib/streak/daily-streak';
import { revalidateTag } from 'next/cache';

const bodySchema = z.object({
  collegeSlug: z.string().trim().min(1).optional(),
});

/**
 * POST — record today's first visit (idempotent) and return visit streak.
 * Uses POST (not GET) because it mutates DB (INSERT + UPSERT).
 * +1 current streak only once per calendar day (midnight in Asia/Kolkata by default).
 */
export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const limited = await consumeRateLimit({
    key: `streak:${ip}`,
    limit: 120,
    windowMs: 60 * 1000,
  });

  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${limited.retryAfterSeconds}s` },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const studentCtx = await resolveAnalyticsStudent(parsed.data.collegeSlug);
  if (!studentCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const streak = await recordDailyVisitAndGetStreak(studentCtx.studentId);
  if (streak.incrementedToday) {
    revalidateTag(`student-streak-${studentCtx.studentId}`, 'max');
  }

  return NextResponse.json({
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastVisitDate: streak.lastVisitDate,
    incrementedToday: streak.incrementedToday,
    /** @deprecated use currentStreak — kept for older clients */
    activeDaysCount: streak.currentStreak,
  });
}
