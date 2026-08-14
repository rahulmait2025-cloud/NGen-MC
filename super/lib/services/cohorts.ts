import 'server-only';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { createAdminClient } from '@/lib/supabase/admin';

export interface CohortRow {
  id: string;
  college_id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/** List cohorts for a college (SuperAdmin only). */
export async function listCohorts(collegeId: string): Promise<CohortRow[]> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('cohorts')
    .select('id, college_id, name, slug, description, created_at, updated_at')
    .eq('college_id', collegeId)
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as CohortRow[];
}

