import { CodingPlatform } from '@/types/student-stats';

export type SafeErrorCategory =
  | 'timeout'
  | 'rate_limit'
  | 'invalid_username'
  | 'connection_expired'
  | 'migration_required'
  | 'network_error'
  | 'provider_unavailable'
  | 'unknown';

export interface SafePresentationError {
  category: SafeErrorCategory;
  message: string;
  retryable: boolean;
}

/**
 * Map raw provider errors or codes into safe, non-sensitive presentation messages.
 * Never exposes raw tokens, headers, DB queries, RPC names, stack traces, or internal IDs.
 */
export function getSafeProviderErrorMessage(
  rawError: string | null | undefined,
  platform?: CodingPlatform | null,
  errorCode?: string | null
): SafePresentationError {
  const errStr = (rawError || '').toLowerCase();
  const code = (errorCode || '').toLowerCase();
  const platName = platform
    ? platform === 'github'
      ? 'GitHub'
      : platform === 'leetcode'
      ? 'LeetCode'
      : platform === 'codeforces'
      ? 'Codeforces'
      : 'GeeksforGeeks'
    : 'Coding platform';

  if (errStr.includes('migration_required') || code === 'migration_required') {
    return {
      category: 'migration_required',
      message: 'Coding history sync is temporarily unavailable. Existing activity is safe.',
      retryable: false,
    };
  }

  if (errStr.includes('rate limit') || errStr.includes('429') || errStr.includes('too many requests') || code === 'rate_limit') {
    return {
      category: 'rate_limit',
      message: `${platName} temporarily limited requests. Try again later.`,
      retryable: false,
    };
  }

  if (errStr.includes('timeout') || errStr.includes('etimedout') || errStr.includes('504') || code === 'timeout') {
    return {
      category: 'timeout',
      message: `${platName} is taking longer than expected. Sync will resume later.`,
      retryable: true,
    };
  }

  if (
    errStr.includes('not found') ||
    errStr.includes('invalid username') ||
    errStr.includes('user not found') ||
    errStr.includes('handle not found') ||
    code === 'invalid_username'
  ) {
    return {
      category: 'invalid_username',
      message: `${platName} username not found. Check username and save again.`,
      retryable: false,
    };
  }

  if (
    errStr.includes('connection expired') ||
    errStr.includes('revoked') ||
    errStr.includes('unauthorized') ||
    errStr.includes('reconnect') ||
    code === 'connection_expired'
  ) {
    return {
      category: 'connection_expired',
      message: `${platName} connection expired. Reconnect ${platName}.`,
      retryable: false,
    };
  }

  if (errStr.includes('network') || errStr.includes('offline') || errStr.includes('failed to fetch')) {
    return {
      category: 'network_error',
      message: 'Connection issue detected. Sync will resume when back online.',
      retryable: true,
    };
  }

  if (errStr.includes('500') || errStr.includes('502') || errStr.includes('503') || errStr.includes('service unavailable')) {
    return {
      category: 'provider_unavailable',
      message: `${platName} service is temporarily unavailable. Will try again later.`,
      retryable: true,
    };
  }

  return {
    category: 'unknown',
    message: `${platName} history import encountered a temporary issue.`,
    retryable: true,
  };
}
