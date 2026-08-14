import 'server-only';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { createAdminClient } from '@/lib/supabase/admin';

export interface PlacementRow {
  id: string;
  student_name: string;
  college_name: string;
  placement_status: string;
  updated_at: string;
}

export interface ContentRow {
  id: string;
  title: string;
  type: string;
  program: string;
  status: string;
  created_at: string;
}

export async function listPlacementRows(options?: { bypassAuth?: boolean }): Promise<PlacementRow[]> {
  if (!options?.bypassAuth) {
    const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('students')
    .select('id, user_id, college_id, placement_ready_status, updated_at')
    .not('placement_ready_status', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const collegeIds = Array.from(new Set(rows.map((r) => r.college_id)));

  const [profilesRes, collegesRes] = await Promise.all([
    admin.from('profiles').select('id, full_name').in('id', userIds),
    admin.from('colleges').select('id, name').in('id', collegeIds),
  ]);

  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (collegesRes.error) throw new Error(collegesRes.error.message);

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p.full_name]));
  const collegeMap = new Map((collegesRes.data ?? []).map((c) => [c.id, c.name]));

  return rows.map((row) => ({
    id: row.id,
    student_name: profileMap.get(row.user_id) ?? row.user_id,
    college_name: collegeMap.get(row.college_id) ?? row.college_id,
    placement_status: row.placement_ready_status ?? 'unknown',
    updated_at: row.updated_at,
  }));
}

export async function listContentRows(options?: { bypassAuth?: boolean }): Promise<ContentRow[]> {
  if (!options?.bypassAuth) {
    const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('audit_logs')
    .select('id, action, payload, created_at')
    .ilike('action', 'content.%')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    if (error.code === '42P01') return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      title: typeof payload.title === 'string' ? payload.title : row.action,
      type: typeof payload.type === 'string' ? payload.type : 'Unknown',
      program: typeof payload.program === 'string' ? payload.program : 'Unassigned',
      status: typeof payload.status === 'string' ? payload.status : 'Logged',
      created_at: row.created_at,
    };
  });
}
