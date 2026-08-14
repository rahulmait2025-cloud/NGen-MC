import { buildEmailLogoImgHtml } from '@/lib/brand/email-logo-markup';
import { BRAND_SOCIAL_LINKS } from '@/lib/brand/social-links';
import { escapeHtml } from '../escape';
import { EMAIL_BRAND, firstNameFrom } from './email-brand';
import { bodyParagraph } from './career-readiness-shell';
import type { TransactionalEmailContent } from './base-template';

/** Header brand for Google welcome transactional emails (no college name). */
const WELCOME_HEADER_BRAND = 'NEXTGEN-CTO';

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

const DEFAULT_SUPPORT_EMAIL = 'support@nextgencto.com';

function brandLogoImg(size: 48 | 56): string {
  return buildEmailLogoImgHtml(EMAIL_BRAND.logoUrl, size);
}

function derivePreferencesUrlFromDashboard(dashboardUrl: string): string | null {
  const trimmed = dashboardUrl.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/^(\/c\/[^/]+\/student)(?:\/.*)?$/);
    if (!match) return null;
    url.pathname = `${match[1]}/profile`;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function deriveUnsubscribeUrl(email: string | undefined): string | null {
  const trimmed = email?.trim();
  if (!trimmed) return null;
  const base = EMAIL_BRAND.websiteUrl.replace(/\/+$/, '');
  return `${base}/auth/unsubscribe?email=${encodeURIComponent(trimmed)}`;
}

function renderPreferenceFooterLinks(
  preferencesUrl: string | null | undefined,
  unsubscribeUrl: string | null | undefined,
): string {
  const prefs = hasDisplayValue(preferencesUrl) ? preferencesUrl!.trim() : '';
  const unsub = hasDisplayValue(unsubscribeUrl) ? unsubscribeUrl!.trim() : '';
  if (!prefs && !unsub) return '';

  const linkStyle = 'color:#d97a1f;text-decoration:underline;font-weight:600;';
  const parts: string[] = [];
  if (prefs) {
    parts.push(`<a href="${escapeHtml(prefs)}" style="${linkStyle}">Manage Preferences</a>`);
  }
  if (unsub) {
    parts.push(`<a href="${escapeHtml(unsub)}" style="${linkStyle}">Unsubscribe</a>`);
  }
  const inner = parts.join(' <span style="color:#94A3B8;padding:0 4px;">|</span> ');
  return `<p style="font-weight:300;margin:10px 0 0;padding:0;text-align:center;font-size:15px;color:#334155;">${inner}</p>`;
}

function hasDisplayValue(value: string | undefined | null): value is string {
  const v = value?.trim();
  return Boolean(v && v.length > 0 && v !== '—' && v !== '-' && v.toLowerCase() !== 'pending');
}

function launchStatusPill(label: string): string {
  return `<p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">${escapeHtml(label)}</p>`;
}

