'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { createJob, updateJob, updateJobStatus, deleteJob } from '@/lib/superadmin/jobs/mutations';
import { createJobSchema, updateJobSchema } from '@/lib/superadmin/jobs/validators';
import type { JobStatus } from '@/lib/superadmin/jobs/types';

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

function formDataToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      obj[key] = value;
    }
  }
  return obj;
}

export async function createJobAction(
  formData: FormData
): Promise<ActionResponse<{ id: string }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const raw = formDataToObject(formData);
    const parsed = createJobSchema.safeParse(raw);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid input.';
      return { success: false, error: message };
    }

    const result = await createJob(parsed.data, authCheck.user.id);

    revalidatePath('/jobs');
    return { success: true, data: result };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to create job.',
    };
  }
}

export async function updateJobAction(
  jobId: string,
  formData: FormData
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const raw = formDataToObject(formData);
    const parsed = updateJobSchema.safeParse(raw);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid input.';
      return { success: false, error: message };
    }

    await updateJob({ ...parsed.data, id: jobId }, authCheck.user.id);

    revalidatePath('/jobs');
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath(`/jobs/${jobId}/edit`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to update job.',
    };
  }
}

export async function updateJobStatusAction(
  jobId: string,
  newStatus: JobStatus
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    await updateJobStatus(jobId, newStatus, authCheck.user.id);

    revalidatePath('/jobs');
    revalidatePath(`/jobs/${jobId}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to update job status.',
    };
  }
}

export async function deleteJobAction(
  jobId: string
): Promise<ActionResponse<void>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    await deleteJob(jobId);

    revalidatePath('/jobs');
    revalidatePath(`/jobs/${jobId}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to delete job.',
    };
  }
}
