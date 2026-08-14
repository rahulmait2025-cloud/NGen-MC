import 'server-only';
import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchGitHubActivity } from '@/lib/platform-fetchers/github';
import { fetchLeetCodeActivity } from '@/lib/platform-fetchers/leetcode';
import { fetchCodeforcesActivity } from '@/lib/platform-fetchers/codeforces';
import { fetchGFGActivity } from '@/lib/platform-fetchers/gfg';
import {
  AvailableYearsByPlatform,
  CodingPlatform,
  CombinedHeatmapDay,
  PlatformConnectionStatus,
  PlatformSyncStatus,
} from '@/types/student-stats';

type PlatformMetadataRow = {
  platform: string;
  handle_or_username: string | null;
  account_created_at: string | null;
  earliest_activity_date: string | null;
  latest_activity_date: string | null;
  metadata_synced_at: string | null;
};

function getUtcYearRange(year: number): {
  startDate: string;
  endDateExclusive: string;
} {
  return {
    startDate: `${year}-01-01`,
    endDateExclusive: `${year + 1}-01-01`,
  };
}

export function formatClarifiedPlatformError(
  platform: CodingPlatform,
  rawError: string | null | undefined,
  year: number,
  accountCreatedAt?: string | null
): string | null {
  if (!rawError) return null;

  const platformNames: Record<CodingPlatform, string> = {
    github: 'GitHub',
    leetcode: 'LeetCode',
    codeforces: 'Codeforces',
    gfg: 'GeeksforGeeks',
  };

  const name = platformNames[platform] || platform.toUpperCase();

  if (accountCreatedAt) {
    const createdYear = new Date(accountCreatedAt).getUTCFullYear();
    if (!isNaN(createdYear) && year < createdYear) {
      return null;
    }
  }

  const lower = rawError.toLowerCase();

  if (lower.includes('fetch failed') || lower.includes('failed to fetch') || lower.includes('network') || lower.includes('timeout')) {
    return `${name} service did not respond. Retry sync to reload.`;
  }
  if (lower.includes('http 404') || lower.includes('not found') || lower.includes('could not be found')) {
    return `${name} profile was not active in ${year}.`;
  }
  if (lower.includes('rate limit') || lower.includes('429')) {
    return `${name} rate limit reached. Please try again in a moment.`;
  }
  if (lower.includes('not_configured') || lower.includes('not linked')) {
    return `${name} profile is not connected.`;
  }

  const cleaned = rawError
    .replace(/^(GFG|GitHub|LeetCode|Codeforces):\s*/i, '')
    .replace(/endpoint returned HTTP \d+/i, 'service unavailable');

  return `${name}: ${cleaned}`;
}

export interface CodePulseSummaryStats {
  totalActiveDays: number;
  totalSolvedCount: number;
  platformTotals: Record<CodingPlatform, number>;
  totalPoints: number;
}

export interface CodePulseNormalizedData {
  studentId: string;
  selectedYear: number;
  selectedPlatform: CodingPlatform | 'combined';
  bio: string | null;
  resumeUrl: string | null;
  connectionStatus: PlatformConnectionStatus;
  summaryStats: CodePulseSummaryStats;
  activitiesMap: Record<string, CombinedHeatmapDay>;
  availableYearsByPlatform: AvailableYearsByPlatform;
  activityYears: number[];
  syncStatusByPlatform: Record<CodingPlatform, PlatformSyncStatus>;
  isYearFullyCached: boolean;
  platformErrors: Partial<Record<CodingPlatform, string>>;
  fetchedAt: string | null;
}

export interface CodePulseReaderParams {
  studentId: string;
  selectedYear?: number;
  selectedPlatform?: CodingPlatform | 'combined';
}

/**
 * Inner database reader for Code Pulse profiles.
 */
