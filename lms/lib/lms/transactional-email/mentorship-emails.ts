import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getStudentAppBaseUrl } from '@/lib/lms/transactional-email/student-app-base-url';
import { queueAndMaybeProcessLmsEmail } from './processor';
import {
  buildMentorshipAdminBookingIdempotencyKey,
  buildMentorshipAdminBookingNotificationEmail,
  buildMentorshipAdminRescheduleIdempotencyKey,
  buildMentorshipAdminRescheduleNotificationEmail,
  buildMentorshipBookingConfirmedEmail,
  buildMentorshipReminderEmail,
  buildMentorshipRescheduleConfirmedEmail,
  buildMentorshipRescheduleIdempotencyKey,
  buildMentorshipSessionCompletedEmail,
} from './templates/mentorship-emails';

function getMentorshipDashboardUrl(): string {
  return `${getStudentAppBaseUrl()}/mentorship`;
}

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? 'support@nextgencto.com';

/** Server-only admin recipient for mentorship booking/reschedule alerts. */
export function getMentorshipAdminNotificationEmail(): string | null {
  const email = process.env.MENTORSHIP_ADMIN_NOTIFICATION_EMAIL?.trim();
  return email || null;
}

async function resolveStudentInfo(userId: string): Promise<{ name: string; email: string }> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .maybeSingle();

  const name = profile?.full_name ?? 'Student';
  let email = profile?.email?.trim() ?? '';

  if (!email) {
    // Profile row may be missing/stale — fall back to the auth.users record.
    const { data: authUser, error: authError } = await admin.auth.admin.getUserById(userId);
    if (!authError && authUser?.user?.email) {
      email = authUser.user.email;
    }
  }

  if (!email) {
    console.warn('[lms-email/mentorship] unable to resolve recipient email for user', { userId });
  }

  return { name, email };
}

async function resolveCategoryTitle(categoryId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('paid_mentorship_categories')
    .select('title')
    .eq('id', categoryId)
    .maybeSingle();
  return data?.title ?? 'Mentorship Session';
}

async function resolveInvoiceForPaidOrder(orderId: string): Promise<{
  invoiceNumber?: string;
  downloadUrl?: string;
  invoiceId?: string;
}> {
  try {
    const { createOrGetInvoiceForPaidOrder } = await import('@/lib/lms/billing/invoices');
    const result = await createOrGetInvoiceForPaidOrder(orderId);
    return {
      invoiceId: result.invoice.id,
      invoiceNumber: result.invoice.invoice_number,
      downloadUrl: result.downloadUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[lms-email/mentorship] invoice failed (payment email still sends)', {
      orderId,
      error: message,
    });
    return {};
  }
}

// ─── 1. Payment Confirmation ─────────────────────────────────────────────────

