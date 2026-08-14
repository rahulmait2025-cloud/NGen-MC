/**
 * Service-role Supabase client — bypasses all RLS policies.
 *
 * USE ONLY for:
 *   - Student creation/invite (requires admin.auth.admin API access)
 *   - Global course listing fallback (when RPC is unavailable)
 *
 * NEVER use for:
 *   - Tenant-scoped queries where RLS should enforce isolation
 *   - Client-side code (server-only import guard prevents this)
 *
 * CALLER RESPONSIBILITY: Every consumer must enforce auth + tenant scoping.
 */
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedAdminClient: SupabaseClient | null = null;

/** Server-only Supabase client with service role for admin operations (e.g. inviteUserByEmail). */
export function createAdminClient() {
  if (cachedAdminClient) return cachedAdminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase admin env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }
  cachedAdminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cachedAdminClient;
}
