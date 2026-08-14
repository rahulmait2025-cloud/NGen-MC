'use client';

import React from 'react';
import { CodingPlatform } from '@/types/student-stats';
import { CodePulseImportProgress } from './use-code-pulse-auto-sync';

interface CodePulseSyncStatusProps {
  progress: CodePulseImportProgress;
  onRetry?: (platform?: CodingPlatform) => void;
  isManualSyncing?: boolean;
}

export function CodePulseSyncStatus({
  progress,
  onRetry,
  isManualSyncing,
}: CodePulseSyncStatusProps) {
  const {
    status,
    activePlatform,
    processedYears,
    completedYears,
    totalYears,
    message,
    platformStatuses,
    connectedPlatforms,
    importedYearCount,
    importedProblemCount,
    importLog,
  } = progress;

  const hasImportLog = (importLog || []).length > 0;
  const currentProcessingYear = processedYears && processedYears.length > 0 ? processedYears[0] : null;

  // 1. Migration Required Banner (Safe message only)
  if (status === 'migration_required') {
    return (
      <div
        className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300 backdrop-blur-sm"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-medium">
            Coding history sync is temporarily unavailable. Existing activity is safe.
          </span>
        </div>
      </div>
    );
  }

  // Helper for platform labels
  const formatPlat = (p: CodingPlatform) =>
    p === 'github' ? 'GitHub' : p === 'leetcode' ? 'LeetCode' : p === 'codeforces' ? 'Codeforces' : 'GFG';

  // Format main status text
  let statusText = message;
  if (status === 'importing' && activePlatform && currentProcessingYear) {
    statusText = `Importing ${formatPlat(activePlatform)} history (${currentProcessingYear}) — ${completedYears} of ${totalYears} years`;
  } else if (status === 'checking') {
    statusText = activePlatform ? `Checking ${formatPlat(activePlatform)} status…` : 'Checking coding history status…';
  }

  // Do not render banner when history is complete, up to date, or idle
  if (status === 'complete' || status === 'idle' || !statusText) {
    return null;
  }

  const isWorking = status === 'importing' || status === 'checking' || isManualSyncing;
  const tone = isWorking
    ? 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300'
    : status === 'paused'
      ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : status === 'partial' || status === 'failed'
        ? 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';

  return (
    <div
      className={`mb-4 rounded-2xl border px-4 py-3 shadow-2xs backdrop-blur-md transition-all duration-300 ${tone}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Main Status Indicator */}
        <div className="flex items-center gap-2.5">
          {isWorking ? (
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
            </span>
          ) : status === 'paused' ? (
            <span className="h-3 w-3 rounded-full bg-amber-400"></span>
          ) : status === 'partial' || status === 'failed' ? (
            <span className="h-3 w-3 rounded-full bg-rose-400"></span>
          ) : (
            <span className="h-3 w-3 rounded-full bg-emerald-400"></span>
          )}

          <span className="text-sm font-semibold">
            {statusText}
          </span>
        </div>

        {/* Retry Action if partial/failed */}
        {(status === 'partial' || status === 'failed') && onRetry && !isManualSyncing && (
          <button
            onClick={() => onRetry()}
            className="inline-flex items-center gap-1.5 rounded-full border border-current/25 bg-background/70 px-3 py-1 text-xs font-semibold transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-current/30"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry Pending Syncs
          </button>
        )}
      </div>

      {hasImportLog && (
        <div className="mt-3 grid gap-3 border-t border-current/10 pt-3 sm:grid-cols-[auto_1fr]">
          <div className="grid grid-cols-2 gap-2 sm:w-52">
            <div className="rounded-xl border border-current/15 bg-background/60 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Years imported</div>
              <div className="text-lg font-black text-foreground">
                {Number.isFinite(importedYearCount) ? importedYearCount : 0}
              </div>
            </div>
            <div className="rounded-xl border border-current/15 bg-background/60 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Problems</div>
              <div className="text-lg font-black text-foreground">
                {Number.isFinite(importedProblemCount) ? importedProblemCount : 0}
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-current/15 bg-background/60 p-2">
            <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide opacity-70">Latest imported years</div>
            <div className="flex flex-wrap gap-1.5">
              {importLog.slice(0, 8).map((item) => {
                const isError = !item.committed && item.status !== 'empty';
                const safeActivityCount = Number.isFinite(item.activityCount) ? item.activityCount : 0;
                const safeYear = Number.isFinite(item.year) ? item.year : '';
                return (
                  <span
                    key={`${item.platform}-${item.year}-${item.status}`}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${
                      isError
                        ? 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                        : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    }`}
                    title={item.message || `${formatPlat(item.platform)} ${safeYear}`}
                  >
                    {formatPlat(item.platform)} {safeYear}: {safeActivityCount} problems
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Per-Platform Badges */}
      {connectedPlatforms && connectedPlatforms.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-current/10 pt-2.5">
          {connectedPlatforms.map((plat: CodingPlatform) => {
            const info = platformStatuses?.[plat];
            const isCurrentActive = activePlatform === plat && status === 'importing';

            let badgeBg = 'bg-background/60 text-muted-foreground border-border/70';
            let badgeText = 'Not Connected';

            if (info) {
              if (isCurrentActive) {
                badgeBg = 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25';
                badgeText = `Importing ${currentProcessingYear || ''}`;
              } else if (info.isComplete) {
                badgeBg = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25';
                badgeText = 'Complete';
              } else if (info.hasErrors) {
                badgeBg = 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25';
                badgeText = 'Retry available';
              } else if (info.remainingYears > 0) {
                badgeBg = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25';
                badgeText = `${info.remainingYears} yrs left`;
              }
            }

            return (
              <div
                key={plat}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badgeBg}`}
              >
                <span className="font-semibold text-foreground">{formatPlat(plat)}:</span>
                <span>{badgeText}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
