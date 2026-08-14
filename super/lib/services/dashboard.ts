import 'server-only';
import { cacheTag, cacheLife } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { logSchemaDegradation, schemaErrorInfo } from '@/lib/supabase/schema-errors';
import {
  getSupabaseErrorMessage,
  isTransientSupabaseFetchError,
  logTransientSupabaseDegradation,
} from '@/lib/supabase/fetch-resilience';
import { listAuditLogs, type AuditLogItem } from '@/lib/services/audit';
import {
  listContentRows,
  listPlacementRows,
} from '@/lib/services/ops-pages';
import { listColleges, type CollegeWithCounts } from '@/lib/services/colleges';

export interface SuperadminDashboardStats {
  activeColleges: number;
  inactiveColleges: number;
  suspendedColleges: number;
  totalStudents: number;
  activeAdmins: number;
  pendingInvites: number;
  collegeLeads: number;
  newActiveCollegesThisMonth: number;
  newStudentsThisMonth: number;
  newAdminsThisMonth: number;
  invitesLast7Days: number;
}

const EMPTY_SUPERADMIN_STATS: SuperadminDashboardStats = {
  activeColleges: 0,
  inactiveColleges: 0,
  suspendedColleges: 0,
  totalStudents: 0,
  activeAdmins: 0,
  pendingInvites: 0,
  collegeLeads: 0,
  newActiveCollegesThisMonth: 0,
  newStudentsThisMonth: 0,
  newAdminsThisMonth: 0,
  invitesLast7Days: 0,
};

export interface CollegeLeaderboardRow {
  id: string;
  name: string;
  slug: string;
  studentsCount: number;
  adminsCount: number;
  status: string;
  rank: number;
}

export interface AtRiskCollegeRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  studentsCount: number;
  adminsCount: number;
  reason: string;
}



export interface FeatureAdoptionRow {
  college_id: string;
  college_name: string;
  plan_key: string;
  enabled_count: number;
  total_features: number;
}

export interface PlacementOverviewRow {
  college_name: string;
  not_ready: number;
  needs_improvement: number;
  interview_ready: number;
  placed: number;
  total: number;
}

export interface SuperadminDashboardExtendedData {
  leaderboard: CollegeLeaderboardRow[];
  atRiskColleges: AtRiskCollegeRow[];
  recentAudit: AuditLogItem[];
  featureAdoption: FeatureAdoptionRow[];
  placementOverview: PlacementOverviewRow[];
  contentEngagement: { total: number; recent: Array<{ id: string; title: string; type: string; created_at: string }> };
}

const EMPTY_SUPERADMIN_EXTENDED_DATA: SuperadminDashboardExtendedData = {
  leaderboard: [],
  atRiskColleges: [],
  recentAudit: [],
  featureAdoption: [],
  placementOverview: [],
  contentEngagement: { total: 0, recent: [] },
};

function _isMissingRelationError(code: string | undefined): boolean {
  return code === '42P01';
}

function isMissingFunctionError(code: string | undefined, message: string | undefined): boolean {
  if (code === 'PGRST202') return true;
  return (message ?? '').toLowerCase().includes('schema cache')
    || (message ?? '').toLowerCase().includes('could not find the function');
}

function isSuperadminRequiredRpcError(code: string | undefined, message: string | undefined): boolean {
  const normalized = (message ?? '').toLowerCase();
  return code === '42501' || normalized.includes('superadmin_required');
}

function shouldUseDashboardStatsFallback(code: string | undefined, message: string | undefined): boolean {
  return (
    isMissingFunctionError(code, message)
    || isSuperadminRequiredRpcError(code, message)
    || isTransientSupabaseFetchError(message)
  );
}

export async function getSuperadminDashboardStats(): Promise<SuperadminDashboardStats> {
  return getSuperadminDashboardStatsCached();
}

