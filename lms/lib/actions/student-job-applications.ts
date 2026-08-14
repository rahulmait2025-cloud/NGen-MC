'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-student-action';
import { createAdminClient } from '@/lib/supabase/admin';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import {
  getStudentApplication,
  canStudentApplyToJob,
} from '@/lib/services/student-jobs';
import { trackActivity } from '@/lib/activity/emit';

export type ActionResponse = {
  success: boolean;
  error?: string;
  data?: { applicationId?: string; jobId?: string };
};

/**
 * Deep Module: JobApplicationCacheAdapter
 * Hides multi-step cache invalidation and activity audit event logging behind one unified seam.
 */
export async function invalidateAndTrackJobApplication(options: {
  collegeSlug: string;
  collegeId: string;
  studentId: string;
  userId: string;
  jobId: string;
  applicationId: string;
  eventName: 'job_post_applied' | 'job_post_reapplied' | 'job_post_application_updated' | 'job_post_application_withdrawn';
}): Promise<void> {
  revalidatePath(`/c/${options.collegeSlug}/student/jobs`);
  revalidatePath(`/c/${options.collegeSlug}/student/my-applications`);
  revalidateTag(`student-applications-${options.studentId}`, 'max');
  revalidateTag(`student-job-application-${options.studentId}-${options.jobId}`, 'max');

  void trackActivity({
    tenantId: options.collegeId,
    actorUserId: options.userId,
    actorRole: 'student',
    eventName: options.eventName,
    entityType: 'job_application',
    entityId: options.applicationId,
    metadata: { job_id: options.jobId, student_id: options.studentId },
  });
}

export async function applyToJobAction(
  collegeSlug: string,
  jobId: string,
  formData: FormData
): Promise<ActionResponse> {
  const auth = await requireAuth(collegeSlug);
  if (!auth) return { success: false, error: 'Not authenticated.' };

  const limited = await consumeRateLimit({
    key: `student-job-apply:${auth.user.id}`,
    limit: 20,
    windowMs: 5 * 60 * 1000,
  });
  if (!limited.ok) {
    return { success: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };
  }

  const isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(
    auth.tenant.slug.toLowerCase()
  );
  const [canApply, existing] = await Promise.all([
    canStudentApplyToJob(auth.studentId, jobId, auth.membership.collegeId, isGlobal),
    getStudentApplication(auth.studentId, jobId),
  ]);
  if (!canApply.allowed) {
    return { success: false, error: canApply.reason };
  }

  if (existing && existing.status !== 'withdrawn') {
    return { success: false, error: 'You have already applied to this job.' };
  }

  const resumeUrl = (formData.get('resume_url') as string)?.trim();
  if (!resumeUrl) return { success: false, error: 'Please provide your resume link.' };

  const supabase = createAdminClient();

  if (existing && existing.status === 'withdrawn') {
    const { error: updateError } = await supabase
      .from('job_applications')
      .update({
        status: 'applied',
        withdrawn_at: null,
        applied_at: new Date().toISOString(),
        resume_path: resumeUrl,
        cover_note: (formData.get('cover_note') as string)?.trim() || null,
        github_url: (formData.get('github_url') as string)?.trim() || null,
        linkedin_url: (formData.get('linkedin_url') as string)?.trim() || null,
        portfolio_url: (formData.get('portfolio_url') as string)?.trim() || null,
        last_edited_at: null,
        reviewed_by: null,
        reviewed_at: null,
        admin_notes: null,
        rejection_reason: null,
      })
      .eq('id', existing.id);

    if (updateError) {
      return { success: false, error: 'Failed to update application.' };
    }

    await invalidateAndTrackJobApplication({
      collegeSlug,
      collegeId: auth.membership.collegeId,
      studentId: auth.studentId,
      userId: auth.user.id,
      jobId,
      applicationId: existing.id,
      eventName: 'job_post_reapplied',
    });

    return { success: true, data: { applicationId: existing.id, jobId } };
  }

  const { data: insertedApp, error: insertError } = await supabase
    .from('job_applications')
    .insert({
      job_id: jobId,
      student_id: auth.studentId,
      user_id: auth.user.id,
      college_id: auth.membership.collegeId,
      status: 'applied',
      resume_path: resumeUrl,
      cover_note: (formData.get('cover_note') as string)?.trim() || null,
      github_url: (formData.get('github_url') as string)?.trim() || null,
      linkedin_url: (formData.get('linkedin_url') as string)?.trim() || null,
      portfolio_url: (formData.get('portfolio_url') as string)?.trim() || null,
    })
    .select('id')
    .single();

  if (insertError || !insertedApp) {
    return { success: false, error: 'Failed to create application.' };
  }

  await invalidateAndTrackJobApplication({
    collegeSlug,
    collegeId: auth.membership.collegeId,
    studentId: auth.studentId,
    userId: auth.user.id,
    jobId,
    applicationId: insertedApp.id,
    eventName: 'job_post_applied',
  });

  return { success: true, data: { applicationId: insertedApp.id, jobId } };
}

