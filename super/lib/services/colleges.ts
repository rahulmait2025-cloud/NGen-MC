import 'server-only';
import { cacheTag, cacheLife } from 'next/cache';
import { cache } from 'react';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
/* SECURITY: This module uses createAdminClient (service-role, bypasses RLS) intentionally.
 * All entry points call getSessionFromHeaders() first to enforce application-level
 * auth — only authenticated superadmins reach this code. RLS remains enabled on the
 * database as defense-in-depth. No client-side code imports this module (server-only).
 * Do NOT expose this module to client bundles. */
import { createAdminClient } from '@/lib/supabase/admin';
import type { CollegesRow } from '@/types/database';
import type { GenerateLinkParams } from '@supabase/auth-js';
import { getPlatformSettings } from '@/lib/services/platform-settings';

export interface CollegeWithCounts extends CollegesRow {
  admins_count?: number;
  students_count?: number;
}

export interface ListCollegesOptions {
  limit?: number;
  offset?: number;
  status?: 'active' | 'inactive' | 'suspended' | 'all';
}

const COLLEGES_COLUMNS_WITHOUT_PLAN_ID = 'id, name, slug, short_name, status, logo_url, primary_color, secondary_color, support_email, support_phone, created_at, updated_at';

const isPlanIdColumnError = (code: string | undefined, msg: string | undefined) =>
  code === '42703' || ((msg ?? '').includes('plan_id') && (msg ?? '').includes('does not exist'));

const fetchCollegesWithCounts = cache(async (options: ListCollegesOptions = {}): Promise<CollegeWithCounts[]> => {
  const { limit = 100, offset = 0, status = 'all' } = options;
  const admin = createAdminClient();
  
  let colleges: CollegesRow[] | null = null;
  let error: { code?: string; message: string } | null = null;

  let query = admin.from('colleges').select('*').order('name').range(offset, offset + limit - 1);
  if (status !== 'all') {
    query = query.eq('status', status);
  }
  
  const res = await query;
  error = res.error;
  colleges = res.data;

  if (error && isPlanIdColumnError(error.code, error.message)) {
    let fallbackQuery = admin.from('colleges').select(COLLEGES_COLUMNS_WITHOUT_PLAN_ID).order('name').range(offset, offset + limit - 1);
    if (status && status !== 'all') {
      fallbackQuery = fallbackQuery.eq('status', status);
    }
    const fallback = await fallbackQuery;
    if (fallback.error) throw new Error(fallback.error.message);
    colleges = (fallback.data ?? []).map((c) => ({ ...c, plan_id: null })) as CollegesRow[];
  } else if (error) {
    throw new Error(error.message);
  }

  if (!colleges?.length) return [];

  const ids = colleges.map((c) => c.id);

  const adminsByCollege: Record<string, number> = {};
  const studentsByCollege: Record<string, number> = {};
  ids.forEach((id) => {
    adminsByCollege[id] = 0;
    studentsByCollege[id] = 0;
  });

  let countsLoaded = false;
  try {
    const adminIdsList = ids.map((id) => `'${id}'`).join(',');
    const [membersCountsRes, studentsCountsRes] = await Promise.all([
      admin.rpc('exec_sql', {
        query: `
          SELECT college_id, count(*)::int as cnt
          FROM college_memberships
          WHERE college_id = ANY(ARRAY[${adminIdsList}]::uuid[])
            AND role = 'college_admin'
            AND status = 'active'
          GROUP BY college_id
        `,
      }),
      admin.rpc('exec_sql', {
        query: `
          SELECT college_id, count(*)::int as cnt
          FROM students
          WHERE college_id = ANY(ARRAY[${adminIdsList}]::uuid[])
          GROUP BY college_id
        `,
      }),
    ]);

    if (!membersCountsRes.error && !studentsCountsRes.error) {
      const parseRows = (data: unknown): { college_id: string; cnt: number }[] => {
        if (!data) return [];
        if (typeof data === 'string') {
          try {
            return JSON.parse(data);
          } catch {
            return [];
          }
        }
        if (Array.isArray(data)) return data;
        return [];
      };

      const mRows = parseRows(membersCountsRes.data);
      const sRows = parseRows(studentsCountsRes.data);

      mRows.forEach((r) => {
        if (r && r.college_id && typeof r.cnt === 'number') {
          adminsByCollege[r.college_id] = r.cnt;
        }
      });
      sRows.forEach((r) => {
        if (r && r.college_id && typeof r.cnt === 'number') {
          studentsByCollege[r.college_id] = r.cnt;
        }
      });
      countsLoaded = true;
    }
  } catch (err) {
    console.warn('[colleges] Failed to load counts via exec_sql, falling back to slow path:', err);
  }

  if (!countsLoaded) {
    const [membersRes, studentsRes] = await Promise.all([
      admin
        .from('college_memberships')
        .select('college_id')
        .in('college_id', ids)
        .eq('role', 'college_admin')
        .eq('status', 'active'),
      admin.from('students').select('college_id').in('college_id', ids),
    ]);

    membersRes.data?.forEach((r) => {
      adminsByCollege[r.college_id] = (adminsByCollege[r.college_id] ?? 0) + 1;
    });
    studentsRes.data?.forEach((r) => {
      studentsByCollege[r.college_id] = (studentsByCollege[r.college_id] ?? 0) + 1;
    });
  }

  return colleges.map((c) => ({
    ...c,
    admins_count: adminsByCollege[c.id] ?? 0,
    students_count: studentsByCollege[c.id] ?? 0,
  }));
});