function launchAccentDivider(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px 0;"><tr><td height="2" bgcolor="#F59E0B" style="background-color:#F59E0B;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
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

function sectionWithParagraph(title: string, text: string): string {
  return `<div style="background:#ffffff;border-radius:10px;padding:18px;margin:0 0 20px 0;border:1px solid #E5E7EB;">
    <p style="margin:0 0 10px 0;font-size:15px;color:#0F172A;font-weight:700;">${escapeHtml(title)}</p>
    <p style="margin:0;font-size:14px;line-height:1.75;color:#334155;">${escapeHtml(text)}</p>
  </div>`;
}

function launchPrimaryCta(label: string, url: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0 26px 0;"><tr><td align="left"><a href="${escapeHtml(url)}" style="display:inline-block;background:linear-gradient(135deg,#e58c33 0%,#d97a1f 100%);color:#FFFFFF;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;padding:14px 22px;border-radius:50px;box-shadow:0 6px 20px rgba(229,140,51,0.35);letter-spacing:0.5px;">${escapeHtml(label)}</a></td></tr></table>`;
}

function launchEmailFooter(
  supportEmail: string,
  preferencesUrl?: string | null,
  unsubscribeUrl?: string | null,
): string {
  const supportHref = `mailto:${supportEmail}`;
  const preferenceLinks = renderPreferenceFooterLinks(preferencesUrl, unsubscribeUrl);
  return `<tr><td align="center" bgcolor="#ffffff" style="text-align:center;margin-top:50px;font-size:0.9em;color:#777;padding:25px 20px;background:#ffffff;background-color:#ffffff;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
<tr>
<td valign="middle" style="padding-right:10px;">${brandLogoImg(56)}</td>
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
<p style="font-weight:300;margin:16px 0 0;padding:0;text-align:center;font-size:15px;color:#334155;">Questions about your account? Contact <a href="${escapeHtml(supportHref)}" style="color:#d97a1f;text-decoration:underline;font-weight:600;">${escapeHtml(supportEmail)}</a></p>
${preferenceLinks}
<p style="font-weight:300;margin-top:6px;text-align:center;font-size:15px;color:#64748B;">© Copyright 2025. NextGen CTO Pvt Ltd. All Rights Reserved.</p>
</td></tr>`;
}

function wrapWelcomeLaunchEmail(params: {
  preheader: string;
  heroTitle: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
  supportEmail: string;
  preferencesUrl?: string | null;
  unsubscribeUrl?: string | null;
}): { html: string; text: string } {
  const preheader = escapeHtml(params.preheader);
  const heroTitle = escapeHtml(params.heroTitle);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${heroTitle}</title></head><body style="margin:0;padding:0;background-color:#F8FAFC;font-family:Arial,Helvetica,sans-serif;color:#111827;-webkit-text-size-adjust:100%;"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:transparent;opacity:0;">${preheader}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F8FAFC" style="background-color:#F8FAFC;mso-table-lspace:0;mso-table-rspace:0;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="max-width:680px;background-color:#ffffff;border:1px solid #E5E7EB;border-radius:10px;mso-table-lspace:0;mso-table-rspace:0;"><tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-bottom:2px solid #F59E0B;padding:22px 24px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF;width:100%;mso-table-lspace:0;mso-table-rspace:0;"><tr><td width="52" valign="middle" bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:0 12px 0 0;vertical-align:middle;">${brandLogoImg(48)}</td><td valign="middle" bgcolor="#FFFFFF" style="background-color:#FFFFFF;color:#1E3A8A;font-size:18px;font-weight:800;line-height:1.25;padding:0;vertical-align:middle;">${escapeHtml(WELCOME_HEADER_BRAND)}</td></tr></table></td></tr><tr><td bgcolor="#ffffff" style="background-color:#FFFFFF;padding:20px 22px 24px 22px;">${params.bodyHtml}${launchPrimaryCta(params.ctaLabel, params.ctaUrl)}<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#94A3B8;">${escapeHtml(params.footerNote)}</p></td></tr>${launchEmailFooter(params.supportEmail, params.preferencesUrl, params.unsubscribeUrl)}</table></td></tr></table></body></html>`;

  const text = buildWelcomePlainText(params);
  return { html, text };
}

function buildWelcomePlainText(params: {
  preheader: string;
  heroTitle: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
  supportEmail: string;
  preferencesUrl?: string | null;
  unsubscribeUrl?: string | null;
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

  const preferenceTextLines: string[] = [];
  if (hasDisplayValue(params.preferencesUrl)) {
    preferenceTextLines.push(`Manage preferences: ${params.preferencesUrl!.trim()}`);
  }
  if (hasDisplayValue(params.unsubscribeUrl)) {
    preferenceTextLines.push(`Unsubscribe: ${params.unsubscribeUrl!.trim()}`);
  }

  return [
    WELCOME_HEADER_BRAND,
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
    `Questions about your account? Contact ${params.supportEmail}`,
    ...preferenceTextLines,
    '',
    '© Copyright 2025. NextGen CTO Pvt Ltd. All Rights Reserved.',
  ]
    .filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== ''))
    .join('\n');
}

export function buildGoogleWelcomeEmail(params: {
  fullName: string;
  dashboardUrl: string;
  email?: string;
  learningUrl?: string;
  supportEmail?: string;
  preferencesUrl?: string;
  unsubscribeUrl?: string;
}): TransactionalEmailContent {
  const firstName = firstNameFrom(params.fullName);
  const supportEmail = hasDisplayValue(params.supportEmail)
    ? params.supportEmail!.trim()
    : DEFAULT_SUPPORT_EMAIL;
  const preferencesUrl = hasDisplayValue(params.preferencesUrl)
    ? params.preferencesUrl!.trim()
    : derivePreferencesUrlFromDashboard(params.dashboardUrl);
  const unsubscribeUrl = hasDisplayValue(params.unsubscribeUrl)
    ? params.unsubscribeUrl!.trim()
    : deriveUnsubscribeUrl(params.email);
  const ctaUrl = params.dashboardUrl?.trim() || params.learningUrl?.trim() || '';
  const ctaLabel = 'Start Learning';

  const bodyHtml = [
    launchStatusPill('WELCOME ABOARD'),
    `<h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Welcome to NextGen CTO 🎉</h1>`,
    launchAccentDivider(),
    bodyParagraph(`Hi ${firstName},`),
    bodyParagraph(
      'Welcome to NextGen CTO. Your learning account has been created successfully, and your student dashboard is now ready.',
    ),
    bodyParagraph(
      "I'm Anuj, Founder & CEO of NextGen CTO Private Limited. We're glad to welcome you to a learning platform built to help students develop strong technical foundations, practical project experience, and career-ready confidence.",
    ),
    bodyParagraph(
      'At NextGen CTO, our focus is simple: help you move beyond classroom learning and build real-world skills that matter for internships, placements, and future technology roles.',
    ),
    numberedSection("What you'll find inside", [
      'Structured learning paths designed for career readiness',
      'Practical lessons focused on real-world technology skills',
      'Projects and activities to strengthen your portfolio',
      'Progress tracking to help you stay consistent',
    ]),
    sectionWithParagraph(
      'Your next step',
      'Start with your student dashboard and explore the learning resources available to you.',
    ),
    bodyParagraph(
      'If anything looks incorrect, or if you need help accessing your dashboard, contact support from your registered email.',
    ),
  ].join('');

  const { html, text } = wrapWelcomeLaunchEmail({
    preheader:
      'Your NextGen CTO learning journey is ready to begin. Start from your student dashboard.',
    heroTitle: 'Welcome to NextGen CTO',
    bodyHtml,
    ctaLabel,
    ctaUrl,
    footerNote:
      'You received this email because your NextGen CTO learning account was created successfully.',
    supportEmail,
    preferencesUrl,
    unsubscribeUrl,
  });

  return {
    subject: 'Welcome to NextGen CTO — Your Learning Journey Starts Here',
    html,
    text,
  };
}
