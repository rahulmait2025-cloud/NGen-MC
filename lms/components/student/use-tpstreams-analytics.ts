'use client';
import { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  postVideoAnalyticsHeartbeat,
  postVideoAnalyticsSessionEnd,
  postVideoAnalyticsSessionStart,
} from '@/lib/api/student-client';

const LOCAL_STORAGE_SAVE_INTERVAL_MS = 5 * 60 * 1000;

export interface UseTpStreamsAnalyticsProps {
  collegeSlug: string;
  courseId: string;
  moduleId?: string;
  lessonId: string;
  embedUrl: string;
  studentId?: string;
  playbackToken?: string;
  onComplete?: () => void;
}

const isDebug =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_DEBUG_REQUESTS === 'true';

function safeId(id?: string | null) {
  return id ? `${id.slice(0, 8)}...` : null;
}

interface WatchSegment {
  startSecond: number;
  endSecond: number;
  playbackRate: number;
  source: string;
  clientSegmentId: string;
  playerInstanceId: string;
  clientSequence: number;
  wallClockSeconds: number;
  segmentStartedAt: string;
  segmentEndedAt: string;
}

interface Interval {
  start: number;
  end: number;
}

interface PlaybackTokenIdentity {
  courseId: string;
  moduleId: string;
  lessonId: string;
  tpstreamsAssetId: string;
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
  return atob(padded);
}

function readPlaybackTokenIdentity(token?: string | null): PlaybackTokenIdentity | null {
  if (!token) return null;
  try {
    const [payload] = token.split('.');
    if (!payload) return null;
    const parsed = JSON.parse(decodeBase64Url(payload)) as Record<string, unknown>;
    const courseId = typeof parsed.courseId === 'string' ? parsed.courseId : null;
    const moduleId = typeof parsed.moduleId === 'string' ? parsed.moduleId : null;
    const lessonId = typeof parsed.lessonId === 'string' ? parsed.lessonId : null;
    const tpstreamsAssetId = typeof parsed.tpAssetId === 'string' ? parsed.tpAssetId : null;
    if (!courseId || !moduleId || !lessonId || !tpstreamsAssetId) {
      return null;
    }
    return { courseId, moduleId, lessonId, tpstreamsAssetId };
  } catch {
    return null;
  }
}

/** Min gap between routine heartbeats during playback (20 seconds recommended cadence). */
const HEARTBEAT_INTERVAL_MS = 20_000;
/** Min gap between event-driven heartbeats (pause, seek). */
const HEARTBEAT_EVENT_MIN_MS = 3_000;

function logAnalyticsFailure(label: string, res: Response, payload?: unknown, responseText?: string) {
  if (res.status === 429) return;
  if (responseText) {
    try {
      const body = JSON.parse(responseText);
      console.error(`[TpStreamsAnalytics] ${label}`, res.status, body?.error ?? body, payload || '');
    } catch {
      console.error(`[TpStreamsAnalytics] ${label}`, res.status, responseText, payload || '');
    }
  } else {
    console.error(`[TpStreamsAnalytics] ${label}`, res.status, payload || '');
  }
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC 4122-compliant UUID v4 fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = intervals.toSorted((a, b) => a.start - b.start);
  const merged: Interval[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr.start <= last.end) {
      last.end = Math.max(last.end, curr.end);
    } else {
      merged.push(curr);
    }
  }
  return merged;
}

