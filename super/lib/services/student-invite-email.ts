import 'server-only';
import { sendEmail } from '@/lib/email/send-email';
import type { EmailCategory } from '@/lib/email/types';
import { getEmailBrandLogoUrl } from '@/lib/email-center/brand-logo';
import { applyEmailLogoImgStyle } from '@/lib/brand/email-logo-markup';
import { getEmailWebsiteUrl } from '@/lib/email-center/brand-links';
import { loadStudentInviteHtmlTemplate } from '@/lib/email/templates/load-student-invite-html';
import { renderMergeFields } from '@/lib/email/templates/render-merge-fields';
import {
  STUDENT_INVITE_PREHEADER,
  STUDENT_INVITE_RESEND_SUBJECT,
  STUDENT_INVITE_SUBJECT,
  STUDENT_INVITE_TEXT,
} from '@/lib/email/templates/student-invite-template';

function firstNameFromFullName(fullName: string, email: string): string {
  const trimmed = fullName.trim();
  if (trimmed) {
    const part = trimmed.split(/\s+/)[0];
    if (part) return part;
  }
  return email.split('@')[0] ?? 'Student';
}

function buildInviteVariables(opts: {
  email: string;
  fullName: string;
  collegeName: string;
  inviteUrl: string;
}): Record<string, string> {
  let siteUrl: string;
  try {
    siteUrl = new URL(opts.inviteUrl).origin;
  } catch {
    siteUrl = opts.inviteUrl;
  }
  const firstName = firstNameFromFullName(opts.fullName, opts.email);
  const unsubscribeUrl = `${siteUrl.replace(/\/+$/, '')}/auth/unsubscribe?email=${encodeURIComponent(opts.email)}`;

  const collegeDisplay = opts.collegeName.trim();
  const base: Record<string, string> = {
    first_name: firstName,
    full_name: opts.fullName.trim() || opts.email,
    college_name: collegeDisplay || 'your college',
    email: opts.email,
    cta_url: opts.inviteUrl,
    invite_url: opts.inviteUrl,
    site_url: siteUrl,
    unsubscribe_url: unsubscribeUrl,
    email_header_display: collegeDisplay ? `NextGen CTO &times; ${collegeDisplay}` : 'NextGen CTO',
    email_logo_url: getEmailBrandLogoUrl(),
    email_website_url: getEmailWebsiteUrl(),
    cta_label: 'Accept Your Invitation',
  };
  base.email_preheader_text = renderMergeFields(STUDENT_INVITE_PREHEADER, base);
  return base;
}

export async function sendTransactionalStudentInviteEmail(opts: {
  to: string;
  fullName: string;
  inviteUrl: string;
  collegeName: string;
  category: Extract<EmailCategory, 'student_invite' | 'student_invite_resend'>;
}): Promise<void> {
  const vars = buildInviteVariables({
    email: opts.to,
    fullName: opts.fullName,
    collegeName: opts.collegeName,
    inviteUrl: opts.inviteUrl,
  });

  const subject =
    opts.category === 'student_invite_resend' ? STUDENT_INVITE_RESEND_SUBJECT : STUDENT_INVITE_SUBJECT;
  const html = applyEmailLogoImgStyle(
    renderMergeFields(loadStudentInviteHtmlTemplate(), vars),
    getEmailBrandLogoUrl(),
  );
  const text = renderMergeFields(STUDENT_INVITE_TEXT, vars);

  const result = await sendEmail({
    to: opts.to,
    subject,
    html,
    text,
    category: opts.category,
  });
  if (!result.ok) {
    throw new Error(result.errorMessage ?? 'Failed to send invite email.');
  }
}
