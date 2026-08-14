import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { OrderWithItems } from '@/types/payments';

export type ResolvedOrderActors = {
  authUserId: string | null;
  studentId: string | null;
  authUserIdSource: string;
  studentIdSource: string;
};

/** FK target for lms_invoices.user_id and lms_email_outbox.user_id */
const LMS_INVOICE_USER_FK_TARGET = 'auth.users(id)';

async function authUserExists(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<boolean> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  return !error && Boolean(data?.user?.id);
}

/**
 * Resolve auth.users id + students.id for an order.
 * Legacy LMS orders stored students.id in purchaser_user_id; schema/RLS expect auth uid.
 */
export async function resolveOrderActors(order: OrderWithItems): Promise<ResolvedOrderActors> {
  const admin = createAdminClient();
  const metadata = (order.metadata ?? {}) as Record<string, unknown>;
  const metaStudentId =
    typeof metadata.student_id === 'string' ? metadata.student_id : null;

  const purchaserRef = order.purchaser_user_id?.trim() || null;

  if (!purchaserRef) {
    if (metaStudentId) {
      const { data: student } = await admin
        .from('students')
        .select('id, user_id')
        .eq('id', metaStudentId)
        .maybeSingle();
      if (student?.user_id) {
        return {
          authUserId: student.user_id as string,
          studentId: student.id as string,
          authUserIdSource: 'students.user_id via metadata.student_id',
          studentIdSource: 'metadata.student_id',
        };
      }
    }
    return {
      authUserId: null,
      studentId: metaStudentId,
      authUserIdSource: 'unresolved',
      studentIdSource: metaStudentId ? 'metadata.student_id' : 'none',
    };
  }

  if (await authUserExists(admin, purchaserRef)) {
    const { data: student } = await admin
      .from('students')
      .select('id, user_id')
      .eq('user_id', purchaserRef)
      .maybeSingle();

    return {
      authUserId: purchaserRef,
      studentId: metaStudentId ?? (student?.id as string | undefined) ?? null,
      authUserIdSource: 'order.purchaser_user_id as auth.users.id',
      studentIdSource: metaStudentId
        ? 'metadata.student_id'
        : student?.id
          ? 'students.id via user_id'
          : 'none',
    };
  }

  const { data: studentById } = await admin
    .from('students')
    .select('id, user_id')
    .eq('id', purchaserRef)
    .maybeSingle();

  if (studentById?.user_id) {
    return {
      authUserId: studentById.user_id as string,
      studentId: studentById.id as string,
      authUserIdSource: 'students.user_id via order.purchaser_user_id as students.id',
      studentIdSource: 'order.purchaser_user_id as students.id',
    };
  }

  if (metaStudentId) {
    const { data: student } = await admin
      .from('students')
      .select('id, user_id')
      .eq('id', metaStudentId)
      .maybeSingle();
    if (student?.user_id) {
      return {
        authUserId: student.user_id as string,
        studentId: student.id as string,
        authUserIdSource: 'students.user_id via metadata.student_id (purchaser_user_id unmatched)',
        studentIdSource: 'metadata.student_id',
      };
    }
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', order.purchaser_email)
    .maybeSingle();

  if (profile?.id && (await authUserExists(admin, profile.id as string))) {
    const { data: student } = await admin
      .from('students')
      .select('id')
      .eq('user_id', profile.id)
      .limit(1)
      .maybeSingle();

    return {
      authUserId: profile.id as string,
      studentId: metaStudentId ?? (student?.id as string | undefined) ?? null,
      authUserIdSource: 'profiles.id via purchaser_email',
      studentIdSource: student?.id ? 'students.id via profile' : 'metadata or none',
    };
  }

  return {
    authUserId: null,
    studentId: metaStudentId ?? purchaserRef,
    authUserIdSource: 'unresolved',
    studentIdSource: metaStudentId ? 'metadata.student_id' : 'order.purchaser_user_id (orphan)',
  };
}

export async function logInvoiceActorDebug(
  orderId: string,
  actors: ResolvedOrderActors,
  rawPurchaserUserId: string | null,
): Promise<void> {
  const admin = createAdminClient();
  let authUserExistsInFk = false;
  if (actors.authUserId) {
    authUserExistsInFk = await authUserExists(admin, actors.authUserId);
  }

  let studentExists = false;
  if (actors.studentId) {
    const { data } = await admin.from('students').select('id').eq('id', actors.studentId).maybeSingle();
    studentExists = Boolean(data?.id);
  }

  console.info('[lms-invoices] actor resolve', {
    orderId,
    invoiceUserId: actors.authUserId,
    invoiceUserIdSource: actors.authUserIdSource,
    studentId: actors.studentId,
    studentIdSource: actors.studentIdSource,
    fkTarget: LMS_INVOICE_USER_FK_TARGET,
    authUserExistsInFk,
    studentExists,
    rawPurchaserUserId,
  });
}
