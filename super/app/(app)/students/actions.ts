'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import {
  bulkInviteStudents as bulkInviteStudentsService,
  deleteStudentCredential as deleteStudentCredentialService,
  getPendingStudentInvites as getPendingStudentInvitesService,
  resendTokenStudentInvite as resendTokenStudentInviteService,
  resendLegacyStudentInvite as resendLegacyStudentInviteService,
  inviteStudent as inviteStudentService,
  removeStudentFromCollege as removeStudentFromCollegeService,
  updateStudent as updateStudentService,
  type StudentListItem,
} from '@/lib/services/students';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { logAudit } from '@/lib/services/audit';
import { trackActivity } from '@/lib/activity/emit';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { parseFormData } from '@/lib/validation/form-data';

const emailSchema = z.email();

const inviteStudentSchema = z.object({
  college_id: z.string().trim().min(1, 'College is required.'),
  email: z.string().trim().toLowerCase().refine((value) => emailSchema.safeParse(value).success, {
    message: 'Email is invalid.',
  }),
  full_name: z.string().trim().min(1, 'Full name is required.'),
  student_code: z.string().trim().optional().transform((value) => (value ? value : null)),
  cohort_id: z.string().trim().optional().transform((value) => (value ? value : null)),
  password: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = (value ?? '').trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .refine((value) => value == null || value.length >= 8, {
      message: 'Password must be at least 8 characters when provided.',
    }),
});

const updateStudentSchema = z.object({
  college_id: z.string().trim().min(1, 'College is required.'),
  student_id: z.string().trim().min(1, 'Student is required.'),
  email: z.string().trim().toLowerCase().refine((value) => emailSchema.safeParse(value).success, {
    message: 'Email is invalid.',
  }),
  full_name: z.string().trim().min(1, 'Full name is required.'),
  student_code: z.string().trim().optional().transform((value) => (value ? value : null)),
});

const deleteStudentSchema = z.object({
  college_id: z.string().trim().min(1, 'College is required.'),
  student_id: z.string().trim().min(1, 'Student is required.'),
});
const bulkInviteRowSchema = z.object({
  email: z.string().trim().toLowerCase().refine((value) => emailSchema.safeParse(value).success, {
    message: 'Email is invalid.',
  }),
  full_name: z.string().trim().min(1, 'Full name is required.').max(120, 'Full name is too long.'),
  student_code: z.string().trim().max(50, 'Student code is too long.').nullable().optional(),
});
const bulkInviteSchema = z.object({
  collegeId: z.string().trim().min(1, 'College is required.'),
  rows: z.array(bulkInviteRowSchema).min(1, 'At least one row is required.').max(200, 'Too many rows.'),
});

export type InviteStudentResult = { ok: true } | { ok: false; error: string };
export type BulkInviteStudentsResult =
  | { ok: true; invited: string[]; added: string[]; failed: { email: string; reason: string }[] }
  | { ok: false; error: string };
export type UpdateStudentResult = { ok: true } | { ok: false; error: string };
export type DeleteStudentResult = { ok: true } | { ok: false; error: string };
export type RemoveStudentFromCollegeResult = { ok: true } | { ok: false; error: string };

export async function inviteStudentAction(formData: FormData): Promise<InviteStudentResult> {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return { ok: false, error: authResult.error };
    const user = authResult.user;

    const limited = await consumeRateLimit({ key: `invite-student:${user.id}`, limit: 40, windowMs: 5 * 60 * 1000 });
    if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

    const parsed = parseFormData(inviteStudentSchema, formData);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const inviteResult = await inviteStudentService({
      college_id: parsed.data.college_id,
      email: parsed.data.email,
      full_name: parsed.data.full_name,
      student_code: parsed.data.student_code,
      cohort_id: parsed.data.cohort_id,
      password: parsed.data.password,
    });

    const resourceId = inviteResult.invite_id ?? inviteResult.user_id ?? parsed.data.email;

    await Promise.all([
      logAudit({
        actor_id: user.id,
        action: 'student.invited',
        resource_type: 'student',
        resource_id: resourceId,
        college_id: parsed.data.college_id,
        payload: {
          email: parsed.data.email,
          full_name: parsed.data.full_name,
          invite_id: inviteResult.invite_id ?? null,
          email_sent: inviteResult.email_sent,
        },
      }),
      trackActivity({
        tenantId: parsed.data.college_id,
        actorUserId: user.id,
        actorRole: 'superadmin',
        actorType: 'superadmin',
        eventName: 'student_invited',
        entityType: 'student',
        entityId: resourceId,
        metadata: {
          email: parsed.data.email,
          full_name: parsed.data.full_name,
          invite_id: inviteResult.invite_id ?? null,
        },
      }),
    ]);

    revalidatePath('/students');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to invite student.' };
  }
}

export async function bulkInviteStudentsAction(
  collegeId: string,
  rows: { email: string; full_name: string; student_code?: string | null }[]
): Promise<BulkInviteStudentsResult> {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return { ok: false, error: authResult.error };
    const user = authResult.user;

    const limited = await consumeRateLimit({
      key: `bulk-invite:${user.id}`,
      limit: 10,
      windowMs: 5 * 60 * 1000,
    });
    if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

    const parsed = bulkInviteSchema.safeParse({ collegeId, rows });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

    const { invited, added, failed } = await bulkInviteStudentsService(parsed.data.rows, parsed.data.collegeId);

    revalidatePath('/students');
    revalidatePath('/colleges');
    revalidatePath('/dashboard');
    revalidatePath(`/colleges/${parsed.data.collegeId}`);
    return { ok: true, invited, added, failed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Bulk invite failed.' };
  }
}