async function readCodePulseDataInner(
  params: CodePulseReaderParams
): Promise<CodePulseNormalizedData | null> {
  const currentUtcYear = new Date().getUTCFullYear();
  const admin = createAdminClient();

  const { data: student, error: studentError } = await admin
    .from('students')
    .select(`
      id,
      user_id,
      bio,
      github_url,
      linkedin_url,
      resume_url,
      leetcode_username,
      codeforces_handle,
      gfg_username,
      coding_stats_synced_at
    `)
    .eq('id', params.studentId)
    .maybeSingle();

  if (studentError) {
    console.error('[code-pulse-reader] Student query error:', studentError.code);
    throw new Error('Database query failed during student lookup.');
  }

  if (!student) {
    return null;
  }

  // 1. Fetch GitHub connection and platform metadata in parallel
  const [ghConnResult, metaRowsResult] = await Promise.all([
    admin
      .from('student_platform_connections')
      .select('provider_username, profile_url, connected_at, last_synced_at, last_sync_error, account_created_at, earliest_activity_date, latest_activity_date')
      .eq('student_id', student.id)
      .eq('platform', 'github')
      .is('revoked_at', null)
      .maybeSingle(),
    admin
      .from('student_platform_metadata')
      .select('platform, handle_or_username, account_created_at, earliest_activity_date, latest_activity_date, metadata_synced_at')
      .eq('student_id', student.id),
  ]);

  if (ghConnResult.error) {
    console.error('[code-pulse-reader] GitHub connection query error:', ghConnResult.error.code);
    throw new Error('Database query failed during GitHub connection lookup.');
  }

  if (metaRowsResult.error) {
    console.error('[code-pulse-reader] Platform metadata query error:', metaRowsResult.error.code);
    throw new Error('Database query failed during platform metadata lookup.');
  }

  const ghConn = ghConnResult.data;
  const metaRows = metaRowsResult.data;

  const metaMap: Record<string, PlatformMetadataRow> = {};
  if (metaRows) {
    for (const r of metaRows as PlatformMetadataRow[]) {
      metaMap[r.platform] = r;
    }
  }

  const connectionStatus: PlatformConnectionStatus = {
    github: {
      isConnected: !!ghConn,
      username: ghConn?.provider_username || null,
      profileUrl: ghConn ? (ghConn.profile_url || student.github_url || null) : null,
      connectedAt: ghConn?.connected_at || null,
      lastSyncedAt: ghConn?.last_synced_at || student.coding_stats_synced_at || null,
      accountCreatedAt: ghConn?.account_created_at || null,
      earliestActivityDate: ghConn?.earliest_activity_date || null,
      error: ghConn?.last_sync_error || null,
    },
    leetcode: {
      username: student.leetcode_username || null,
      lastSyncedAt: metaMap.leetcode?.metadata_synced_at || student.coding_stats_synced_at || null,
      accountCreatedAt: metaMap.leetcode?.account_created_at || null,
      earliestActivityDate: metaMap.leetcode?.earliest_activity_date || null,
    },
    codeforces: {
      handle: student.codeforces_handle || null,
      lastSyncedAt: metaMap.codeforces?.metadata_synced_at || student.coding_stats_synced_at || null,
      accountCreatedAt: metaMap.codeforces?.account_created_at || null,
      earliestActivityDate: metaMap.codeforces?.earliest_activity_date || null,
    },
    gfg: {
      username: student.gfg_username || null,
      lastSyncedAt: metaMap.gfg?.metadata_synced_at || student.coding_stats_synced_at || null,
      accountCreatedAt: metaMap.gfg?.account_created_at || null,
      earliestActivityDate: metaMap.gfg?.earliest_activity_date || null,
    },
    linkedin: { url: student.linkedin_url || null },
    portfolio: { url: student.resume_url || null },
  };

  const hasAnyPlatformConnected =
    connectionStatus.github.isConnected ||
    !!connectionStatus.leetcode.username ||
    !!connectionStatus.codeforces.handle ||
    !!connectionStatus.gfg.username;

  const fillMissingProviderMetadata = async (platform: CodingPlatform) => {
    const applyMetadata = (accountCreatedAt?: string | null, earliestActivityDate?: string | null) => {
      if (platform === 'github') {
        connectionStatus.github.accountCreatedAt ||= accountCreatedAt || null;
        connectionStatus.github.earliestActivityDate ||= earliestActivityDate || null;
      } else if (platform === 'leetcode') {
        connectionStatus.leetcode.accountCreatedAt ||= accountCreatedAt || null;
        connectionStatus.leetcode.earliestActivityDate ||= earliestActivityDate || null;
      } else if (platform === 'codeforces') {
        connectionStatus.codeforces.accountCreatedAt ||= accountCreatedAt || null;
        connectionStatus.codeforces.earliestActivityDate ||= earliestActivityDate || null;
      } else if (platform === 'gfg') {
        connectionStatus.gfg.accountCreatedAt ||= accountCreatedAt || null;
        connectionStatus.gfg.earliestActivityDate ||= earliestActivityDate || null;
      }
    };

    const hasMetadata =
      platform === 'github'
        ? connectionStatus.github.accountCreatedAt || connectionStatus.github.earliestActivityDate
        : platform === 'leetcode'
          ? connectionStatus.leetcode.accountCreatedAt || connectionStatus.leetcode.earliestActivityDate
          : platform === 'codeforces'
            ? connectionStatus.codeforces.accountCreatedAt || connectionStatus.codeforces.earliestActivityDate
            : connectionStatus.gfg.accountCreatedAt || connectionStatus.gfg.earliestActivityDate;

    if (hasMetadata) return;

    try {
      const result =
        platform === 'github'
          ? await fetchGitHubActivity(student.id, currentUtcYear)
          : platform === 'leetcode'
            ? await fetchLeetCodeActivity(student.id, connectionStatus.leetcode.username, currentUtcYear)
            : platform === 'codeforces'
              ? await fetchCodeforcesActivity(student.id, connectionStatus.codeforces.handle, currentUtcYear)
              : await fetchGFGActivity(student.id, connectionStatus.gfg.username, currentUtcYear);

      if (result.success) {
        applyMetadata(result.accountCreatedAt, result.earliestActivityDate);
      }
    } catch (err) {
      console.warn(`[code-pulse-reader] Provider metadata discovery failed for ${platform}:`, err);
    }
  };

  await Promise.all([
    connectionStatus.github.isConnected ? fillMissingProviderMetadata('github') : Promise.resolve(),
    connectionStatus.leetcode.username ? fillMissingProviderMetadata('leetcode') : Promise.resolve(),
    connectionStatus.codeforces.handle ? fillMissingProviderMetadata('codeforces') : Promise.resolve(),
    connectionStatus.gfg.username ? fillMissingProviderMetadata('gfg') : Promise.resolve(),
  ]);

  if (!hasAnyPlatformConnected) {
    return {
      studentId: student.id,
      selectedYear: currentUtcYear,
      selectedPlatform: 'combined',
      bio: student.bio || null,
      resumeUrl: student.resume_url || null,
      connectionStatus,
      summaryStats: {
        totalActiveDays: 0,
        totalSolvedCount: 0,
        totalPoints: 0,
        platformTotals: { github: 0, leetcode: 0, codeforces: 0, gfg: 0 },
      },
      activitiesMap: {},
      availableYearsByPlatform: {
        github: [],
        leetcode: [],
        codeforces: [],
        gfg: [],
        combined: [currentUtcYear],
      },
      activityYears: [currentUtcYear],
      syncStatusByPlatform: {
        github: 'not_configured',
        leetcode: 'not_configured',
        codeforces: 'not_configured',
        gfg: 'not_configured',
      },
      isYearFullyCached: true,
      platformErrors: {},
      fetchedAt: new Date().toISOString(),
    };
  }

  // 2. Fetch all sync states for metadata discovery
  const { data: allSyncStates } = await admin
    .from('student_platform_year_sync_state')
    .select('year, platform, status')
    .eq('student_id', student.id);

  const syncYearsByPlatform: Record<CodingPlatform, Set<number>> = {
    github: new Set(),
    leetcode: new Set(),
    codeforces: new Set(),
    gfg: new Set(),
  };

  if (allSyncStates) {
    for (const row of allSyncStates) {
      if (row.year && Number.isInteger(row.year) && row.year >= 2000 && row.year <= currentUtcYear) {
        if (row.platform && syncYearsByPlatform[row.platform as CodingPlatform]) {
          syncYearsByPlatform[row.platform as CodingPlatform].add(row.year);
        }
      }
    }
  }

  // Priority-based available year discovery (Requirement 4)
  const getPlatformMinYear = async (
    platform: CodingPlatform,
    accountCreatedAt?: string | null,
    earliestActivityDate?: string | null,
    syncYears?: Set<number>
  ): Promise<number | null> => {
    // 1. account_created_at
    if (accountCreatedAt) {
      const y = new Date(accountCreatedAt).getUTCFullYear();
      if (!isNaN(y) && y >= 2000 && y <= currentUtcYear) return y;
    }
    // 2. earliest_activity_date
    if (earliestActivityDate) {
      const y = new Date(earliestActivityDate).getUTCFullYear();
      if (!isNaN(y) && y >= 2000 && y <= currentUtcYear) return y;
    }
    // 3. Earliest year from student_platform_year_sync_state
    if (syncYears && syncYears.size > 0) {
      const minSync = Math.min(...Array.from(syncYears));
      if (minSync >= 2000 && minSync <= currentUtcYear) return minSync;
    }
    // 4. Indexed single-row activity query fallback (.order('date', { ascending: true }).limit(1))
    const { data: minActRow } = await admin
      .from('student_platform_daily_activities')
      .select('date')
      .eq('student_id', student.id)
      .eq('platform', platform)
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (minActRow && minActRow.date) {
      const y = parseInt(minActRow.date.split('-')[0], 10);
      if (!isNaN(y) && y >= 2000 && y <= currentUtcYear) return y;
    }

    return null;
  };

  const makeContinuousYearRange = (minYear: number | null): number[] => {
    const startY = minYear && minYear >= 2000 && minYear <= currentUtcYear ? minYear : currentUtcYear;
    const years: number[] = [];
    for (let y = startY; y <= currentUtcYear; y++) {
      years.push(y);
    }
    return years.reverse();
  };

  const [ghMin, lcMin, cfMin, gfgMin] = await Promise.all([
    connectionStatus.github.isConnected
      ? getPlatformMinYear(
        'github',
        connectionStatus.github.accountCreatedAt,
        connectionStatus.github.earliestActivityDate,
        syncYearsByPlatform.github
      )
      : Promise.resolve(null),
    connectionStatus.leetcode.username
      ? getPlatformMinYear(
        'leetcode',
        connectionStatus.leetcode.accountCreatedAt,
        connectionStatus.leetcode.earliestActivityDate,
        syncYearsByPlatform.leetcode
      )
      : Promise.resolve(null),
    connectionStatus.codeforces.handle
      ? getPlatformMinYear(
        'codeforces',
        connectionStatus.codeforces.accountCreatedAt,
        connectionStatus.codeforces.earliestActivityDate,
        syncYearsByPlatform.codeforces
      )
      : Promise.resolve(null),
    connectionStatus.gfg.username
      ? getPlatformMinYear(
        'gfg',
        connectionStatus.gfg.accountCreatedAt,
        connectionStatus.gfg.earliestActivityDate,
        syncYearsByPlatform.gfg
      )
      : Promise.resolve(null),
  ]);

  const availableYearsByPlatform: AvailableYearsByPlatform = {
    github: connectionStatus.github.isConnected ? makeContinuousYearRange(ghMin) : [],
    leetcode: connectionStatus.leetcode.username ? makeContinuousYearRange(lcMin) : [],
    codeforces: connectionStatus.codeforces.handle ? makeContinuousYearRange(cfMin) : [],
    gfg: connectionStatus.gfg.username ? makeContinuousYearRange(gfgMin) : [],
    combined: [],
  };

  const activeMinYears = [ghMin, lcMin, cfMin, gfgMin].filter((y): y is number => y !== null);
  const combinedMin = activeMinYears.length > 0 ? Math.min(...activeMinYears) : currentUtcYear;
  availableYearsByPlatform.combined = makeContinuousYearRange(combinedMin);

  // Validate selected platform
  let selectedPlatform: CodingPlatform | 'combined' = params.selectedPlatform || 'combined';
  if (selectedPlatform !== 'combined') {
    const isConnected =
      selectedPlatform === 'github'
        ? connectionStatus.github.isConnected
        : selectedPlatform === 'leetcode'
          ? !!connectionStatus.leetcode.username
          : selectedPlatform === 'codeforces'
            ? !!connectionStatus.codeforces.handle
            : !!connectionStatus.gfg.username;

    if (!isConnected) {
      selectedPlatform = 'combined';
    }
  }

  // Validate selected year
  const platformYears = availableYearsByPlatform[selectedPlatform] || availableYearsByPlatform.combined;
  let selectedYear = params.selectedYear;
  if (
    typeof selectedYear !== 'number' ||
    !Number.isInteger(selectedYear) ||
    !platformYears.includes(selectedYear)
  ) {
    selectedYear = platformYears.length > 0 ? platformYears[0] : currentUtcYear;
  }



  // 3. Fetch all configured platform activities live concurrently in-memory
  const [githubLiveResult, leetcodeLiveResult, codeforcesLiveResult, gfgLiveResult] = await Promise.all([
    connectionStatus.github.isConnected && (selectedPlatform === 'github' || selectedPlatform === 'combined')
      ? fetchGitHubActivity(student.id, selectedYear)
      : Promise.resolve(null),
    connectionStatus.leetcode.username && (selectedPlatform === 'leetcode' || selectedPlatform === 'combined')
      ? fetchLeetCodeActivity(student.id, connectionStatus.leetcode.username, selectedYear)
      : Promise.resolve(null),
    connectionStatus.codeforces.handle && (selectedPlatform === 'codeforces' || selectedPlatform === 'combined')
      ? fetchCodeforcesActivity(student.id, connectionStatus.codeforces.handle, selectedYear)
      : Promise.resolve(null),
    connectionStatus.gfg.username && (selectedPlatform === 'gfg' || selectedPlatform === 'combined')
      ? fetchGFGActivity(student.id, connectionStatus.gfg.username, selectedYear)
      : Promise.resolve(null),
  ]);

  // 4. Compute Sync Status by platform for selected year from live outcomes
  const syncStatusByPlatform: Record<CodingPlatform, PlatformSyncStatus> = {
    github: connectionStatus.github.isConnected ? (githubLiveResult?.syncStatus || 'failed') : 'not_configured',
    leetcode: connectionStatus.leetcode.username ? (leetcodeLiveResult?.syncStatus || 'failed') : 'not_configured',
    codeforces: connectionStatus.codeforces.handle ? (codeforcesLiveResult?.syncStatus || 'failed') : 'not_configured',
    gfg: connectionStatus.gfg.username ? (gfgLiveResult?.syncStatus || 'failed') : 'not_configured',
  };

  const platformErrors: Partial<Record<CodingPlatform, string>> = {};
  const liveResults = [
    { platform: 'github' as const, res: githubLiveResult, created: connectionStatus.github.accountCreatedAt },
    { platform: 'leetcode' as const, res: leetcodeLiveResult, created: connectionStatus.leetcode.accountCreatedAt },
    { platform: 'codeforces' as const, res: codeforcesLiveResult, created: connectionStatus.codeforces.accountCreatedAt },
    { platform: 'gfg' as const, res: gfgLiveResult, created: connectionStatus.gfg.accountCreatedAt },
  ];

  for (const item of liveResults) {
    if (item.res && !item.res.success && item.res.error) {
      const clarified = formatClarifiedPlatformError(item.platform, item.res.error, selectedYear, item.created);
      if (clarified) platformErrors[item.platform] = clarified;
    }
  }

  const configuredPlatforms: CodingPlatform[] = (['github', 'leetcode', 'codeforces', 'gfg'] as const)
    .filter((p) => syncStatusByPlatform[p] !== 'not_configured');

  const isYearFullyCached = true;

  // 5. Build daily heatmap activities & summary statistics directly from live results
  const activitiesMap: Record<string, CombinedHeatmapDay> = {};
  const platformTotals: Record<CodingPlatform, number> = {
    github: 0,
    leetcode: 0,
    codeforces: 0,
    gfg: 0,
  };
  let totalSolvedCount = 0;
  let totalPoints = 0;

  const processLiveActivities = (platform: CodingPlatform, acts: any) => {
    if (!acts) return;
    for (const act of acts) {
      if (!activitiesMap[act.date]) {
        const [y, m, d] = act.date.split('-').map(Number);
        const dateObj = new Date(Date.UTC(y, m - 1, d));
        activitiesMap[act.date] = {
          date: act.date,
          formattedDate: dateObj.toLocaleDateString('en-US', {
            timeZone: 'UTC',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          githubCount: 0,
          leetcodeCount: 0,
          codeforcesCount: 0,
          gfgCount: 0,
          totalPoints: 0,
        };
      }

      if (platform === 'github') activitiesMap[act.date].githubCount += act.activityCount;
      else if (platform === 'leetcode') activitiesMap[act.date].leetcodeCount += act.activityCount;
      else if (platform === 'codeforces') activitiesMap[act.date].codeforcesCount += act.activityCount;
      else if (platform === 'gfg') activitiesMap[act.date].gfgCount += act.activityCount;

      activitiesMap[act.date].totalPoints += act.points;
      platformTotals[platform] += act.activityCount;
      totalSolvedCount += act.activityCount;
      totalPoints += act.points;
    }
  };

  if (githubLiveResult?.success) processLiveActivities('github', githubLiveResult.activities);
  if (leetcodeLiveResult?.success) processLiveActivities('leetcode', leetcodeLiveResult.activities);
  if (codeforcesLiveResult?.success) processLiveActivities('codeforces', codeforcesLiveResult.activities);
  if (gfgLiveResult?.success) processLiveActivities('gfg', gfgLiveResult.activities);

  const activeDatesSet = new Set<string>();
  for (const [dateKey, dayData] of Object.entries(activitiesMap)) {
    const totalDayCount =
      dayData.githubCount + dayData.leetcodeCount + dayData.codeforcesCount + dayData.gfgCount;
    if (totalDayCount > 0) {
      activeDatesSet.add(dateKey);
    }
  }

  const summaryStats: CodePulseSummaryStats = {
    totalActiveDays: activeDatesSet.size,
    totalSolvedCount,
    platformTotals,
    totalPoints,
  };

  const activityYears = availableYearsByPlatform.combined;

  return {
    studentId: student.id,
    selectedYear,
    selectedPlatform,
    bio: student.bio || null,
    resumeUrl: student.resume_url || null,
    connectionStatus,
    summaryStats,
    activitiesMap,
    availableYearsByPlatform,
    activityYears,
    syncStatusByPlatform,
    isYearFullyCached,
    platformErrors,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Shared server reader wrapped with React.cache for request-level deduplication.
 */
export const readCodePulseData = cache(async function readCodePulseData(
  params: CodePulseReaderParams
): Promise<CodePulseNormalizedData | null> {
  return readCodePulseDataInner(params);
});
