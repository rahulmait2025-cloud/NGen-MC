'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { CodingPlatform, PlatformSyncStatus } from '@/types/student-stats';
import {
  getStudentCodePulseImportStatus,
  importStudentPlatformBatch,
} from '@/lib/actions/coding-stats-actions';
import { getSafeProviderErrorMessage } from '@/lib/platform-fetchers/provider-error-presentation';
import { summarizeCommittedImports } from '@/lib/platform-fetchers/platform-year-commit';

export type CodePulseImportProgressStatus =
  | 'idle'
  | 'checking'
  | 'importing'
  | 'paused'
  | 'complete'
  | 'partial'
  | 'failed'
  | 'migration_required';

export type CodePulseImportProgress = {
  activePlatform: CodingPlatform | null;
  completedYears: number;
  totalYears: number;
  processedYears: number[];
  importedYearCount: number;
  importedProblemCount: number;
  importLog: Array<{
    platform: CodingPlatform;
    year: number;
    status: string;
    committed: boolean;
    activityCount: number;
    message?: string;
  }>;
  status: CodePulseImportProgressStatus;
  message: string | null;
  connectedPlatforms?: CodingPlatform[];
  platformStatuses?: Record<CodingPlatform, { remainingYears: number; isComplete: boolean; hasErrors: boolean }>;
};

export type CodePulseAutoSyncResult = {
  isComplete: boolean;
  hasErrors: boolean;
  completedPlatforms: CodingPlatform[];
  failedPlatforms: CodingPlatform[];
};

export type UseCodePulseAutoSyncOptions = {
  connectedPlatforms: CodingPlatform[];
  initialSyncStatus: Record<CodingPlatform, PlatformSyncStatus>;
  enabled?: boolean;
  onBatchCommitted?: () => void | Promise<void>;
  onComplete?: (result: CodePulseAutoSyncResult) => void;
  onError?: (result: CodePulseAutoSyncResult) => void;
};

