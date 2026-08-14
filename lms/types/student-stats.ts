export type CodingPlatform = 'github' | 'leetcode' | 'codeforces' | 'gfg';

export type PlatformSyncStatus =
  | 'success'
  | 'empty'
  | 'partial'
  | 'failed'
  | 'pending'
  | 'uncached'
  | 'not_configured';

export interface DailyPlatformActivity {
  date: string; // ISO format 'YYYY-MM-DD'
  platform: CodingPlatform;
  activityCount: number;
  points: number;
}

export interface CombinedHeatmapDay {
  date: string; // ISO format 'YYYY-MM-DD'
  formattedDate: string;
  githubCount: number;
  leetcodeCount: number;
  codeforcesCount: number;
  gfgCount: number;
  totalPoints: number;
}

export interface CodePulseSummaryStats {
  totalActiveDays: number;
  totalSolvedCount: number;
  platformTotals: Record<CodingPlatform, number>;
  totalPoints: number;
}

export interface AvailableYearsByPlatform {
  combined: number[];
  github: number[];
  leetcode: number[];
  codeforces: number[];
  gfg: number[];
}

export interface PlatformConnectionStatus {
  github: {
    isConnected: boolean;
    username: string | null;
    profileUrl: string | null;
    connectedAt: string | null;
    lastSyncedAt: string | null;
    accountCreatedAt: string | null;
    earliestActivityDate: string | null;
    error: string | null;
  };
  leetcode: {
    username: string | null;
    lastSyncedAt: string | null;
    accountCreatedAt: string | null;
    earliestActivityDate: string | null;
  };
  codeforces: {
    handle: string | null;
    lastSyncedAt: string | null;
    accountCreatedAt: string | null;
    earliestActivityDate: string | null;
  };
  gfg: {
    username: string | null;
    lastSyncedAt: string | null;
    accountCreatedAt: string | null;
    earliestActivityDate: string | null;
  };
  linkedin?: {
    url: string | null;
  };
  portfolio?: {
    url: string | null;
  };
}

export interface PlatformFetchResult {
  platform: CodingPlatform;
  success: boolean;
  activities: DailyPlatformActivity[];
  syncStatus: PlatformSyncStatus;
  accountCreatedAt?: string | null;
  earliestActivityDate?: string | null;
  latestActivityDate?: string | null;
  error?: string;
}

export interface CodingStatsSyncResult {
  success: boolean;
  cooldownActive?: boolean;
  nextSyncAvailableInSeconds?: number;
  syncedAt?: string;
  platformResults: Record<CodingPlatform, { success: boolean; count: number; syncStatus: PlatformSyncStatus; error?: string }>;
  error?: string;
}

export interface StudentCodingStatsResult {
  studentId: string;
  studentName: string;
  avatarUrl: string | null;
  username: string | null;
  usernameSet: boolean;
  bio: string | null;
  resumeUrl: string | null;
  connectionStatus: PlatformConnectionStatus;
  summaryStats: CodePulseSummaryStats;
  activitiesMap: Record<string, CombinedHeatmapDay>;
  selectedYear: number;
  selectedPlatform?: CodingPlatform | 'combined';
  availableYearsByPlatform: AvailableYearsByPlatform;
  activityYears: number[];
  syncStatusByPlatform: Record<CodingPlatform, PlatformSyncStatus>;
  isYearFullyCached: boolean;
  platformErrors?: Partial<Record<CodingPlatform, string>>;
  warnings?: string[];
  fetchedAt?: string | null;
}

export interface PublicCodingPlatformLinks {
  github: {
    username: string | null;
    profileUrl: string | null;
  };
  leetcode: {
    username: string | null;
    profileUrl: string | null;
  };
  codeforces: {
    handle: string | null;
    profileUrl: string | null;
  };
  gfg: {
    username: string | null;
    profileUrl: string | null;
  };
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  resumeUrl: string | null;
}

export interface PublicStudentCodingProfileResult {
  username: string;
  studentName: string;
  avatarUrl: string | null;
  bio: string | null;
  platformLinks: PublicCodingPlatformLinks;
  summaryStats: CodePulseSummaryStats;
  activitiesMap: Record<string, CombinedHeatmapDay>;
  selectedYear: number;
  selectedPlatform?: CodingPlatform | 'combined';
  availableYearsByPlatform: AvailableYearsByPlatform;
  activityYears: number[];
}

export interface PlatformProfileInputs {
  bio?: string;
  githubUrl?: string;
  leetcodeUsername?: string;
  codeforcesHandle?: string;
  gfgUsername?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
}

export interface PlatformProgressSummary {
  platform: CodingPlatform;
  totalYears: number;
  completedYears: number;
  failedYears: number;
  importingYears: number;
  isComplete: boolean;
}

export type PlatformYearImportStatus =
  | 'success'
  | 'empty'
  | 'failed'
  | 'partial'
  | 'stale_account'
  | 'already_completed'
  | 'migration_required';

export interface PlatformYearImportResult {
  year: number;
  status: PlatformYearImportStatus;
  committed: boolean;
  activityCount: number;
  retryable: boolean;
  errorCode?: string;
  message?: string;
}

export interface PlatformImportBatchResult {
  ok?: boolean;
  platform: CodingPlatform;
  requestedYears?: number[];
  results?: PlatformYearImportResult[];
  processedYears: number[];
  completedYears: number;
  completedYearList?: number[];
  failedYears?: number[];
  pendingYears?: number[];
  totalYears: number;
  remainingYears: number;
  didCommit?: boolean;
  isComplete: boolean;
  hasErrors: boolean;
  hasRetryableErrors?: boolean;
  hasNonRetryableErrors?: boolean;
  syncStatusByPlatform?: Record<CodingPlatform, PlatformSyncStatus>;
  activitiesMap?: Record<string, CombinedHeatmapDay>;
  sanitizedError?: string;
}
