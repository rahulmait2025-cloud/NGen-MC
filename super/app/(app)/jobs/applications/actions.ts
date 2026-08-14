'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { updateApplicationStatus, updateApplicationNotes, updateRejectionReason } from '@/lib/superadmin/jobs/applicant-mutations';
import { getApplicationById } from '@/lib/superadmin/jobs/applicant-queries';
import type { ApplicationStatus } from '@/lib/superadmin/jobs/applicant-queries';
import { trackActivity } from '@/lib/activity/emit';

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function updateApplicationStatusAction(
  applicationId: string,
  newStatus: ApplicationStatus,
  note?: string,
  rejectionReason?: string
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const appBefore = await getApplicationById(applicationId);

    await updateApplicationStatus(
      applicationId,
      newStatus,
      authCheck.user.id,
      note || null,
      rejectionReason || null
    );

    const eventName = newStatus === 'shortlisted' ? 'job_post_shortlisted'
      : newStatus === 'selected' ? 'job_post_selected'
      : newStatus === 'rejected' ? 'job_post_rejected'
      : 'job_post_status_changed';

    void trackActivity({
      tenantId: appBefore?.college_id ?? null,
      actorUserId: authCheck.user.id,
      actorRole: 'superadmin',
      eventName,
      entityType: 'job_application',
      entityId: applicationId,
      metadata: {
        job_id: appBefore?.job_id,
        student_id: appBefore?.student_id,
        old_status: appBefore?.status,
        new_status: newStatus,
      },
    });

    revalidatePath('/jobs');
    revalidatePath('/jobs/applications');
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to update status.',
    };
  }
}

export async function updateApplicationNotesAction(
  applicationId: string,
  adminNotes: string
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    await updateApplicationNotes(applicationId, adminNotes || null, authCheck.user.id);

    revalidatePath('/jobs/applications');
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to update notes.',
    };
  }
}

export async function updateRejectionReasonAction(
  applicationId: string,
  rejectionReason: string
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    await updateRejectionReason(applicationId, rejectionReason || null, authCheck.user.id);

    revalidatePath('/jobs/applications');
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to update rejection reason.',
    };
  }
}

export async function getResumeSignedUrlAction(
  resumePath: string
): Promise<ActionResponse<{ url: string }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    // If it's already a URL (http/https), return it directly
    if (resumePath.startsWith('http://') || resumePath.startsWith('https://')) {
      return { success: true, data: { url: resumePath } };
    }

    return { success: false, error: 'Invalid resume link.' };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to generate resume link.',
    };
  }
}
