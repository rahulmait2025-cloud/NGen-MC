import 'server-only';
import type { createAdminClient } from '@/lib/supabase/admin';

function normalizeStudentInviteExpiryHours(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? '').trim(), 10);
  let v = Number.isFinite(n) ? Math.trunc(n) : 24;
  if (v < 1) v = 1;
  if (v > 168) v = 168;
  return v;
}

/** Reads `platform_settings.invite_expiry_hours` for row `id = default`. */
export async function getStudentInviteExpiryHours(
  admin: ReturnType<typeof createAdminClient>,
): Promise<number> {
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
