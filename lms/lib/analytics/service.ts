import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  mergeRanges,
  sumRanges,
  type WatchSegmentInput,
  type NormalizedWatchSegment,
  type VideoProgressSummary,
  type Range,
} from './calculation';
import type { VideoAnalyticsHeartbeatPayload } from './types';
import {
  MAX_PLAYBACK_RATE,
  MAX_SEGMENTS_PER_HEARTBEAT,
  MAX_REQUEST_WATCH_TIME_SECONDS,
  MAX_SEGMENT_DURATION_SECONDS,
  WATCH_TIME_PLAUSIBILITY_TOLERANCE,
  isValidPlaybackRate,
  sanitizePlaybackRate,
} from './policy';
import { resolveOwnedPlaybackSession } from './session-resolver';

const COMPLETION_THRESHOLD = 0.66;
const MAX_VIDEO_DURATION_SECONDS = 24 * 60 * 60;

const isDebug =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_DEBUG_REQUESTS === 'true';

function safeId(id?: string | null) {
  return id ? `${id.slice(0, 8)}...` : null;
}

export interface StartSessionParams {
  studentId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  pillarId?: string | null;
  tpstreamsAssetId: string;
  videoDurationSeconds: number;
}

export interface HeartbeatParams {
  studentId: string;
  sessionId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  pillarId?: string | null;
  tpstreamsAssetId: string;
  videoDurationSeconds: number;
  currentTimeSeconds: number;
  playbackRate?: number;
  /** @deprecated client-supplied wall clock is no longer trusted. Computed server-side. */
  wallClockSeconds?: number;
  eventType?: string;
  segments: WatchSegmentInput[];
  counts?: {
    play?: number;
    pause?: number;
    seek?: number;
    ratechange?: number;
  };
  /** @deprecated client-supplied unique seconds are no longer trusted. Recomputed server-side. */
  uniqueWatchedSeconds?: number;
  /** @deprecated client-supplied total seconds are no longer trusted. Recomputed server-side. */
  totalWatchedSeconds?: number;
}

/**
 * Video analytics backend service.
 *
 * Source-of-truth tables (rich schema, deployed by SuperAdmin migration 00161):
 *   - video_watch_sessions
 *   - video_watch_segments
 *   - video_watch_events
 *   - student_video_progress
 *
 * Compatibility mirror (legacy):
 *   - student_progress
 *     Kept in sync (best-effort, monotonic) so the rest of the LMS course
 *     progress / resume / completion flows continue to work.
 *
 *   - student_video_sessions
 *     No longer written by the LMS analytics service. The old `syncProgress`
 *     server action in `lib/services/student-progress.ts` still maintains this
 *     row for backwards compatibility with any consumer that reads it
 *     directly; it is treated as legacy audit data.
 */
export class VideoAnalyticsBackendService {
  /**
   * Initialize a new secure video viewing session, idempotently.
   * Uses the `get_or_open_video_watch_session` RPC (deployed in
   * SuperAdmin migration 00193) to ensure at most one open session
   * per (student, lesson) tuple.
   */
  static async startSession(params: StartSessionParams) {
    const { studentId, courseId, lessonId, videoDurationSeconds } = params;
    const admin = createAdminClient();
    const { pillarId = null, moduleId, tpstreamsAssetId } = params;
    const safeDuration = clampDuration(videoDurationSeconds);
    // Prefer the idempotent RPC. If the RPC is not yet deployed (older
    // environments) the .rpc call will fail with PGRST202 — fall back
    // to a direct upsert using the partial unique index that should
    // have been deployed alongside it.
    let sessionId: string;
    let alreadyOpen = false;

    const rpcResult = await admin.rpc('get_or_open_video_watch_session', {
      p_student_id: studentId,
      p_pillar_id: pillarId,
      p_course_id: courseId,
      p_module_id: moduleId,
      p_lesson_id: lessonId,
      p_tpstreams_asset_id: tpstreamsAssetId,
      p_video_duration_seconds: safeDuration,
    });

    if (!rpcResult.error && rpcResult.data && Array.isArray(rpcResult.data) && rpcResult.data.length > 0) {
      const row = rpcResult.data[0] as { session_id?: string; already_open?: boolean };
      if (row.session_id) {
        sessionId = row.session_id;
        alreadyOpen = Boolean(row.already_open);
      } else {
        sessionId = await this.openSessionDirect(admin, params, safeDuration);
      }
    } else {
      // Fallback path
      sessionId = await this.openSessionDirect(admin, params, safeDuration);
    }

    // Fetch the latest student_video_progress row for the response.
    const { data: progress } = await admin
      .from('student_video_progress')
      .select('id, student_id, pillar_id, course_id, module_id, lesson_id, tpstreams_asset_id, video_duration_seconds, total_video_seconds_watched, unique_watched_seconds, repeat_watched_seconds, wall_clock_seconds, completion_percentage, completed, first_started_at, last_watched_at, last_position_seconds, max_position_seconds, play_count, pause_count, seek_count, rate_change_count, session_count, completed_at')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    return {
      sessionId,
      alreadyOpen,
      progress: progress ?? null,
    };
  }