export async function sendMentorshipPaymentConfirmation(params: {
  userId: string;
  categoryTitle: string;
  categoryId?: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  orderId: string;
  totalMinor: number;
  invoiceDownloadUrl?: string | null;
  invoiceNumber?: string | null;
  paymentId?: string | null;
  /** When true, create/reuse LMS invoice for this paid order before emailing. */
  createInvoice?: boolean;
}): Promise<void> {
  const student = await resolveStudentInfo(params.userId);
  if (!student.email) {
    console.error('[lms-email/mentorship] missing recipient email', {
      userId: params.userId,
      orderId: params.orderId,
    });
    return;
  }

  let categoryTitle = params.categoryTitle?.trim();
  if (!categoryTitle && params.categoryId) {
    categoryTitle = await resolveCategoryTitle(params.categoryId);
  }
  if (!categoryTitle) {
    categoryTitle = 'Mentorship Session';
  }

  let invoiceDownloadUrl = params.invoiceDownloadUrl ?? null;
  let invoiceNumber = params.invoiceNumber ?? null;
  let invoiceId: string | undefined;

  if (params.createInvoice !== false && params.totalMinor > 0 && !invoiceDownloadUrl) {
    const created = await resolveInvoiceForPaidOrder(params.orderId);
    invoiceDownloadUrl = created.downloadUrl ?? null;
    invoiceNumber = created.invoiceNumber ?? null;
    invoiceId = created.invoiceId;
  }

  const scheduleInformation = `${params.sessionDate} · ${params.startTime}–${params.endTime} IST`;

  const { buildPaymentConfirmationEmail } = await import('./templates/payment-confirmation');
  const content = buildPaymentConfirmationEmail({
    purchaserName: student.name,
    entityName: categoryTitle,
    entityLabel: 'Mentorship',
    purchaseTypeLabel: 'Mentorship',
    orderId: params.orderId,
    invoiceNumber,
    totalMinor: params.totalMinor,
    paidAtLabel: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    invoiceDownloadUrl,
    dashboardUrl: getMentorshipDashboardUrl(),
    primaryCtaUrl: getMentorshipDashboardUrl(),
    primaryCtaLabel: 'View Mentorship Schedule',
    paymentId: params.paymentId ?? undefined,
    scheduleInformation,
    accessMessage:
      'Your mentorship payment is confirmed. Booking confirmation with schedule details follows once your session is finalized.',
    supportEmail: SUPPORT_EMAIL,
  });

  await queueAndMaybeProcessLmsEmail({
    eventType: 'mentorship_payment_confirmation',
    userId: params.userId,
    orderId: params.orderId,
    invoiceId,
    toEmail: student.email,
    subject: content.subject,
    htmlBody: content.html,
    textBody: content.text,
    category: 'mentorship_payment_confirmation',
    idempotencyKey: `mentorship_payment:order:${params.orderId}`,
    metadata: { entity_type: 'paid_mentorship_booking' },
  });
  console.info('[lms-email/mentorship] payment email enqueue attempted', { orderId: params.orderId });
}

// ─── 2. Booking Confirmed (learner + admin) ──────────────────────────────────

export async function sendMentorshipBookingConfirmed(params: {
  userId: string;
  categoryId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  meetingUrl?: string | null;
  orderId: string;
  bookingId: string;
}): Promise<void> {
  const student = await resolveStudentInfo(params.userId);
  if (!student.email) {
    // Booking/payment must remain successful when email cannot be resolved.
    // Structured redacted log for SuperAdmin/ops; do not throw into webhook/confirm paths.
    console.error('[lms-email/mentorship] booking confirmation skipped — no recipient email', {
      bookingId: params.bookingId,
      orderId: params.orderId,
      reason: 'missing_profile_and_auth_email',
    });
    return;
  }

  const categoryTitle = await resolveCategoryTitle(params.categoryId);

  const content = buildMentorshipBookingConfirmedEmail({
    studentName: student.name,
    categoryTitle,
    sessionDate: params.sessionDate,
    startTime: params.startTime,
    endTime: params.endTime,
    meetingUrl: params.meetingUrl,
    dashboardUrl: getMentorshipDashboardUrl(),
    supportEmail: SUPPORT_EMAIL,
  });

  try {
    await queueAndMaybeProcessLmsEmail({
      eventType: 'mentorship_booking_confirmed',
      userId: params.userId,
      orderId: params.orderId,
      toEmail: student.email,
      subject: content.subject,
      htmlBody: content.html,
      textBody: content.text,
      category: 'mentorship_booking_confirmed',
      // Booking-scoped so free/admin-created bookings without an order still
      // dedupe correctly; the order id is retained in metadata for traceability.
      idempotencyKey: `mentorship_confirmed:booking:${params.bookingId}`,
      metadata: { entity_type: 'paid_mentorship_booking', booking_id: params.bookingId, order_id: params.orderId },
    });
  } catch (err) {
    console.error('[lms-email/mentorship] booking confirmation queue failed', {
      bookingId: params.bookingId,
      orderId: params.orderId,
      reason: err instanceof Error ? err.message : 'queue_failed',
    });
    return;
  }

  void sendMentorshipAdminBookingNotification({
    studentName: student.name,
    studentEmail: student.email,
    categoryId: params.categoryId,
    categoryTitle,
    sessionDate: params.sessionDate,
    startTime: params.startTime,
    endTime: params.endTime,
    meetingUrl: params.meetingUrl,
    orderId: params.orderId,
    bookingId: params.bookingId,
  });
}

