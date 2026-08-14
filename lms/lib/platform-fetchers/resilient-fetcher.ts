import 'server-only';
import { PlatformFetchResult, PlatformSyncStatus } from '@/types/student-stats';
import { PlatformFetcher, FetcherContext } from '@/lib/platform-fetchers/fetcher-registry';

export type ResilientFetcherOptions = {
  maxRetries?: number;
  retryDelayMs?: number;
};

export function createResilientFetcher(
  inner: PlatformFetcher,
  options: ResilientFetcherOptions = {},
): PlatformFetcher {
  const { maxRetries = 2, retryDelayMs = 1000 } = options;

  return {
    platform: inner.platform,
    async fetch(studentId: string, context: FetcherContext, year: number): Promise<PlatformFetchResult> {
      let lastError: string | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, retryDelayMs * attempt));
          }

          const result = await inner.fetch(studentId, context, year);

          if (result.success) {
            return result;
          }

          if (!result.success && attempt < maxRetries) {
            lastError = result.error || 'Unknown error';
            continue;
          }

          return result;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);

          if (attempt < maxRetries) {
            console.warn(
              `[resilient-fetcher] Retry ${attempt + 1}/${maxRetries} for ${inner.platform}: ${lastError}`,
            );
            continue;
          }
        }
      }

      return {
        platform: inner.platform,
        success: false,
        activities: [],
        syncStatus: 'failed' as PlatformSyncStatus,
        error: lastError || `Failed after ${maxRetries + 1} attempts`,
      };
    },
  };
}

export function wrapAllFetchers(
  fetchers: Record<string, PlatformFetcher>,
  options?: ResilientFetcherOptions,
): Record<string, PlatformFetcher> {
  const wrapped: Record<string, PlatformFetcher> = {};
  for (const [key, fetcher] of Object.entries(fetchers)) {
    wrapped[key] = createResilientFetcher(fetcher, options);
  }
  return wrapped;
}
