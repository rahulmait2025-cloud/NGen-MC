import { buildEmailLogoImgHtml } from '@/lib/brand/email-logo-markup';
import { BRAND_SOCIAL_LINKS } from '@/lib/brand/social-links';
import { escapeHtml } from '../escape';
import { EMAIL_BRAND, fallbackText, firstNameFrom } from './email-brand';
import { bodyParagraph, detailCard } from './career-readiness-shell';
import type { TransactionalEmailContent } from './base-template';

/** Header brand for enrollment transactional emails (no college name). */
const ENROLLMENT_HEADER_BRAND = 'NEXTGEN-CTO';

const SOCIAL = {
  instagram: BRAND_SOCIAL_LINKS.instagram,
  linkedin: BRAND_SOCIAL_LINKS.linkedin,
  youtube: BRAND_SOCIAL_LINKS.youtube,
  instagramIcon:
    'https://algozenith.s3.ap-south-1.amazonaws.com/content/07-06-24/8059_a58afaf2-29b8-4761-9c0e-6d9fc6ae6f4a.png',
  linkedinIcon:
    'https://algozenith.s3.ap-south-1.amazonaws.com/content/07-06-24/8059_44a6715c-441d-43f8-b5ee-bad637d717d3.png',
  youtubeIcon:
    'https://algozenith.s3.ap-south-1.amazonaws.com/content/07-06-24/8059_11a31c49-ba39-442b-81ac-b0816e2a71a1.png',
} as const;

function hasDisplayValue(value: string | undefined | null): value is string {
  const v = value?.trim();
  return Boolean(v && v.length > 0 && v !== '—' && v !== '-' && v.toLowerCase() !== 'pending');
}

function mapAccessTypeLabel(entityTypeLabel: string | undefined): string {
  const raw = entityTypeLabel?.trim().toLowerCase() ?? '';
  if (!raw) return 'Learning Access';
  if (raw === 'course') return 'Course';
  if (raw.includes('variant')) return 'Course Variant';
  if (raw.includes('bundle')) return 'Bundle';
  if (raw.includes('bootcamp')) return 'Job Ready Bootcamp';
  if (raw.includes('note')) return 'Notes';
  if (raw.includes('mentorship')) return 'Mentorship';
  const titled = entityTypeLabel!.trim();
  if (/^course$/i.test(titled)) return 'Course';
  if (/variant/i.test(titled)) return 'Course Variant';
  if (/bundle/i.test(titled)) return 'Bundle';
  return titled;
}

export function resolveAccessConfirmationCta(params: {
  entityTypeLabel?: string;
  accessUrl?: string | null;
}): { ctaLabel: string; usesLearningCta: boolean } {
  const hasUrl = Boolean(params.accessUrl?.trim());
  const raw = params.entityTypeLabel?.trim().toLowerCase() ?? '';
  if (raw.includes('mentorship') && /reschedule/.test(raw)) {
    return { ctaLabel: hasUrl ? 'View Updated Schedule' : 'Go to Dashboard', usesLearningCta: false };
  }
  if (raw.includes('mentorship')) {
    return { ctaLabel: hasUrl ? 'View Mentorship Schedule' : 'Go to Dashboard', usesLearningCta: false };
  }
  return { ctaLabel: hasUrl ? 'Start Learning' : 'Go to Dashboard', usesLearningCta: true };
}

function numberedSection(title: string, steps: string[]): string {
  const items = steps
    .map((s) => `<li style="margin:0 0 10px 0;">${escapeHtml(s)}</li>`)
    .join('');
  return `<div style="background:#ffffff;border-radius:10px;padding:18px;margin:0 0 20px 0;border:1px solid #E5E7EB;">
    <p style="margin:0 0 10px 0;font-size:15px;color:#0F172A;font-weight:700;">${escapeHtml(title)}</p>
    <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.75;color:#334155;">${items}</ol>
  </div>`;
}

function launchStatusPill(label: string): string {
  return `<p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">${escapeHtml(label)}</p>`;
}