export async function sendMentorshipAdminBookingNotification(params: {
  studentName: string;
  studentEmail: string;
  categoryId: string;
  categoryTitle?: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  meetingUrl?: string | null;
  orderId?: string | null;
  bookingId: string;
}): Promise<void> {
  const adminEmail = getMentorshipAdminNotificationEmail();
  if (!adminEmail) {
    console.warn('[lms-email/mentorship] admin booking notification skipped — MENTORSHIP_ADMIN_NOTIFICATION_EMAIL unset');
    return;
  }

  const categoryTitle =
    params.categoryTitle?.trim() || (await resolveCategoryTitle(params.categoryId));

  const content = buildMentorshipAdminBookingNotificationEmail({
    studentName: params.studentName,
    studentEmail: params.studentEmail,
    categoryTitle,
    sessionDate: params.sessionDate,
    startTime: params.startTime,
    endTime: params.endTime,
    meetingUrl: params.meetingUrl,
    orderId: params.orderId,
    bookingId: params.bookingId,
    supportEmail: SUPPORT_EMAIL,
  });

  await queueAndMaybeProcessLmsEmail({
    eventType: 'mentorship_admin_booking_notification',
    userId: null,
    orderId: params.orderId ?? null,
    toEmail: adminEmail,
    subject: content.subject,
    htmlBody: content.html,
    textBody: content.text,
    category: 'transactional_essential',
    idempotencyKey: buildMentorshipAdminBookingIdempotencyKey({
      orderId: params.orderId,
      bookingId: params.bookingId,
    }),
    metadata: {
      entity_type: 'paid_mentorship_booking',
      booking_id: params.bookingId,
      admin_notification: true,
    },
  });
}

// ─── 3. 24-Hour Reminder ─────────────────────────────────────────────────────

export async function sendMentorshipReminder(params: {
  userId: string;
  categoryId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  meetingUrl?: string | null;
  bookingId: string;
}): Promise<void> {
  const student = await resolveStudentInfo(params.userId);
  if (!student.email) return;

  const categoryTitle = await resolveCategoryTitle(params.categoryId);

  const content = buildMentorshipReminderEmail({
    studentName: student.name,
    categoryTitle,
    sessionDate: params.sessionDate,
    startTime: params.startTime,
    endTime: params.endTime,
    meetingUrl: params.meetingUrl,
    dashboardUrl: getMentorshipDashboardUrl(),
    supportEmail: SUPPORT_EMAIL,
  });

  await queueAndMaybeProcessLmsEmail({
    eventType: 'mentorship_reminder',
    userId: params.userId,
    toEmail: student.email,
    subject: content.subject,
    htmlBody: content.html,
    textBody: content.text,
    category: 'mentorship_reminder',
    idempotencyKey: `mentorship_reminder:booking:${params.bookingId}`,
  });
}

// ─── 4. Reschedule Confirmed (learner + admin) ───────────────────────────────

export async function sendMentorshipRescheduleConfirmed(params: {
  userId: string;
  categoryId: string;
  previousDate?: string | null;
  previousStartTime?: string | null;
  previousEndTime?: string | null;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
  bookingId: string;
  rescheduleVersion: number;
  meetingUrl?: string | null;
  statusLabel?: string;
}): Promise<void> {
  const student = await resolveStudentInfo(params.userId);
  if (!student.email) return;

  const categoryTitle = await resolveCategoryTitle(params.categoryId);
  const meetingUrl = params.meetingUrl?.trim() || null;

  const content = buildMentorshipRescheduleConfirmedEmail({
    studentName: student.name,
    categoryTitle,
    previousDate: params.previousDate,
    previousStartTime: params.previousStartTime,
    previousEndTime: params.previousEndTime,
    newDate: params.newDate,
    newStartTime: params.newStartTime,
    newEndTime: params.newEndTime,
    timezoneLabel: 'Asia/Kolkata (IST)',
    statusLabel: params.statusLabel ?? 'Confirmed',
    meetingUrl,
    sessionInstructions:
      'A reminder will be sent 24 hours before your session. Please come prepared with any questions you have.',
    dashboardUrl: getMentorshipDashboardUrl(),
    supportEmail: SUPPORT_EMAIL,
  });

  await queueAndMaybeProcessLmsEmail({
    eventType: 'mentorship_reschedule_confirmed',
    userId: params.userId,
    toEmail: student.email,
    subject: content.subject,
    htmlBody: content.html,
    textBody: content.text,
    category: 'mentorship_reschedule_confirmed',
    idempotencyKey: buildMentorshipRescheduleIdempotencyKey({
      bookingId: params.bookingId,
      rescheduleVersion: params.rescheduleVersion,
    }),
    metadata: {
      entity_type: 'paid_mentorship_reschedule',
      booking_id: params.bookingId,
      reschedule_version: params.rescheduleVersion,
    },
  });

  void sendMentorshipAdminRescheduleNotification({
    studentName: student.name,
    studentEmail: student.email,
    categoryId: params.categoryId,
    categoryTitle,
    previousDate: params.previousDate,
    previousStartTime: params.previousStartTime,
    previousEndTime: params.previousEndTime,
    newDate: params.newDate,
    newStartTime: params.newStartTime,
    newEndTime: params.newEndTime,
    meetingUrl,
    bookingId: params.bookingId,
    rescheduleVersion: params.rescheduleVersion,
  });
}