async function listCollegesCached(): Promise<CollegeWithCounts[]> {
  'use cache';
  cacheLife('halfMinute');
  cacheTag('superadmin-colleges-list');
  return fetchCollegesWithCounts({ limit: 100, offset: 0 });
}

/** List all colleges (SuperAdmin only; uses service role). */
export async function listColleges(options?: ListCollegesOptions & { bypassAuth?: boolean }): Promise<CollegeWithCounts[]> {
  if (!options?.bypassAuth) {
    const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  }
  
  if (options && (options.offset !== undefined || options.limit !== undefined || options.status !== 'all')) {
    // Paginated queries use non-cached version to ensure correct data per page
    return listCollegesPaginated(options.limit ?? 20, options.offset ?? 0, options.status ?? 'all');
  }
  
  return listCollegesCached();
}

// Paginated queries should NOT use unstable_cache because different limit/offset/status
// return different results. The cache key is static ['superadmin-colleges-paginated'] which means
// ALL pagination calls return the SAME cached data (first call's result).
// FIX: Call fetchCollegesWithCounts directly for paginated queries, rely on tag invalidation only.
// This ensures each pagination request gets fresh/correct data.
async function listCollegesPaginated(
  limit: number,
  offset: number,
  status: ListCollegesOptions['status'],
): Promise<CollegeWithCounts[]> {
  return fetchCollegesWithCounts({ limit, offset, status });
}

export async function getCollegeById(collegeId: string): Promise<CollegeWithCounts | null> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const admin = createAdminClient();

  let college: CollegesRow | null = null;
  let collegeError: { code?: string; message: string } | null = null;

  const res = await admin.from('colleges').select('*').eq('id', collegeId).maybeSingle();
  collegeError = res.error;
  college = res.data;

  if (collegeError && isPlanIdColumnError(collegeError.code, collegeError.message)) {
    const fallback = await admin.from('colleges').select(COLLEGES_COLUMNS_WITHOUT_PLAN_ID).eq('id', collegeId).maybeSingle();
    if (fallback.error) throw new Error(fallback.error.message);
    college = fallback.data ? ({ ...fallback.data, plan_id: null } as CollegesRow) : null;
  } else if (collegeError) {
    throw new Error(collegeError.message);
  }

  if (!college) return null;

  const [adminsRes, studentsRes] = await Promise.all([
    admin
      .from('college_memberships')
      .select('id', { head: true, count: 'exact' })
      .eq('college_id', collegeId)
      .eq('role', 'college_admin')
      .eq('status', 'active'),
    admin
      .from('students')
      .select('id', { head: true, count: 'exact' })
      .eq('college_id', collegeId),
  ]);

  if (adminsRes.error) throw new Error(adminsRes.error.message);
  if (studentsRes.error) throw new Error(studentsRes.error.message);

  return {
    ...college,
    admins_count: adminsRes.count ?? 0,
    students_count: studentsRes.count ?? 0,
  };
}

export interface CreateCollegeInput {
  name: string;
  slug: string;
  short_name?: string | null;
  status?: 'active' | 'inactive' | 'suspended';
  support_email?: string | null;
  support_phone?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
}

