import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { JobApplicationsRow } from '@/types/database';

export type ApplicationStatus = JobApplicationsRow['status'];

export type ApplicantRow = JobApplicationsRow;

export interface ApplicantWithDetails extends ApplicantRow {
  student_name: string | null;
  student_email: string | null;
  college_name: string | null;
  job_title: string;
  job_company: string;
}

export interface StatusHistoryRow {
  id: string;
  application_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  actor_role: string | null;
  note: string | null;
  created_at: string;
}

export interface ListApplicantsOptions {
  jobId?: string;
  status?: ApplicationStatus | 'all';
  collegeId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

const PAGE_SIZE = 50;

export async function listApplicants(options: ListApplicantsOptions = {}): Promise<{
  applicants: ApplicantWithDetails[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const admin = createAdminClient();
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? PAGE_SIZE));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = admin
    .from('job_applications')
    .select('*', { count: 'exact' });

  if (options.jobId) {
    query = query.eq('job_id', options.jobId);
  }

  if (options.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options.collegeId) {
    query = query.eq('college_id', options.collegeId);
  }

  query = query.order('applied_at', { ascending: false }).range(from, to);

  const { data: applications, error, count } = await query;
  if (error) throw new Error(error.message);

  const apps = applications ?? [];
  if (apps.length === 0) {
    return { applicants: [], total: count ?? 0, page, pageSize: limit };
  }

  const studentIds = [...new Set(apps.map((a) => a.student_id))];
  const jobIds = [...new Set(apps.map((a) => a.job_id))];
  const collegeIds = [...new Set(apps.reduce<string[]>((acc, a) => { if (a.college_id) acc.push(a.college_id as string); return acc; }, []))];

  const [studentsResult, jobsResult, collegesResult] = await Promise.all([
    admin
      .from('students')
      .select('id, user_id')
      .in('id', studentIds),
    admin
      .from('job_posts')
      .select('id, title, company_name')
      .in('id', jobIds),
    collegeIds.length > 0
      ? admin.from('colleges').select('id, name').in('id', collegeIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userIds = [...new Set((studentsResult.data ?? []).map((s) => s.user_id))];
  const profilesResult = userIds.length > 0
    ? await admin.from('profiles').select('id, full_name, email').in('id', userIds)
    : { data: [] };

  const studentMap = new Map((studentsResult.data ?? []).map((s) => [s.id, s]));
  const profileMap = new Map((profilesResult.data ?? []).map((p) => [p.id, p]));
  const jobMap = new Map((jobsResult.data ?? []).map((j) => [j.id, j]));
  const collegeMap = new Map((collegesResult.data ?? []).map((c) => [c.id, c]));

  let enriched = apps.map((app) => {
    const student = studentMap.get(app.student_id);
    const profile = student ? profileMap.get(student.user_id) : null;
    const job = jobMap.get(app.job_id);
    const college = app.college_id ? collegeMap.get(app.college_id) : null;

    return {
      ...app,
      student_name: profile?.full_name ?? null,
      student_email: profile?.email ?? null,
      college_name: college?.name ?? null,
      job_title: job?.title ?? 'Unknown',
      job_company: job?.company_name ?? 'Unknown',
    } as ApplicantWithDetails;
  });

  if (options.search) {
    const q = options.search.toLowerCase();
    enriched = enriched.filter(
      (a) =>
        (a.student_name?.toLowerCase().includes(q)) ||
        (a.student_email?.toLowerCase().includes(q))
    );
  }

  return { applicants: enriched, total: count ?? 0, page, pageSize: limit };
}

export async function getApplicationById(applicationId: string): Promise<ApplicantWithDetails | null> {
  const admin = createAdminClient();

  const { data: app, error } = await admin
    .from('job_applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }

  const [studentResult, jobResult] = await Promise.all([
    admin.from('students').select('id, user_id, college_id').eq('id', app.student_id).single(),
    admin.from('job_posts').select('id, title, company_name').eq('id', app.job_id).single(),
  ]);

  let profileResult = null;
  if (studentResult.data) {
    const { data } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', studentResult.data.user_id)
      .single();
    profileResult = data;
  }

  let collegeName = null;
  if (app.college_id) {
    const { data } = await admin.from('colleges').select('name').eq('id', app.college_id).single();
    collegeName = data?.name ?? null;
  }

  return {
    ...app,
    student_name: profileResult?.full_name ?? null,
    student_email: profileResult?.email ?? null,
    college_name: collegeName,
    job_title: jobResult.data?.title ?? 'Unknown',
    job_company: jobResult.data?.company_name ?? 'Unknown',
  } as ApplicantWithDetails;
}

export async function getStatusHistory(applicationId: string): Promise<StatusHistoryRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('job_application_status_history')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as StatusHistoryRow[];
}

export async function getApplicantCountForJob(jobId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from('job_applications')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getApplicantCountsForJobs(jobIds: string[]): Promise<Map<string, number>> {
  if (jobIds.length === 0) return new Map();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('job_applications')
    .select('job_id')
    .in('job_id', jobIds);

  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.job_id, (counts.get(row.job_id) ?? 0) + 1);
  }
  return counts;
}

export async function listCollegesForFilter(): Promise<{ id: string; name: string }[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('colleges')
    .select('id, name')
    .eq('status', 'active')
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string }[];
}
