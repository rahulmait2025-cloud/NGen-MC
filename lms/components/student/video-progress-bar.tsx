'use client';

import { useCallback, useRef, useState, useMemo, useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';

interface VideoProgressBarProps {
  /** Unique key that changes per lesson so localStorage is scoped to a single video. */
  storageKey: string;
  /** Current playback time in seconds (from player). */
  currentTime?: number;
  /** Total video duration in seconds. */
  duration?: number;
  /** Optional CSS className. */
  className?: string;
}

type Interval = { start: number; end: number };

const EMPTY_INTERVALS: Interval[] = [];

interface SnapshotCache {
  key: string;
  raw: string | null;
  intervals: Interval[];
}

function parseIntervals(raw: string | null): Interval[] {
  if (!raw) return EMPTY_INTERVALS;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Interval[]) : EMPTY_INTERVALS;
  } catch {
    return EMPTY_INTERVALS;
  }
}

function readRaw(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Thin completion progress bar shown above the video iframe.
 *
 * We can't easily read playback position from inside a cross-origin iframe
 * (YouTube, TPStreams), so this component is best-effort:
 *  - When the parent passes `currentTime` and `duration`, the bar reflects live state.
 *  - Otherwise it falls back to the last-known interval we computed locally.
 *
 * The bar represents "watched" seconds (unique), not raw playhead position, so
 * scrubbing back and forth does not visually regress.
 */
export function VideoProgressBar({
  storageKey,
  currentTime,
  duration,
  className,
}: VideoProgressBarProps) {
  const [hovered, setHovered] = useState(false);
  const cacheRef = useRef<SnapshotCache>({ key: '', raw: null, intervals: EMPTY_INTERVALS });

  const subscribe = useCallback(
    (notify: () => void) => {
      if (typeof window === 'undefined') return () => undefined;
      const onStorage = (e: StorageEvent) => {
        if (!e.key || e.key === storageKey) notify();
      };
      const onVis = () => {
        if (document.visibilityState === 'visible') notify();
      };
      window.addEventListener('storage', onStorage);
      document.addEventListener('visibilitychange', onVis);
      return () => {
        window.removeEventListener('storage', onStorage);
        document.removeEventListener('visibilitychange', onVis);
      };
    },
    [storageKey],
  );

  const getSnapshot = useCallback((): Interval[] => {
    const cache = cacheRef.current;
    if (cache.key === storageKey) {
      const raw = readRaw(storageKey);
      if (raw === cache.raw) return cache.intervals;
      const intervals = parseIntervals(raw);
      cacheRef.current = { key: storageKey, raw, intervals };
      return intervals;
    }
    const raw = readRaw(storageKey);
    const intervals = parseIntervals(raw);
    cacheRef.current = { key: storageKey, raw, intervals };
    return intervals;
  }, [storageKey]);

  const getServerSnapshot = useCallback((): Interval[] => EMPTY_INTERVALS, []);

  const intervals = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Live mode: parent provides currentTime + duration, prefer that.
  const livePercent = useMemo(
    () =>
      typeof currentTime === 'number' && typeof duration === 'number' && duration > 0
        ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
        : null,
    [currentTime, duration],
  );

  // Fallback: compute from intervals.
  const totalWatched = intervals.reduce((sum, it) => sum + Math.max(0, it.end - it.start), 0);
  const fallbackPercent =
    typeof duration === 'number' && duration > 0
      ? Math.min(100, Math.max(0, (totalWatched / duration) * 100))
      : 0;

  const percent = livePercent ?? fallbackPercent;

  return (
    <progress
      className={cn(
        'relative h-1 w-full overflow-hidden rounded-full bg-foreground/15 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary [&::-webkit-progress-value]:transition-[width,opacity] [&::-webkit-progress-value]:duration-200 [&::-webkit-progress-value]:ease-out [&>div]:rounded-full [&>div]:bg-primary [&>div]:transition-[width,opacity] [&>div]:duration-200 [&>div]:ease-out',
        className,
      )}
      value={Math.round(percent)}
      max={100}
      aria-label="Video watch progress"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ opacity: hovered ? 1 : 0.9 }}
    />
  );
}
