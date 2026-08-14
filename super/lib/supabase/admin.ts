/**
 * Service-role Supabase client — bypasses all RLS policies.
 *
 * USE ONLY for:
 *   - SuperAdmin service modules (requireSuperadmin() must be called by the consumer)
 *   - Job handlers (internal system paths, guarded at HTTP entry point)
 *   - Logging (fire-and-forget, no user data exposure)
 *   - Auth infrastructure (profile lookup, session management)
 *
 * NEVER use for:
 *   - User-scoped queries where RLS should enforce tenant isolation
 *   - Client-side code (server-only import guard prevents this)
 *
 * CALLER RESPONSIBILITY: Every consumer must enforce auth + tenant scoping.
 */
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createResilientFetch } from '@/lib/supabase/fetch-resilience';

let cachedAdminClient: SupabaseClient | null = null;

export function createAdminClient() {
  if (cachedAdminClient) return cachedAdminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Server configuration error.');
  }
  cachedAdminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: createResilientFetch(),
    },
  });
  return cachedAdminClient;
}