function launchAccentDivider(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px 0;"><tr><td height="2" bgcolor="#F59E0B" style="background-color:#F59E0B;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

function launchPrimaryCta(label: string, url: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0 26px 0;"><tr><td align="left"><a href="${escapeHtml(url)}" style="display:inline-block;background:linear-gradient(135deg,#e58c33 0%,#d97a1f 100%);color:#FFFFFF;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;padding:14px 22px;border-radius:50px;box-shadow:0 6px 20px rgba(229,140,51,0.35);letter-spacing:0.5px;">${escapeHtml(label)}</a></td></tr></table>`;
}

function launchEmailFooter(supportEmail: string): string {
  const supportHref = `mailto:${supportEmail}`;
  return `<tr><td align="center" bgcolor="#ffffff" style="text-align:center;margin-top:50px;font-size:0.9em;color:#777;padding:25px 20px;background:#ffffff;background-color:#ffffff;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
<tr>
<td valign="middle" style="padding-right:10px;">${buildEmailLogoImgHtml(EMAIL_BRAND.logoUrl, 56)}</td>
<td valign="middle" style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;line-height:1.2;color:#1E335C;">NextGen CTO</td>
</tr></table>
<div style="margin:auto;text-align:center;">
<p style="color:#172B4D;font-size:14px;font-weight:600;">Follow us on</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
<tr>
<td style="padding:0 6px;"><a href="${escapeHtml(SOCIAL.instagram)}" style="cursor:pointer;text-decoration:none;"><img src="${escapeHtml(SOCIAL.instagramIcon)}" style="width:40px;height:40px;" alt="Instagram"/></a></td>
<td style="padding:0 6px;"><a href="${escapeHtml(SOCIAL.linkedin)}" style="cursor:pointer;text-decoration:none;"><img src="${escapeHtml(SOCIAL.linkedinIcon)}" style="width:40px;height:40px;" alt="LinkedIn"/></a></td>
<td style="padding:0 6px;"><a href="${escapeHtml(SOCIAL.youtube)}" style="cursor:pointer;text-decoration:none;"><img src="${escapeHtml(SOCIAL.youtubeIcon)}" style="width:40px;height:40px;" alt="YouTube"/></a></td>
</tr></table>
</div>
<div style="height:1px;background-color:#E5E7EB;margin-top:2rem;"></div>
<p style="font-weight:300;margin:16px 0 0;padding:0;text-align:center;font-size:15px;color:#334155;">Questions about your enrollment? Contact <a href="${escapeHtml(supportHref)}" style="color:#d97a1f;text-decoration:underline;font-weight:600;">${escapeHtml(supportEmail)}</a></p>
<p style="font-weight:300;margin-top:6px;text-align:center;font-size:15px;color:#64748B;">© Copyright 2025. NextGen CTO Pvt Ltd. All Rights Reserved.</p>
</td></tr>`;
}

function wrapEnrollmentLaunchEmail(params: {
  preheader: string;
  heroTitle: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
  supportEmail: string;
}): { html: string; text: string } {
  const preheader = escapeHtml(params.preheader);
  const heroTitle = escapeHtml(params.heroTitle);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${heroTitle}</title></head><body style="margin:0;padding:0;background-color:#F8FAFC;font-family:Arial,Helvetica,sans-serif;color:#111827;-webkit-text-size-adjust:100%;"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:transparent;opacity:0;">${preheader}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F8FAFC" style="background-color:#F8FAFC;mso-table-lspace:0;mso-table-rspace:0;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="max-width:680px;background-color:#ffffff;border:1px solid #E5E7EB;border-radius:10px;mso-table-lspace:0;mso-table-rspace:0;"><tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-bottom:2px solid #F59E0B;padding:22px 24px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF;width:100%;mso-table-lspace:0;mso-table-rspace:0;"><tr><td width="52" valign="middle" bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:0 12px 0 0;vertical-align:middle;">${buildEmailLogoImgHtml(EMAIL_BRAND.logoUrl, 48, 'NextGen CTO Logo')}</td><td valign="middle" bgcolor="#FFFFFF" style="background-color:#FFFFFF;color:#1E3A8A;font-size:18px;font-weight:800;line-height:1.25;padding:0;vertical-align:middle;">${escapeHtml(ENROLLMENT_HEADER_BRAND)}</td></tr></table></td></tr><tr><td bgcolor="#ffffff" style="background-color:#FFFFFF;padding:20px 22px 24px 22px;">${params.bodyHtml}${launchPrimaryCta(params.ctaLabel, params.ctaUrl)}<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#94A3B8;">${escapeHtml(params.footerNote)}</p></td></tr>${launchEmailFooter(params.supportEmail)}</table></td></tr></table></body></html>`;

  const text = buildEnrollmentPlainText(params);
  return { html, text };
}

function buildEnrollmentPlainText(params: {
  preheader: string;
  heroTitle: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
  supportEmail: string;
}): string {
  let listNum = 0;
  const body = params.bodyHtml
    .replace(/<ol[^>]*>/gi, () => {
      listNum = 0;
      return '\n';
    })
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>/gi, () => {
      listNum += 1;
      return `\n${listNum}. `;
    })
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return [
    ENROLLMENT_HEADER_BRAND,
    '',
    params.preheader,
    '',
    params.heroTitle,
    '',
    body,
    '',
    `${params.ctaLabel}: ${params.ctaUrl}`,
    '',
    params.footerNote,
    '',
    `Questions about your enrollment? Contact ${params.supportEmail}`,
    '',
    '© Copyright 2025. NextGen CTO Pvt Ltd. All Rights Reserved.',
  ]
    .filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== ''))
    .join('\n');
}