export async function sendMentorshipAdminRescheduleNotification(params: {
  studentName: string;
  studentEmail: string;
  categoryId: string;
  categoryTitle?: string;
  previousDate?: string | null;
  previousStartTime?: string | null;
  previousEndTime?: string | null;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
  meetingUrl?: string | null;
  bookingId: string;
  rescheduleVersion: number;
}): Promise<void> {
  const adminEmail = getMentorshipAdminNotificationEmail();
  if (!adminEmail) {
    console.warn(
      '[lms-email/mentorship] admin reschedule notification skipped — MENTORSHIP_ADMIN_NOTIFICATION_EMAIL unset',
    );
    return;
  }

  const categoryTitle =
    params.categoryTitle?.trim() || (await resolveCategoryTitle(params.categoryId));

  const content = buildMentorshipAdminRescheduleNotificationEmail({
    studentName: params.studentName,
    studentEmail: params.studentEmail,
    categoryTitle,
    previousDate: params.previousDate,
    previousStartTime: params.previousStartTime,
    previousEndTime: params.previousEndTime,
    newDate: params.newDate,
    newStartTime: params.newStartTime,
    newEndTime: params.newEndTime,
    meetingUrl: params.meetingUrl,
    bookingId: params.bookingId,
    rescheduleVersion: params.rescheduleVersion,
    supportEmail: SUPPORT_EMAIL,
  });

  await queueAndMaybeProcessLmsEmail({
    eventType: 'mentorship_admin_reschedule_notification',
    userId: null,
    toEmail: adminEmail,
    subject: content.subject,
    htmlBody: content.html,
    textBody: content.text,
    category: 'transactional_essential',
    idempotencyKey: buildMentorshipAdminRescheduleIdempotencyKey({
      bookingId: params.bookingId,
      rescheduleVersion: params.rescheduleVersion,
    }),
    metadata: {
      entity_type: 'paid_mentorship_reschedule',
      booking_id: params.bookingId,
      reschedule_version: params.rescheduleVersion,
      admin_notification: true,
    },
  });
}

// ─── 5. Session Completed ────────────────────────────────────────────────────

export async function sendMentorshipSessionCompleted(params: {
  userId: string;
  categoryId: string;
  sessionDate: string;
  bookingId: string;
}): Promise<void> {
  const student = await resolveStudentInfo(params.userId);
  if (!student.email) return;

  const categoryTitle = await resolveCategoryTitle(params.categoryId);

  const content = buildMentorshipSessionCompletedEmail({
    studentName: student.name,
    categoryTitle,
    sessionDate: params.sessionDate,
    dashboardUrl: getMentorshipDashboardUrl(),
    supportEmail: SUPPORT_EMAIL,
  });

  await queueAndMaybeProcessLmsEmail({
    eventType: 'mentorship_session_completed',
    userId: params.userId,
    toEmail: student.email,
    subject: content.subject,
    htmlBody: content.html,
    textBody: content.text,
    category: 'mentorship_session_completed',
    idempotencyKey: `mentorship_completed:booking:${params.bookingId}`,
  });
}
