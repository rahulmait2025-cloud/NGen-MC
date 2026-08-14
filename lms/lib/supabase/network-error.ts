export interface ErrorLike {
  message?: string | null;
  name?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
}

const SUPABASE_NETWORK_ERROR_RE = /fetch failed|timeout|network|econnreset|enotfound|connect/;

export function isSupabaseNetworkError(error: ErrorLike | null | undefined): boolean {
  if (!error) return false;

  if (error.name === 'AuthRetryableFetchError') return true;

  const message = `${error.message ?? ''}`.toLowerCase();
  return SUPABASE_NETWORK_ERROR_RE.test(message);
}

export function describeSupabaseError(error: unknown): string {
  if (!error) return 'Unknown error';

  if (typeof error === 'string') return error;

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object') {
    const e = error as ErrorLike;
    const parts = [e.message, e.details, e.hint, e.code ? `code=${e.code}` : null].filter(
      (part): part is string => typeof part === 'string' && part.length > 0,
    );
    if (parts.length > 0) return parts.join(' | ');

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }

  return String(error);
}
