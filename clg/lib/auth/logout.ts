'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/require-admin-action';

/**
 * Logout: clear Supabase auth session and redirect.
 * Supabase handles cookie cleanup automatically via signOut().
 */
export async function logout(redirectTo?: string) {
  const [, supabase] = await Promise.all([requireAuth(), createClient()]);
  await supabase.auth.signOut();
  redirect(redirectTo ?? '/login');
}
