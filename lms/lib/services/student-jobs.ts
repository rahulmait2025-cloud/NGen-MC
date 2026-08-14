import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { JobPostsRow, JobApplicationsRow } from '@/types/database';
import { cacheTag, cacheLife } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { APPLICATION_STATUS_CONFIG } from '@/components/jobs/job-constants';

export type JobStatus = JobPostsRow['status'];
export type JobVisibilityScope = JobPostsRow['visibility_scope'];
export type JobWorkMode = NonNullable<JobPostsRow['work_mode']>;
export type JobEmploymentType = NonNullable<JobPostsRow['employment_type']>;
export type ApplicationStatus = JobApplicationsRow['status'];

export type JobPost = Omit<JobPostsRow, 'created_by' | 'updated_by' | 'updated_at'>;

export type JobApplication = Omit<
  JobApplicationsRow,
  'reviewed_by' | 'reviewed_at' | 'admin_notes' | 'rejection_reason' | 'updated_at'
>;

export interface JobApplicationWithJob extends JobApplication {
  job_posts: Pick<JobPost, 'id' | 'title' | 'company_name' | 'location' | 'work_mode' | 'employment_type' | 'status' | 'application_deadline'> | null;
}

const PAGE_SIZE = 20;

async function getCollegeJobMappingsCached(collegeId: string): Promise<string[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag(`college-job-mappings-${collegeId}`);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('job_post_colleges')
    .select('job_id')
    .eq('college_id', collegeId);

  if (error) {
    return [];
  }
  return (data ?? []).map((m) => m.job_id);
}

