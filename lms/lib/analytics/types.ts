/**
 * Type definitions for LMS Video Analytics Calculation Service.
 */

export interface Range {
  start: number;
  end: number;
}

export interface WatchSegmentInput {
  startSecond: number;
  endSecond: number;
  playbackRate?: number;
  source?: string;
  clientSegmentId?: string;
  playerInstanceId?: string;
  clientSequence?: number;
  wallClockSeconds?: number;
  segmentStartedAt?: string;
  segmentEndedAt?: string;
}

export interface NormalizedWatchSegment {
  startSecond: number;
  endSecond: number;
  playbackRate: number;
  source: string;
  clientSegmentId: string | null;
  playerInstanceId: string | null;
  clientSequence: number | null;
  wallClockSeconds: number;
  segmentStartedAt: string | null;
  segmentEndedAt: string | null;
}

export interface VideoProgressSummary {
  videoDurationSeconds: number;
  totalWatchedSeconds: number;
  uniqueWatchedSeconds: number;
  repeatWatchedSeconds: number;
  completionPercentage: number;
  completed: boolean;
}

export interface VideoAnalyticsHeartbeatPayload {
  sessionId: string;
  studentId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  tpstreamsAssetId: string;
  videoDurationSeconds: number;
  lastPositionSeconds: number;
  segments: WatchSegmentInput[];
}
