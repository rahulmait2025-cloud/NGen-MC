import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  JobPostWithColleges,
  JobListItem,
  ListJobsOptions,
} from './types';

const PAGE_SIZE = 20;

export async function listJobs(options: ListJobsOptions = {}): Promise<{
  jobs: JobListItem[];
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
    .from('job_posts')
    .select(
      'id, title, company_name, status, visibility_scope, work_mode, employment_type, application_deadline, created_at, published_at',
      { count: 'exact' }
    );

  if (options.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options.search) {
    query = query.or(`title.ilike.%${options.search}%,company_name.ilike.%${options.search}%`);
  }

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    jobs: (data ?? []) as JobListItem[],
    total: count ?? 0,
    page,
    pageSize: limit,
  };
}

export async function getJobById(jobId: string): Promise<JobPostWithColleges | null> {
  const admin = createAdminClient();

  const { data: job, error } = await admin
    .from('job_posts')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }

  const { data: colleges } = await admin
    .from('job_post_colleges')
    .select('college_id, colleges(name)')
    .eq('job_id', jobId);

  const collegeLinks = (colleges ?? []).map((row: { college_id: string; colleges: { name: string }[] }) => ({
    college_id: row.college_id,
    college_name: row.colleges?.[0]?.name ?? 'Unknown',
  }));

  return { ...job, colleges: collegeLinks } as JobPostWithColleges;
}

export async function listCollegesForPicker(): Promise<
  { id: string; name: string }[]
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('colleges')
    .select('id, name')
    .eq('status', 'active')
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string }[];
}
