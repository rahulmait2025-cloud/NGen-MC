/**
 * Service-role Supabase client — bypasses all RLS policies.
 *
 * USE ONLY for:
 *   - Direct-learner B2C provisioning (membership, student row, non_partnered_students when needed)
 *   - Course payment operations (order intents, enrollment grants)
 *   - Phase 6 tiered runtime reads (after session + tenant checks; see `TIERED_RUNTIME_UNIFIED_READ`)
 *   - Platform settings reads (invite-status flow)
 *   - Unsubscribe token verification
 *
 * NEVER use for:
 *   - Tenant-scoped student queries where RLS should enforce isolation
 *   - Client-side code (server-only import guard prevents this)
 *
 * CALLER RESPONSIBILITY: Every consumer must enforce auth + tenant scoping.
 */
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedAdminClient: SupabaseClient | null = null;

/** Server-only Supabase client with service role. Use only for ensure-profile repair (e.g. create student row when missing). */
export function createAdminClient() {
  if (cachedAdminClient) return cachedAdminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Server configuration error.'
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
