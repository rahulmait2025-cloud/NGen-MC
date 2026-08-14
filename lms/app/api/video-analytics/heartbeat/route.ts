import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { consumeRateLimit, getRequestIp } from '@/lib/security/rate-limit';
import { VideoAnalyticsBackendService } from '@/lib/analytics/service';
import { requireStudentRuntime } from '@/lib/student-runtime/runtime';
import { StudentRuntimeError } from '@/lib/student-runtime/errors';
import { verifyPlaybackToken } from '@/lib/security/playback-token';
import { revalidateStudentDashboardAnalytics } from '@/lib/services/student-dashboard-analytics';
import {
  MIN_PLAYBACK_RATE,
  MAX_PLAYBACK_RATE,
  MAX_SEGMENTS_PER_HEARTBEAT,
} from '@/lib/analytics/policy';

const isDebug =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_DEBUG_REQUESTS === 'true';

function safeId(id?: string | null) {
  return id ? `${id.slice(0, 8)}...` : null;
}

const MAX_VIDEO_DURATION_SECONDS = 24 * 60 * 60;

// Short-lived in-memory idempotency cache. sendBeacon() can replay the same
// payload on flaky networks; if the same key arrives within TTL we return the
// cached response instead of double-writing segments/events.
const IDEMPOTENCY_TTL_MS = 60_000;
const idempotencyCache = new Map<string, { expiresAt: number; response: { status: number; body: unknown } }>();

function getIdempotencyResult(key: string | null): { status: number; body: unknown } | null {
  if (!key) return null;
  const entry = idempotencyCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    idempotencyCache.delete(key);
    return null;
  }
  return entry.response;
}

function setIdempotencyResult(
  key: string | null,
  status: number,
  body: unknown,
): void {
  if (!key) return;
  idempotencyCache.set(key, {
    expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
    response: { status, body },
  });
  if (idempotencyCache.size > 5000) {
    // Cheap eviction: clear the entire map when it gets large. Keys are short-lived anyway.
    idempotencyCache.clear();
  }
}

const segmentSchema = z.object({
  startSecond: z
    .number()
    .nonnegative()
    .max(MAX_VIDEO_DURATION_SECONDS + 1, 'Segment start beyond video duration'),
  endSecond: z
    .number()
    .nonnegative()
    .max(MAX_VIDEO_DURATION_SECONDS + 1, 'Segment end beyond video duration'),
  playbackRate: z
    .number()
    .min(MIN_PLAYBACK_RATE, 'Playback rate out of range')
    .max(MAX_PLAYBACK_RATE, 'Playback rate out of range')
    .optional(),
  source: z.string().min(1).max(40).optional(),
  clientSegmentId: z.string().min(1).max(128).optional(),
  playerInstanceId: z.string().max(128).optional(),
  clientSequence: z.number().int().nonnegative().optional(),
  wallClockSeconds: z.number().nonnegative().optional(),
  segmentStartedAt: z.string().optional(),
  segmentEndedAt: z.string().optional(),
});

