import 'server-only';
import { cache } from 'react';
import { cacheLife, cacheTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

export interface SuperadminProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  global_role: 'superadmin' | null;
  is_active: boolean;
  suspended_at?: string | null;
}

/**
 * Cached profile lookup.
 *
 * Marked with `use cache` (Next.js 16 Cache Components) so the layout
 * can call it without triggering the blocking-route error. The `userId`
 * is part of the auto-generated cache key. Tag-based invalidation lets
 * mutations on the `profiles` table refresh this entry on demand.
 */
async function lookupProfile(
  userId: string
): Promise<SuperadminProfile | null> {
  'use cache';
  cacheLife('10minutes'); // OPTIMIZATION: Extended from 'minutes' to 10min - profile rarely changes
  cacheTag('superadmin-profiles');

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('id, email, full_name, global_role, is_active, suspended_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[ensureSuperadminProfile] Profile lookup error:', error.message);
    return null;
  }

  return data as SuperadminProfile | null;
}

export const ensureSuperadminProfile = cache(async function ensureSuperadminProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string | null } | null;
}): Promise<SuperadminProfile | null> {
  return lookupProfile(user.id);
});
