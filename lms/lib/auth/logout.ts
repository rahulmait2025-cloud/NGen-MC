'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Logout: clear Supabase auth session locally and redirect.
 */
export async function logout(redirectTo?: string) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;

  if (process.env.AUTH_DIAGNOSTICS_ENABLED === 'true') {
    console.log(`[auth-diagnostics] native-logout: userId=${userId ?? 'unknown'}`);
  }

  await supabase.auth.signOut({ scope: 'local' });
  redirect(redirectTo ?? '/');
}

/**
 * Global Logout: clear all Supabase auth sessions across all devices.
 */
export async function logoutAllDevices(redirectTo?: string) {
  const { requireSensitiveAuthIdentity } = await import('./require-sensitive-auth-identity');
  const identity = await requireSensitiveAuthIdentity();

  if (process.env.AUTH_DIAGNOSTICS_ENABLED === 'true') {
    console.log(`[auth-diagnostics] global-logout-requested: userId=${identity.userId.slice(0, 8)}...`);
  }

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'global' });
  redirect(redirectTo ?? '/');
}

/**
 * Logout Other Devices: clear all Supabase auth sessions except current device.
 */
export async function logoutOtherDevices() {
  const { requireSensitiveAuthIdentity } = await import('./require-sensitive-auth-identity');
  const identity = await requireSensitiveAuthIdentity();

  if (process.env.AUTH_DIAGNOSTICS_ENABLED === 'true') {
    console.log(`[auth-diagnostics] other-sessions-logout-requested: userId=${identity.userId.slice(0, 8)}...`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: 'others' });
  if (error) {
    return { ok: false, error: 'SESSION_REVOCATION_FAILED' };
  }
  return { ok: true };
}