export async function editApplicationAction(
  collegeSlug: string,
  applicationId: string,
  formData: FormData
): Promise<ActionResponse> {
  const auth = await requireAuth(collegeSlug);
  if (!auth) return { success: false, error: 'Not authenticated.' };

  const supabase = createAdminClient();
  const { data: existing, error: fetchError } = await supabase
    .from('job_applications')
    .select('id, student_id, status, job_id, student_edit_count')
    .eq('id', applicationId)
    .single();

  if (fetchError || !existing) return { success: false, error: 'Application not found.' };
  if (existing.student_id !== auth.studentId) return { success: false, error: 'Access denied.' };
  if (existing.status === 'withdrawn') return { success: false, error: 'Cannot edit a withdrawn application.' };

  const { data: job } = await supabase
    .from('job_posts')
    .select('status')
    .eq('id', existing.job_id)
    .single();

  if (!job || job.status !== 'open') {
    return { success: false, error: 'This job is no longer open.' };
  }

  const { error: updateError } = await supabase
    .from('job_applications')
    .update({
      cover_note: (formData.get('cover_note') as string)?.trim() || null,
      github_url: (formData.get('github_url') as string)?.trim() || null,
      linkedin_url: (formData.get('linkedin_url') as string)?.trim() || null,
      portfolio_url: (formData.get('portfolio_url') as string)?.trim() || null,
      last_edited_at: new Date().toISOString(),
      student_edit_count: (existing.student_edit_count ?? 0) + 1,
    })
    .eq('id', applicationId);

  if (updateError) return { success: false, error: 'Failed to update application.' };

  await invalidateAndTrackJobApplication({
    collegeSlug,
    collegeId: auth.membership.collegeId,
    studentId: auth.studentId,
    userId: auth.user.id,
    jobId: existing.job_id,
    applicationId,
    eventName: 'job_post_application_updated',
  });

  return { success: true, data: { applicationId } };
}

export async function withdrawApplicationAction(
  collegeSlug: string,
  applicationId: string
): Promise<ActionResponse> {
  const auth = await requireAuth(collegeSlug);
  if (!auth) return { success: false, error: 'Not authenticated.' };

  const limited = await consumeRateLimit({
    key: `student-job-withdraw:${auth.user.id}`,
    limit: 10,
    windowMs: 5 * 60 * 1000,
  });
  if (!limited.ok) {
    return { success: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };
  }

  const supabase = createAdminClient();
  const { data: existing, error: fetchError } = await supabase
    .from('job_applications')
    .select('id, student_id, status, resume_path, job_id')
    .eq('id', applicationId)
    .single();

  if (fetchError || !existing) return { success: false, error: 'Application not found.' };
  if (existing.student_id !== auth.studentId) return { success: false, error: 'Access denied.' };
  if (existing.status === 'withdrawn') return { success: false, error: 'Application is already withdrawn.' };

  const { error: updateError } = await supabase
    .from('job_applications')
    .update({
      status: 'withdrawn',
      withdrawn_at: new Date().toISOString(),
      resume_path: null,
      resume_file_name: null,
      resume_size_bytes: null,
      resume_mime_type: null,
    })
    .eq('id', applicationId);

  if (updateError) return { success: false, error: 'Failed to withdraw application.' };

  await invalidateAndTrackJobApplication({
    collegeSlug,
    collegeId: auth.membership.collegeId,
    studentId: auth.studentId,
    userId: auth.user.id,
    jobId: existing.job_id,
    applicationId,
    eventName: 'job_post_application_withdrawn',
  });

  return { success: true };
}
