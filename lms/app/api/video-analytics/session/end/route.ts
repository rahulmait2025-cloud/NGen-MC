import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { consumeRateLimit, getRequestIp } from "@/lib/security/rate-limit";
import { VideoAnalyticsBackendService } from "@/lib/analytics/service";
import { requireStudentRuntime } from "@/lib/student-runtime/runtime";
import { StudentRuntimeError } from "@/lib/student-runtime/errors";
import { verifyPlaybackToken } from "@/lib/security/playback-token";
import { revalidateStudentDashboardAnalytics } from "@/lib/services/student-dashboard-analytics";

const isDebug =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_DEBUG_REQUESTS === 'true';

function safeId(id?: string | null) {
  return id ? `${id.slice(0, 8)}...` : null;
}

const endSchema = z.object({
  collegeSlug: z.string().trim().min(1).optional(),
  sessionId: z.uuid("Invalid session ID"),
  courseId: z.uuid("Invalid course ID"),
  moduleId: z.uuid("Invalid module ID"),
  lessonId: z.uuid("Invalid lesson ID"),
  tpstreamsAssetId: z.string().min(1, "TPStreams asset ID required"),
  playbackToken: z.string().trim().min(1, "Playback token is required"),
  currentTimeSeconds: z.number().nonnegative().optional(),
});

export async function POST(request: Request) {
  try {
    const ip = getRequestIp(request);
    const limited = await consumeRateLimit({
      key: `video-session-end:${ip}`,
      limit: 60,
      windowMs: 60 * 1000,
      failClosed: true,
    });
    if (!limited.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSeconds) },
        },
      );
    }
    const body = await request.json();
    const parsed = endSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const activeSlug = parsed.data.collegeSlug || 'direct-learners';
    const runtime = await requireStudentRuntime(activeSlug);

    const grant = verifyPlaybackToken(parsed.data.playbackToken);
    if (!grant) {
      return NextResponse.json(
        { ok: false, error: "Forbidden: Invalid or expired playback grant." },
        { status: 403 },
      );
    }
    if (!grant.moduleId || !grant.tpAssetId) {
      return NextResponse.json(
        { ok: false, error: "Forbidden: Incomplete playback grant." },
        { status: 403 },
      );
    }
    if (
      grant.studentId !== runtime.student.studentId ||
      grant.courseId !== parsed.data.courseId ||
      grant.moduleId !== parsed.data.moduleId ||
      grant.lessonId !== parsed.data.lessonId ||
      grant.tpAssetId !== parsed.data.tpstreamsAssetId
    ) {
      if (isDebug) {
        console.info('[request-audit]', {
          area: 'video-analytics',
          action: 'stale-session-request-rejected',
          reason: 'playback-token-tuple-mismatch',
          sessionId: safeId(parsed.data.sessionId),
          lessonId: safeId(parsed.data.lessonId),
          assetId: safeId(parsed.data.tpstreamsAssetId),
        });
      }
      return NextResponse.json(
        { ok: false, error: "Forbidden: Playback grant mismatch." },
        { status: 403 },
      );
    }

    // Finalize the session; ownership is validated inside VideoAnalyticsBackendService.endSession
    const progress = await VideoAnalyticsBackendService.endSession({
      studentId: runtime.student.studentId,
      sessionId: parsed.data.sessionId,
      courseId: grant.courseId,
      moduleId: grant.moduleId,
      lessonId: grant.lessonId,
      tpstreamsAssetId: grant.tpAssetId,
      currentTimeSeconds: parsed.data.currentTimeSeconds ?? 0,
    });

    revalidateTag('progress', 'max');
    revalidateTag(`student-my-courses-${runtime.student.studentId}`, 'max');
    revalidateStudentDashboardAnalytics(runtime.student.studentId, grant.collegeId ?? null);

    if (isDebug) {
      console.info('[request-audit]', {
        area: 'video-analytics',
        action: 'sessionEnd',
        sessionId: safeId(parsed.data.sessionId),
        lessonId: safeId(grant.lessonId),
        assetId: safeId(grant.tpAssetId),
      });
    }

    return NextResponse.json({ ok: true, progress });
  } catch (err: unknown) {
    if (err instanceof StudentRuntimeError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status: err.status }
      );
    }
    const errorMsg =
      err instanceof Error ? err.message : "Internal Server Error";
    const status =
      errorMsg.includes("Invalid session") || errorMsg.includes("unauthorized")
        ? 403
        : 500;
    return NextResponse.json({ ok: false, error: errorMsg }, { status });
  }
}