export const listVisibleJobs = cache(async function listVisibleJobs(options: {
  collegeId: string;
  collegeSlug: string;
  isGlobal: boolean;
  page?: number;
  limit?: number;
  search?: string;
  workMode?: string;
  employmentType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{ jobs: JobPost[]; total: number; page: number; pageSize: number }> {
  'use cache';
  cacheLife('weeks');
  cacheTag(`college-jobs-${options.collegeId || 'global'}`);

  const supabase = createAdminClient();
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(500, Math.max(1, options.limit ?? PAGE_SIZE));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Narrow column projection to avoid downloading heavy description / responsibilities / perks etc.
  let query = supabase
    .from('job_posts')
    .select('id, title, company_name, company_website, location, work_mode, employment_type, experience_level, salary_min_minor, salary_max_minor, salary_currency, openings, application_deadline, status, visibility_scope, published_at, created_at, skills', { count: 'exact' })
    .eq('status', 'open');

  // Push visibility scope filters into SQL
  if (options.isGlobal) {
    query = query.neq('visibility_scope', 'college_only');
  } else {
    query = query.neq('visibility_scope', 'global_only');
  }

  // Handle selected_colleges mapping on the DB side using cached mappings (guarded check)
  const allowedJobIds = options.collegeId ? await getCollegeJobMappingsCached(options.collegeId) : [];
  
  if (allowedJobIds.length > 0) {
    query = query.or(`visibility_scope.neq.selected_colleges,id.in.(${allowedJobIds.join(',')})`);
  } else {
    query = query.neq('visibility_scope', 'selected_colleges');
  }

  // Filters
  if (options.search) {
    query = query.or(`title.ilike.%${options.search}%,company_name.ilike.%${options.search}%,location.ilike.%${options.search}%`);
  }
  if (options.workMode && options.workMode !== 'all') {
    query = query.eq('work_mode', options.workMode);
  }
  if (options.employmentType && options.employmentType !== 'all') {
    query = query.eq('employment_type', options.employmentType);
  }

  // Sorting
  if (options.sortBy) {
    query = query.order(options.sortBy, { ascending: options.sortOrder === 'asc' });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  // Database-side pagination
  const { data, error, count } = await query.range(from, to);

  if (error) throw new Error(error.message);

  return {
    jobs: (data ?? []) as JobPost[],
    total: count ?? 0,
    page,
    pageSize: limit,
  };
});

export const getJobDetail = cache(async function getJobDetail(jobId: string): Promise<JobPost | null> {
  'use cache';
  cacheLife('weeks');
  cacheTag(`job-detail-${jobId}`);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('job_posts')
    .select('id, title, company_name, company_website, company_about, location, work_mode, employment_type, experience_level, salary_min_minor, salary_max_minor, salary_currency, openings, application_deadline, description, responsibilities, requirements, skills, perks, status, visibility_scope, published_at, created_at')
    .eq('id', jobId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }
  return data as JobPost;
});

export const getStudentApplication = cache(async function getStudentApplication(
  studentId: string,
  jobId: string
): Promise<JobApplication | null> {
  'use cache';
  cacheLife('weeks');
  cacheTag(`student-job-application-${studentId}-${jobId}`);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('job_applications')
    .select('id, job_id, student_id, user_id, college_id, status, resume_path, resume_file_name, resume_size_bytes, resume_mime_type, cover_note, github_url, linkedin_url, portfolio_url, answers, student_edit_count, applied_at, last_edited_at, withdrawn_at, created_at')
    .eq('student_id', studentId)
    .eq('job_id', jobId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as JobApplication | null;
});

/** Batch-fetch application statuses for multiple jobs in a single query (avoids N+1). */
export async function getStudentApplicationsForJobs(
  studentId: string,
  jobIds: string[],
): Promise<Map<string, JobApplication | null>> {
  if (jobIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('job_applications')
    .select('job_id, status')
    .eq('student_id', studentId)
    .in('job_id', jobIds);

  if (error) throw new Error(error.message);
  const map = new Map<string, JobApplication | null>();
  // Initialize all job IDs as null (no application)
  for (const id of jobIds) map.set(id, null);
  // Fill in found applications
  for (const app of (data ?? [])) {
    map.set(app.job_id, app as unknown as JobApplication);
  }
  return map;
}

async function _getApplicationById(
  applicationId: string,
  studentId: string
): Promise<JobApplication | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('job_applications')
    .select('id, job_id, student_id, user_id, college_id, status, resume_path, resume_file_name, resume_size_bytes, resume_mime_type, cover_note, github_url, linkedin_url, portfolio_url, answers, student_edit_count, applied_at, last_edited_at, withdrawn_at, created_at')
    .eq('id', applicationId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as JobApplication | null;
}

export const listMyApplications = cache(async function listMyApplications(options: {
  studentId: string;
  page?: number;
  limit?: number;
}): Promise<{ applications: JobApplicationWithJob[]; total: number; page: number; pageSize: number }> {
  'use cache';
  cacheLife('weeks');
  cacheTag(`student-applications-${options.studentId}`);

  const supabase = createAdminClient();
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? PAGE_SIZE));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('job_applications')
    .select('*, job_posts(id, title, company_name, location, work_mode, employment_type, status, application_deadline)', { count: 'exact' })
    .eq('student_id', options.studentId)
    .order('applied_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    applications: (data ?? []) as JobApplicationWithJob[],
    total: count ?? 0,
    page,
    pageSize: limit,
  };
});

export interface StudentAccessContext {
  studentId: string;
  collegeId: string;
  isGlobal: boolean;
}

/**
 * Deep Module: JobAccessEvaluator
 * Encapsulates all job visibility, college mapping, and application eligibility rules behind one seam.
 */
export class JobAccessEvaluator {
  static evaluateApplicationEligibility(
    job: JobPost | null,
    existingApplication: JobApplication | null,
    context: StudentAccessContext,
    isCollegeMapped: boolean = true
  ): { allowed: boolean; reason?: string } {
    if (!job) return { allowed: false, reason: 'Job not found.' };
    if (job.status !== 'open') return { allowed: false, reason: 'This job is no longer open.' };

    if (job.application_deadline) {
      const deadline = new Date(job.application_deadline);
      if (deadline < new Date()) {
        return { allowed: false, reason: 'Application deadline has passed.' };
      }
    }

    switch (job.visibility_scope) {
      case 'college_only':
        if (context.isGlobal) return { allowed: false, reason: 'This job is only for college students.' };
        break;
      case 'global_only':
        if (!context.isGlobal) return { allowed: false, reason: 'This job is only for direct/global students.' };
        break;
      case 'selected_colleges':
        if (!isCollegeMapped) return { allowed: false, reason: 'This job is not available for your college.' };
        break;
    }

    if (existingApplication && existingApplication.status !== 'withdrawn') {
      return { allowed: false, reason: 'You have already applied to this job.' };
    }

    return { allowed: true };
  }
}

export interface JobDetailViewModel {
  job: JobPost;
  application: JobApplication | null;
  eligibility: { allowed: boolean; reason?: string };
  isApplied: boolean;
  isWithdrawn: boolean;
  deadlineFormatted: string | null;
  isDeadlinePassed: boolean;
  isDeadlineUrgent: boolean;
  formattedSalary: string | null;
  statusConfig: { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info' } | null;
  hasAnyList: boolean;
  ctaState: {
    type: 'visit_website' | 'apply' | 'reapply' | 'edit' | 'ineligible' | 'none';
    label: string;
    href?: string;
    external?: boolean;
    reason?: string;
  };
}

/**
 * Deep Module: JobDetailPresenter
 * Computes complete view-model presentation logic (deadlines, salary, CTAs, list checks) for job detail pages.
 */
export class JobDetailPresenter {
  static present(
    job: JobPost,
    application: JobApplication | null,
    eligibility: { allowed: boolean; reason?: string },
    collegeSlug: string,
    now: Date = new Date()
  ): JobDetailViewModel {
    const isApplied = !!(application && application.status !== 'withdrawn');
    const isWithdrawn = application?.status === 'withdrawn';

    const deadlineDate = job.application_deadline ? new Date(job.application_deadline) : null;
    const deadlineFormatted = deadlineDate
      ? deadlineDate.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

    const isDeadlinePassed = deadlineDate ? deadlineDate < now : false;
    const isDeadlineUrgent = deadlineDate && !isDeadlinePassed
      ? deadlineDate.getTime() - now.getTime() < 48 * 60 * 60 * 1000
      : false;

    const formattedSalary = job.salary_min_minor != null
      ? `${job.salary_currency} ${(job.salary_min_minor / 100).toLocaleString('en-IN')}${
          job.salary_max_minor != null ? ` – ${job.salary_currency} ${(job.salary_max_minor / 100).toLocaleString('en-IN')}` : ''
        }`
      : null;

    const statusConfig = application?.status ? APPLICATION_STATUS_CONFIG[application.status] ?? null : null;
    const hasAnyList = !!(job.responsibilities?.length || job.requirements?.length || job.skills?.length || job.perks?.length);

    let ctaType: JobDetailViewModel['ctaState']['type'] = 'none';
    let ctaLabel = 'Apply Now';
    let ctaHref: string | undefined;
    let ctaExternal = false;
    let ctaReason: string | undefined;

    if (eligibility.allowed && !isApplied) {
      if (job.company_website) {
        ctaType = 'visit_website';
        ctaLabel = 'Visit Company Website';
        ctaHref = job.company_website;
        ctaExternal = true;
      } else {
        ctaType = isWithdrawn ? 'reapply' : 'apply';
        ctaLabel = isWithdrawn ? 'Re-apply Now' : 'Apply Now';
        ctaHref = `/c/${collegeSlug}/student/jobs/${job.id}/apply`;
      }
    } else if (isApplied && !isDeadlinePassed && job.status === 'open') {
      ctaType = 'edit';
      ctaLabel = 'Edit Application';
      ctaHref = `/c/${collegeSlug}/student/jobs/${job.id}/edit`;
    } else if (!eligibility.allowed && !isApplied) {
      ctaType = 'ineligible';
      ctaReason = eligibility.reason;
    }

    return {
      job,
      application,
      eligibility,
      isApplied,
      isWithdrawn,
      deadlineFormatted,
      isDeadlinePassed,
      isDeadlineUrgent,
      formattedSalary,
      statusConfig,
      hasAnyList,
      ctaState: {
        type: ctaType,
        label: ctaLabel,
        href: ctaHref,
        external: ctaExternal,
        reason: ctaReason,
      },
    };
  }
}

export async function canStudentApplyToJob(
  studentId: string,
  jobId: string,
  collegeId: string,
  isGlobal: boolean
): Promise<{ allowed: boolean; reason?: string }> {
  const [job, existing] = await Promise.all([
    getJobDetail(jobId),
    getStudentApplication(studentId, jobId),
  ]);

  if (!job) return { allowed: false, reason: 'Job not found.' };

  let isCollegeMapped = true;
  if (job.visibility_scope === 'selected_colleges' && collegeId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('job_post_colleges')
      .select('college_id')
      .eq('job_id', jobId)
      .eq('college_id', collegeId)
      .maybeSingle();
    isCollegeMapped = !!data;
  }

  return JobAccessEvaluator.evaluateApplicationEligibility(
    job,
    existing,
    { studentId, collegeId, isGlobal },
    isCollegeMapped
  );
}
