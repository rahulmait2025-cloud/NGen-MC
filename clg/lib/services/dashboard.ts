import 'server-only';
import { cacheTag, cacheLife } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/server';

import {
  getPlacementReadinessFunnel,
  getPlacementPendingReviewsCount,
} from '@/lib/services/placements';

export interface DashboardStats {
  studentsCount: number;
  adminsCount: number;
}

export interface StudentWithProfile {
  id: string;
  user_id: string;
  college_id: string;
  student_code: string | null;
  full_name: string | null;
  email: string | null;
}

export interface AdminWithProfile {
  id: string;
  user_id: string;
  college_id: string;
  role: 'college_admin' | 'student' | 'faculty_spoc';
  status: string;
  full_name: string | null;
  email: string | null;
}

export interface CurrentAdminCollegeSnapshot {
  collegeId: string;
  studentsCount: number;
  adminsCount: number;
  students: StudentWithProfile[];
  admins: AdminWithProfile[];
}

export interface CollegeDashboardRosterSnapshot {
  students: StudentWithProfile[];
  admins: AdminWithProfile[];
}

export interface CollegeDashboardExtendedData {
  collegeKpis: {
    total_students: number;
    total_cohorts: number;
    lecture_completion_rate: number;
    attendance_rate: number;
    average_assessment_score: number;
    assessment_completion_rate: number;
    placement_ready_count: number;
    placed_count: number;
    pending_placement_review_count: number;
  } | null;
  cohortPerformance: { cohort_id: string | null; student_count: number }[];

  lectureEngagement: { lecture_completion_rate: number; total_lectures_completed: number } | null;
  assessmentAnalytics: { average_score: number; completion_rate: number; total_submitted: number } | null;
  placementFunnel: { not_ready_count: number; needs_improvement_count: number; interview_ready_count: number; placed_count: number; total_profiles: number } | null;
  pendingReviewsCount: number;
  notifications: { id: string; notification_type: string; status: string; created_at: string }[];
  recentActivity: { id: string; action: string; created_at: string }[];
  atRiskStudents: { student_id: string; course_title: string; days_inactive: number }[];
  /** Set when extended data failed to load; UI can show error state */
  _error?: boolean;
}

async function getCollegeDashboardStatsCached(collegeId: string): Promise<DashboardStats> {
  'use cache';
  cacheLife('minutes');
  cacheTag('college-dashboard-stats');
  const supabase = createServiceRoleClient();
  const [studentsRes, adminsRes] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('college_id', collegeId),
    supabase
      .from('college_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('college_id', collegeId)
      .eq('role', 'college_admin')
      .eq('status', 'active'),
  ]);
  return {
    studentsCount: studentsRes.count ?? 0,
    adminsCount: adminsRes.count ?? 0,
  };
}

/** Tenant-aware: stats for a single college. RLS restricts to college_admin's college. */
export async function getCollegeDashboardStats(collegeId: string): Promise<DashboardStats> {
  return getCollegeDashboardStatsCached(collegeId);
}

