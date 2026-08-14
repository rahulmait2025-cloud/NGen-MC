'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/require-superadmin-action';

export async function logout() {
  const [, supabase] = await Promise.all([requireAuth(), createClient()]);
  await supabase.auth.signOut();
  redirect('/login');
}