export function useCodePulseAutoSync({
  connectedPlatforms,
  initialSyncStatus: _initialSyncStatus,
  enabled = true,
  onBatchCommitted,
  onComplete,
  onError,
}: UseCodePulseAutoSyncOptions) {
  const [progress, setProgress] = useState<CodePulseImportProgress>({
    activePlatform: null,
    completedYears: 0,
    totalYears: 0,
    processedYears: [],
    importedYearCount: 0,
    importedProblemCount: 0,
    importLog: [],
    status: 'idle',
    message: null,
  });

  const attemptedYearsByPlatform = useRef<Map<CodingPlatform, Set<number>>>(new Map());
  const importLogRef = useRef<CodePulseImportProgress['importLog']>([]);
  const importedYearCountRef = useRef(0);
  const importedProblemCountRef = useRef(0);
  const consecutiveNoProgressMap = useRef<Map<CodingPlatform, number>>(new Map());
  const batchCountRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const isManualSyncingRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const runSyncStepRef = useRef<() => Promise<void>>(null);

  const getAttemptedYears = (platform: CodingPlatform): number[] => {
    const set = attemptedYearsByPlatform.current.get(platform);
    return set ? Array.from(set) : [];
  };

  const recordAttemptedYears = (platform: CodingPlatform, years: number[]) => {
    let set = attemptedYearsByPlatform.current.get(platform);
    if (!set) {
      set = new Set<number>();
      attemptedYearsByPlatform.current.set(platform, set);
    }
    for (const y of years) {
      set.add(y);
    }
  };

  const clearSessionState = useCallback(() => {
    attemptedYearsByPlatform.current.clear();
    importLogRef.current = [];
    importedYearCountRef.current = 0;
    importedProblemCountRef.current = 0;
    consecutiveNoProgressMap.current.clear();
    batchCountRef.current = 0;
  }, []);

  const runSyncStep = useCallback(async () => {
    if (!enabled || isPausedRef.current || isRunningRef.current || isManualSyncingRef.current) {
      return;
    }

    if (typeof window !== 'undefined' && !navigator.onLine) {
      setProgress((prev) => ({
        ...prev,
        status: 'paused',
        message: 'Coding history import paused while offline',
      }));
      return;
    }

    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    isRunningRef.current = true;

    try {
      // 1. Fetch current persisted import status from server
      const statusRes = await getStudentCodePulseImportStatus();
      if (!statusRes.success) {
        isRunningRef.current = false;
        return;
      }

      // Compute dynamic session batch cap
      let totalRemainingYears = 0;
      for (const plat of statusRes.connectedPlatforms) {
        const info = statusRes.platformStatuses[plat];
        if (info) totalRemainingYears += info.remainingYears;
      }
      const expectedBatches = Math.ceil(totalRemainingYears / 2);
      const sessionBatchLimit = Math.min(
        Math.max(expectedBatches + statusRes.connectedPlatforms.length * 2, 20),
        60
      );

      if (batchCountRef.current >= sessionBatchLimit) {
        setProgress((prev) => ({
          ...prev,
          status: 'partial',
          message: 'Import paused after maximum session batches. Reload page to continue.',
        }));
        isRunningRef.current = false;
        return;
      }

      if (statusRes.overallComplete) {
        setProgress({
          activePlatform: null,
          completedYears: 0,
          totalYears: 0,
          processedYears: [],
          importedYearCount: importedYearCountRef.current,
          importedProblemCount: importedProblemCountRef.current,
          importLog: importLogRef.current,
          status: 'complete',
          message: importLogRef.current.length > 0
            ? `Coding history imported: ${importedYearCountRef.current} years, ${importedProblemCountRef.current} problems`
            : 'Coding history is up to date',
        });
        onComplete?.({
          isComplete: true,
          hasErrors: false,
          completedPlatforms: connectedPlatforms,
          failedPlatforms: [],
        });
        isRunningRef.current = false;
        return;
      }

      // 2. Select next incomplete connected platform
      const activePlatforms = statusRes.connectedPlatforms.length > 0 ? statusRes.connectedPlatforms : connectedPlatforms;
      let targetPlatform: CodingPlatform | null = null;
      let targetStatusInfo = null;

      for (const plat of activePlatforms) {
        const platInfo = statusRes.platformStatuses[plat];
        const noProgressCount = consecutiveNoProgressMap.current.get(plat) || 0;

        if (platInfo && !platInfo.isComplete && noProgressCount < 2) {
          targetPlatform = plat;
          targetStatusInfo = platInfo;
          break;
        }
      }

      if (!targetPlatform || !targetStatusInfo) {
        // All active platforms are either complete or hit session no-progress limit
        setProgress((prev) => ({
          ...prev,
          status: 'idle',
          message: null,
        }));
        isRunningRef.current = false;
        return;
      }

      const platformLabels: Record<CodingPlatform, string> = {
        github: 'GitHub',
        leetcode: 'LeetCode',
        codeforces: 'Codeforces',
        gfg: 'GeeksforGeeks',
      };

      const platLabel = platformLabels[targetPlatform] || targetPlatform;
      const completedYears = targetStatusInfo.completedYears;
      const totalYears = targetStatusInfo.totalYears;

      setProgress({
        activePlatform: targetPlatform,
        completedYears,
        totalYears,
        processedYears: getAttemptedYears(targetPlatform),
        importedYearCount: importedYearCountRef.current,
        importedProblemCount: importedProblemCountRef.current,
        importLog: importLogRef.current,
        status: 'importing',
        message: totalYears > 0
          ? `Importing ${platLabel} history: ${completedYears} of ${totalYears} years`
          : `Importing ${platLabel} history…`,
      });

      // 3. Execute bounded batch request
      const attemptedYears = getAttemptedYears(targetPlatform);
      const batchRes = await importStudentPlatformBatch(targetPlatform, 2, attemptedYears);
      batchCountRef.current++;

      const batchLog = (batchRes.results || []).map((result) => ({
        platform: targetPlatform,
        year: result.year,
        status: result.status,
        committed: result.committed,
        activityCount: typeof result.activityCount === 'number' && Number.isFinite(result.activityCount) ? result.activityCount : 0,
        message: result.message,
      }));

      if (batchLog.length > 0) {
        importLogRef.current = [...batchLog, ...importLogRef.current].slice(0, 20);
        const imported = summarizeCommittedImports(batchLog);
        importedYearCountRef.current = (Number.isFinite(importedYearCountRef.current) ? importedYearCountRef.current : 0) + imported.yearCount;
        importedProblemCountRef.current = (Number.isFinite(importedProblemCountRef.current) ? importedProblemCountRef.current : 0) + imported.activityCount;
        const last = batchLog[0];
        setProgress((prev) => ({
          ...prev,
          activePlatform: targetPlatform,
          completedYears: batchRes.completedYears,
          totalYears: batchRes.totalYears,
          processedYears: batchRes.processedYears,
          importedYearCount: importedYearCountRef.current,
          importedProblemCount: importedProblemCountRef.current,
          importLog: importLogRef.current,
          status: 'importing',
          message: `${platLabel} ${last.year} imported: ${last.activityCount} problems (${batchRes.remainingYears} years left)`,
        }));
      }

      // Check for migration_required status
      const migrationRequired = batchRes.results?.some((r) => r.status === 'migration_required');
      if (migrationRequired) {
        const safeErr = getSafeProviderErrorMessage('migration_required', targetPlatform);
        setProgress((prev) => ({
          ...prev,
          status: 'migration_required',
          message: safeErr.message,
        }));
        isPausedRef.current = true;
        isRunningRef.current = false;
        return;
      }

      // Check for rate limit or non-retryable errors
      const hasRateLimit = batchRes.results?.some((r) => r.errorCode === 'rate_limit');
      if (hasRateLimit) {
        // Pause platform for session
        consecutiveNoProgressMap.current.set(targetPlatform, 99);
      }

      if (batchRes.processedYears.length > 0) {
        recordAttemptedYears(targetPlatform, batchRes.processedYears);
        if (!hasRateLimit) {
          consecutiveNoProgressMap.current.set(targetPlatform, 0);
        }
      } else {
        const prevCount = consecutiveNoProgressMap.current.get(targetPlatform) || 0;
        consecutiveNoProgressMap.current.set(targetPlatform, prevCount + 1);
      }

      // 4. Refresh UI data after committed batch
      if (batchRes.didCommit && onBatchCommitted) {
        await onBatchCommitted();
      }

      isRunningRef.current = false;

      // 5. Schedule next step with cooperative delay if session allows
      if (batchCountRef.current < sessionBatchLimit && !isPausedRef.current) {
        timerRef.current = setTimeout(() => {
          runSyncStepRef.current?.();
        }, 350);
      }
    } catch (err) {
      console.error('[useCodePulseAutoSync] Auto-sync step error:', err);
      isRunningRef.current = false;
      onError?.({
        isComplete: false,
        hasErrors: true,
        completedPlatforms: [],
        failedPlatforms: connectedPlatforms,
      });
    }
  }, [connectedPlatforms, enabled, onBatchCommitted, onComplete, onError]);

  useEffect(() => {
    runSyncStepRef.current = runSyncStep;
  }, [runSyncStep]);

  const pauseAutoSync = useCallback(() => {
    isPausedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const resumeAutoSync = useCallback(() => {
    isPausedRef.current = false;
    if (!isRunningRef.current) {
      runSyncStepRef.current?.();
    }
  }, []);

  const triggerAutoSync = useCallback(() => {
    clearSessionState();
    isPausedRef.current = false;
    if (!isRunningRef.current) {
      runSyncStepRef.current?.();
    }
  }, [clearSessionState]);

  // Window event listeners for online/offline, visibilitychange, focus
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      isPausedRef.current = false;
      if (!isRunningRef.current) {
        runSyncStepRef.current?.();
      }
    };

    const handleOffline = () => {
      isPausedRef.current = true;
      setProgress((prev) => ({
        ...prev,
        status: 'paused',
        message: 'Coding history import paused while offline',
      }));
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPausedRef.current = true;
      } else {
        isPausedRef.current = false;
        if (!isRunningRef.current) {
          runSyncStepRef.current?.();
        }
      }
    };

    const handleFocus = () => {
      isPausedRef.current = false;
      if (!isRunningRef.current) {
        runSyncStepRef.current?.();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Mount effect: Kick off auto-sync if enabled and work remains
  useEffect(() => {
    if (enabled && connectedPlatforms.length > 0) {
      const timeoutId = setTimeout(() => {
        runSyncStepRef.current?.();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [enabled, connectedPlatforms]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    progress,
    pauseAutoSync,
    resumeAutoSync,
    triggerAutoSync,
  };
}