export function useTpStreamsAnalytics({
  collegeSlug,
  courseId,
  moduleId,
  lessonId,
  embedUrl,
  studentId,
  playbackToken,
  onComplete,
}: UseTpStreamsAnalyticsProps) {
  const canonicalIdentity = useMemo(() => readPlaybackTokenIdentity(playbackToken), [playbackToken]);
  const analyticsIdentityKey = canonicalIdentity
    ? `${canonicalIdentity.courseId}:${canonicalIdentity.moduleId}:${canonicalIdentity.lessonId}:${canonicalIdentity.tpstreamsAssetId}`
    : null;

  const sessionIdRef = useRef<string | null>(null);
  const durationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const sessionStartTimeRef = useRef<number>(0);
  const startSessionInFlightRef = useRef(false);
  const startSessionIdentityKeyRef = useRef<string | null>(null);
  const lastHeartbeatTimeRef = useRef<number>(0);
  const heartbeatBackoffUntilRef = useRef<number>(0);
  const heartbeatInFlightRef = useRef(false);
  const rateLimitWarnedRef = useRef(false);
  const currentSegmentRef = useRef<WatchSegment | null>(null);
  const segmentBufferRef = useRef<WatchSegment[]>([]);
  const countsRef = useRef({ play: 0, pause: 0, seek: 0, ratechange: 0 });
  const playbackRateRef = useRef<number>(1.0);
  const isPlayingRef = useRef<boolean>(false);
  const totalWatchedSecondsRef = useRef<number>(0);
  const segmentSeqRef = useRef<number>(0);
  const playerInstanceIdRef = useRef<string>(cryptoRandomId());
  const lastSegmentStartWallRef = useRef<number>(0);
  const hasEndedRef = useRef(false);
  const endSessionInFlightRef = useRef(false);
  const lastTickWallRef = useRef<number>(0);
  const lastLocalStorageSaveRef = useRef<number>(0);

  const lastFlushedPositionRef = useRef<number>(0);
  const sessionRequestIdRef = useRef<number>(0);

  const collegeSlugRef = useRef(collegeSlug);
  const courseIdRef = useRef(canonicalIdentity?.courseId ?? courseId);
  const moduleIdRef = useRef<string | null>(canonicalIdentity?.moduleId ?? null);
  const lessonIdRef = useRef(canonicalIdentity?.lessonId ?? lessonId);
  const tpstreamsAssetIdRef = useRef<string | null>(canonicalIdentity?.tpstreamsAssetId ?? null);
  const analyticsIdentityKeyRef = useRef<string | null>(analyticsIdentityKey);
  const studentIdRef = useRef(studentId);
  const playbackTokenRef = useRef(playbackToken);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    collegeSlugRef.current = collegeSlug;
    courseIdRef.current = canonicalIdentity?.courseId ?? courseId;
    moduleIdRef.current = canonicalIdentity?.moduleId ?? null;
    lessonIdRef.current = canonicalIdentity?.lessonId ?? lessonId;
    tpstreamsAssetIdRef.current = canonicalIdentity?.tpstreamsAssetId ?? null;
    analyticsIdentityKeyRef.current = canonicalIdentity
      ? `${canonicalIdentity.courseId}:${canonicalIdentity.moduleId}:${canonicalIdentity.lessonId}:${canonicalIdentity.tpstreamsAssetId}`
      : null;
    studentIdRef.current = studentId;
    playbackTokenRef.current = playbackToken;
    onCompleteRef.current = onComplete;
  }, [collegeSlug, courseId, moduleId, lessonId, embedUrl, studentId, playbackToken, onComplete, canonicalIdentity]);

  const _getStorageKey = useCallback(() => {
    return `lms-video-intervals:${studentIdRef.current || 'anon'}:${lessonIdRef.current}`;
  }, []);

  /**
   * localStorage persistence for the unflushed segment buffer. Without
   * this, a hard browser crash (not a `pagehide` or visibilitychange,
   * which we already handle with `sendBeacon` and `flushHeartbeat`)
   * can lose the last few seconds of segments. The buffer is small
   * (max 500 segments) and write is best-effort: failure to write
   * (e.g. quota exceeded) is silently ignored and degrades gracefully
   * to in-memory-only behaviour.
   */
  const _getSegmentBufferKey = useCallback(() => {
    return `lms-video-segments:${studentIdRef.current || 'anon'}:${lessonIdRef.current}`;
  }, []);

  const persistSegmentBuffer = useCallback(() => {
    // No-op to disable local caching
  }, []);

  const clearPersistedSegmentBuffer = useCallback(() => {
    // No-op to disable local caching
  }, []);

  const restorePersistedSegmentBuffer = useCallback((): WatchSegment[] | null => {
    return null;
  }, []);

  const loadIntervals = useCallback((): Interval[] => {
    return [];
  }, []);

  const saveIntervals = useCallback((_intervals: Interval[]) => {
    // No-op to disable local caching
  }, []);

  const getUniqueWatchedSeconds = useCallback((): number => {
    const intervals = loadIntervals();
    return intervals.reduce((sum, item) => sum + (item.end - item.start), 0);
  }, [loadIntervals]);

  const closeActiveSegment = useCallback((): WatchSegment | null => {
    const seg = currentSegmentRef.current;
    if (!seg) return null;
    const now = Date.now();
    // If the segment never received a timeupdate (student played and
    // immediately closed the tab / refreshed), endSecond can equal
    // startSecond. In that case, fall back to the wall-clock elapsed
    // time to estimate how many seconds the student actually watched.
    // We approximate by using the max of: last known video time,
    // start time + 0.01s (so it round-trips to the server), or
    // start time + wallClockSeconds (the most accurate signal we
    // have when currentTime never advanced).
    if (seg.endSecond <= seg.startSecond) {
      const wallSec = (now - lastSegmentStartWallRef.current) / 1000;
      // Use lastTimeRef (last known currentTime) as the end position,
      // then bump by a tiny epsilon so the segment is non-zero on the
      // server. This guarantees even 1-second-of-then-close-tab plays
      // are persisted.
      const fallback = Math.max(
        lastTimeRef.current,
        seg.startSecond + 0.01,
        seg.startSecond + wallSec * playbackRateRef.current,
      );
      seg.endSecond = Number(fallback.toFixed(2));
      if (seg.endSecond <= seg.startSecond) {
        seg.endSecond = Number((seg.startSecond + 0.01).toFixed(2));
      }
    }
    seg.wallClockSeconds = Number(
      ((now - lastSegmentStartWallRef.current) / 1000).toFixed(2),
    );
    seg.segmentEndedAt = new Date().toISOString();
    segmentBufferRef.current.push({ ...seg });
    currentSegmentRef.current = null;
    // Persist to localStorage so a hard browser crash (no pagehide/
    // visibilitychange fired) doesn't lose the segment. This is a
    // best-effort write; failures fall back to in-memory only.
    persistSegmentBuffer();
    return seg;
  }, [persistSegmentBuffer]);

  const startNewSegment = useCallback(
    (startSecond: number, source: string = 'play') => {
      const rate = playbackRateRef.current;
      segmentSeqRef.current += 1;
      lastSegmentStartWallRef.current = Date.now();
      currentSegmentRef.current = {
        startSecond: Number(startSecond.toFixed(2)),
        endSecond: Number(startSecond.toFixed(2)),
        playbackRate: rate,
        source,
        clientSegmentId: cryptoRandomId(),
        playerInstanceId: playerInstanceIdRef.current,
        clientSequence: segmentSeqRef.current,
        wallClockSeconds: 0,
        segmentStartedAt: new Date().toISOString(),
        segmentEndedAt: new Date().toISOString(),
      };
    },
    [],
  );

  const flushHeartbeat = useCallback(
    async (eventType: string = 'heartbeat', options?: { force?: boolean }) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      const identityKey = analyticsIdentityKeyRef.current;
      const targetToken = playbackTokenRef.current;
      const resolvedModuleIdVal = moduleIdRef.current;
      const resolvedTpAssetId = tpstreamsAssetIdRef.current;
      if (!identityKey || !targetToken || !resolvedModuleIdVal || !resolvedTpAssetId) {
        // Lound warning instead of silent skip — if moduleId is
        // missing, the server endpoint will reject every heartbeat
        // and the student appears to have watched nothing. We surface
        // a single warning per lesson+page-load so it doesn't spam
        // the console.
        if (!rateLimitWarnedRef.current) {
          console.warn(
            '[TpStreamsAnalytics] canonical analytics identity is incomplete; heartbeat skipped.',
            { lessonId: safeId(lessonIdRef.current), courseId: safeId(courseIdRef.current), eventType },
          );
        }
        return;
      }
      const now = Date.now();
      if (now < heartbeatBackoffUntilRef.current) {
        return;
      }
      const minGap = eventType === 'heartbeat' ? HEARTBEAT_INTERVAL_MS : HEARTBEAT_EVENT_MIN_MS;
      if (!options?.force && now - lastHeartbeatTimeRef.current < minGap) {
        return;
      }
      // Phase 1+4: Skip routine heartbeats if:
      // - playback position hasn't changed meaningfully (<10s delta) AND no new segments
      // - tab is hidden (visibility change will force-flush when visible)
      // This prevents spam during paused/hidden/stalled states while still
      // flushing on play/pause/seek/ended (force=true).
      if (!options?.force) {
        if (typeof document !== 'undefined' && document.hidden) {
          return;
        }
        const positionDelta = Math.abs(lastTimeRef.current - lastFlushedPositionRef.current);
        if (positionDelta < 10 && segmentBufferRef.current.length === 0) {
          if (isDebug) {
            console.info('[request-audit]', {
              area: 'video-analytics-client',
              action: 'flushHeartbeat-skipped-client-noop',
              reason: positionDelta < 10 ? 'position-unchanged' : 'no-segments',
              lessonId: safeId(lessonIdRef.current),
            });
          }
          return;
        }
      }
      if (heartbeatInFlightRef.current) {
        return;
      }
      closeActiveSegment();
      const MAX_LOCAL_SEGMENTS = 500;
      if (segmentBufferRef.current.length > MAX_LOCAL_SEGMENTS) {
        const overflow = segmentBufferRef.current.length - MAX_LOCAL_SEGMENTS;
        segmentBufferRef.current.splice(0, overflow);
      }
      if (segmentBufferRef.current.length === 0 && eventType === 'heartbeat') {
        lastHeartbeatTimeRef.current = now;
        return;
      }
      const segmentsToSend = [...segmentBufferRef.current];
      segmentBufferRef.current = [];
      lastHeartbeatTimeRef.current = now;
      heartbeatInFlightRef.current = true;
      const heartbeatIdempotencyKey = cryptoRandomId();
      const uniqueWatchedSeconds = getUniqueWatchedSeconds();
      const totalWatchedSeconds = totalWatchedSecondsRef.current;

      if (isDebug) {
        console.info('[request-audit]', {
          area: 'video-analytics-client',
          action: 'flushHeartbeat',
          eventType,
          segmentsCount: segmentsToSend.length,
          lessonId: safeId(lessonIdRef.current),
        });
      }

      try {
        const res = await postVideoAnalyticsHeartbeat({
            collegeSlug: collegeSlugRef.current,
            sessionId: sessionId,
            courseId: courseIdRef.current,
            moduleId: resolvedModuleIdVal,
            lessonId: lessonIdRef.current,
            tpstreamsAssetId: resolvedTpAssetId,
            videoDurationSeconds: durationRef.current,
            currentTimeSeconds: lastTimeRef.current,
            playbackRate: playbackRateRef.current,
            playbackToken: targetToken,
            wallClockSeconds: Number(((Date.now() - sessionStartTimeRef.current) / 1000).toFixed(1)),
            eventType,
            segments: segmentsToSend,
            counts: { ...countsRef.current },
            uniqueWatchedSeconds,
            totalWatchedSeconds,
          }, heartbeatIdempotencyKey);
        const data = await res.json();
        if (res.status === 429) {
          const retryAfter = Number(res.headers.get('Retry-After')) || 30;
          heartbeatBackoffUntilRef.current = Date.now() + retryAfter * 1000;
          // 429 means segments were NOT persisted. Re-insert at the
          // front of the buffer and keep the localStorage copy intact
          // so the retry can ship them.
          segmentBufferRef.current.unshift(...segmentsToSend);
          if (!rateLimitWarnedRef.current) {
            rateLimitWarnedRef.current = true;
          }
          return;
        }
        if (!res.ok || !data.ok) {
          logAnalyticsFailure('heartbeat', res, { eventType }, JSON.stringify(data));
          // Server rejected: re-insert and keep the localStorage copy
          // so the next attempt (or a later tab) can ship them.
          segmentBufferRef.current.unshift(...segmentsToSend);
          return;
        }
        // Server acknowledged the segments. They are now durable in
        // the DB, so we can safely drop the localStorage copy. If a
        // later crash happens, we'll start with a fresh buffer.
        heartbeatBackoffUntilRef.current = 0;
        rateLimitWarnedRef.current = false;
        lastFlushedPositionRef.current = lastTimeRef.current;
        clearPersistedSegmentBuffer();
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[video-analytics] heartbeat flushed', {
            eventType,
            segmentsCount: segmentsToSend.length,
            currentTime: lastTimeRef.current,
            uniqueWatchedSeconds,
          });
        }
        if (data.summary?.completed && onCompleteRef.current) {
          onCompleteRef.current();
        }
      } catch (err) {
        console.error('[TpStreamsAnalytics] Heartbeat failed:', err);
        segmentBufferRef.current.unshift(...segmentsToSend);
        persistSegmentBuffer();
      } finally {
        heartbeatInFlightRef.current = false;
      }
    },
    [getUniqueWatchedSeconds, closeActiveSegment, clearPersistedSegmentBuffer, persistSegmentBuffer],
  );

  const startSession = useCallback(async (duration: number = 0) => {
    if (sessionIdRef.current) {
      if (isDebug) {
        console.info('[request-audit]', {
          area: 'video-analytics-client',
          action: 'duplicate-start-prevented',
          reason: 'session-already-active',
          sessionId: safeId(sessionIdRef.current),
          lessonId: safeId(lessonIdRef.current),
          assetId: safeId(tpstreamsAssetIdRef.current),
        });
      }
      return;
    }
    const resolvedModuleIdVal = moduleIdRef.current;
    const targetIdentityKey = analyticsIdentityKeyRef.current;
      const targetToken = playbackTokenRef.current;
      const targetAssetId = tpstreamsAssetIdRef.current;
      if (!targetIdentityKey || !targetToken || !resolvedModuleIdVal || !targetAssetId) {
        if (!rateLimitWarnedRef.current) {
          rateLimitWarnedRef.current = true;
          console.warn(
            '[TpStreamsAnalytics] canonical analytics identity is incomplete; startSession skipped.',
            { lessonId: safeId(lessonIdRef.current), courseId: safeId(courseIdRef.current) },
          );
      }
      return;
    }
    if (startSessionInFlightRef.current && startSessionIdentityKeyRef.current === targetIdentityKey) {
      if (isDebug) {
        console.info('[request-audit]', {
          area: 'video-analytics-client',
          action: 'duplicate-start-prevented',
          reason: 'start-request-in-flight',
          lessonId: safeId(lessonIdRef.current),
          assetId: safeId(targetAssetId),
        });
      }
      return;
    }

    startSessionInFlightRef.current = true;
    startSessionIdentityKeyRef.current = targetIdentityKey;
    const currentReqId = ++sessionRequestIdRef.current;

    const restored = restorePersistedSegmentBuffer();
    if (restored && restored.length > 0 && segmentBufferRef.current.length === 0) {
      segmentBufferRef.current = restored;
    }
    hasEndedRef.current = false;
    endSessionInFlightRef.current = false;
    
    const sanitizedDuration = typeof duration === 'number' && Number.isFinite(duration) && duration >= 0 ? duration : 0;
    
    durationRef.current = sanitizedDuration;
    sessionStartTimeRef.current = Date.now();
    totalWatchedSecondsRef.current = 0;
    segmentSeqRef.current = 0;
    playerInstanceIdRef.current = cryptoRandomId();

      const targetLessonId = lessonIdRef.current;

      try {
        if (isDebug) {
          console.info('[request-audit]', {
            area: 'video-analytics-client',
            action: 'startSession',
            reason: 'player-loaded-with-canonical-token',
            lessonId: safeId(targetLessonId),
            assetId: safeId(targetAssetId),
            courseId: safeId(courseIdRef.current),
          });
        }
      const res = await postVideoAnalyticsSessionStart({
          collegeSlug: collegeSlugRef.current,
          courseId: courseIdRef.current,
          moduleId: resolvedModuleIdVal,
          lessonId: targetLessonId,
          tpstreamsAssetId: targetAssetId,
          videoDurationSeconds: sanitizedDuration,
          playbackToken: targetToken,
        }, cryptoRandomId());
      const data = await res.json();

      // Discard stale responses if lesson, token, asset, or request generation changed during fetch
      if (
        currentReqId !== sessionRequestIdRef.current ||
        targetIdentityKey !== analyticsIdentityKeyRef.current ||
        targetLessonId !== lessonIdRef.current ||
        targetToken !== playbackTokenRef.current ||
        targetAssetId !== tpstreamsAssetIdRef.current
      ) {
        if (isDebug) {
          console.info('[request-audit]', {
            area: 'video-analytics-client',
            action: 'stale-session-request-rejected',
            currentReqId,
            activeReqId: sessionRequestIdRef.current,
            lessonId: safeId(targetLessonId),
            assetId: safeId(targetAssetId),
          });
        }
        return;
      }

      if (data.ok && data.sessionId) {
        sessionIdRef.current = data.sessionId;
        lastHeartbeatTimeRef.current = Date.now();
        if (data.alreadyOpen && isDebug) {
          console.info('[request-audit]', {
            area: 'video-analytics-client',
            action: 'duplicate-start-prevented',
            sessionId: safeId(data.sessionId),
            lessonId: safeId(targetLessonId),
            assetId: safeId(targetAssetId),
          });
        }
        if (segmentBufferRef.current.length > 0) {
          void flushHeartbeat('heartbeat', { force: true });
        }
      } else {
        logAnalyticsFailure('session/start', res, undefined, JSON.stringify(data));
      }
    } catch (err) {
      console.error('[TpStreamsAnalytics] Start session failed:', err);
    } finally {
      if (currentReqId === sessionRequestIdRef.current) {
        startSessionInFlightRef.current = false;
        startSessionIdentityKeyRef.current = null;
      }
    }
  }, [restorePersistedSegmentBuffer, flushHeartbeat]);

  const endSession = useCallback(async () => {
    if (hasEndedRef.current) {
      return;
    }
    if (endSessionInFlightRef.current) {
      return;
    }
      const sessionId = sessionIdRef.current;
      if (!sessionId) {
        return;
      }
      const currentToken = playbackTokenRef.current;
      const currentModuleId = moduleIdRef.current;
      const currentTpAssetId = tpstreamsAssetIdRef.current;
      if (!currentToken || !currentModuleId || !currentTpAssetId) {
        return;
      }
      endSessionInFlightRef.current = true;
    try {
      await flushHeartbeat('ended', { force: true });
    } catch {
      // Best effort
    }
    if (!sessionIdRef.current) {
      endSessionInFlightRef.current = false;
      return;
    }
    try {
      const res = await postVideoAnalyticsSessionEnd({
          collegeSlug: collegeSlugRef.current,
          sessionId: sessionId,
          courseId: courseIdRef.current,
          moduleId: currentModuleId,
          lessonId: lessonIdRef.current,
          tpstreamsAssetId: currentTpAssetId,
          playbackToken: currentToken,
          currentTimeSeconds: lastTimeRef.current,
        }, cryptoRandomId(), { headers: { 'Keep-Alive': 'true' } });
      if (res.ok) {
        hasEndedRef.current = true;
        sessionIdRef.current = null;
      }
    } catch {
      console.error('[TpStreamsAnalytics] End session failed');
    } finally {
      endSessionInFlightRef.current = false;
    }
  }, [flushHeartbeat]);

  const onPlay = useCallback(() => {
    isPlayingRef.current = true;
    countsRef.current.play += 1;

    // If previous session ended (replay / re-watch), start a fresh session
    // so that new segments are persisted and cumulative watch time grows.
    if (!sessionIdRef.current && hasEndedRef.current) {
      hasEndedRef.current = false;
      endSessionInFlightRef.current = false;
      totalWatchedSecondsRef.current = 0;
      segmentSeqRef.current = 0;
      playerInstanceIdRef.current = cryptoRandomId();
      sessionStartTimeRef.current = Date.now();
      lastHeartbeatTimeRef.current = 0;
      segmentBufferRef.current = [];
      countsRef.current = { play: 1, pause: 0, seek: 0, ratechange: 0 };
      void startSession(durationRef.current);
    }

    if (currentSegmentRef.current) {
      closeActiveSegment();
    }
    // Reset wall-clock tick baseline so the first timeupdate after play
    // computes a sane `maxAllowedDelta` (otherwise the first tick can be
    // misclassified as a seek and dropped, losing the first seconds).
    lastTickWallRef.current = Date.now();
    startNewSegment(lastTimeRef.current, 'play');
  }, [closeActiveSegment, startNewSegment, startSession]);

  const onPause = useCallback(() => {
    isPlayingRef.current = false;
    countsRef.current.pause += 1;
    closeActiveSegment();
  }, [closeActiveSegment]);

  const onSeek = useCallback(() => {
    countsRef.current.seek += 1;
    closeActiveSegment();
  }, [closeActiveSegment]);

  const onRateChange = useCallback((rate?: number) => {
    countsRef.current.ratechange += 1;
    if (typeof rate === 'number' && Number.isFinite(rate) && rate >= 0.5 && rate <= 2.0) {
      playbackRateRef.current = rate;
      closeActiveSegment();
      if (isPlayingRef.current) {
        startNewSegment(lastTimeRef.current, 'ratechange');
      }
    }
  }, [closeActiveSegment, startNewSegment]);

  const onTimeUpdate = useCallback(
    (currentTime: number, videoDurationSeconds?: number) => {
      const sanitizedVideoDuration = typeof videoDurationSeconds === 'number' && Number.isFinite(videoDurationSeconds) && videoDurationSeconds >= 0 ? videoDurationSeconds : 0;
      if (sanitizedVideoDuration > durationRef.current) {
        durationRef.current = sanitizedVideoDuration;
      }
      const now = Date.now();
      const lastTime = lastTimeRef.current;
      const delta = currentTime - lastTime;
      const wallDeltaMs = lastTickWallRef.current ? now - lastTickWallRef.current : 0;
      const rate = playbackRateRef.current;

      const wallDeltaSec = wallDeltaMs / 1000;
      const maxAllowedDelta = Math.max(3.0, wallDeltaSec * rate * 2.5);
      const isSeek = Math.abs(delta) > maxAllowedDelta;

      if (isSeek) {
        closeActiveSegment();
        startNewSegment(currentTime, 'seeked');
      } else if (delta > 0) {
        // Natural forward playback
        totalWatchedSecondsRef.current += delta;
        const start = Number(lastTime.toFixed(2));
        const end = Number(currentTime.toFixed(2));
        
        // OPTIMIZATION: Only persist to localStorage every LOCAL_STORAGE_SAVE_INTERVAL_MS (10s)
        // Instead of every timeupdate (~4x/second). Data is still tracked in memory.
        if (now - lastLocalStorageSaveRef.current >= LOCAL_STORAGE_SAVE_INTERVAL_MS) {
          lastLocalStorageSaveRef.current = now;
          const intervals = loadIntervals();
          intervals.push({ start, end });
          const merged = mergeIntervals(intervals);
          saveIntervals(merged);
        }
        
        if (!currentSegmentRef.current) {
          startNewSegment(start, isPlayingRef.current ? 'play' : 'timeupdate');
        }
        currentSegmentRef.current!.endSecond = end;

        // Routine playback heartbeat
        if (now - lastHeartbeatTimeRef.current >= HEARTBEAT_INTERVAL_MS) {
          void flushHeartbeat('heartbeat');
        }
      } else if (delta < 0) {
        // Rewind (small) within the maxAllowedDelta window. The student
        // is re-watching a portion. We don't add to totalWatchedSeconds
        // (it's not *new* watch time) but we must close the current
        // segment so its endSecond stops growing, and start a new one
        // at the rewound position. Without this, a rewind + close-tab
        // would lose the segment beyond the rewind point.
        closeActiveSegment();
        startNewSegment(currentTime, 'rewind');
      }

      lastTimeRef.current = currentTime;
      lastTickWallRef.current = now;
    },
    [loadIntervals, saveIntervals, closeActiveSegment, startNewSegment, flushHeartbeat],
  );

  const onEnded = useCallback(() => {
    isPlayingRef.current = false;
    closeActiveSegment();
    void endSession();
  }, [endSession, closeActiveSegment]);

  // End active session and reset state when the canonical lesson/asset tuple changes.
  useEffect(() => {
    // Capture values from current render scope (before it changes)
    const oldCollegeSlug = collegeSlug;
    const oldLessonId = lessonIdRef.current;
    const oldModuleId = moduleIdRef.current;
    const oldCourseId = courseIdRef.current;
    const oldAssetId = tpstreamsAssetIdRef.current;
    const oldToken = playbackTokenRef.current;

    return () => {
      // Invalidate any in-flight async requests for previous lesson
      sessionRequestIdRef.current += 1;

      const sessionId = sessionIdRef.current;
      if (sessionId && oldModuleId && oldAssetId && oldToken && !hasEndedRef.current) {
        closeActiveSegment();
        const segmentsToSend = [...segmentBufferRef.current];
        if (segmentsToSend.length > 0) {
          const uniqueWatchedSeconds = getUniqueWatchedSeconds();
          const totalWatchedSeconds = totalWatchedSecondsRef.current;
          const payload = JSON.stringify({
            collegeSlug: oldCollegeSlug,
            sessionId: sessionId,
            courseId: oldCourseId,
            moduleId: oldModuleId,
            lessonId: oldLessonId,
            tpstreamsAssetId: oldAssetId,
            videoDurationSeconds: durationRef.current,
            currentTimeSeconds: lastTimeRef.current,
            playbackRate: playbackRateRef.current,
            playbackToken: oldToken,
            wallClockSeconds: Number(((Date.now() - sessionStartTimeRef.current) / 1000).toFixed(1)),
            eventType: 'session_close',
            segments: segmentsToSend,
            counts: { ...countsRef.current },
            uniqueWatchedSeconds,
            totalWatchedSeconds,
          });

          void postVideoAnalyticsHeartbeat(payload, cryptoRandomId(), {
            keepalive: true,
          });
        }

        void postVideoAnalyticsSessionEnd({
            collegeSlug: oldCollegeSlug,
            sessionId: sessionId,
            courseId: oldCourseId,
            moduleId: oldModuleId,
            lessonId: oldLessonId,
            tpstreamsAssetId: oldAssetId,
            playbackToken: oldToken,
            currentTimeSeconds: lastTimeRef.current,
          }, cryptoRandomId(), {
          keepalive: true,
        });
      }

      // Reset all ref states for the next lesson
      sessionIdRef.current = null;
      durationRef.current = 0;
      lastTimeRef.current = 0;
      sessionStartTimeRef.current = 0;
      lastHeartbeatTimeRef.current = 0;
      heartbeatBackoffUntilRef.current = 0;
      startSessionInFlightRef.current = false;
      startSessionIdentityKeyRef.current = null;
      heartbeatInFlightRef.current = false;
      rateLimitWarnedRef.current = false;
      currentSegmentRef.current = null;
      segmentBufferRef.current = [];
      countsRef.current = { play: 0, pause: 0, seek: 0, ratechange: 0 };
      playbackRateRef.current = 1.0;
      isPlayingRef.current = false;
      totalWatchedSecondsRef.current = 0;
      segmentSeqRef.current = 0;
      playerInstanceIdRef.current = cryptoRandomId();
      lastSegmentStartWallRef.current = 0;
      hasEndedRef.current = false;
      endSessionInFlightRef.current = false;
      lastTickWallRef.current = 0;
      lastFlushedPositionRef.current = 0;
    };
  }, [analyticsIdentityKey, collegeSlug, closeActiveSegment, getUniqueWatchedSeconds]);

  useEffect(() => {
    const handlePageHide = (e: PageTransitionEvent) => {
      if (e.persisted) return;
      const sessionId = sessionIdRef.current;
      const resolvedModuleIdVal = moduleIdRef.current;
      const resolvedTpAssetId = tpstreamsAssetIdRef.current;
      const resolvedToken = playbackTokenRef.current;
      if (!sessionId || !resolvedModuleIdVal || !resolvedTpAssetId || !resolvedToken) return;
      if (hasEndedRef.current) return;
      closeActiveSegment();
      if (segmentBufferRef.current.length > 0) {
        const uniqueWatchedSeconds = getUniqueWatchedSeconds();
        const totalWatchedSeconds = totalWatchedSecondsRef.current;
        const payload = JSON.stringify({
          collegeSlug: collegeSlugRef.current,
          sessionId: sessionId,
          courseId: courseIdRef.current,
          moduleId: resolvedModuleIdVal,
          lessonId: lessonIdRef.current,
          tpstreamsAssetId: resolvedTpAssetId,
          videoDurationSeconds: durationRef.current,
          currentTimeSeconds: lastTimeRef.current,
          playbackRate: playbackRateRef.current,
          playbackToken: resolvedToken,
          wallClockSeconds: Number(((Date.now() - sessionStartTimeRef.current) / 1000).toFixed(1)),
          eventType: 'pagehide',
          segments: segmentBufferRef.current,
          counts: { ...countsRef.current },
          uniqueWatchedSeconds,
          totalWatchedSeconds,
        });
        navigator.sendBeacon('/api/video-analytics/heartbeat', new Blob([payload], { type: 'application/json' }));
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isPlayingRef.current) {
        void flushHeartbeat('visibility_hidden', { force: true });
      } else if (document.visibilityState === 'visible' && isPlayingRef.current) {
        if (!currentSegmentRef.current) {
          startNewSegment(lastTimeRef.current, 'visibility_restored');
        }
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const capturedCounts = { ...countsRef.current };

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Hook unmount cleanup (client-side Next.js routing)
      const sessionId = sessionIdRef.current;
      const resolvedModuleIdVal = moduleIdRef.current;
      const resolvedTpAssetId = tpstreamsAssetIdRef.current;
      const resolvedToken = playbackTokenRef.current;
      if (sessionId && resolvedModuleIdVal && resolvedTpAssetId && resolvedToken && !hasEndedRef.current) {
        closeActiveSegment();
        const segmentsToSend = [...segmentBufferRef.current];
        if (segmentsToSend.length > 0) {
          const uniqueWatchedSeconds = getUniqueWatchedSeconds();
          const totalWatchedSeconds = totalWatchedSecondsRef.current;
          const payload = JSON.stringify({
            collegeSlug: collegeSlugRef.current,
            sessionId: sessionId,
            courseId: courseIdRef.current,
            moduleId: resolvedModuleIdVal,
            lessonId: lessonIdRef.current,
            tpstreamsAssetId: resolvedTpAssetId,
            videoDurationSeconds: durationRef.current,
            currentTimeSeconds: lastTimeRef.current,
            playbackRate: playbackRateRef.current,
            playbackToken: resolvedToken,
            wallClockSeconds: Number(((Date.now() - sessionStartTimeRef.current) / 1000).toFixed(1)),
            eventType: 'session_close',
            segments: segmentsToSend,
            counts: capturedCounts,
            uniqueWatchedSeconds,
            totalWatchedSeconds,
          });

          void postVideoAnalyticsHeartbeat(payload, cryptoRandomId(), {
            keepalive: true,
          });
        }
      }
    };
  }, [flushHeartbeat, closeActiveSegment, getUniqueWatchedSeconds, startNewSegment]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      if (segmentBufferRef.current.length > 0) {
        console.info('[TpStreamsAnalytics] Browser back online. Retrying segment flush...');
        void flushHeartbeat('heartbeat', { force: true });
      }
    };
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [flushHeartbeat]);

  return {
    startSession,
    endSession,
    onPlay,
    onPause,
    onSeek,
    onRateChange,
    onTimeUpdate,
    onEnded,
    playbackRateRef,
  };
}