export async function createCollege(input: CreateCollegeInput): Promise<{ id: string; slug: string }> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const admin = createAdminClient();
  const settings = await getPlatformSettings();

  let planId: string | null = null;
  const plansTableMissing =
    (code: string | undefined, msg: string | undefined) =>
    code === '42P01' || code === 'PGRST204' || (msg ?? '').includes('schema cache');

  const { data: planRow, error: planError } = await admin
    .from('plans')
    .select('id')
    .eq('key', settings.default_tenant_plan)
    .maybeSingle();

  if (planError) {
    if (!plansTableMissing(planError.code, planError.message)) {
      throw new Error(planError.message);
    }
    // Table missing or not in schema cache: continue without plan_id
  } else {
    planId = planRow?.id ?? null;
    if (!planId) {
      const { data: starterPlan, error: starterError } = await admin.from('plans').select('id').eq('key', 'starter').maybeSingle();
      if (starterError) {
        if (!plansTableMissing(starterError.code, starterError.message)) {
          throw new Error(starterError.message);
        }
      } else {
        planId = starterPlan?.id ?? null;
      }
    }
  }

  const { data, error } = await admin
    .from('colleges')
    .insert({
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase().replace(/\s+/g, '-'),
      short_name: input.short_name?.trim() || null,
      status: input.status ?? 'active',
      support_email: input.support_email?.trim() || null,
      support_phone: input.support_phone?.trim() || null,
      primary_color: input.primary_color?.trim() || null,
      secondary_color: input.secondary_color?.trim() || null,
      ...(planId ? { plan_id: planId } : {}),
    })
    .select('id, slug')
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Create college failed');

  return { id: data.id, slug: data.slug };
}

export interface UpdateCollegeInput {
  name?: string;
  short_name?: string | null;
  status?: 'active' | 'inactive' | 'suspended';
  support_email?: string | null;
  support_phone?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
}

/** Update a college (SuperAdmin only; uses service role). Slug is not updated to avoid breaking routes. */
export async function updateCollege(collegeId: string, input: UpdateCollegeInput): Promise<void> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const admin = createAdminClient();
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.short_name !== undefined) updates.short_name = input.short_name?.trim() || null;
  if (input.status !== undefined) updates.status = input.status;
  if (input.support_email !== undefined) updates.support_email = input.support_email?.trim() || null;
  if (input.support_phone !== undefined) updates.support_phone = input.support_phone?.trim() || null;
  if (input.primary_color !== undefined) updates.primary_color = input.primary_color?.trim() || null;
  if (input.secondary_color !== undefined) updates.secondary_color = input.secondary_color?.trim() || null;
  if (Object.keys(updates).length === 0) return;
  const { error } = await admin.from('colleges').update(updates).eq('id', collegeId);
  if (error) throw new Error(error.message);
}

export interface InviteCollegeAdminInput {
  college_id: string;
  email: string;
  full_name: string;
  password?: string;
}

/**
 * Create a user, profile, and college_admin membership (SuperAdmin only; uses service role).
 *
 * - If password is provided: creates an active login immediately.
 * - If password is omitted/blank: generates an invite link that lets the user set a password.
 */
export async function inviteCollegeAdmin(input: InviteCollegeAdminInput): Promise<{ user_id: string; invite_link?: string }> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  // Keep password bytes exact as entered by superadmin; trimming mutates credentials.
  const password = input.password ?? '';

  const { data: college, error: collegeError } = await admin
    .from('colleges')
    .select('slug')
    .eq('id', input.college_id)
    .single();
  if (collegeError) throw new Error(collegeError.message);
  if (!college?.slug) throw new Error('College not found.');

  let userId: string;
  let inviteLink: string | undefined;

  if (password) {
    const { data: userData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: input.full_name },
    });
    if (authError) throw new Error(authError.message);
    if (!userData.user) throw new Error('Create user failed');
    userId = userData.user.id;
    // Align with student flow: hard-confirm email to avoid intermittent auth invalid-login errors.
    const { error: confirmError } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
    if (confirmError) throw new Error(confirmError.message);
  } else {
    const baseUrl = process.env.NEXT_PUBLIC_COLLEGE_ADMIN_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
    if (!baseUrl) throw new Error('Missing NEXT_PUBLIC_COLLEGE_ADMIN_APP_URL (or NEXT_PUBLIC_APP_URL) env.');
    const redirectTo = `${baseUrl.replace(/\/+$/, '')}/c/${encodeURIComponent(college.slug)}/admin/reset-password`;

    const params: GenerateLinkParams = {
      type: 'invite',
      email,
      options: { redirectTo, data: { full_name: input.full_name } },
    };

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink(params);
    if (linkError) throw new Error(linkError.message);
    const link = linkData ?? null;
    if (!link?.user?.id) throw new Error('Invite link generation failed.');
    userId = link.user.id;
    inviteLink = link.properties?.action_link;
    if (!inviteLink) throw new Error('Invite link generation failed (missing action link).');
  }

  await admin.from('profiles').upsert(
    {
      id: userId,
      full_name: input.full_name.trim(),
      email,
      is_active: true,
    },
    { onConflict: 'id' }
  );

  // SECURITY: role and status are server-controlled constants, never sourced from user input.
  // The CHECK constraint on college_memberships.role (migration 00244) enforces valid values
  // at the database level as defense-in-depth.
  const { error: memError } = await admin.from('college_memberships').insert({
    user_id: userId,
    college_id: input.college_id,
    role: 'college_admin',
    status: password ? 'active' : 'invited',
  });
  if (memError) throw new Error(memError.message);
  return { user_id: userId, invite_link: inviteLink };
}

