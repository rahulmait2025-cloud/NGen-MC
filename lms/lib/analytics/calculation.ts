/**
 * Reusable Server-Side Analytics Calculation Utilities (Phase 3).
 *
 * Provides pure mathematical functions for interval arithmetic, normalization,
 * validation, and progress aggregation for LMS video watch analytics.
 */

import type {
  Range,
  WatchSegmentInput,
  NormalizedWatchSegment,
  VideoProgressSummary,
} from './types';

export type { Range, WatchSegmentInput, NormalizedWatchSegment, VideoProgressSummary };

/**
 * Normalizes raw watch segment input into valid floating point values with defaults.
 */
function normalizeWatchSegment(segment: WatchSegmentInput): NormalizedWatchSegment {
  let s = Math.max(0, Number(segment.startSecond) || 0);
  let e = Math.max(0, Number(segment.endSecond) || 0);

  if (s > e) {
    const temp = s;
    s = e;
    e = temp;
  }

  return {
    startSecond: Number(s.toFixed(2)),
    endSecond: Number(e.toFixed(2)),
    playbackRate: Number(segment.playbackRate) || 1.0,
    source: segment.source || 'play',
    clientSegmentId: segment.clientSegmentId ?? null,
    playerInstanceId: segment.playerInstanceId ?? null,
    clientSequence: segment.clientSequence ?? null,
    wallClockSeconds: segment.wallClockSeconds ?? (e - s),
    segmentStartedAt: segment.segmentStartedAt ?? null,
    segmentEndedAt: segment.segmentEndedAt ?? null,
  };
}

/**
 * Validates a normalized watch segment against video boundaries and physical rules.
 */
function validateWatchSegment(segment: NormalizedWatchSegment, videoDurationSeconds: number): boolean {
  if (isNaN(segment.startSecond) || isNaN(segment.endSecond)) {
    return false;
  }

  // 1. end_second must be strictly greater than start_second
  if (segment.endSecond <= segment.startSecond) {
    return false;
  }

  // 2. Segment should not exceed video duration (with 1s floating buffer)
  if (videoDurationSeconds > 0 && segment.endSecond > videoDurationSeconds + 1.0) {
    return false;
  }

  // 3. Large jumps caused by seeking or corrupt timestamps (e.g. single segment > 12 hours)
  const maxPossibleContinuousChunk = 43200; // 12 hours
  if ((segment.endSecond - segment.startSecond) > maxPossibleContinuousChunk) {
    return false;
  }

  return true;
}

/**
 * Merges overlapping or adjacent timeline ranges into a set of disjoint ranges.
 */
export function mergeRanges(ranges: Range[]): Range[] {
  if (!ranges || ranges.length === 0) return [];

  // Filter out invalid ranges and clone
  const validRanges = ranges.reduce((acc, r) => {
    if (r && typeof r.start === 'number' && typeof r.end === 'number' && r.start <= r.end) {
      acc.push({ start: r.start, end: r.end });
    }
    return acc;
  }, [] as Range[]).sort((a, b) => a.start - b.start);

  if (validRanges.length === 0) return [];

  const merged: Range[] = [validRanges[0]];

  for (let i = 1; i < validRanges.length; i++) {
    const last = merged[merged.length - 1];
    const curr = validRanges[i];

    if (curr.start <= last.end) {
      last.end = Math.max(last.end, curr.end);
    } else {
      merged.push(curr);
    }
  }

  return merged;
}

/**
 * Sums the total duration of disjoint ranges.
 */
export function sumRanges(ranges: Range[]): number {
  if (!ranges || ranges.length === 0) return 0.0;
  const total = ranges.reduce((acc, r) => acc + Math.max(0, r.end - r.start), 0.0);
  return Number(total.toFixed(2));
}

/**
 * Calculates total watched seconds across all segments (including repeat views).
 */
export function calculateTotalWatchedSeconds(segments: NormalizedWatchSegment[]): number {
  if (!segments || segments.length === 0) return 0.0;
  const total = segments.reduce((acc, s) => acc + Math.max(0, s.endSecond - s.startSecond), 0.0);
  return Number(total.toFixed(2));
}

/**
 * Calculates unique watched seconds by merging overlapping segments.
 */
function calculateUniqueWatchedSeconds(segments: NormalizedWatchSegment[]): number {
  if (!segments || segments.length === 0) return 0.0;
  const ranges: Range[] = segments.map((s) => ({ start: s.startSecond, end: s.endSecond }));
  const merged = mergeRanges(ranges);
  return sumRanges(merged);
}

/**
 * Calculates repeat watched seconds (total watched - unique watched).
 */
function calculateRepeatWatchedSeconds(segments: NormalizedWatchSegment[]): number {
  const total = calculateTotalWatchedSeconds(segments);
  const unique = calculateUniqueWatchedSeconds(segments);
  const repeat = Math.max(0, total - unique);
  return Number(repeat.toFixed(2));
}

/**
 * Calculates completion percentage based on unique watched seconds and video duration.
 */
function calculateCompletionPercentage(uniqueWatchedSeconds: number, durationSeconds: number): number {
  if (durationSeconds <= 0 || uniqueWatchedSeconds <= 0) return 0.0;
  const pct = (uniqueWatchedSeconds / durationSeconds) * 100.0;
  return Number(Math.min(100.0, Math.max(0.0, pct)).toFixed(2));
}

/**
 * Determines whether a lecture is considered completed based on threshold.
 */
function isLectureCompleted(completionPercentage: number, threshold: number = 66.0): boolean {
  return completionPercentage >= threshold;
}

/**
 * Orchestrates full progress summary calculation from raw segment inputs.
 */
function _calculateProgressSummary(segments: WatchSegmentInput[], videoDurationSeconds: number): VideoProgressSummary {
  const duration = Math.max(0, videoDurationSeconds);

  // Normalize and validate
  const validSegments = (segments || []).reduce((acc, s) => {
    const normalized = normalizeWatchSegment(s);
    if (validateWatchSegment(normalized, duration)) acc.push(normalized);
    return acc;
  }, [] as ReturnType<typeof normalizeWatchSegment>[]);

  const totalWatchedSeconds = calculateTotalWatchedSeconds(validSegments);
  const uniqueWatchedSeconds = calculateUniqueWatchedSeconds(validSegments);
  const repeatWatchedSeconds = calculateRepeatWatchedSeconds(validSegments);
  const completionPercentage = calculateCompletionPercentage(uniqueWatchedSeconds, duration);
  const completed = isLectureCompleted(completionPercentage, 66.0);

  return {
    videoDurationSeconds: Number(duration.toFixed(2)),
    totalWatchedSeconds,
    uniqueWatchedSeconds,
    repeatWatchedSeconds,
    completionPercentage,
    completed,
  };
}
