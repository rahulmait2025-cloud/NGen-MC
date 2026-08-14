import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';

export type AdminSessionRole = 'superadmin' | 'college_admin' | 'faculty_spoc' | 'mentor';

export interface ActiveAdminSession {
  id: string;
  userId: string;
  collegeId: string | null;
  role: AdminSessionRole;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  status: 'active' | 'revoked' | 'expired';
}

export interface RegisterAdminSessionInput {
  userId: string;
  collegeId?: string | null;
  role: AdminSessionRole;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  metadata?: Record<string, unknown>;
}

export interface RegisteredAdminSession {
  id: string;
  token: string;
  expiresAt: Date;
}

export async function getAdminSessionHistory(limit = 20): Promise<ActiveAdminSession[]> {
  const { session } = await getSession();
  const user = session?.user;

  if (!user) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('admin_sessions')
    .select('id, user_id, college_id, role, created_at, last_seen_at, expires_at, status')
    .eq('user_id', user.id)
    .order('last_seen_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    collegeId: row.college_id,
    role: row.role as AdminSessionRole,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
    status: row.status,
  }));
}

export async function revokeOwnAdminSessionById(sessionId: string, reason: string): Promise<boolean> {
  const { session } = await getSession();
  const user = session?.user;

  if (!user) return false;

  const supabase = await createClient();

  const { error } = await supabase
    .from('admin_sessions')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoke_reason: reason,
    })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .eq('status', 'active');

  return !error;
}
