import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  CreateJobInput,
  UpdateJobInput,
  JobStatus,
} from './types';

export async function createJob(
  input: CreateJobInput,
  createdByUserId: string
): Promise<{ id: string }> {
  const admin = createAdminClient();

  const now = new Date().toISOString();
  const shouldPublish = input.status === 'open';

  const { data: job, error: jobError } = await admin
    .from('job_posts')
    .insert({
      title: input.title,
      company_name: input.company_name,
      company_website: input.company_website ?? null,
      company_about: input.company_about ?? null,
      location: input.location ?? null,
      work_mode: input.work_mode ?? null,
      employment_type: input.employment_type ?? null,
      experience_level: input.experience_level ?? null,
      salary_min_minor: input.salary_min_minor ?? null,
      salary_max_minor: input.salary_max_minor ?? null,
      salary_currency: input.salary_currency ?? 'INR',
      openings: input.openings ?? null,
      application_deadline: input.application_deadline ?? null,
      description: input.description,
      responsibilities: input.responsibilities ?? [],
      requirements: input.requirements ?? [],
      skills: input.skills ?? [],
      perks: input.perks ?? [],
      status: input.status ?? 'draft',
      visibility_scope: input.visibility_scope ?? 'all_lms',
      created_by: createdByUserId,
      updated_by: createdByUserId,
      published_at: shouldPublish ? now : null,
    })
    .select('id')
    .single();

  if (jobError) throw new Error(jobError.message);

  if (input.visibility_scope === 'selected_colleges' && input.selected_college_ids?.length) {
    const collegeRows = input.selected_college_ids.map((collegeId) => ({
      job_id: job.id,
      college_id: collegeId,
    }));
    const { error: collegeError } = await admin
      .from('job_post_colleges')
      .insert(collegeRows);
    if (collegeError) throw new Error(collegeError.message);
  }

  return { id: job.id };
}

export async function updateJob(
  input: UpdateJobInput,
  updatedByUserId: string
): Promise<void> {
  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from('job_posts')
    .select('status, published_at')
    .eq('id', input.id)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error('Job not found.');

  const shouldPublish = input.status === 'open' && !existing.published_at;

  const { error: updateError } = await admin
    .from('job_posts')
    .update({
      title: input.title,
      company_name: input.company_name,
      company_website: input.company_website ?? null,
      company_about: input.company_about ?? null,
      location: input.location ?? null,
      work_mode: input.work_mode ?? null,
      employment_type: input.employment_type ?? null,
      experience_level: input.experience_level ?? null,
      salary_min_minor: input.salary_min_minor ?? null,
      salary_max_minor: input.salary_max_minor ?? null,
      salary_currency: input.salary_currency ?? 'INR',
      openings: input.openings ?? null,
      application_deadline: input.application_deadline ?? null,
      description: input.description,
      responsibilities: input.responsibilities ?? [],
      requirements: input.requirements ?? [],
      skills: input.skills ?? [],
      perks: input.perks ?? [],
      status: input.status ?? 'draft',
      visibility_scope: input.visibility_scope ?? 'all_lms',
      updated_by: updatedByUserId,
      published_at: shouldPublish ? new Date().toISOString() : existing.published_at,
    })
    .eq('id', input.id);

  if (updateError) throw new Error(updateError.message);

  if (input.visibility_scope === 'selected_colleges') {
    await admin.from('job_post_colleges').delete().eq('job_id', input.id);
    if (input.selected_college_ids?.length) {
      const collegeRows = input.selected_college_ids.map((collegeId) => ({
        job_id: input.id,
        college_id: collegeId,
      }));
      const { error: collegeError } = await admin
        .from('job_post_colleges')
        .insert(collegeRows);
      if (collegeError) throw new Error(collegeError.message);
    }
  } else {
    await admin.from('job_post_colleges').delete().eq('job_id', input.id);
  }
}

export async function updateJobStatus(
  jobId: string,
  newStatus: JobStatus,
  updatedByUserId: string
): Promise<void> {
  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from('job_posts')
    .select('status, published_at')
    .eq('id', jobId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error('Job not found.');

  const shouldPublish = newStatus === 'open' && !existing.published_at;

  const { error } = await admin
    .from('job_posts')
    .update({
      status: newStatus,
      updated_by: updatedByUserId,
      published_at: shouldPublish ? new Date().toISOString() : existing.published_at,
    })
    .eq('id', jobId);

  if (error) throw new Error(error.message);
}

export async function deleteJob(jobId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('job_posts')
    .delete()
    .eq('id', jobId);

  if (error) throw new Error(error.message);
}