async function getSuperadminDashboardStatsCached(): Promise<SuperadminDashboardStats> {
  'use cache';
  cacheLife('minutes');
  cacheTag('superadmin-dashboard-stats');
  const admin = createAdminClient();
  try {
    const { data, error } = await admin.rpc('get_superadmin_dashboard_shell');
    if (error) {
      if (!shouldUseDashboardStatsFallback(error.code, error.message)) {
        throw new Error(error.message);
      }
      if (isTransientSupabaseFetchError(error.message)) {
        logSchemaDegradation(
          schemaErrorInfo('getSuperadminDashboardStats.rpc', error.code, error.message, 'get_superadmin_dashboard_shell'),
        );
      }
      return getSuperadminDashboardStatsFallback(admin);
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) {
      return EMPTY_SUPERADMIN_STATS;
    }

    return {
      activeColleges: Number((row as Record<string, unknown>).active_colleges ?? 0),
      inactiveColleges: Number((row as Record<string, unknown>).inactive_colleges ?? 0),
      suspendedColleges: Number((row as Record<string, unknown>).suspended_colleges ?? 0),
      totalStudents: Number((row as Record<string, unknown>).total_students ?? 0),
      activeAdmins: Number((row as Record<string, unknown>).active_admins ?? 0),
      pendingInvites: Number((row as Record<string, unknown>).pending_invites ?? 0),
      collegeLeads: Number((row as Record<string, unknown>).college_leads ?? 0),
      newActiveCollegesThisMonth: Number((row as Record<string, unknown>).new_active_colleges_this_month ?? 0),
      newStudentsThisMonth: Number((row as Record<string, unknown>).new_students_this_month ?? 0),
      newAdminsThisMonth: Number((row as Record<string, unknown>).new_admins_this_month ?? 0),
      invitesLast7Days: Number((row as Record<string, unknown>).invites_last_7_days ?? 0),
    };
  } catch (err) {
    const message = getSupabaseErrorMessage(err);
    if (!isTransientSupabaseFetchError(message)) {
      throw err;
    }
    logTransientSupabaseDegradation('getSuperadminDashboardStats', err);
    try {
      return await getSuperadminDashboardStatsFallback(admin);
    } catch {
      return EMPTY_SUPERADMIN_STATS;
    }
  }
}

async function getSuperadminDashboardStatsFallback(admin: ReturnType<typeof createAdminClient>): Promise<SuperadminDashboardStats> {
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    activeCollegesRes,
    inactiveCollegesRes,
    suspendedCollegesRes,
    totalStudentsRes,
    activeAdminsRes,
    pendingInvitesRes,
    collegeLeadsRes,
    newActiveCollegesThisMonthRes,
    newStudentsThisMonthRes,
    newAdminsThisMonthRes,
    invitesLast7DaysRes,
  ] = await Promise.all([
    admin.from('colleges').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('colleges').select('id', { count: 'exact', head: true }).eq('status', 'inactive'),
    admin.from('colleges').select('id', { count: 'exact', head: true }).eq('status', 'suspended'),
    admin.from('students').select('id', { count: 'exact', head: true }),
    admin.from('college_memberships').select('id', { count: 'exact', head: true }).eq('role', 'college_admin').eq('status', 'active'),
    admin.from('college_memberships').select('id', { count: 'exact', head: true }).eq('status', 'invited'),
    admin.from('college_leads').select('id', { count: 'exact', head: true }),
    admin.from('colleges').select('id', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', monthStart),
    admin.from('students').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    admin.from('college_memberships').select('id', { count: 'exact', head: true }).eq('role', 'college_admin').eq('status', 'active').gte('created_at', monthStart),
    admin.from('college_memberships').select('id', { count: 'exact', head: true }).eq('status', 'invited').gte('created_at', sevenDaysAgo),
  ]);

  const results = [
    activeCollegesRes,
    inactiveCollegesRes,
    suspendedCollegesRes,
    totalStudentsRes,
    activeAdminsRes,
    pendingInvitesRes,
    collegeLeadsRes,
    newActiveCollegesThisMonthRes,
    newStudentsThisMonthRes,
    newAdminsThisMonthRes,
    invitesLast7DaysRes,
  ];

  for (const res of results) {
    if (res.error) {
      if (isTransientSupabaseFetchError(res.error.message)) {
        logSchemaDegradation(
          schemaErrorInfo('getSuperadminDashboardStatsFallback', res.error.code, res.error.message),
        );
        return EMPTY_SUPERADMIN_STATS;
      }
      throw new Error(res.error.message);
    }
  }

  return {
    activeColleges: activeCollegesRes.count ?? 0,
    inactiveColleges: inactiveCollegesRes.count ?? 0,
    suspendedColleges: suspendedCollegesRes.count ?? 0,
    totalStudents: totalStudentsRes.count ?? 0,
    activeAdmins: activeAdminsRes.count ?? 0,
    pendingInvites: pendingInvitesRes.count ?? 0,
    collegeLeads: collegeLeadsRes.count ?? 0,
    newActiveCollegesThisMonth: newActiveCollegesThisMonthRes.count ?? 0,
    newStudentsThisMonth: newStudentsThisMonthRes.count ?? 0,
    newAdminsThisMonth: newAdminsThisMonthRes.count ?? 0,
    invitesLast7Days: invitesLast7DaysRes.count ?? 0,
  };
}

