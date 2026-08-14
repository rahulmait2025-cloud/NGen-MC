'use server';

import { createClient } from '@/lib/supabase/server';

export async function updateRecoveryPassword(
  password: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (password.length < 8) {
    return { ok: false, message: 'Password must be at least 8 characters.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: 'Your reset session expired. Request a new link.' };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  await supabase.auth.signOut();
  return { ok: true };
}
