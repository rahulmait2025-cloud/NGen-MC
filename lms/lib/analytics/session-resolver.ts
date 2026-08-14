import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { VideoWatchSessionsRow } from '@/types/database';
import { MAX_SESSION_LIFETIME_MS } from './policy';

export interface ResolveOwnedPlaybackSessionParams {
  sessionId: string;
  studentId: string;
  courseId?: string;
  lessonId?: string;
  tpstreamsAssetId?: string;
  videoAssetId?: string;
}

export interface ResolvedOwnedSession {
  session: VideoWatchSessionsRow;
  authoritativeDuration: number;
}

const isDebug =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_DEBUG_REQUESTS === 'true';

function safeId(id?: string | null) {
  return id ? `${id.slice(0, 8)}...` : null;
}

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours inactivity limit

/**
 * Single canonical resolver for playback-session ownership and lifecycle validation.
 * Validates student ownership, course, lesson, tpstreams asset IDs, video asset IDs, session age, and inactivity timeout.
 */
export async function resolveOwnedPlaybackSession(
  params: ResolveOwnedPlaybackSessionParams,
): Promise<ResolvedOwnedSession> {
  const { sessionId, studentId, courseId, lessonId, tpstreamsAssetId, videoAssetId } = params;
  const admin = createAdminClient();

  const { data: sessionRow, error: sessErr } = await admin
    .from('video_watch_sessions')
    .select('id, student_id, pillar_id, course_id, module_id, lesson_id, tpstreams_asset_id, started_at, ended_at, last_position_seconds, max_position_seconds, total_video_seconds_watched, unique_watched_seconds, repeat_watched_seconds, wall_clock_seconds, completion_percentage, completed, play_count, pause_count, seek_count, rate_change_count, created_at, updated_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessErr || !sessionRow) {
    if (isDebug) {
      console.info('[request-audit]', {
        action: 'playback-session-not-found',
        sessionId: safeId(sessionId),
      });
    }
    throw new Error('Unauthorized or invalid session.');
  }

  // Ownership validation
  if (sessionRow.student_id !== studentId) {
    if (isDebug) {
      console.info('[request-audit]', {
        action: 'playback-session-ownership-denied',
        area: 'video-analytics',
        diagnostic: 'stale-session-request-rejected',
        sessionId: safeId(sessionId),
        reason: 'student_id mismatch',
      });
    }
    throw new Error('Unauthorized or invalid session.');
  }

  if (courseId && sessionRow.course_id !== courseId) {
    if (isDebug) {
      console.info('[request-audit]', {
        action: 'playback-session-ownership-denied',
        area: 'video-analytics',
        diagnostic: 'stale-session-request-rejected',
        sessionId: safeId(sessionId),
        reason: 'course_id mismatch',
      });
    }
    throw new Error('Unauthorized or invalid session.');
  }

  if (lessonId && sessionRow.lesson_id !== lessonId) {
    if (isDebug) {
      console.info('[request-audit]', {
        action: 'playback-session-ownership-denied',
        area: 'video-analytics',
        diagnostic: 'stale-session-request-rejected',
        sessionId: safeId(sessionId),
        reason: 'lesson_id mismatch',
      });
    }
    throw new Error('Unauthorized or invalid session.');
  }

  if (tpstreamsAssetId && sessionRow.tpstreams_asset_id !== tpstreamsAssetId) {
    if (isDebug) {
      console.info('[request-audit]', {
        action: 'playback-session-ownership-denied',
        area: 'video-analytics',
        diagnostic: 'stale-session-request-rejected',
        sessionId: safeId(sessionId),
        reason: 'tpstreams_asset_id mismatch',
      });
    }
    throw new Error('Unauthorized or invalid session.');
  }

  // Expiry / Lifetime & Inactivity check
  const startedAtMs = new Date(sessionRow.started_at).getTime();
  const lastActiveMs = sessionRow.updated_at ? new Date(sessionRow.updated_at).getTime() : startedAtMs;

  if (
    Number.isNaN(startedAtMs) ||
    Date.now() - startedAtMs > MAX_SESSION_LIFETIME_MS ||
    Date.now() - lastActiveMs > INACTIVITY_TIMEOUT_MS
  ) {
    if (isDebug) {
      console.info('[request-audit]', {
        action: 'playback-session-expired',
        sessionId: safeId(sessionId),
      });
    }
    throw new Error('Unauthorized or invalid session.');
  }

  // Resolve server-authoritative duration & video_asset_id from video_assets
  const { data: assetRow } = await admin
    .from('video_assets')
    .select('id, master_course_id, duration_seconds')
    .eq('tp_asset_id', sessionRow.tpstreams_asset_id)
    .eq('master_course_id', sessionRow.course_id)
    .maybeSingle();

  if (videoAssetId && assetRow && assetRow.id !== videoAssetId) {
    if (isDebug) {
      console.info('[request-audit]', {
        action: 'playback-session-ownership-denied',
        sessionId: safeId(sessionId),
        reason: 'video_asset_id mismatch',
      });
    }
    throw new Error('Unauthorized or invalid session.');
  }

  const authoritativeDuration =
    assetRow?.duration_seconds && assetRow.duration_seconds > 0
      ? assetRow.duration_seconds
      : 0;

  return {
    session: sessionRow as VideoWatchSessionsRow,
    authoritativeDuration,
  };
}
