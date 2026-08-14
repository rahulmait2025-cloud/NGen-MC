import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeRateLimit, getRequestIp } from "@/lib/security/rate-limit";
import { VideoAnalyticsBackendService } from "@/lib/analytics/service";
import { requireStudentRuntime } from "@/lib/student-runtime/runtime";
import { verifyPlaybackToken } from "@/lib/security/playback-token";
import { createAdminClient } from "@/lib/supabase/admin";

const isDebug =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_DEBUG_REQUESTS === 'true';

function safeId(id?: string | null) {
  return id ? `${id.slice(0, 8)}...` : null;
}

const startSchema = z.object({
  collegeSlug: z.string().trim().min(1).optional(),
  courseId: z.uuid("Invalid course ID"),
  moduleId: z.uuid("Invalid module ID"),
  lessonId: z.uuid("Invalid lesson ID"),
  pillarId: z.uuid("Invalid pillar ID").nullable().optional(),
  tpstreamsAssetId: z.string().min(1, "TPStreams asset ID required"),
  videoDurationSeconds: z.number().nonnegative(),
  playbackToken: z.string().trim().min(1, "Playback token is required"),
});

export async function POST(request: Request) {
  try {
    const ip = getRequestIp(request);
    const limited = await consumeRateLimit({
      key: `video-session-start:${ip}`,
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
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const {
      collegeSlug,
      courseId,
      moduleId,
      lessonId,
      pillarId,
      tpstreamsAssetId,
      videoDurationSeconds: _clientDuration,
      playbackToken,
    } = parsed.data;

    // 1. Resolve standard Student Runtime (no sensitive getUser() or fresh RPCs)
    const activeSlug = collegeSlug || 'direct-learners';
    const runtime = await requireStudentRuntime(activeSlug);

    // 2. Verify the signed playback grant
    const grant = verifyPlaybackToken(playbackToken);
    if (!grant) {
      return NextResponse.json(
        { ok: false, error: "Forbidden: Invalid or expired playback grant." },
        { status: 403 },
      );
    }

    // 3. Confirm studentId matches the runtime
    if (grant.studentId !== runtime.student.studentId) {
      return NextResponse.json(
        { ok: false, error: "Forbidden: Student ID mismatch." },
        { status: 403 },
      );
    }

    // 4. Confirm course, lesson, video asset and TPStreams asset match the request
    if (grant.courseId !== courseId) {
      return NextResponse.json(
        { ok: false, error: "Forbidden: Course ID mismatch." },
        { status: 403 },
      );
    }
    if (!grant.moduleId || grant.moduleId !== moduleId) {
      if (isDebug) {
        console.warn('[TpStreamsAnalytics] Module ID mismatch:', {
          grantModuleId: safeId(grant.moduleId),
          requestModuleId: safeId(moduleId),
          lessonId: safeId(lessonId),
        });
      }
      return NextResponse.json(
        { ok: false, error: "Forbidden: Module ID mismatch." },
        { status: 403 },
      );
    }
    if (grant.lessonId !== lessonId) {
      if (isDebug) {
        console.warn('[TpStreamsAnalytics] Lesson ID mismatch:', {
          grantLessonId: safeId(grant.lessonId),
          requestLessonId: safeId(lessonId),
          grantCourseId: safeId(grant.courseId),
          grantVideoAssetId: safeId(grant.videoAssetId),
        });
      }
      return NextResponse.json(
        { ok: false, error: "Forbidden: Lesson ID mismatch." },
        { status: 403 },
      );
    }
    if (grant.tpAssetId !== tpstreamsAssetId) {
      if (isDebug) {
        console.warn('[TpStreamsAnalytics] Asset ID mismatch:', {
          grantTpAssetId: safeId(grant.tpAssetId),
          requestTpAssetId: safeId(tpstreamsAssetId),
          grantVideoAssetId: safeId(grant.videoAssetId),
          lessonId: safeId(lessonId),
        });
      }
      return NextResponse.json(
        { ok: false, error: "Forbidden: TPStreams asset ID mismatch." },
        { status: 403 },
      );
    }

    if (!grant.videoAssetId || !grant.tpAssetId) {
      return NextResponse.json(
        { ok: false, error: "Forbidden: Incomplete playback grant." },
        { status: 403 },
      );
    }

    // 5. Use server-authoritative asset duration from video_assets
    const admin = createAdminClient();
    const { data: asset } = await admin
      .from('video_assets')
      .select('duration_seconds')
      .eq('id', grant.videoAssetId)
      .maybeSingle();

    const videoDurationSeconds = asset?.duration_seconds && asset.duration_seconds > 0
      ? asset.duration_seconds
      : 0;

    // 6. Create the watch session
    const result = await VideoAnalyticsBackendService.startSession({
      studentId: runtime.student.studentId,
      courseId: grant.courseId,
      moduleId: grant.moduleId,
      lessonId: grant.lessonId,
      pillarId,
      tpstreamsAssetId: grant.tpAssetId,
      videoDurationSeconds,
    });

    if (isDebug) {
      console.info('[request-audit]', {
        area: 'video-analytics',
        action: 'sessionStart',
        reason: result.alreadyOpen ? 'reused-open-canonical-session' : 'created-canonical-session',
        sessionId: safeId(result.sessionId),
        lessonId: safeId(grant.lessonId),
        assetId: safeId(grant.tpAssetId),
        courseId: safeId(grant.courseId),
      });
      if (result.alreadyOpen) {
        console.info('[request-audit]', {
          area: 'video-analytics',
          action: 'duplicate-start-prevented',
          sessionId: safeId(result.sessionId),
          lessonId: safeId(grant.lessonId),
          assetId: safeId(grant.tpAssetId),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      sessionId: result.sessionId,
      alreadyOpen: result.alreadyOpen,
      progress: result.progress,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal Server Error";
    const status = errorMsg.includes("Unauthorized") || errorMsg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ ok: false, error: errorMsg }, { status });
  }
}
