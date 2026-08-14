import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export function normalizeStudentInviteExpiryHours(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? '').trim(), 10);
  let v = Number.isFinite(n) ? Math.trunc(n) : 24;
  if (v < 1) v = 1;
  if (v > 168) v = 168;
  return v;
}

export async function getStudentInviteExpiryHours(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin
    .from('platform_settings')
    .select('invite_expiry_hours')
    .eq('id', 'default')
    .maybeSingle();
  if (error) {
    const missing =
      error.code === '42P01' ||
      error.code === 'PGRST204' ||
      (error.message ?? '').toLowerCase().includes('schema cache');
    if (missing) return 24;
    throw new Error(error.message);
  }
  return normalizeStudentInviteExpiryHours(data?.invite_expiry_hours ?? 24);
}
