export interface ErrorLike {
  message?: string | null;
  name?: string | null;
  code?: string | null;
}

export function isSupabaseNetworkError(error: ErrorLike | null | undefined): boolean {
  if (!error) return false;

  if (error.name === 'AuthRetryableFetchError') return true;

  const message = `${error.message ?? ''}`.toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('connect')
  );
}

export function describeSupabaseError(error: ErrorLike | null | undefined): string {
  if (!error) return 'Unknown error';
  return error.message || error.code || error.name || 'Unknown error';
}
