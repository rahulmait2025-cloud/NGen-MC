import { createBrowserClient } from '@supabase/ssr';
import { BROWSER_COOKIE_OPTIONS, resolveSupabaseKey, resolveSupabaseUrl } from './cookie-options';

/**
 * Browser Supabase client. Session stored only in httpOnly cookies (YouTube-style persistent session).
 */
export function createClient() {
  const url = resolveSupabaseUrl();
  const key = resolveSupabaseKey();
  const supabase = createBrowserClient(url, key, {
    cookieOptions: BROWSER_COOKIE_OPTIONS,
  });

  // Keep the session cookie-backed, but do not run the browser auto-refresh
  // ticker while the tab is idle. Server requests still validate/refresh auth.
  void supabase.auth.stopAutoRefresh();

  return supabase;
}
