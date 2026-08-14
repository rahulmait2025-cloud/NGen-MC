import 'server-only';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CollegeWithCounts } from '@/lib/services/colleges';

export interface UserListItem {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  college_id: string;
  college_name: string | null;
  college_slug: string | null;
  status: string;
}

/** List college admins (and optionally other roles) with college info (SuperAdmin only). */
export async function listUsers(opts?: {
  role?: 'college_admin' | 'student' | 'faculty_spoc';
  college_id?: string;
  limit?: number;
  offset?: number;
  college?: Pick<CollegeWithCounts, 'id' | 'name' | 'slug'>;
}): Promise<UserListItem[]> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const admin = createAdminClient();
  const limit = Math.min(opts?.limit ?? 50, 100); // Cap at 100
  const offset = opts?.offset ?? 0;
  
  let query = admin
    .from('college_memberships')
    .select('id, user_id, college_id, role, status')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
    
  if (opts?.role) query = query.eq('role', opts.role);
  if (opts?.college_id) query = query.eq('college_id', opts.college_id);
  
  const { data: memberships, error: memError } = await query;
  if (memError) throw new Error(memError.message);
  if (!memberships?.length) return [];

  const userIds = [...new Set(memberships.map((m) => m.user_id))];
  const collegeIds = [...new Set(memberships.map((m) => m.college_id))];
  const shouldReuseCollege =
    opts?.college != null &&
    collegeIds.length === 1 &&
    collegeIds[0] === opts.college.id;
  const reusedCollege = shouldReuseCollege ? opts?.college : null;
  const [profilesRes, collegesRes] = await Promise.all([
    admin.from('profiles').select('id, full_name, email').in('id', userIds),
    reusedCollege
      ? Promise.resolve({
          data: [{ id: reusedCollege.id, name: reusedCollege.name, slug: reusedCollege.slug }],
          error: null,
        })
      : admin.from('colleges').select('id, name, slug').in('id', collegeIds),
  ]);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (collegesRes.error) throw new Error(collegesRes.error.message);
  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const collegeMap = new Map((collegesRes.data ?? []).map((c) => [c.id, c]));

  return memberships.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    full_name: profileMap.get(m.user_id)?.full_name ?? null,
    email: profileMap.get(m.user_id)?.email ?? null,
    role: m.role,
    college_id: m.college_id,
    college_name: collegeMap.get(m.college_id)?.name ?? null,
    college_slug: collegeMap.get(m.college_id)?.slug ?? null,
    status: m.status,
  }));
}
