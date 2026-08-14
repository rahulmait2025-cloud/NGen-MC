import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApplicationStatus } from './applicant-queries';

export async function updateApplicationStatus(
  applicationId: string,
  newStatus: ApplicationStatus,
  changedByUserId: string,
  note?: string | null,
  rejectionReason?: string | null
): Promise<void> {
  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from('job_applications')
    .select('id, status')
    .eq('id', applicationId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error('Application not found.');

  const oldStatus = existing.status;

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    reviewed_by: changedByUserId,
    reviewed_at: new Date().toISOString(),
  };

  if (newStatus === 'rejected' && rejectionReason) {
    updatePayload.rejection_reason = rejectionReason;
  }

  if (note) {
    updatePayload.admin_notes = note;
  }

  const { error: updateError } = await admin
    .from('job_applications')
    .update(updatePayload)
    .eq('id', applicationId);

  if (updateError) throw new Error(updateError.message);

  const { error: historyError } = await admin
    .from('job_application_status_history')
    .insert({
      application_id: applicationId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changedByUserId,
      actor_role: 'superadmin',
      note: note ?? null,
    });

  if (historyError) throw new Error(historyError.message);
}

export async function updateApplicationNotes(
  applicationId: string,
  adminNotes: string | null,
  updatedByUserId: string
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('job_applications')
    .update({
      admin_notes: adminNotes,
      reviewed_by: updatedByUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (error) throw new Error(error.message);
}

export async function updateRejectionReason(
  applicationId: string,
  rejectionReason: string | null,
  updatedByUserId: string
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('job_applications')
    .update({
      rejection_reason: rejectionReason,
      reviewed_by: updatedByUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (error) throw new Error(error.message);
}