const heartbeatSchema = z.object({
  collegeSlug: z.string().trim().min(1).optional(),
  sessionId: z.uuid('Invalid session ID'),
  courseId: z.uuid('Invalid course ID'),
  moduleId: z.uuid('Invalid module ID'),
  lessonId: z.uuid('Invalid lesson ID'),
  pillarId: z.uuid('Invalid pillar ID').nullable().optional(),
  tpstreamsAssetId: z.string().min(1, 'TPStreams asset ID required'),
  videoDurationSeconds: z
    .number()
    .nonnegative()
    .max(MAX_VIDEO_DURATION_SECONDS, 'Video duration too large'),
  currentTimeSeconds: z
    .number()
    .nonnegative()
    .max(MAX_VIDEO_DURATION_SECONDS, 'currentTime out of range'),
  playbackRate: z
    .number()
    .min(MIN_PLAYBACK_RATE, 'Playback rate out of range')
    .max(MAX_PLAYBACK_RATE, 'Playback rate out of range')
    .optional(),
  playbackToken: z.string().trim().min(1, 'Playback token is required'),
  eventType: z
    .enum([
      'heartbeat',
      'play',
      'pause',
      'seek',
      'seeked',
      'ratechange',
      'ended',
      'session_close',
      'visibility_hidden',
      'pagehide',
      'resume',
    ])
    .optional(),
  segments: z
    .array(segmentSchema)
    .max(MAX_SEGMENTS_PER_HEARTBEAT, `At most ${MAX_SEGMENTS_PER_HEARTBEAT} segments per heartbeat`)
    .default([]),
  counts: z
    .object({
      play: z.number().int().nonnegative().optional(),
      pause: z.number().int().nonnegative().optional(),
      seek: z.number().int().nonnegative().optional(),
      ratechange: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const idempotencyKey = request.headers.get('Idempotency-Key');
    const cached = getIdempotencyResult(idempotencyKey);
    if (cached) {
      return NextResponse.json(cached.body, { status: cached.status });
    }

    const ip = getRequestIp(request);
    const limited = await consumeRateLimit({
      key: `video-heartbeat:${ip}`,
      limit: 90,
      windowMs: 60 * 1000,
      failClosed: false,
    });

    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.`, throttled: true },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
      );
    }

    const body = await request.json();
    const parsed = heartbeatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const activeSlug = parsed.data.collegeSlug || 'direct-learners';
    const runtime = await requireStudentRuntime(activeSlug);

    const { collegeSlug: _collegeSlug, playbackToken, ...heartbeatData } = parsed.data;

    const grant = verifyPlaybackToken(playbackToken);
    if (!grant) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: Invalid or expired playback grant.' },
        { status: 403 },
      );
    }
    if (!grant.moduleId || !grant.tpAssetId) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: Incomplete playback grant.' },
        { status: 403 },
      );
    }
    if (
      grant.studentId !== runtime.student.studentId ||
      grant.courseId !== heartbeatData.courseId ||
      grant.moduleId !== heartbeatData.moduleId ||
      grant.lessonId !== heartbeatData.lessonId ||
      grant.tpAssetId !== heartbeatData.tpstreamsAssetId
    ) {
      if (isDebug) {
        console.info('[request-audit]', {
          area: 'video-analytics',
          action: 'stale-session-request-rejected',
          reason: 'playback-token-tuple-mismatch',
          sessionId: safeId(heartbeatData.sessionId),
          lessonId: safeId(heartbeatData.lessonId),
          assetId: safeId(heartbeatData.tpstreamsAssetId),
        });
      }
      return NextResponse.json(
        { ok: false, error: 'Forbidden: Playback grant mismatch.' },
        { status: 403 },
      );
    }

    // Phase 4: Server-side no-op guard — skip heavy writes if no meaningful change.
    if (
      heartbeatData.eventType === 'heartbeat' &&
      heartbeatData.segments.length === 0
    ) {
      if (isDebug) {
        console.info('[request-audit]', {
          area: 'video-analytics',
          action: 'heartbeat-skipped-server-noop',
          sessionId: safeId(heartbeatData.sessionId),
          reason: 'no-segments',
        });
      }
      return NextResponse.json({
        ok: true,
        sessionId: heartbeatData.sessionId,
        eventType: heartbeatData.eventType,
        segmentsReceived: 0,
        summary: null,
        skipped: true,
        reason: 'no-segments',
      });
    }

    if (isDebug) {
      console.info('[request-audit]', {
        area: 'video-analytics',
        action: 'heartbeat',
        sessionId: safeId(heartbeatData.sessionId),
        lessonId: safeId(heartbeatData.lessonId),
        assetId: safeId(heartbeatData.tpstreamsAssetId),
        eventType: heartbeatData.eventType,
        segmentsCount: heartbeatData.segments.length,
      });
    }

    const summary = await VideoAnalyticsBackendService.processHeartbeat({
      studentId: runtime.student.studentId,
      ...heartbeatData,
    });

    if (summary.completed || heartbeatData.eventType === 'ended' || heartbeatData.eventType === 'session_close') {
      revalidateTag('progress', 'max');
      revalidateTag(`student-my-courses-${runtime.student.studentId}`, 'max');
      revalidateStudentDashboardAnalytics(runtime.student.studentId, grant.collegeId ?? null);
    }

    const responseBody = {
      ok: true,
      sessionId: heartbeatData.sessionId,
      eventType: heartbeatData.eventType,
      segmentsReceived: heartbeatData.segments.length,
      summary,
    };

    setIdempotencyResult(idempotencyKey, 200, responseBody);

    return NextResponse.json(responseBody);
  } catch (err: unknown) {
    if (err instanceof StudentRuntimeError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status: err.status }
      );
    }
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[VideoAnalytics:Heartbeat] ERROR', errorMsg);
    const status =
      errorMsg.startsWith('Unauthorized') ||
      errorMsg.includes('invalid session') ||
      errorMsg.includes('Unauthorized or invalid session')
        ? 403
        : 500;
    return NextResponse.json({ ok: false, error: errorMsg }, { status });
  }
}

