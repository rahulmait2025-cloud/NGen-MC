import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client for SuperAdmin.
 * Uses a module-level singleton to avoid creating multiple client instances.
 */
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL or ANON KEY is missing.');
  }
  return { url, key };
}

export function createClient() {
  if (browserClient) return browserClient;

  const { url, key } = getSupabaseEnv();
  browserClient = createBrowserClient(url, key);

  return browserClient;
}

