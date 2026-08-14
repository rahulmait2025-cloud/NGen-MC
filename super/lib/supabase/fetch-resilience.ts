import 'server-only';

import { logSchemaDegradation, schemaErrorInfo } from '@/lib/supabase/schema-errors';

/** Transient network/fetch failures — safe to degrade dashboard reads. */
export function isTransientSupabaseFetchError(message: string | undefined): boolean {
  const normalized = (message ?? '').toLowerCase();
  return (
    normalized.includes('fetch failed')
    || normalized.includes('typeerror: fetch')
    || normalized.includes('econnreset')
    || normalized.includes('econnrefused')
    || normalized.includes('etimedout')
    || normalized.includes('enotfound')
    || normalized.includes('eai_again')
    || normalized.includes('network timeout')
    || normalized.includes('failed to fetch')
    || normalized.includes('aborterror')
    || normalized.includes('operation was aborted')
    || normalized.includes('socket hang up')
    || normalized.includes('other side closed')
    || normalized.includes('und_err')
    || normalized.includes('connecttimeout')
    || normalized.includes('connectionerror')
    || normalized.includes('database connection failed')
  );
}

export function getSupabaseErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const parts = [err.name, err.message].filter(Boolean);
    const cause = (err as Error & { cause?: unknown }).cause;
    if (cause !== undefined) {
      parts.push(getSupabaseErrorMessage(cause));
    }
    return parts.join(': ');
  }
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

export function isTransientSupabaseError(err: unknown): boolean {
  return isTransientSupabaseFetchError(getSupabaseErrorMessage(err));
}

export function logTransientSupabaseDegradation(context: string, err: unknown): void {
  const message = getSupabaseErrorMessage(err);
  logSchemaDegradation(schemaErrorInfo(context, undefined, message));
}

const RESILIENT_FETCH_RETRIES = 3;
const RESILIENT_FETCH_BACKOFF_MS = 250;

/** Retry transient fetch failures (common during slow dev compiles / cold Supabase). */
export function createResilientFetch(maxRetries = RESILIENT_FETCH_RETRIES): typeof fetch {
  return async (input, init) => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fetch(input, init);
      } catch (err) {
        lastError = err;
        if (!isTransientSupabaseError(err) || attempt === maxRetries) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, RESILIENT_FETCH_BACKOFF_MS * (attempt + 1)));
      }
    }
    throw lastError;
  };
}