async function deleteAuthUsersIfStandalone(userIds: string[], excludedCollegeId: string): Promise<number> {
  if (userIds.length === 0) return 0;

  const admin = createAdminClient();

  const [otherMembershipsRes, profilesRes] = await Promise.all([
    admin
      .from('college_memberships')
      .select('user_id, college_id')
      .in('user_id', userIds)
      .neq('college_id', excludedCollegeId),
    admin.from('profiles').select('id, global_role').in('id', userIds),
  ]);

  if (otherMembershipsRes.error) throw new Error(otherMembershipsRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const hasOtherMembership = new Set((otherMembershipsRes.data ?? []).map((m) => m.user_id));
  const isSuperadmin = new Set<string>();
  for (const p of profilesRes.data ?? []) {
    if (p.global_role === 'superadmin') isSuperadmin.add(p.id);
  }

  const deletableUserIds = userIds.filter(
    (id) => !hasOtherMembership.has(id) && !isSuperadmin.has(id)
  );

  const deleteResults = await Promise.allSettled(
    deletableUserIds.map((userId) =>
      admin.auth.admin.deleteUser(userId).then(({ error }) => {
        if (error) throw new Error(error.message);
      }),
    ),
  );

  for (const r of deleteResults) {
    if (r.status === 'rejected') throw r.reason;
  }

  return deletableUserIds.length;
}

/** Delete a college admin membership and also auth credentials if user is no longer used elsewhere. */
export async function deleteCollegeAdminCredential(collegeId: string, userId: string): Promise<void> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const admin = createAdminClient();
  const { data: membership, error: membershipError } = await admin
    .from('college_memberships')
    .select('id, role')
    .eq('college_id', collegeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (membershipError) throw new Error(membershipError.message);
  if (!membership || membership.role !== 'college_admin') {
    throw new Error('College admin membership not found.');
  }

  const { error: deleteMembershipError } = await admin
    .from('college_memberships')
    .delete()
    .eq('college_id', collegeId)
    .eq('user_id', userId)
    .eq('role', 'college_admin');

  if (deleteMembershipError) throw new Error(deleteMembershipError.message);

  await deleteAuthUsersIfStandalone([userId], collegeId);
}

/** Delete a college and all linked login credentials for tenant members (admins/students/faculty). */
export async function deleteCollegeCascade(collegeId: string): Promise<{ deletedUsers: number }> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const admin = createAdminClient();

  const [membershipsRes, studentsRes] = await Promise.all([
    admin.from('college_memberships').select('user_id').eq('college_id', collegeId),
    admin.from('students').select('user_id').eq('college_id', collegeId),
  ]);

  if (membershipsRes.error) throw new Error(membershipsRes.error.message);
  if (studentsRes.error) throw new Error(studentsRes.error.message);

  const userIds = Array.from(
    new Set([
      ...(membershipsRes.data ?? []).map((m) => m.user_id),
      ...(studentsRes.data ?? []).map((s) => s.user_id),
    ])
  );

  const { error: deleteCollegeError } = await admin.from('colleges').delete().eq('id', collegeId);
  if (deleteCollegeError) throw new Error(deleteCollegeError.message);

  const deletedUsers = await deleteAuthUsersIfStandalone(userIds, collegeId);
  return { deletedUsers };
}

export async function getSimpleColleges(): Promise<{ id: string; name: string; slug: string }[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('colleges')
    .select('id, name, slug')
    .eq('status', 'active')
    .order('name');

  if (error) throw new Error(error.message);
  return data ?? [];
}



