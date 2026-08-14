import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export async function getConfirmedPublicUsernameForUser(
  userId: string,
): Promise<string | null> {
  const admin = createAdminClient();

  const { data: profile, error } = await admin
    .from('profiles')
    .select('username, username_set')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[confirmed-public-username] Failed to fetch profile username:', error.code);
    throw new Error('Database query failed while fetching confirmed username.');
  }

  if (!profile || !profile.username) {
    return null;
  }

  return profile.username.trim().toLowerCase();
}
