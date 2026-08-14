import 'server-only';
import { CodingPlatform, PlatformFetchResult } from '@/types/student-stats';
import { fetchGitHubActivity } from '@/lib/platform-fetchers/github';
import { fetchLeetCodeActivity } from '@/lib/platform-fetchers/leetcode';
import { fetchCodeforcesActivity } from '@/lib/platform-fetchers/codeforces';
import { fetchGFGActivity } from '@/lib/platform-fetchers/gfg';

export type FetcherContext = {
  leetcodeUsername?: string | null;
  codeforcesHandle?: string | null;
  gfgUsername?: string | null;
};

export type ProviderFetchOutcome =
  | 'success'
  | 'empty'
  | 'retryable_error'
  | 'non_retryable_error'
  | 'partial';

export type ProviderYearFetchResult = {
  platform: CodingPlatform;
  requestedYear: number;
  outcome: ProviderFetchOutcome;
  activities: Array<{
    activityDate: string;
    activityCount: number;
    points?: number;
  }>;
  accountMetadata?: {
    providerUserId?: string | null;
    accountCreatedAt?: string | null;
    earliestActivityDate?: string | null;
    latestActivityDate?: string | null;
  };
  providerCursor?: string | null;
  errorCode?: string | null;
  safeErrorMessage?: string | null;
};

export function toProviderYearFetchResult(
  platform: CodingPlatform,
  year: number,
  res: PlatformFetchResult
): ProviderYearFetchResult {
  let outcome: ProviderFetchOutcome;

  if (res.syncStatus === 'success') {
    outcome = res.activities.length > 0 ? 'success' : 'empty';
  } else if (res.syncStatus === 'empty') {
    outcome = 'empty';
  } else if (res.syncStatus === 'partial') {
    outcome = 'partial';
  } else if (res.syncStatus === 'not_configured') {
    outcome = 'non_retryable_error';
  } else {
    outcome = 'retryable_error';
  }

  return {
    platform,
    requestedYear: year,
    outcome,
    activities: res.activities.map((a) => ({
      activityDate: a.date,
      activityCount: a.activityCount,
      points: a.points,
    })),
    accountMetadata: {
      accountCreatedAt: res.accountCreatedAt,
      earliestActivityDate: res.earliestActivityDate,
      latestActivityDate: res.latestActivityDate,
    },
    errorCode: res.error ? 'FETCH_ERROR' : null,
    safeErrorMessage: res.error || null,
  };
}

export type PlatformFetcher = {
  platform: CodingPlatform;
  fetch(studentId: string, context: FetcherContext, year: number): Promise<PlatformFetchResult>;
};

const githubFetcher: PlatformFetcher = {
  platform: 'github',
  async fetch(studentId, _context, year) {
    const targetYear = year || new Date().getUTCFullYear();
    return fetchGitHubActivity(studentId, targetYear);
  },
};

const leetcodeFetcher: PlatformFetcher = {
  platform: 'leetcode',
  async fetch(studentId, context, year) {
    return fetchLeetCodeActivity(studentId, context.leetcodeUsername, year);
  },
};

const codeforcesFetcher: PlatformFetcher = {
  platform: 'codeforces',
  async fetch(studentId, context, year) {
    return fetchCodeforcesActivity(studentId, context.codeforcesHandle, year);
  },
};

const gfgFetcher: PlatformFetcher = {
  platform: 'gfg',
  async fetch(studentId, context, year) {
    return fetchGFGActivity(studentId, context.gfgUsername, year);
  },
};

const fetcherRegistry: Record<CodingPlatform, PlatformFetcher> = {
  github: githubFetcher,
  leetcode: leetcodeFetcher,
  codeforces: codeforcesFetcher,
  gfg: gfgFetcher,
};

export function getFetcher(platform: CodingPlatform): PlatformFetcher {
  const fetcher = fetcherRegistry[platform];
  if (!fetcher) {
    throw new Error(`Unknown platform: ${platform}`);
  }
  return fetcher;
}

export function getConfiguredContext(
  student: {
    leetcode_username?: string | null;
    codeforces_handle?: string | null;
    gfg_username?: string | null;
  },
  ghConnected: boolean,
): { platforms: CodingPlatform[]; context: FetcherContext } {
  const platforms: CodingPlatform[] = [];
  if (ghConnected) platforms.push('github');
  if (student.leetcode_username) platforms.push('leetcode');
  if (student.codeforces_handle) platforms.push('codeforces');
  if (student.gfg_username) platforms.push('gfg');

  return {
    platforms,
    context: {
      leetcodeUsername: student.leetcode_username,
      codeforcesHandle: student.codeforces_handle,
      gfgUsername: student.gfg_username,
    },
  };
}

export async function fetchAllConfigured(
  studentId: string,
  context: FetcherContext,
  year: number,
  platforms: CodingPlatform[],
): Promise<PlatformFetchResult[]> {
  return Promise.all(
    platforms.map((p) => fetcherRegistry[p].fetch(studentId, context, year)),
  );
}
