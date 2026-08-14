'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { StatsHeader } from './stats-header';
import { ActivityHeatmapContainer } from './activity-heatmap-container';
import { useCodePulseAutoSync } from './use-code-pulse-auto-sync';
import { CodePulseSyncStatus } from './code-pulse-sync-status';
import { CodingPlatform, StudentCodingStatsResult } from '@/types/student-stats';

export function CodingPulseDashboardClient({
  statsData,
}: {
  statsData: StudentCodingStatsResult;
}) {
  const router = useRouter();
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const lastRefreshAtRef = useRef(0);

  const connectedPlatforms = useMemo<CodingPlatform[]>(() => {
    const platforms: CodingPlatform[] = [];
    if (statsData.connectionStatus.github.isConnected) platforms.push('github');
    if (statsData.connectionStatus.leetcode.username) platforms.push('leetcode');
    if (statsData.connectionStatus.codeforces.handle) platforms.push('codeforces');
    if (statsData.connectionStatus.gfg.username) platforms.push('gfg');
    return platforms;
  }, [
    statsData.connectionStatus.github.isConnected,
    statsData.connectionStatus.leetcode.username,
    statsData.connectionStatus.codeforces.handle,
    statsData.connectionStatus.gfg.username,
  ]);

  const refreshStats = useCallback(() => {
    lastRefreshAtRef.current = Date.now();
    router.refresh();
  }, [router]);

  const handleBatchCommitted = useCallback(() => {
    if (Date.now() - lastRefreshAtRef.current < 2500) return;
    refreshStats();
  }, [refreshStats]);

  const { progress, pauseAutoSync, resumeAutoSync, triggerAutoSync } = useCodePulseAutoSync({
    connectedPlatforms,
    initialSyncStatus: statsData.syncStatusByPlatform,
    enabled: connectedPlatforms.length > 0 && !isManualSyncing,
    onBatchCommitted: handleBatchCommitted,
    onComplete: refreshStats,
  });

  const handleManualSyncStart = useCallback(() => {
    setIsManualSyncing(true);
    pauseAutoSync();
  }, [pauseAutoSync]);

  const handleManualSyncEnd = useCallback(() => {
    setIsManualSyncing(false);
    resumeAutoSync();
  }, [resumeAutoSync]);

  return (
    <div className="space-y-6">
      <StatsHeader
        studentName={statsData.studentName}
        studentRole="Coding Profile"
        avatarUrl={statsData.avatarUrl || undefined}
        bio={statsData.bio}
        connectionStatus={statsData.connectionStatus}
        username={statsData.username}
        usernameSet={statsData.usernameSet}
        onManualSyncStart={handleManualSyncStart}
        onManualSyncEnd={handleManualSyncEnd}
      />

      <CodePulseSyncStatus
        progress={progress}
        onRetry={triggerAutoSync}
        isManualSyncing={isManualSyncing}
      />

      <ActivityHeatmapContainer
        initialActivitiesMap={statsData.activitiesMap}
        initialYear={statsData.selectedYear}
        initialPlatform={statsData.selectedPlatform || 'combined'}
        initialAvailableYears={statsData.availableYearsByPlatform}
        initialSyncStatus={statsData.syncStatusByPlatform}
      />
    </div>
  );
}