/** Fetch all extended dashboard data for SuperAdmin (leaderboard, at-risk, jobs, audit, etc.). */
export async function getSuperadminDashboardExtendedData(
  collegesInput?: CollegeWithCounts[]
): Promise<SuperadminDashboardExtendedData> {
  if (!collegesInput) {
    return getSuperadminDashboardExtendedDataCached();
  }
  return getSuperadminDashboardExtendedDataUncached(collegesInput);
}

async function getSuperadminDashboardExtendedDataCached(): Promise<SuperadminDashboardExtendedData> {
  'use cache';
  cacheLife('minutes');
  cacheTag('superadmin-dashboard-extended');
  return getSuperadminDashboardExtendedDataUncached(undefined);
}

async function getSuperadminDashboardExtendedDataUncached(
  collegesInput?: CollegeWithCounts[]
): Promise<SuperadminDashboardExtendedData> {
  try {
    return await buildSuperadminDashboardExtendedData(collegesInput);
  } catch (err) {
    const message = getSupabaseErrorMessage(err);
    if (!isTransientSupabaseFetchError(message)) {
      throw err;
    }
    logTransientSupabaseDegradation('getSuperadminDashboardExtendedData', err);
    return EMPTY_SUPERADMIN_EXTENDED_DATA;
  }
}

