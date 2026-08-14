import { cache } from 'react';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { PERSISTENT_COOKIE_OPTIONS, resolveSupabaseKey, resolveSupabaseUrl } from './cookie-options';

/** Server Supabase client; cookie-only session, same maxAge as client/middleware. */
export async function createClient() {
  const url = resolveSupabaseUrl();
  const key = resolveSupabaseKey();
  const cookieStore = await cookies();
  
  const client = createServerClient(url, key, {
    cookieOptions: PERSISTENT_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (err) {
          console.error('[auth/cookie] failed to set cookies:', err);
          throw err;
        }
      },
    },
  });
  
  return client;
}

/**
 * Cookie-less Supabase client for use inside `unstable_cache()`.
 * This avoids the "cookies() inside cache scope" error.
 * Only use this for queries that don't need authenticated access (e.g. public data reads).
 */
export function createPublicClient() {
  const url = resolveSupabaseUrl();
  const key = resolveSupabaseKey();
  return createServerClient(url, key, {
    cookieOptions: PERSISTENT_COOKIE_OPTIONS,
    cookies: {
      getAll() { return []; },
      setAll() {},
    },
  });
}

/**
 * Service role Supabase client for use inside `unstable_cache()`.
 * This bypasses RLS and avoids the "cookies() inside cache scope" error.
 * Uses @supabase/supabase-js directly (not the SSR wrapper) to avoid
 * cookie-handling overhead and potential fetch interference.
 * ONLY use this for trusted queries where you verify the tenant boundary manually.
 */
export const createServiceRoleClient = cache(function createServiceRoleClient() {
  const url = resolveSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
});

const _createAdminClient = createServiceRoleClient;