export function buildBatchEnrollmentSuccessEmail(params: {
  purchaserName: string;
  entityTitle: string;
  entityTypeLabel: string;
  accessUrl: string;
  dashboardUrl: string;
  supportEmail: string;
  programName?: string;
  validUntilLabel?: string;
  batchName?: string;
  collegeName?: string;
  primaryCtaLabel?: string;
  accessMessage?: string;
  heroTitle?: string;
  statusPill?: string;
  summaryTitle?: string;
  statusLabel?: string;
  statusValue?: string;
}): TransactionalEmailContent {
  const firstName = firstNameFrom(params.purchaserName);
  const courseName = fallbackText(params.entityTitle, 'your learning access');
  const accessType = mapAccessTypeLabel(params.entityTypeLabel);
  const startUrl = params.accessUrl?.trim() || params.dashboardUrl;
  const { ctaLabel: defaultCta } = resolveAccessConfirmationCta({
    entityTypeLabel: params.entityTypeLabel,
    accessUrl: params.accessUrl,
  });
  const ctaLabel = params.primaryCtaLabel?.trim() || defaultCta;
  const statusPill = params.statusPill?.trim() || 'ACCESS ACTIVATED';
  const heroTitle = params.heroTitle?.trim() || "You're Enrolled 🎉";
  const summaryTitle = params.summaryTitle?.trim() || 'Enrollment summary';
  const statusLabel = params.statusLabel?.trim() || 'Enrollment Status';
  const statusValue = params.statusValue?.trim() || 'Active';

  const summaryRows: Array<{ label: string; value: string }> = [
    { label: accessType, value: courseName },
    { label: 'Access Type', value: accessType },
    { label: statusLabel, value: statusValue },
  ];
  if (hasDisplayValue(params.validUntilLabel)) {
    summaryRows.push({ label: 'Valid Till', value: params.validUntilLabel!.trim() });
  }
  if (hasDisplayValue(params.batchName)) {
    summaryRows.push({ label: 'Batch/Cohort', value: params.batchName!.trim() });
  }
  if (hasDisplayValue(params.collegeName)) {
    summaryRows.push({ label: 'College/Institution', value: params.collegeName!.trim() });
  }

  const accessMessage =
    params.accessMessage?.trim() ||
    `Your learning access for ${courseName} has been activated successfully.`;

  const bodyHtml = [
    launchStatusPill(statusPill),
    `<h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">${escapeHtml(heroTitle)}</h1>`,
    launchAccentDivider(),
    bodyParagraph(`Hi ${firstName},`),
    bodyParagraph(accessMessage),
    bodyParagraph(
      'You\u2019re now ready to continue from your dashboard. This access has been added to your NextGen CTO account so you can keep building career-ready skills at the assigned pace.',
    ),
    detailCard(summaryTitle, summaryRows),
    numberedSection('What you can do now', [
      'Open your dashboard and open the purchased item',
      'Start with the first available lesson, notes, or schedule action',
      'Track your progress as you complete learning activities',
      'Continue building your skills through the assigned content',
    ]),
    bodyParagraph(
      'If the course is not visible immediately, refresh your dashboard once. If the issue continues, contact support with your registered email or payment details.',
    ),
  ].join('');

  const { html, text } = wrapEnrollmentLaunchEmail({
    preheader: 'Your access is active. Continue from your dashboard.',
    heroTitle: heroTitle.replace(/🎉/g, '').trim() || "You're Enrolled",
    bodyHtml,
    ctaLabel,
    ctaUrl: startUrl,
    footerNote: 'This is a transactional confirmation of your purchase access on NextGen CTO.',
    supportEmail: params.supportEmail,
  });

  return {
    subject: `${heroTitle.includes('Enrolled') ? "You're Enrolled in" : 'Access Confirmed —'} ${courseName}`.replace(
      /\s+/g,
      ' ',
    ).trim(),
    html,
    text,
  };
}