  private static async openSessionDirect(
    admin: ReturnType<typeof createAdminClient>,
    params: StartSessionParams,
    safeDuration: number,
  ): Promise<string> {
    const { studentId, pillarId = null, courseId, moduleId, lessonId, tpstreamsAssetId } = params;

    // Reuse an open session if one exists for this (student, lesson).
    const existing = await admin
      .from('video_watch_sessions')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .eq('module_id', moduleId)
      .eq('lesson_id', lessonId)
      .eq('tpstreams_asset_id', tpstreamsAssetId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing.data?.id) {
      return existing.data.id;
    }

    const { data: inserted, error: insertErr } = await admin
      .from('video_watch_sessions')
      .insert({
        student_id: studentId,
        pillar_id: pillarId,
        course_id: courseId,
        module_id: moduleId,
        lesson_id: lessonId,
        tpstreams_asset_id: tpstreamsAssetId,
        started_at: new Date().toISOString(),
        play_count: 1,
      })
      .select('id')
      .single();

    if (insertErr || !inserted?.id) {
      // Race condition: another tab just opened one. Re-select.
      const racer = await admin
        .from('video_watch_sessions')
        .select('id')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .eq('module_id', moduleId)
        .eq('lesson_id', lessonId)
        .eq('tpstreams_asset_id', tpstreamsAssetId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (racer.data?.id) return racer.data.id;
      throw new Error(`Failed to open video watch session: ${insertErr?.message || 'Unknown error'}`);
    }

    // Make sure a progress row exists without overwriting existing completed flags via PostgREST defaults.
    const { data: existingProgress } = await admin
      .from('student_video_progress')
      .select('student_id')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (!existingProgress) {
      await admin
        .from('student_video_progress')
        .insert({
          student_id: studentId,
          pillar_id: pillarId,
          course_id: courseId,
          module_id: moduleId,
          lesson_id: lessonId,
          tpstreams_asset_id: tpstreamsAssetId,
          video_duration_seconds: safeDuration,
          play_count: 1,
        });
    } else {
      await admin
        .from('student_video_progress')
        .update({
          tpstreams_asset_id: tpstreamsAssetId,
          video_duration_seconds: safeDuration,
        })
        .eq('student_id', studentId)
        .eq('lesson_id', lessonId);
    }

    return inserted.id;
  }

  /**
   * Process a heartbeat beacon.
   *
   * Pipeline:
   *   1. Validate ownership & lifecycle via canonical session resolver.
   *   2. Reject heartbeats after session end or expiration.
   *   3. Server time watch-time plausibility check.
   *   4. Sanitize segments against strict playback-rate policies.
   *   5. Update progress atomically without using client duration for completion.
   */
  static async processHeartbeat(params: HeartbeatParams): Promise<VideoProgressSummary> {
    const {
      studentId,
      sessionId,
      courseId: _courseId,
      moduleId: _moduleId,
      lessonId,
      pillarId: _pillarId,
      tpstreamsAssetId: _tpstreamsAssetId,
      currentTimeSeconds,
      playbackRate,
      eventType,
      segments,
      counts,
    } = params;

    // 1. Resolve owned playback session canonical check
    const { session: sessionRow, authoritativeDuration } = await resolveOwnedPlaybackSession({
      sessionId,
      studentId,
      courseId: _courseId,
      lessonId,
      tpstreamsAssetId: _tpstreamsAssetId,
    });

    // 2. Reject late heartbeats if session is already ended
    if (sessionRow.ended_at) {
      if (isDebug) {
        console.info('[request-audit]', {
          action: 'playback-session-ended',
          sessionId: safeId(sessionId),
        });
      }
      throw new Error('Unauthorized or invalid session.');
    }

    const admin = createAdminClient();

    // 3. Server time watch-time plausibility check
    const currentServerTime = Date.now();
    const previousHeartbeatTime = sessionRow.updated_at
      ? new Date(sessionRow.updated_at).getTime()
      : new Date(sessionRow.started_at).getTime();
    const serverElapsedSeconds = Math.max(0, (currentServerTime - previousHeartbeatTime) / 1000);

    const maxAllowedBatchWatchTime = Math.min(
      MAX_REQUEST_WATCH_TIME_SECONDS,
      Math.max(10, serverElapsedSeconds * MAX_PLAYBACK_RATE * WATCH_TIME_PLAUSIBILITY_TOLERANCE + 15),
    );

    const hasAuthoritativeDuration = authoritativeDuration > 0;
    const safeDuration = clampDuration(authoritativeDuration);
    const safeCurrentTime = clampTime(currentTimeSeconds, safeDuration);

    if (!hasAuthoritativeDuration && isDebug) {
      console.info('[request-audit]', {
        action: 'progress-duration-missing',
        sessionId: safeId(sessionId),
        lessonId: safeId(lessonId),
      });
    }

    // 4. Sanitize segments with strict rate bounds & server plausibility cap
    const normalizedSegments = sanitizeSegments(segments, safeDuration, maxAllowedBatchWatchTime);

    // Filter out segments with client_segment_id values that were already persisted in past requests
    const incomingClientIds = normalizedSegments
      .map((s) => s.clientSegmentId)
      .filter((id): id is string => Boolean(id));

    let existingClientIds = new Set<string>();
    if (incomingClientIds.length > 0) {
      const { data: existingSegs } = await admin
        .from('video_watch_segments')
        .select('client_segment_id')
        .eq('student_id', studentId)
        .eq('lesson_id', lessonId)
        .in('client_segment_id', incomingClientIds);

      if (existingSegs && existingSegs.length > 0) {
        existingClientIds = new Set(
          existingSegs
            .map((s) => s.client_segment_id)
            .filter((id): id is string => Boolean(id)),
        );
      }
    }

    const freshSegments = normalizedSegments.filter(
      (s) => !s.clientSegmentId || !existingClientIds.has(s.clientSegmentId),
    );

    if (freshSegments.length > 0) {
      const segmentRows = freshSegments.map((s) => ({
        session_id: sessionId,
        student_id: studentId,
        pillar_id: sessionRow.pillar_id ?? null,
        course_id: sessionRow.course_id,
        module_id: sessionRow.module_id,
        lesson_id: lessonId,
        tpstreams_asset_id: _tpstreamsAssetId ?? '',
        start_second: s.startSecond,
        end_second: s.endSecond,
        playback_rate: s.playbackRate,
        wall_clock_seconds: s.wallClockSeconds,
        source: s.source,
        client_segment_id: s.clientSegmentId,
        player_instance_id: s.playerInstanceId,
        client_sequence: s.clientSequence,
        segment_started_at: s.segmentStartedAt,
        segment_ended_at: s.segmentEndedAt,
        calculation_version: 2,
      }));

      // Use upsert with onConflict to skip duplicate client_segment_id values.
      const withClientId = segmentRows.filter((r) => r.client_segment_id);
      const withoutClientId = segmentRows.filter((r) => !r.client_segment_id);

      // Batch both segment writes in parallel
      await Promise.all([
        withClientId.length > 0
          ? admin.from('video_watch_segments').upsert(withClientId, {
              onConflict: 'student_id,lesson_id,client_segment_id',
              ignoreDuplicates: true,
            })
          : Promise.resolve(),
        withoutClientId.length > 0
          ? admin.from('video_watch_segments').insert(withoutClientId)
          : Promise.resolve(),
      ]);
    }

    // 5. Insert granular event (if the heartbeat represents one).
    const eventPromise = (eventType && shouldRecordEvent(eventType))
      ? admin.from('video_watch_events').insert({
          session_id: sessionId,
          student_id: studentId,
          course_id: sessionRow.course_id,
          module_id: sessionRow.module_id,
          lesson_id: lessonId,
          event_type: eventType,
          current_time_seconds: safeCurrentTime,
          playback_rate: sanitizePlaybackRate(playbackRate, 1.0),
        })
      : Promise.resolve();

    const isEndingSession = eventType === 'ended' || eventType === 'session_close';

    const [sessionMetrics, lessonMetrics, existingProgressResult] = await Promise.all([
      getPersistedWatchMetrics(admin, {
        studentId,
        lessonId,
        sessionId,
        videoDurationSeconds: safeDuration,
      }),
      getPersistedWatchMetrics(admin, {
        studentId,
        lessonId,
        videoDurationSeconds: safeDuration,
      }),
      admin
        .from('student_video_progress')
        .select('completed_at')
        .eq('student_id', studentId)
        .eq('lesson_id', lessonId)
        .maybeSingle(),
    ]);

    const existingProgress = existingProgressResult.data;
    const sessionCompletionPct = calculateCompletionPercentage(sessionMetrics.uniqueWatched, safeDuration);
    const lessonCompletionPct = calculateCompletionPercentage(lessonMetrics.uniqueWatched, safeDuration);
    const completed = safeDuration > 0 && lessonCompletionPct >= COMPLETION_THRESHOLD * 100;
    const newMaxPosition = Math.max(
      Number(sessionRow.max_position_seconds ?? 0),
      safeCurrentTime,
    );

    await Promise.all([
      admin
        .from('video_watch_sessions')
        .update({
          ended_at: isEndingSession ? new Date().toISOString() : null,
          last_position_seconds: safeCurrentTime,
          max_position_seconds: newMaxPosition,
          total_video_seconds_watched: sessionMetrics.totalWatched,
          unique_watched_seconds: sessionMetrics.uniqueWatched,
          repeat_watched_seconds: sessionMetrics.repeatWatched,
          wall_clock_seconds: sessionMetrics.wallClock,
          completion_percentage: sessionCompletionPct,
          completed: safeDuration > 0 && sessionCompletionPct >= COMPLETION_THRESHOLD * 100,
          play_count: counts?.play ?? undefined,
          pause_count: counts?.pause ?? undefined,
          seek_count: counts?.seek ?? undefined,
          rate_change_count: counts?.ratechange ?? undefined,
          tpstreams_asset_id: _tpstreamsAssetId ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId),
      eventPromise,
    ]);

    const sessionStats = await getLessonSessionStats(admin, studentId, lessonId);

    // Diagnostic logging for completion
    if (completed && !existingProgress?.completed_at && isDebug) {
      console.info('[request-audit]', {
        action: 'completion-recorded',
        sessionId: safeId(sessionId),
        lessonId: safeId(lessonId),
      });
    }

    const now = new Date().toISOString();

    const progressRow: Record<string, unknown> = {
      student_id: studentId,
      pillar_id: sessionRow.pillar_id ?? null,
      course_id: sessionRow.course_id,
      module_id: sessionRow.module_id,
      lesson_id: lessonId,
      tpstreams_asset_id: _tpstreamsAssetId ?? '',
      video_duration_seconds: safeDuration,
      total_video_seconds_watched: lessonMetrics.totalWatched,
      unique_watched_seconds: lessonMetrics.uniqueWatched,
      repeat_watched_seconds: lessonMetrics.repeatWatched,
      wall_clock_seconds: lessonMetrics.wallClock,
      completion_percentage: lessonCompletionPct,
      completed,
      last_watched_at: now,
      last_position_seconds: safeCurrentTime,
      max_position_seconds: Math.max(sessionStats.maxPosition, safeCurrentTime),
      play_count: sessionStats.playCount,
      pause_count: sessionStats.pauseCount,
      seek_count: sessionStats.seekCount,
      rate_change_count: sessionStats.rateChangeCount,
      session_count: sessionStats.sessionCount,
    };

    if (completed && !existingProgress?.completed_at) {
      progressRow.completed_at = now;
    }

    const [progressErr] = await Promise.all([
      admin
        .from('student_video_progress')
        .upsert(progressRow, { onConflict: 'student_id,lesson_id' })
        .then((r) => r.error),
      mirrorToLegacyStudentProgress(admin, {
        studentId,
        lessonId,
        uniqueWatched: lessonMetrics.uniqueWatched,
        totalDuration: safeDuration,
        lastPosition: safeCurrentTime,
        completed,
      }),
    ]);

    if (progressErr) {
      throw new Error(`Failed to save watch progress: ${progressErr.message}`);
    }

    if (isEndingSession && isDebug) {
      console.info('[request-audit]', {
        area: 'video-analytics',
        action: 'session-finalization',
        sessionId: safeId(sessionId),
        lessonId: safeId(lessonId),
        assetId: safeId(_tpstreamsAssetId),
        uniqueWatchedSeconds: Math.round(sessionMetrics.uniqueWatched),
        completionPercentage: sessionCompletionPct,
      });
    }

    return {
      videoDurationSeconds: safeDuration,
      totalWatchedSeconds: Math.round(lessonMetrics.totalWatched),
      uniqueWatchedSeconds: Math.round(lessonMetrics.uniqueWatched),
      repeatWatchedSeconds: Math.round(lessonMetrics.repeatWatched),
      completionPercentage: lessonCompletionPct,
      completed,
    };
  }

  /**
   * Finalize a session idempotently.
   */
  static async endSession(params: {
    studentId: string;
    sessionId: string;
    courseId: string;
    moduleId: string;
    lessonId: string;
    tpstreamsAssetId: string;
    currentTimeSeconds: number;
  }) {
    const { studentId, sessionId, courseId, lessonId, tpstreamsAssetId, currentTimeSeconds } = params;
    const admin = createAdminClient();

    // Canonical ownership check
    const { session: sessionRow, authoritativeDuration } = await resolveOwnedPlaybackSession({
      sessionId,
      studentId,
      courseId,
      lessonId,
      tpstreamsAssetId,
    });

    if (sessionRow.ended_at) {
      // Idempotent return for already-ended session
      return getProgressForStudent(admin, studentId, sessionRow.lesson_id);
    }

    const safeDuration = clampDuration(authoritativeDuration);
    const safeCurrentTime = clampTime(currentTimeSeconds, safeDuration);
    const sessionMetrics = await getPersistedWatchMetrics(admin, {
      studentId,
      lessonId,
      sessionId,
      videoDurationSeconds: safeDuration,
      fallbackWallClockSeconds: Math.max(0, (Date.now() - new Date(sessionRow.started_at).getTime()) / 1000),
    });
    const completionPct = calculateCompletionPercentage(sessionMetrics.uniqueWatched, safeDuration);
    const endedAt = new Date().toISOString();
    await admin
      .from('video_watch_sessions')
      .update({
        ended_at: endedAt,
        last_position_seconds: safeCurrentTime,
        max_position_seconds: Math.max(Number(sessionRow.max_position_seconds ?? 0), safeCurrentTime),
        total_video_seconds_watched: sessionMetrics.totalWatched,
        unique_watched_seconds: sessionMetrics.uniqueWatched,
        repeat_watched_seconds: sessionMetrics.repeatWatched,
        wall_clock_seconds: sessionMetrics.wallClock,
        completion_percentage: completionPct,
        completed: safeDuration > 0 && completionPct >= COMPLETION_THRESHOLD * 100,
        updated_at: endedAt,
      })
      .eq('id', sessionId)
      .eq('student_id', studentId);

    const [lessonMetrics, sessionStats, existingProgressResult] = await Promise.all([
      getPersistedWatchMetrics(admin, {
        studentId,
        lessonId,
        videoDurationSeconds: safeDuration,
      }),
      getLessonSessionStats(admin, studentId, lessonId),
      admin
        .from('student_video_progress')
        .select('completed_at')
        .eq('student_id', studentId)
        .eq('lesson_id', lessonId)
        .maybeSingle(),
    ]);

    const lessonCompletionPct = calculateCompletionPercentage(lessonMetrics.uniqueWatched, safeDuration);
    const completed = safeDuration > 0 && lessonCompletionPct >= COMPLETION_THRESHOLD * 100;
    const progressRow: Record<string, unknown> = {
      student_id: studentId,
      pillar_id: sessionRow.pillar_id ?? null,
      course_id: sessionRow.course_id,
      module_id: sessionRow.module_id,
      lesson_id: lessonId,
      tpstreams_asset_id: tpstreamsAssetId,
      video_duration_seconds: safeDuration,
      total_video_seconds_watched: lessonMetrics.totalWatched,
      unique_watched_seconds: lessonMetrics.uniqueWatched,
      repeat_watched_seconds: lessonMetrics.repeatWatched,
      wall_clock_seconds: lessonMetrics.wallClock,
      completion_percentage: lessonCompletionPct,
      completed,
      last_watched_at: endedAt,
      last_position_seconds: safeCurrentTime,
      max_position_seconds: Math.max(sessionStats.maxPosition, safeCurrentTime),
      play_count: sessionStats.playCount,
      pause_count: sessionStats.pauseCount,
      seek_count: sessionStats.seekCount,
      rate_change_count: sessionStats.rateChangeCount,
      session_count: sessionStats.sessionCount,
    };

    if (completed && !existingProgressResult.data?.completed_at) {
      progressRow.completed_at = endedAt;
    }

    const [progressUpsert] = await Promise.all([
      admin
        .from('student_video_progress')
        .upsert(progressRow, { onConflict: 'student_id,lesson_id' }),
      mirrorToLegacyStudentProgress(admin, {
        studentId,
        lessonId,
        uniqueWatched: lessonMetrics.uniqueWatched,
        totalDuration: safeDuration,
        lastPosition: safeCurrentTime,
        completed,
      }),
    ]);

    if (progressUpsert.error) {
      throw new Error(`Failed to save watch progress: ${progressUpsert.error.message}`);
    }

    if (isDebug) {
      console.info('[request-audit]', {
        area: 'video-analytics',
        action: 'session-finalization',
        sessionId: safeId(sessionId),
        lessonId: safeId(lessonId),
        assetId: safeId(tpstreamsAssetId),
        uniqueWatchedSeconds: Math.round(sessionMetrics.uniqueWatched),
        completionPercentage: completionPct,
      });
    }

    return getProgressForStudent(admin, studentId, sessionRow.lesson_id);
  }

  /**
   * Read the current progress state for a single video lesson.
   * Reads from the rich `student_video_progress` table.
   */
  static async getProgress(studentId: string, lessonId: string) {
    const admin = createAdminClient();
    return getProgressForStudent(admin, studentId, lessonId);
  }
}

// ─── helpers ──────────────────────────────────────────────────────────

function clampDuration(d: number): number {
  if (!Number.isFinite(d) || d < 0) return 0;
  return Math.min(d, MAX_VIDEO_DURATION_SECONDS);
}

function clampTime(t: number, durationSeconds: number): number {
  if (!Number.isFinite(t) || t < 0) return 0;
  const tolerance = 5.0;
  if (durationSeconds > 0 && t > durationSeconds + tolerance) {
    return durationSeconds;
  }
  return t;
}

function calculateCompletionPercentage(uniqueWatchedSeconds: number, durationSeconds: number): number {
  if (durationSeconds <= 0 || uniqueWatchedSeconds <= 0) return 0;
  return Math.round(Math.min(100, (uniqueWatchedSeconds / durationSeconds) * 100) * 100) / 100;
}

async function getPersistedWatchMetrics(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    studentId: string;
    lessonId: string;
    sessionId?: string;
    videoDurationSeconds: number;
    fallbackWallClockSeconds?: number;
  },
): Promise<{
  totalWatched: number;
  uniqueWatched: number;
  repeatWatched: number;
  wallClock: number;
}> {
  let query = admin
    .from('video_watch_segments')
    .select('start_second, end_second, wall_clock_seconds')
    .eq('student_id', input.studentId)
    .eq('lesson_id', input.lessonId);

  if (input.sessionId) {
    query = query.eq('session_id', input.sessionId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to read watch segments: ${error.message}`);
  }

  const ranges: Range[] = [];
  let totalWatched = 0;
  let wallClock = 0;

  for (const row of data ?? []) {
    const start = Number(row.start_second ?? 0);
    const end = Number(row.end_second ?? 0);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    ranges.push({ start, end });
    totalWatched += end - start;
    wallClock += Math.max(0, Number(row.wall_clock_seconds ?? 0));
  }

  const boundedDuration = clampDuration(input.videoDurationSeconds);
  const rawUnique = sumRanges(mergeRanges(ranges));
  const uniqueWatched = boundedDuration > 0 ? Math.min(rawUnique, boundedDuration) : 0;
  const roundedTotal = Number(Math.max(0, totalWatched).toFixed(2));
  const roundedUnique = Number(Math.max(0, uniqueWatched).toFixed(2));
  const roundedWallClock = Number(
    Math.max(wallClock, input.fallbackWallClockSeconds ?? 0).toFixed(2),
  );

  return {
    totalWatched: roundedTotal,
    uniqueWatched: roundedUnique,
    repeatWatched: Number(Math.max(0, roundedTotal - roundedUnique).toFixed(2)),
    wallClock: roundedWallClock,
  };
}

async function getLessonSessionStats(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  lessonId: string,
): Promise<{
  sessionCount: number;
  playCount: number;
  pauseCount: number;
  seekCount: number;
  rateChangeCount: number;
  maxPosition: number;
}> {
  const { data, error } = await admin
    .from('video_watch_sessions')
    .select('play_count, pause_count, seek_count, rate_change_count, max_position_seconds')
    .eq('student_id', studentId)
    .eq('lesson_id', lessonId);

  if (error) {
    throw new Error(`Failed to read watch sessions: ${error.message}`);
  }

  return (data ?? []).reduce(
    (acc, row) => {
      acc.sessionCount += 1;
      acc.playCount += Number(row.play_count ?? 0);
      acc.pauseCount += Number(row.pause_count ?? 0);
      acc.seekCount += Number(row.seek_count ?? 0);
      acc.rateChangeCount += Number(row.rate_change_count ?? 0);
      acc.maxPosition = Math.max(acc.maxPosition, Number(row.max_position_seconds ?? 0));
      return acc;
    },
    {
      sessionCount: 0,
      playCount: 0,
      pauseCount: 0,
      seekCount: 0,
      rateChangeCount: 0,
      maxPosition: 0,
    },
  );
}

const RECORDED_VIDEO_EVENTS = new Set([
  'play',
  'pause',
  'seek',
  'seeked',
  'ratechange',
  'ended',
  'session_close',
  'visibility_hidden',
  'resume',
]);

function shouldRecordEvent(eventType: string): boolean {
  return RECORDED_VIDEO_EVENTS.has(eventType);
}

function sanitizeSegments(
  raw: WatchSegmentInput[],
  videoDuration: number,
  maxBatchWatchTime: number = MAX_REQUEST_WATCH_TIME_SECONDS,
): NormalizedWatchSegment[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out: NormalizedWatchSegment[] = [];

  let totalRequestWatchTime = 0;
  const processedRaw = raw.length > MAX_SEGMENTS_PER_HEARTBEAT ? raw.slice(-MAX_SEGMENTS_PER_HEARTBEAT) : raw;

  for (const seg of processedRaw) {
    if (!seg) continue;
    const s = Number(seg.startSecond);
    const e = Number(seg.endSecond);
    if (!Number.isFinite(s) || !Number.isFinite(e)) continue;
    if (s < 0 || e < 0) continue;
    if (e <= s) continue;
    if (e - s > MAX_SEGMENT_DURATION_SECONDS) continue;
    if (videoDuration > 0 && s > videoDuration + 1) continue;
    if (videoDuration > 0 && e > videoDuration + 1) continue;

    const segmentDuration = e - s;
    const wallClock = seg.wallClockSeconds && seg.wallClockSeconds > 0 ? seg.wallClockSeconds : segmentDuration;

    // Reject segments with invalid playback rates
    if (!isValidPlaybackRate(seg.playbackRate)) {
      if (isDebug) {
        console.info('[request-audit]', { action: 'progress-segment-rejected', reason: 'invalid-rate', rate: seg.playbackRate });
      }
      continue;
    }

    const rate = seg.playbackRate;

    // Plausibility check: segment duration cannot exceed wallClock * rate * WATCH_TIME_PLAUSIBILITY_TOLERANCE
    const maxPlausibleWatch = Math.max(2.0, wallClock * rate * WATCH_TIME_PLAUSIBILITY_TOLERANCE);
    if (segmentDuration > maxPlausibleWatch) {
      if (isDebug) {
        console.info('[request-audit]', { action: 'progress-segment-rejected', reason: 'implausible-progression', segmentDuration, maxPlausibleWatch });
      }
      continue;
    }

    if (totalRequestWatchTime + segmentDuration > maxBatchWatchTime) {
      if (isDebug) {
        console.info('[request-audit]', { action: 'progress-segment-rejected', reason: 'batch-watch-time-exceeded' });
      }
      continue;
    }
    totalRequestWatchTime += segmentDuration;

    out.push({
      startSecond: Number(s.toFixed(2)),
      endSecond: Number(e.toFixed(2)),
      playbackRate: rate,
      source: seg.source ?? 'play',
      clientSegmentId: seg.clientSegmentId ?? null,
      playerInstanceId: seg.playerInstanceId ?? null,
      clientSequence: seg.clientSequence ?? null,
      wallClockSeconds: Number(wallClock.toFixed(2)),
      segmentStartedAt: seg.segmentStartedAt ?? null,
      segmentEndedAt: seg.segmentEndedAt ?? null,
    });
  }
  return out;
}

async function getProgressForStudent(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  lessonId: string,
) {
  const { data, error } = await admin
    .from('student_video_progress')
    .select('id, student_id, pillar_id, course_id, module_id, lesson_id, tpstreams_asset_id, video_duration_seconds, total_video_seconds_watched, unique_watched_seconds, repeat_watched_seconds, wall_clock_seconds, completion_percentage, completed, first_started_at, last_watched_at, last_position_seconds, max_position_seconds, play_count, pause_count, seek_count, rate_change_count, session_count, completed_at')
    .eq('student_id', studentId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to read video progress: ${error.message}`);
  }
  return data ?? null;
}

function _progressRowToSummary(
  row: Record<string, unknown> | null | undefined,
  fallbackDuration: number,
): VideoProgressSummary {
  if (!row) {
    return {
      videoDurationSeconds: Math.round(fallbackDuration || 0),
      totalWatchedSeconds: 0,
      uniqueWatchedSeconds: 0,
      repeatWatchedSeconds: 0,
      completionPercentage: 0,
      completed: false,
    };
  }
  const unique = Number(row.unique_watched_seconds ?? 0);
  const total = Number(row.total_video_seconds_watched ?? unique);
  const duration = Number(row.video_duration_seconds ?? fallbackDuration ?? 0);
  return {
    videoDurationSeconds: Math.round(duration),
    totalWatchedSeconds: Math.round(total),
    uniqueWatchedSeconds: Math.round(unique),
    repeatWatchedSeconds: Math.max(0, Math.round(total - unique)),
    completionPercentage: Number(row.completion_percentage ?? 0),
    completed: Boolean(row.completed),
  };
}

/**
 * Mirror aggregates from the rich schema into the legacy
 * `student_progress` table. All writes are monotonic — we never
 * reduce already-recorded values, so the rest of the LMS
 * (course completion, resume position) keeps working without
 * any risk of regressing on rollout.
 */
async function mirrorToLegacyStudentProgress(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    studentId: string;
    lessonId: string;
    uniqueWatched: number;
    totalDuration: number;
    lastPosition: number;
    completed: boolean;
  },
): Promise<{ success: boolean; error?: string }> {
  const { data: existing, error: readErr } = await admin
    .from('student_progress')
    .select('watched_seconds, total_seconds, last_position_seconds, completed')
    .eq('student_id', input.studentId)
    .eq('item_id', input.lessonId)
    .maybeSingle();

  if (readErr && readErr.code !== 'PGRST116') {
    // Mirror is best-effort — log and move on.
    return { success: false, error: readErr.message };
  }

  const newWatched = Math.round(input.uniqueWatched);
  const newPosition = Math.round(input.lastPosition);

  const payload: Record<string, unknown> = {
    student_id: input.studentId,
    item_id: input.lessonId,
    watched_seconds: Math.max(Number(existing?.watched_seconds ?? 0), newWatched),
    last_position_seconds: Math.max(Number(existing?.last_position_seconds ?? 0), newPosition),
    completed: Boolean(existing?.completed) || input.completed,
    completed_at: input.completed && !existing?.completed ? new Date().toISOString() : undefined,
    updated_at: new Date().toISOString(),
  };

  if (input.totalDuration > 0) {
    payload.total_seconds = Math.max(Number(existing?.total_seconds ?? 0), Math.round(input.totalDuration));
  }

  const { error: upsertErr } = await admin
    .from('student_progress')
    .upsert(payload, { onConflict: 'student_id,item_id' });

  if (upsertErr) {
    return { success: false, error: upsertErr.message };
  }
  return { success: true };
}

export type { VideoAnalyticsHeartbeatPayload };
