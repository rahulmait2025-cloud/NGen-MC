export type PlatformYearCommitStatus =
  | 'success'
  | 'empty'
  | 'failed'
  | 'partial'
  | 'stale_account'
  | 'migration_required';

export type PlatformYearCommitResult = {
  success: boolean;
  status: PlatformYearCommitStatus;
  committed: boolean;
  activityCount: number;
  error?: string;
};

type PlatformAccountMetadata = {
  accountCreatedAt?: string | null;
  earliestActivityDate?: string | null;
  latestActivityDate?: string | null;
};

const COMMIT_STATUSES = new Set<PlatformYearCommitStatus>([
  'success',
  'empty',
  'failed',
  'partial',
  'stale_account',
  'migration_required',
]);

export function toRpcAccountMetadata(metadata?: PlatformAccountMetadata | null) {
  if (!metadata) return null;

  return {
    account_created_at: metadata.accountCreatedAt ?? null,
    earliest_activity_date: metadata.earliestActivityDate ?? null,
    latest_activity_date: metadata.latestActivityDate ?? null,
  };
}

export function normalizePlatformYearCommitResult(value: unknown): PlatformYearCommitResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  if (
    typeof raw.success !== 'boolean' ||
    typeof raw.committed !== 'boolean' ||
    typeof raw.status !== 'string' ||
    !COMMIT_STATUSES.has(raw.status as PlatformYearCommitStatus)
  ) {
    return null;
  }

  const activityCount =
    typeof raw.activity_count === 'number' && Number.isFinite(raw.activity_count)
      ? Math.max(0, raw.activity_count)
      : 0;

  return {
    success: raw.success,
    status: raw.status as PlatformYearCommitStatus,
    committed: raw.committed,
    activityCount,
    ...(typeof raw.error === 'string' ? { error: raw.error } : {}),
  };
}

export function summarizeCommittedImports(
  results: Array<{ committed: boolean; activityCount: unknown }>,
): { yearCount: number; activityCount: number } {
  return results.reduce(
    (summary, result) => {
      if (!result.committed) return summary;

      summary.yearCount += 1;
      if (typeof result.activityCount === 'number' && Number.isFinite(result.activityCount)) {
        summary.activityCount += Math.max(0, result.activityCount);
      }
      return summary;
    },
    { yearCount: 0, activityCount: 0 },
  );
}