export async function updateStudentAction(formData: FormData): Promise<UpdateStudentResult> {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return { ok: false, error: authResult.error };
    const user = authResult.user;

    const limited = await consumeRateLimit({ key: `update-student:${user.id}`, limit: 80, windowMs: 5 * 60 * 1000 });
    if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

    const parsed = parseFormData(updateStudentSchema, formData);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const { user_id } = await updateStudentService({
      college_id: parsed.data.college_id,
      student_id: parsed.data.student_id,
      email: parsed.data.email,
      full_name: parsed.data.full_name,
      student_code: parsed.data.student_code,
    });

    await Promise.all([
      logAudit({
        actor_id: user.id,
        action: 'student.updated',
        resource_type: 'student',
        resource_id: user_id,
        college_id: parsed.data.college_id,
        payload: { student_id: parsed.data.student_id, email: parsed.data.email, full_name: parsed.data.full_name },
      }),
      trackActivity({
        tenantId: parsed.data.college_id,
        actorUserId: user.id,
        actorRole: 'superadmin',
        actorType: 'superadmin',
        eventName: 'student_updated',
        entityType: 'student',
        entityId: parsed.data.student_id,
        metadata: { email: parsed.data.email, full_name: parsed.data.full_name },
      }),
    ]);

    revalidatePath('/students');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to update student.' };
  }
}

export async function removeStudentFromCollegeAction(formData: FormData): Promise<RemoveStudentFromCollegeResult> {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return { ok: false, error: authResult.error };
    const user = authResult.user;

    const limited = await consumeRateLimit({ key: `remove-student:${user.id}`, limit: 40, windowMs: 5 * 60 * 1000 });
    if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

    const parsed = parseFormData(deleteStudentSchema, formData);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const { user_id } = await removeStudentFromCollegeService(parsed.data.college_id, parsed.data.student_id);

    await logAudit({
      actor_id: user.id,
      action: 'student.removed_from_college',
      resource_type: 'student',
      resource_id: user_id,
      college_id: parsed.data.college_id,
      payload: { student_id: parsed.data.student_id },
    });

    revalidatePath('/students');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to remove student from college.' };
  }
}

export async function deleteStudentAction(formData: FormData): Promise<DeleteStudentResult> {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return { ok: false, error: authResult.error };
    const user = authResult.user;

    const limited = await consumeRateLimit({ key: `delete-student:${user.id}`, limit: 40, windowMs: 5 * 60 * 1000 });
    if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

    const parsed = parseFormData(deleteStudentSchema, formData);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const { user_id } = await deleteStudentCredentialService(parsed.data.college_id, parsed.data.student_id);

    await Promise.all([
      logAudit({
        actor_id: user.id,
        action: 'student.deleted',
        resource_type: 'student',
        resource_id: user_id,
        college_id: parsed.data.college_id,
        payload: { student_id: parsed.data.student_id },
      }),
      trackActivity({
        tenantId: parsed.data.college_id,
        actorUserId: user.id,
        actorRole: 'superadmin',
        actorType: 'superadmin',
        eventName: 'student_deleted',
        entityType: 'student',
        entityId: parsed.data.student_id,
        metadata: {},
      }),
    ]);

    // Invalidate only after the full delete path succeeded.
    revalidatePath('/students');
    revalidateTag(`student-${user_id}`, 'max');
    revalidateTag('entitlements', 'max');
    revalidateTag(`ambassador-status-${user_id}`, 'max');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to delete student.' };
  }
}


export async function getPendingStudentInvitesAction(): Promise<{ ok: true; invites: StudentListItem[] } | { ok: false; error: string }> {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return { ok: false, error: authResult.error };

    const invites = await getPendingStudentInvitesService();
    return { ok: true, invites };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to fetch pending invites.' };
  }
}

export async function resendStudentInviteAction(
  input: { inviteId: string } | { legacyUserId: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return { ok: false, error: authResult.error };
    const user = authResult.user;

    const limited = await consumeRateLimit({ key: `resend-invite:${user.id}`, limit: 20, windowMs: 5 * 60 * 1000 });
    if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

    const resourceId = 'inviteId' in input ? input.inviteId : input.legacyUserId;
    if ('inviteId' in input) {
      await resendTokenStudentInviteService(input.inviteId);
    } else {
      await resendLegacyStudentInviteService(input.legacyUserId);
    }

    await logAudit({
      actor_id: user.id,
      action: 'student.invite_resent',
      resource_type: 'student',
      resource_id: resourceId,
      payload: input,
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to resend invite.' };
  }
}

export async function getStudentAnalyticsAction(studentId: string, collegeId: string) {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return { ok: false, error: authResult.error, data: null };
    const { getStudentLearningAnalytics } = await import('@/lib/superadmin/learning-analytics');
    const data = await getStudentLearningAnalytics(collegeId, studentId);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load analytics.', data: null };
  }
}
