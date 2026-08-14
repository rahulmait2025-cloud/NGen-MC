import { fallbackText, firstNameFrom } from './email-brand';
import {
  bodyParagraph,
  bodyParagraphWithStrong,
  detailCard,
  wrapCareerReadinessEmail,
} from './career-readiness-shell';
import type { TransactionalEmailContent } from './base-template';

const inrFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

function formatInr(minor: number): string {
  return inrFormatter.format(minor / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(timeStr: string): string {
  const [h, m] = String(timeStr).slice(0, 5).split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

// ─── 1. Payment Confirmation ─────────────────────────────────────────────────

export function buildMentorshipPaymentConfirmationEmail(params: {
  studentName: string;
  categoryTitle: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  orderId: string;
  totalMinor: number;
  paidAtLabel: string;
  dashboardUrl: string;
  supportEmail: string;
}): TransactionalEmailContent {
  const firstName = firstNameFrom(params.studentName);
  const category = fallbackText(params.categoryTitle, 'Mentorship Session');
  const orderRef = params.orderId.slice(0, 8).toUpperCase();

  const summaryRows = [
    { label: 'Session Type', value: category },
    { label: 'Date', value: formatDate(params.sessionDate) },
    { label: 'Time', value: `${formatTime(params.startTime)} — ${formatTime(params.endTime)}` },
    { label: 'Amount Paid', value: formatInr(params.totalMinor) },
    { label: 'Order ID', value: orderRef },
    { label: 'Paid On', value: params.paidAtLabel },
  ];

  const bodyHtml = [
    `<div style="display:inline-block;margin:0 0 20px 0;padding:8px 14px;border-radius:999px;background:#ecfdf5;border:1px solid #a7f3d0;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#047857;">PAYMENT CONFIRMED</div>`,
    `<h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Payment Successful</h1>`,
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px 0;"><tr><td height="2" bgcolor="#10B981" style="background-color:#10B981;font-size:0;line-height:0;">&nbsp;</td></tr></table>`,
    bodyParagraph(`Hi ${firstName},`),
    bodyParagraphWithStrong(
      'Thank you for your payment. Your mentorship session for ',
      category,
      ' has been confirmed.',
    ),
    bodyParagraph("Your session details are below. You'll receive a reminder 24 hours before your session."),
    detailCard('Session details', summaryRows),
    bodyParagraph(
      'If you need to reschedule, you can do so up to 24 hours before the session from your dashboard.',
    ),
  ].join('');

  const { html, text } = wrapCareerReadinessEmail({
    preheader: 'Your mentorship session payment has been confirmed.',
    heroTitle: 'Payment Successful',
    bodyHtml,
    ctaLabel: 'View Booking',
    ctaUrl: params.dashboardUrl,
    footerNote: 'This is a transactional receipt for your mentorship session purchase.',
    supportEmail: params.supportEmail,
  });

  return {
    subject: `Payment Confirmed — ${category}`,
    html,
    text,
  };
}

// ─── 2. Booking Confirmed ────────────────────────────────────────────────────

export function buildMentorshipBookingConfirmedEmail(params: {
  studentName: string;
  categoryTitle: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  meetingUrl?: string | null;
  dashboardUrl: string;
  supportEmail: string;
}): TransactionalEmailContent {
  const firstName = firstNameFrom(params.studentName);
  const category = fallbackText(params.categoryTitle, 'Mentorship Session');

  const summaryRows = [
    { label: 'Session Type', value: category },
    { label: 'Date', value: formatDate(params.sessionDate) },
    { label: 'Time', value: `${formatTime(params.startTime)} — ${formatTime(params.endTime)}` },
    { label: 'Duration', value: '30 minutes' },
  ];

  if (params.meetingUrl) {
    summaryRows.push({ label: 'Meeting Link', value: params.meetingUrl });
  }

  const bodyHtml = [
    `<div style="display:inline-block;margin:0 0 20px 0;padding:8px 14px;border-radius:999px;background:#eff6ff;border:1px solid #bfdbfe;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#1d4ed8;">BOOKING CONFIRMED</div>`,
    `<h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Session Confirmed</h1>`,
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px 0;"><tr><td height="2" bgcolor="#3B82F6" style="background-color:#3B82F6;font-size:0;line-height:0;">&nbsp;</td></tr></table>`,
    bodyParagraph(`Hi ${firstName},`),
    bodyParagraphWithStrong(
      'Your mentorship session for ',
      category,
      ' has been confirmed.',
    ),
    detailCard('Session details', summaryRows),
    bodyParagraph('A reminder will be sent 24 hours before your session. Please come prepared with any questions you have.'),
    bodyParagraph(
      'You can reschedule this session once, up to 24 hours before the start time, from your dashboard.',
    ),
  ].join('');

  const { html, text } = wrapCareerReadinessEmail({
    preheader: 'Your mentorship session has been confirmed.',
    heroTitle: 'Session Confirmed',
    bodyHtml,
    ctaLabel: 'View Booking',
    ctaUrl: params.dashboardUrl,
    footerNote: 'This is a transactional notification from NextGen CTO.',
    supportEmail: params.supportEmail,
  });

  return {
    subject: `Session Confirmed — ${category} on ${formatDate(params.sessionDate)}`,
    html,
    text,
  };
}

// ─── 3. 24-Hour Reminder ─────────────────────────────────────────────────────

export function buildMentorshipReminderEmail(params: {
  studentName: string;
  categoryTitle: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  meetingUrl?: string | null;
  dashboardUrl: string;
  supportEmail: string;
}): TransactionalEmailContent {
  const firstName = firstNameFrom(params.studentName);
  const category = fallbackText(params.categoryTitle, 'Mentorship Session');

  const summaryRows = [
    { label: 'Session Type', value: category },
    { label: 'Date', value: formatDate(params.sessionDate) },
    { label: 'Time', value: `${formatTime(params.startTime)} — ${formatTime(params.endTime)}` },
    { label: 'Duration', value: '30 minutes' },
  ];

  if (params.meetingUrl) {
    summaryRows.push({ label: 'Meeting Link', value: params.meetingUrl });
  }

  const bodyHtml = [
    `<div style="display:inline-block;margin:0 0 20px 0;padding:8px 14px;border-radius:999px;background:#fff7ed;border:1px solid #fed7aa;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#c2410c;">REMINDER</div>`,
    `<h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Session Tomorrow</h1>`,
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px 0;"><tr><td height="2" bgcolor="#F59E0B" style="background-color:#F59E0B;font-size:0;line-height:0;">&nbsp;</td></tr></table>`,
    bodyParagraph(`Hi ${firstName},`),
    bodyParagraphWithStrong(
      'This is a reminder that your mentorship session for ',
      category,
      ' is scheduled for tomorrow.',
    ),
    detailCard('Session details', summaryRows),
    bodyParagraph("Please come prepared with any questions or topics you'd like to discuss."),
    bodyParagraph(
      'If you need to reschedule, you must do so at least 24 hours before the session starts.',
    ),
  ].join('');

  const { html, text } = wrapCareerReadinessEmail({
    preheader: `Your mentorship session is tomorrow at ${formatTime(params.startTime)}.`,
    heroTitle: 'Session Tomorrow',
    bodyHtml,
    ctaLabel: 'View Booking',
    ctaUrl: params.dashboardUrl,
    footerNote: 'This is a reminder from NextGen CTO.',
    supportEmail: params.supportEmail,
  });

  return {
    subject: `Reminder: Your ${category} session is tomorrow`,
    html,
    text,
  };
}

// ─── 4. Reschedule Confirmed ─────────────────────────────────────────────────

export function buildMentorshipRescheduleIdempotencyKey(params: {
  bookingId: string;
  rescheduleVersion: number;
}): string {
  return `mentorship_reschedule:booking:${params.bookingId}:v${params.rescheduleVersion}`;
}

export function buildMentorshipRescheduleConfirmedEmail(params: {
  studentName: string;
  categoryTitle: string;
  mentorName?: string | null;
  previousDate?: string | null;
  previousStartTime?: string | null;
  previousEndTime?: string | null;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
  timezoneLabel?: string;
  statusLabel?: string;
  meetingUrl?: string | null;
  sessionInstructions?: string | null;
  dashboardUrl: string;
  supportEmail: string;
}): TransactionalEmailContent {
  const firstName = firstNameFrom(params.studentName);
  const category = fallbackText(params.categoryTitle, 'Mentorship Session');
  const timezone = params.timezoneLabel?.trim() || 'Asia/Kolkata (IST)';
  const status = params.statusLabel?.trim() || 'Confirmed';
  const meetingUrl = params.meetingUrl?.trim() || null;

  const summaryRows: Array<{ label: string; value: string }> = [
    { label: 'Session', value: category },
  ];
  if (params.mentorName?.trim()) {
    summaryRows.push({ label: 'Mentor', value: params.mentorName.trim() });
  }
  if (params.previousDate && params.previousStartTime && params.previousEndTime) {
    summaryRows.push({
      label: 'Previous schedule',
      value: `${formatDate(params.previousDate)} · ${formatTime(params.previousStartTime)} — ${formatTime(params.previousEndTime)} ${timezone}`,
    });
  }
  summaryRows.push({
    label: 'Updated schedule',
    value: `${formatDate(params.newDate)} · ${formatTime(params.newStartTime)} — ${formatTime(params.newEndTime)} ${timezone}`,
  });
  summaryRows.push({ label: 'Timezone', value: timezone });
  summaryRows.push({ label: 'Status', value: status });
  if (meetingUrl) {
    summaryRows.push({ label: 'Meeting link', value: meetingUrl });
  }

  const instructions =
    params.sessionInstructions?.trim() ||
    'Please join on time and come prepared with any questions you would like to discuss.';

  const bodyHtml = [
    `<div style="display:inline-block;margin:0 0 20px 0;padding:8px 14px;border-radius:999px;background:#f5f3ff;border:1px solid #c4b5fd;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#7c3aed;">RESCHEDULED</div>`,
    `<h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Session Rescheduled</h1>`,
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px 0;"><tr><td height="2" bgcolor="#8B5CF6" style="background-color:#8B5CF6;font-size:0;line-height:0;">&nbsp;</td></tr></table>`,
    bodyParagraph(`Hi ${firstName},`),
    bodyParagraphWithStrong(
      'Your mentorship session for ',
      category,
      ' has been rescheduled.',
    ),
    detailCard('Updated session details', summaryRows),
    bodyParagraph(instructions),
    meetingUrl
      ? ''
      : bodyParagraph(
          'The session joining details will be available in your mentorship dashboard.',
        ),
  ].join('');

  const { html, text } = wrapCareerReadinessEmail({
    preheader: 'Your mentorship session has been rescheduled.',
    heroTitle: 'Session Rescheduled',
    bodyHtml,
    ctaLabel: meetingUrl ? 'Join Session' : 'View Updated Schedule',
    ctaUrl: meetingUrl || params.dashboardUrl,
    secondaryLink: meetingUrl
      ? { label: 'View Updated Schedule', url: params.dashboardUrl }
      : undefined,
    footerNote: 'This is a transactional notification from NextGen CTO. No payment receipt or invoice is generated for rescheduling.',
    supportEmail: params.supportEmail,
  });

  return {
    subject: `Session Rescheduled — ${category} on ${formatDate(params.newDate)}`,
    html,
    text,
  };
}

// ─── 5. Session Completed ────────────────────────────────────────────────────

export function buildMentorshipSessionCompletedEmail(params: {
  studentName: string;
  categoryTitle: string;
  sessionDate: string;
  dashboardUrl: string;
  supportEmail: string;
}): TransactionalEmailContent {
  const firstName = firstNameFrom(params.studentName);
  const category = fallbackText(params.categoryTitle, 'Mentorship Session');

  const bodyHtml = [
    `<div style="display:inline-block;margin:0 0 20px 0;padding:8px 14px;border-radius:999px;background:#ecfdf5;border:1px solid #a7f3d0;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#047857;">COMPLETED</div>`,
    `<h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Session Completed</h1>`,
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px 0;"><tr><td height="2" bgcolor="#10B981" style="background-color:#10B981;font-size:0;line-height:0;">&nbsp;</td></tr></table>`,
    bodyParagraph(`Hi ${firstName},`),
    bodyParagraphWithStrong(
      'Your mentorship session for ',
      category,
      ` on ${formatDate(params.sessionDate)} has been marked as completed.`,
    ),
    bodyParagraph('We hope the session was valuable. You can book another session anytime from your dashboard.'),
    bodyParagraph('If you have any feedback, feel free to reach out to us.'),
  ].join('');

  const { html, text } = wrapCareerReadinessEmail({
    preheader: 'Your mentorship session has been completed.',
    heroTitle: 'Session Completed',
    bodyHtml,
    ctaLabel: 'Book Another Session',
    ctaUrl: params.dashboardUrl,
    footerNote: 'This is a transactional notification from NextGen CTO.',
    supportEmail: params.supportEmail,
  });

  return {
    subject: `Session Completed — ${category}`,
    html,
    text,
  };
}

// ─── 6. Admin: new booking notification ──────────────────────────────────────

export function buildMentorshipAdminBookingNotificationEmail(params: {
  studentName: string;
  studentEmail: string;
  categoryTitle: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  meetingUrl?: string | null;
  orderId?: string | null;
  bookingId: string;
  supportEmail: string;
}): TransactionalEmailContent {
  const category = fallbackText(params.categoryTitle, 'Mentorship Session');
  const meetingUrl = params.meetingUrl?.trim() || null;
  const summaryRows: Array<{ label: string; value: string }> = [
    { label: 'Student', value: params.studentName },
    { label: 'Student email', value: params.studentEmail },
    { label: 'Session', value: category },
    {
      label: 'Schedule',
      value: `${formatDate(params.sessionDate)} · ${formatTime(params.startTime)} — ${formatTime(params.endTime)} Asia/Kolkata (IST)`,
    },
    { label: 'Booking ID', value: params.bookingId },
  ];
  if (params.orderId) {
    summaryRows.push({ label: 'Order ID', value: params.orderId.slice(0, 8).toUpperCase() });
  }
  if (meetingUrl) {
    summaryRows.push({ label: 'Meeting link', value: meetingUrl });
  }

  const bodyHtml = [
    `<div style="display:inline-block;margin:0 0 20px 0;padding:8px 14px;border-radius:999px;background:#eff6ff;border:1px solid #bfdbfe;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#1d4ed8;">NEW BOOKING</div>`,
    `<h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Mentorship Session Booked</h1>`,
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px 0;"><tr><td height="2" bgcolor="#3B82F6" style="background-color:#3B82F6;font-size:0;line-height:0;">&nbsp;</td></tr></table>`,
    bodyParagraph('A student has successfully booked a mentorship session.'),
    detailCard('Booking details', summaryRows),
    meetingUrl
      ? ''
      : bodyParagraph('No meeting link is configured on this booking yet.'),
  ].join('');

  const { html, text } = wrapCareerReadinessEmail({
    preheader: `New mentorship booking — ${category}`,
    heroTitle: 'Mentorship Session Booked',
    bodyHtml,
    ctaLabel: meetingUrl ? 'Open Meeting Link' : undefined,
    ctaUrl: meetingUrl || undefined,
    footerNote: 'Internal mentorship admin notification from NextGen CTO.',
    supportEmail: params.supportEmail,
  });

  return {
    subject: `New Mentorship Booking — ${category} · ${formatDate(params.sessionDate)}`,
    html,
    text,
  };
}

// ─── 7. Admin: reschedule notification ───────────────────────────────────────

export function buildMentorshipAdminRescheduleNotificationEmail(params: {
  studentName: string;
  studentEmail: string;
  categoryTitle: string;
  previousDate?: string | null;
  previousStartTime?: string | null;
  previousEndTime?: string | null;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
  meetingUrl?: string | null;
  bookingId: string;
  rescheduleVersion: number;
  supportEmail: string;
}): TransactionalEmailContent {
  const category = fallbackText(params.categoryTitle, 'Mentorship Session');
  const meetingUrl = params.meetingUrl?.trim() || null;
  const summaryRows: Array<{ label: string; value: string }> = [
    { label: 'Student', value: params.studentName },
    { label: 'Student email', value: params.studentEmail },
    { label: 'Session', value: category },
  ];
  if (params.previousDate && params.previousStartTime && params.previousEndTime) {
    summaryRows.push({
      label: 'Previous schedule',
      value: `${formatDate(params.previousDate)} · ${formatTime(params.previousStartTime)} — ${formatTime(params.previousEndTime)} Asia/Kolkata (IST)`,
    });
  }
  summaryRows.push({
    label: 'Updated schedule',
    value: `${formatDate(params.newDate)} · ${formatTime(params.newStartTime)} — ${formatTime(params.newEndTime)} Asia/Kolkata (IST)`,
  });
  summaryRows.push({ label: 'Booking ID', value: params.bookingId });
  summaryRows.push({ label: 'Reschedule version', value: String(params.rescheduleVersion) });
  if (meetingUrl) {
    summaryRows.push({ label: 'Meeting link', value: meetingUrl });
  }

  const bodyHtml = [
    `<div style="display:inline-block;margin:0 0 20px 0;padding:8px 14px;border-radius:999px;background:#f5f3ff;border:1px solid #c4b5fd;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#7c3aed;">RESCHEDULED</div>`,
    `<h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Mentorship Session Rescheduled</h1>`,
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px 0;"><tr><td height="2" bgcolor="#8B5CF6" style="background-color:#8B5CF6;font-size:0;line-height:0;">&nbsp;</td></tr></table>`,
    bodyParagraph('A student has successfully rescheduled a mentorship session.'),
    detailCard('Updated booking details', summaryRows),
    meetingUrl
      ? ''
      : bodyParagraph('No meeting link is configured on this booking yet.'),
  ].join('');

  const { html, text } = wrapCareerReadinessEmail({
    preheader: `Mentorship reschedule — ${category}`,
    heroTitle: 'Mentorship Session Rescheduled',
    bodyHtml,
    ctaLabel: meetingUrl ? 'Open Meeting Link' : undefined,
    ctaUrl: meetingUrl || undefined,
    footerNote: 'Internal mentorship admin notification from NextGen CTO.',
    supportEmail: params.supportEmail,
  });

  return {
    subject: `Mentorship Rescheduled — ${category} · ${formatDate(params.newDate)}`,
    html,
    text,
  };
}

export function buildMentorshipAdminBookingIdempotencyKey(params: {
  orderId?: string | null;
  bookingId: string;
}): string {
  if (params.orderId) {
    return `mentorship_admin_booking:order:${params.orderId}`;
  }
  return `mentorship_admin_booking:booking:${params.bookingId}`;
}

export function buildMentorshipAdminRescheduleIdempotencyKey(params: {
  bookingId: string;
  rescheduleVersion: number;
}): string {
  return `mentorship_admin_reschedule:booking:${params.bookingId}:v${params.rescheduleVersion}`;
}
