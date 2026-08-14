import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStudentRuntime } from '@/lib/student-runtime/runtime';
import { StudentRuntimeError } from '@/lib/student-runtime/errors';
import { consumeRateLimit, getRequestIp } from '@/lib/security/rate-limit';
import { VideoAnalyticsBackendService } from '@/lib/analytics/service';

const querySchema = z.object({
  courseId: z.uuid('Invalid course ID'),
  moduleId: z.uuid('Invalid module ID').optional(),
  lessonId: z.uuid('Invalid lesson ID'),
});

export async function GET(request: Request) {
  try {
    const ip = getRequestIp(request);
    const limited = await consumeRateLimit({
      key: `video-progress-get:${ip}`,
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
    const collegeSlug = searchParams.get('collegeSlug');
    const activeSlug = collegeSlug || 'direct-learners';
    const runtime = await requireStudentRuntime(activeSlug);

    const parsed = querySchema.safeParse({
      courseId: searchParams.get('courseId') || undefined,
      moduleId: searchParams.get('moduleId') || undefined,
      lessonId: searchParams.get('lessonId') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const progress = await VideoAnalyticsBackendService.getProgress(runtime.student.studentId, parsed.data.lessonId);

    return NextResponse.json({
      ok: true,
      progress: progress || {
        student_id: runtime.student.studentId,
        lesson_id: parsed.data.lessonId,
        video_duration_seconds: 0,
        total_video_seconds_watched: 0,
        unique_watched_seconds: 0,
        completion_percentage: 0,
        completed: false,
      },
    });
  } catch (err: unknown) {
    if (err instanceof StudentRuntimeError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status: err.status }
      );
    }
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}


