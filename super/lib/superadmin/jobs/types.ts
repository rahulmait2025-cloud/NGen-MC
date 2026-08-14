import type { JobPostsRow } from '@/types/database';

export type JobStatus = JobPostsRow['status'];
export type JobVisibilityScope = JobPostsRow['visibility_scope'];
export type JobWorkMode = NonNullable<JobPostsRow['work_mode']>;
export type JobEmploymentType = NonNullable<JobPostsRow['employment_type']>;

export type JobPost = JobPostsRow;

export interface JobPostCollegesRow {
  job_id: string;
  college_id: string;
}

export interface JobPostWithColleges extends JobPost {
  colleges?: { college_id: string; college_name: string }[];
}

export type JobListItem = Pick<
  JobPostsRow,
  | 'id'
  | 'title'
  | 'company_name'
  | 'status'
  | 'visibility_scope'
  | 'work_mode'
  | 'employment_type'
  | 'application_deadline'
  | 'created_at'
  | 'published_at'
>;

export interface CreateJobInput {
  title: string;
  company_name: string;
  company_website?: string | null;
  company_about?: string | null;
  location?: string | null;
  work_mode?: JobWorkMode | null;
  employment_type?: JobEmploymentType | null;
  experience_level?: string | null;
  salary_min_minor?: number | null;
  salary_max_minor?: number | null;
  salary_currency?: string;
  openings?: number | null;
  application_deadline?: string | null;
  description: string;
  responsibilities?: string[];
  requirements?: string[];
  skills?: string[];
  perks?: string[];
  status?: JobStatus;
  visibility_scope?: JobVisibilityScope;
  selected_college_ids?: string[];
}

export interface UpdateJobInput {
  id: string;
  title: string;
  company_name: string;
  company_website?: string | null;
  company_about?: string | null;
  location?: string | null;
  work_mode?: JobWorkMode | null;
  employment_type?: JobEmploymentType | null;
  experience_level?: string | null;
  salary_min_minor?: number | null;
  salary_max_minor?: number | null;
  salary_currency?: string;
  openings?: number | null;
  application_deadline?: string | null;
  description: string;
  responsibilities?: string[];
  requirements?: string[];
  skills?: string[];
  perks?: string[];
  status?: JobStatus;
  visibility_scope?: JobVisibilityScope;
  selected_college_ids?: string[];
}

export interface ListJobsOptions {
  page?: number;
  limit?: number;
  status?: JobStatus | 'all';
  search?: string;
}