async function listStudentsForCollegeCached(collegeId: string, limit: number): Promise<StudentWithProfile[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('college-students-list');
  const supabase = createServiceRoleClient();
  
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, user_id, college_id, student_code')
    .eq('college_id', collegeId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (studentsError || !students?.length) return [];

  const userIds = [...new Set(students.map((s) => s.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  return students.map((s) => ({
    id: s.id,
    user_id: s.user_id,
    college_id: s.college_id,
    student_code: s.student_code,
    full_name: profileMap.get(s.user_id)?.full_name ?? null,
    email: profileMap.get(s.user_id)?.email ?? null,
  }));
}

/** Tenant-aware: list students for a college with profile names. RLS restricts to college. */
export async function listStudentsForCollege(collegeId: string, limit = 50): Promise<StudentWithProfile[]> {
  return listStudentsForCollegeCached(collegeId, limit);
}

async function listAdminsForCollegeCached(collegeId: string, limit: number): Promise<AdminWithProfile[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('college-admins-list');
  const supabase = createServiceRoleClient();

  const { data: memberships, error: membershipsError } = await supabase
    .from('college_memberships')
    .select('id, user_id, college_id, role, status')
    .eq('college_id', collegeId)
    .eq('role', 'college_admin')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (membershipsError || !memberships?.length) return [];

  const userIds = [...new Set(memberships.map((m) => m.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return memberships.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    college_id: m.college_id,
    role: m.role,
    status: m.status,
    full_name: profileMap.get(m.user_id)?.full_name ?? null,
    email: profileMap.get(m.user_id)?.email ?? null,
  }));
}

/** Tenant-aware: list active admins for a college with profile names. */
export async function listAdminsForCollege(collegeId: string, limit = 20): Promise<AdminWithProfile[]> {
  return listAdminsForCollegeCached(collegeId, limit);
}

async function getCollegeDashboardExtendedDataCached(collegeId: string): Promise<CollegeDashboardExtendedData> {
  'use cache';
  cacheLife('minutes');
  cacheTag('college-dashboard-extended');
  const supabase = createServiceRoleClient();

  const [
    kpisRow,
    funnel,
    pendingReviewsCount,
    auditData,
    atRiskData,
    cohortData,
    notificationsData,
  ] = await Promise.all([
    supabase.from('mv_college_kpis').select('college_id, total_students, total_cohorts, lecture_completion_rate, total_lectures_completed, attendance_rate, average_assessment_score, assessment_completion_rate, total_assessments_completed, placement_ready_count, placed_count, pending_placement_review_count').eq('college_id', collegeId).maybeSingle(),
    getPlacementReadinessFunnel(collegeId),
    getPlacementPendingReviewsCount(collegeId),
    supabase.from('audit_logs').select('id, action, created_at').eq('college_id', collegeId).order('created_at', { ascending: false }).limit(15),
    supabase.from('v_inactive_students_by_course').select('student_id, course_title, days_inactive').eq('college_id', collegeId).limit(20),
    supabase.from('students').select('cohort_id').eq('college_id', collegeId).not('cohort_id', 'is', null),
    supabase.from('notification_queue').select('id, notification_type, status, created_at').eq('tenant_id', collegeId).in('status', ['pending', 'failed']).order('created_at', { ascending: false }).limit(10),
  ]);

  const kpis = kpisRow.data as Record<string, unknown> | null;
  const cohortCounts = new Map<string | null, number>();
  for (const row of cohortData.data ?? []) {
    const cid = (row as { cohort_id: string | null }).cohort_id;
    cohortCounts.set(cid, (cohortCounts.get(cid) ?? 0) + 1);
  }
  const cohortPerformance = Array.from(cohortCounts.entries()).map(([cohort_id, student_count]) => ({ cohort_id, student_count }));

  return {
    collegeKpis: kpis
      ? {
          total_students: Number(kpis.total_students) ?? 0,
          total_cohorts: Number(kpis.total_cohorts) ?? 0,
          lecture_completion_rate: Number(kpis.lecture_completion_rate) ?? 0,
          attendance_rate: Number(kpis.attendance_rate) ?? 0,
          average_assessment_score: Number(kpis.average_assessment_score) ?? 0,
          assessment_completion_rate: Number(kpis.assessment_completion_rate) ?? 0,
          placement_ready_count: Number(kpis.placement_ready_count) ?? 0,
          placed_count: Number(kpis.placed_count) ?? 0,
          pending_placement_review_count: Number(kpis.pending_placement_review_count) ?? 0,
        }
      : null,
    cohortPerformance,

    lectureEngagement: kpis
      ? {
          lecture_completion_rate: Number(kpis.lecture_completion_rate) ?? 0,
          total_lectures_completed: Number(kpis.total_lectures_completed) ?? 0,
        }
      : null,
    assessmentAnalytics: kpis
      ? {
          average_score: Number(kpis.average_assessment_score) ?? 0,
          completion_rate: Number(kpis.assessment_completion_rate) ?? 0,
          total_submitted: Number(kpis.total_assessments_completed) ?? 0,
        }
      : null,
    placementFunnel: funnel
      ? {
          not_ready_count: funnel.not_ready_count ?? 0,
          needs_improvement_count: funnel.needs_improvement_count ?? 0,
          interview_ready_count: funnel.interview_ready_count ?? 0,
          placed_count: funnel.placed_count ?? 0,
          total_profiles: funnel.total_profiles ?? 0,
        }
      : null,
    pendingReviewsCount: pendingReviewsCount ?? 0,
    notifications: (notificationsData.data ?? []).map((n) => ({
      id: (n as { id: string }).id,
      notification_type: (n as { notification_type: string }).notification_type,
      status: (n as { status: string }).status,
      created_at: (n as { created_at: string }).created_at,
    })),
    recentActivity: (auditData.data ?? []).map((a) => ({
      id: (a as { id: string }).id,
      action: (a as { action: string }).action,
      created_at: (a as { created_at: string }).created_at,
    })),
    atRiskStudents: (atRiskData.data ?? []).map((r) => ({
      student_id: (r as { student_id: string }).student_id,
      course_title: (r as { course_title: string }).course_title,
      days_inactive: Number((r as { days_inactive: number }).days_inactive) ?? 0,
    })),
  };
}

/** Tenant-aware: extended dashboard data for college (KPIs, cohort, course completion, placement, audit, at-risk). */
export async function getCollegeDashboardExtendedData(collegeId: string): Promise<CollegeDashboardExtendedData> {
  return getCollegeDashboardExtendedDataCached(collegeId);
}