async function buildSuperadminDashboardExtendedData(
  collegesInput?: CollegeWithCounts[],
): Promise<SuperadminDashboardExtendedData> {
  const admin = createAdminClient();
  const [fetchedColleges, recentAudit, placementRows, contentRows] =
    await Promise.all([
      collegesInput ? Promise.resolve(collegesInput) : listColleges({ bypassAuth: true }),
      listAuditLogs({ limit: 15 }),
      listPlacementRows({ bypassAuth: true }),
      listContentRows({ bypassAuth: true }),
    ]);
  const colleges = fetchedColleges;

  const leaderboard: CollegeLeaderboardRow[] = colleges
    .toSorted((a, b) => (b.admins_count ?? 0) * 2 + (b.students_count ?? 0) - (a.admins_count ?? 0) * 2 - (a.students_count ?? 0))
    .slice(0, 10)
    .map((c, i) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      studentsCount: c.students_count ?? 0,
      adminsCount: c.admins_count ?? 0,
      status: c.status,
      rank: i + 1,
    }));

  const atRiskColleges: AtRiskCollegeRow[] = colleges
    .filter((c) => {
      const status = c.status;
      const students = c.students_count ?? 0;
      const admins = c.admins_count ?? 0;
      if (status === 'suspended') return true;
      if (status === 'inactive') return true;
      if (status === 'active' && admins === 0) return true;
      if (status === 'active' && students === 0) return true;
      return false;
    })
    .slice(0, 10)
    .map((c) => {
      let reason = '';
      if (c.status === 'suspended') reason = 'Suspended';
      else if (c.status === 'inactive') reason = 'Inactive';
      else if ((c.admins_count ?? 0) === 0) reason = 'No admins';
      else if ((c.students_count ?? 0) === 0) reason = 'No students';
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        studentsCount: c.students_count ?? 0,
        adminsCount: c.admins_count ?? 0,
        reason,
      };
    });



  const placementByCollege = new Map<string, { not_ready: number; needs_improvement: number; interview_ready: number; placed: number; total: number }>();
  for (const row of placementRows) {
    const key = row.college_name;
    if (!placementByCollege.has(key)) {
      placementByCollege.set(key, { not_ready: 0, needs_improvement: 0, interview_ready: 0, placed: 0, total: 0 });
    }
    const agg = placementByCollege.get(key)!;
    agg.total += 1;
    const s = (row.placement_status ?? '').toLowerCase();
    if (s === 'not_ready') agg.not_ready += 1;
    else if (s === 'needs_improvement') agg.needs_improvement += 1;
    else if (s === 'interview_ready') agg.interview_ready += 1;
    else if (s === 'placed') agg.placed += 1;
  }
  const placementOverview: PlacementOverviewRow[] = Array.from(placementByCollege.entries()).map(([college_name, v]) => ({
    college_name,
    ...v,
  }));

  let featureAdoption: FeatureAdoptionRow[] = [];
  try {
    const { data: planFeatures } = await admin.from('plan_features').select('plan_id, feature_key, enabled').eq('enabled', true);
    const planIds = [...new Set((planFeatures ?? []).map((p) => p.plan_id))];
    const { data: plans } = await admin.from('plans').select('id, key').in('id', planIds);
    const planKeyMap = new Map((plans ?? []).map((p) => [p.id, p.key]));
    const distinctFeaturesByPlan = new Map<string, Set<string>>();
    for (const p of planFeatures ?? []) {
      if (!distinctFeaturesByPlan.has(p.plan_id)) distinctFeaturesByPlan.set(p.plan_id, new Set());
      distinctFeaturesByPlan.get(p.plan_id)!.add(p.feature_key);
    }
    const { data: collegesWithPlan } = await admin.from('colleges').select('id, name, plan_id').not('plan_id', 'is', null);
    featureAdoption = (collegesWithPlan ?? []).map((c) => {
      const enabled = distinctFeaturesByPlan.get(c.plan_id)?.size ?? 0;
      return {
        college_id: c.id,
        college_name: c.name,
        plan_key: planKeyMap.get(c.plan_id) ?? 'unknown',
        enabled_count: enabled,
        total_features: Math.max(1, enabled),
      };
    });
  } catch (err) {
    const message = getSupabaseErrorMessage(err);
    if (isTransientSupabaseFetchError(message)) {
      logTransientSupabaseDegradation('getSuperadminDashboardExtendedData.featureAdoption', err);
      featureAdoption = [];
    } else if (!message.toLowerCase().includes('schema cache') && !message.toLowerCase().includes('does not exist')) {
      throw err;
    } else {
      logSchemaDegradation(
        schemaErrorInfo('getSuperadminDashboardExtendedData.featureAdoption', undefined, message, 'plans/plan_features/colleges.plan_id'),
      );
      featureAdoption = [];
    }
  }


  return {
    leaderboard,
    atRiskColleges,
    recentAudit,
    featureAdoption,
    placementOverview,
    contentEngagement: {
      total: contentRows.length,
      recent: contentRows.slice(0, 5).map((r) => ({ id: r.id, title: r.title, type: r.type, created_at: r.created_at })),
    },
  };
}
