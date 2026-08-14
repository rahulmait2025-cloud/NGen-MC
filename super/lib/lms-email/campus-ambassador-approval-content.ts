import { buildEmailLogoImgHtml } from '@/lib/brand/email-logo-markup';
import { getEmailBrandLogoUrl } from '@/lib/brand/email-logo-url';
import {
  getEmailSocialAssets,
} from '@/lib/email-center/brand-links';

/** Matches LMS payment / welcome transactional email chrome. */
const HEADER_BRAND = 'NEXTGEN-CTO';
const DEFAULT_SUPPORT_EMAIL = 'support@nextgen-cto.in';
/** Primary brand accent for body CTAs and highlights (header chrome stays amber). */
const BRAND_PRIMARY = '#FF5F36';
const BRAND_PRIMARY_SOFT = '#FFF4F0';
const TEXT_DARK = '#0F172A';
const TEXT_BODY = '#334155';
const TEXT_MUTED = '#64748B';
const BORDER_NEUTRAL = '#E5E7EB';

function resolveSocial() {
  const assets = getEmailSocialAssets();
  return {
    instagram: assets.instagramUrl,
    linkedin: assets.linkedinUrl,
    youtube: assets.youtubeUrl,
    instagramIcon: assets.instagramIcon,
    linkedinIcon: assets.linkedinIcon,
    youtubeIcon: assets.youtubeIcon,
  } as const;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function optionalTrimmed(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function resolveSupportEmail(): string {
  const candidates = [
    process.env.NEXTGEN_SUPPORT_EMAIL,
    process.env.SUPPORT_EMAIL,
    process.env.EMAIL_REPLY_TO,
  ];
  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (trimmed) return trimmed;
  }
  return DEFAULT_SUPPORT_EMAIL;
}

export function getLmsBaseUrlForEmail(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_LMS_URL,
    process.env.NEXT_PUBLIC_STUDENT_APP_URL,
    process.env.STUDENT_APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ];
  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    const trimmed = raw.trim().replace(/\/+$/, '');
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
  return 'https://app.nextgen-cto.in';
}

function bodyParagraph(text: string): string {
  return `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:${TEXT_BODY};">${escapeHtml(text)}</p>`;
}

function primaryCta(label: string, url: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 12px 0;"><tr><td align="left" bgcolor="${BRAND_PRIMARY}" style="border-radius:8px;background-color:${BRAND_PRIMARY};"><a href="${escapeHtml(url)}" style="display:inline-block;background-color:${BRAND_PRIMARY};color:#FFFFFF;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;padding:14px 24px;border-radius:8px;letter-spacing:0.2px;mso-padding-alt:0;border:1px solid ${BRAND_PRIMARY};">${escapeHtml(label)}</a></td></tr></table>`;
}

function ctaFallbackLink(url: string): string {
  return `<p style="margin:0 0 22px 0;font-size:13px;line-height:1.6;color:${TEXT_MUTED};">If the button does not work, copy this link into your browser:<br/><a href="${escapeHtml(url)}" style="color:${BRAND_PRIMARY};text-decoration:underline;word-break:break-all;">${escapeHtml(url)}</a></p>`;
}

/** Decorative accent mark — email-safe, no transform dependency. */
function sparkDecor(): string {
  return `<span aria-hidden="true" style="display:inline-block;width:8px;height:8px;margin:0 0 0 6px;vertical-align:middle;border-radius:50%;background-color:${BRAND_PRIMARY};font-size:0;line-height:0;">&nbsp;</span>`;
}

function numberBadge(n: number): string {
  return `<td width="36" valign="top" style="padding:0 12px 0 0;vertical-align:top;"><div style="width:28px;height:28px;line-height:28px;text-align:center;border-radius:50%;background:${BRAND_PRIMARY_SOFT};border:1px solid ${BRAND_PRIMARY};color:${BRAND_PRIMARY};font-size:13px;font-weight:700;font-family:Arial,Helvetica,sans-serif;">${n}</div></td>`;
}

/**
 * Role / benefit card for the 2×2 desktop grid.
 * Uses <th> (not <td>) so Gmail Android honors display:block stacking in media queries.
 * Desktop: badge left + text right. Mobile CSS stacks the column full-width and
 * places the badge above the heading so text is never squeezed into a tiny column.
 */
function roleCard(index: number, title: string, description: string): string {
  const wrapSafe =
    'word-break:normal;overflow-wrap:normal;white-space:normal;hyphens:none;-webkit-hyphens:none;-ms-hyphens:none;';
  return `<th class="benefit-column ca-stack" width="50%" valign="top" align="left" style="width:50%;max-width:50%;padding:0 8px 16px 8px;vertical-align:top;font-weight:normal;text-align:left;">
<table class="benefit-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:100%;border:1px solid ${BORDER_NEUTRAL};border-radius:10px;background:#ffffff;">
<tr><td class="benefit-card-pad" style="padding:16px 16px 14px 16px;">
<table class="benefit-inner" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;"><tr>
<td class="benefit-badge-cell" width="40" valign="top" style="width:40px;padding:0 12px 0 0;vertical-align:top;">
<div style="width:28px;height:28px;line-height:28px;text-align:center;border-radius:50%;background:${BRAND_PRIMARY_SOFT};border:1px solid ${BRAND_PRIMARY};color:${BRAND_PRIMARY};font-size:13px;font-weight:700;font-family:Arial,Helvetica,sans-serif;">${index}</div>
</td>
<td class="benefit-text-cell" valign="top" style="vertical-align:top;width:100%;">
<p class="benefit-heading" style="margin:0 0 6px 0;font-size:14px;line-height:1.4;color:${TEXT_DARK};font-weight:700;${wrapSafe}">${escapeHtml(title)}</p>
<p class="benefit-description" style="margin:0;font-size:13px;line-height:1.6;color:${TEXT_MUTED};${wrapSafe}">${escapeHtml(description)}</p>
</td></tr></table>
</td></tr></table>
</th>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
<td style="padding:8px 0;border-bottom:1px solid ${BORDER_NEUTRAL};font-size:13px;color:${TEXT_MUTED};width:38%;vertical-align:top;">${escapeHtml(label)}</td>
<td style="padding:8px 0;border-bottom:1px solid ${BORDER_NEUTRAL};font-size:14px;color:${TEXT_DARK};font-weight:600;word-break:break-word;vertical-align:top;">${escapeHtml(value)}</td>
</tr>`;
}

function checklistItem(n: number, text: string): string {
  return `<tr>
${numberBadge(n)}
<td valign="middle" style="padding:0 0 12px 0;vertical-align:middle;font-size:14px;line-height:1.55;color:${TEXT_BODY};word-break:break-word;">${escapeHtml(text)}</td>
</tr>`;
}

function benefitItem(text: string): string {
  return `<tr>
<td width="22" valign="top" style="padding:0 10px 10px 0;vertical-align:top;"><div style="width:10px;height:10px;margin-top:5px;border-radius:50%;background-color:${BRAND_PRIMARY};font-size:0;line-height:0;">&nbsp;</div></td>
<td valign="top" style="padding:0 0 10px 0;vertical-align:top;font-size:14px;line-height:1.6;color:${TEXT_BODY};word-break:break-word;">${escapeHtml(text)}</td>
</tr>`;
}

function launchEmailFooter(supportEmail: string): string {
  const supportHref = `mailto:${supportEmail}`;
  const logoUrl = getEmailBrandLogoUrl();
  const social = resolveSocial();
  return `<tr><td align="center" bgcolor="#ffffff" style="text-align:center;margin-top:50px;font-size:0.9em;color:#777;padding:25px 20px;background:#ffffff;background-color:#ffffff;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
<tr>
<td valign="middle" style="padding-right:10px;">${buildEmailLogoImgHtml(logoUrl, 56)}</td>
<td valign="middle" style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;line-height:1.2;color:#1E335C;">NextGen CTO</td>
</tr></table>
<div style="margin:auto;text-align:center;">
<p style="color:#172B4D;font-size:14px;font-weight:600;">Follow us on</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
<tr>
<td style="padding:0 6px;"><a href="${escapeHtml(social.instagram)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;cursor:pointer;text-decoration:none;"><img src="${escapeHtml(social.instagramIcon)}" width="24" height="24" alt="Instagram" style="display:block;width:24px;height:24px;border:0;outline:none;text-decoration:none;"/></a></td>
<td style="padding:0 6px;"><a href="${escapeHtml(social.linkedin)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;cursor:pointer;text-decoration:none;"><img src="${escapeHtml(social.linkedinIcon)}" width="24" height="24" alt="LinkedIn" style="display:block;width:24px;height:24px;border:0;outline:none;text-decoration:none;"/></a></td>
<td style="padding:0 6px;"><a href="${escapeHtml(social.youtube)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;cursor:pointer;text-decoration:none;"><img src="${escapeHtml(social.youtubeIcon)}" width="24" height="24" alt="YouTube" style="display:block;width:24px;height:24px;border:0;outline:none;text-decoration:none;"/></a></td>
</tr></table>
</div>
<div style="height:1px;background-color:#E5E7EB;margin-top:2rem;"></div>
<p style="font-weight:300;margin:16px 0 0;padding:0;text-align:center;font-size:15px;color:#334155;">Have questions? Write to <a href="${escapeHtml(supportHref)}" style="color:#d97a1f;text-decoration:underline;font-weight:600;">${escapeHtml(supportEmail)}</a></p>
<p style="font-weight:300;margin-top:6px;text-align:center;font-size:15px;color:#64748B;">© Copyright 2026. NextGen-CTO Pvt. Ltd. All Rights Reserved.</p>
</td></tr>`;
}

export type CampusAmbassadorApprovalEmailParams = {
  fullName: string;
  email: string;
  collegeSlug?: string | null;
  couponCode?: string | null;
  baseUrl?: string;
  /** Optional display name for the ambassador's college. */
  collegeName?: string | null;
  /** Optional public ambassador identifier shown in the welcome panel. */
  ambassadorId?: string | null;
  /** Optional cohort / program label. */
  cohortName?: string | null;
};

export function buildCampusAmbassadorApprovalEmail(
  params: CampusAmbassadorApprovalEmailParams,
): { subject: string; html: string; text: string } {
  const ambassadorName = params.fullName.trim() || 'Ambassador';
  const safeName = escapeHtml(ambassadorName);
  const base = (params.baseUrl ?? getLmsBaseUrlForEmail()).replace(/\/+$/, '');
  const dashboardPath = params.collegeSlug
    ? `/c/${encodeURIComponent(params.collegeSlug)}/student/dashboard/campus-ambassador`
    : '/campus-ambassador';
  const dashboardUrl = `${base}${dashboardPath}`;
  const supportEmail = resolveSupportEmail();
  const collegeName = optionalTrimmed(params.collegeName);
  const ambassadorId = optionalTrimmed(params.ambassadorId);
  const cohortName = optionalTrimmed(params.cohortName);
  const couponCode = optionalTrimmed(params.couponCode);
  const logoUrl = getEmailBrandLogoUrl();
  const ctaLabel = 'Open Ambassador Dashboard';

  const subject = 'Welcome to the NextGen CTO Campus Ambassador Program';
  const preheader =
    'You are officially part of the Campus Ambassador community. Open your dashboard to get started.';

  const detailRows: string[] = [];
  if (collegeName) detailRows.push(detailRow('College', collegeName));
  if (ambassadorId) detailRows.push(detailRow('Ambassador ID', ambassadorId));
  if (cohortName) detailRows.push(detailRow('Cohort', cohortName));
  if (couponCode) detailRows.push(detailRow('Referral coupon', couponCode));

  const detailsBlock =
    detailRows.length > 0
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:14px 0 0 0;">${detailRows.join('')}</table>`
      : '';

  const bodyHtml = `
<!-- welcome hero -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px 0;">
<tr><td style="padding:4px 0 0 0;">
<p style="margin:0 0 10px 0;font-size:11px;font-weight:700;color:${BRAND_PRIMARY};text-transform:uppercase;letter-spacing:0.1em;">Welcome to the community ${sparkDecor()}</p>
<h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.3;color:${TEXT_DARK};font-weight:800;word-break:break-word;">Welcome aboard, ${safeName}!</h1>
<p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:${TEXT_BODY};">You're officially a part of the NextGen CTO Campus Ambassador Program.</p>
${bodyParagraph(
  'We are excited to have you represent NextGen CTO at your campus. This journey is designed to help you build practical leadership, communication and community-building experience while helping students discover meaningful learning and career opportunities.',
)}
</td></tr></table>

<!-- personal welcome panel -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
<tr><td style="background-color:${BRAND_PRIMARY_SOFT};border:1px solid #FDD5C8;border-radius:10px;padding:18px 18px 16px 18px;">
<p style="margin:0 0 10px 0;font-size:15px;line-height:1.6;color:${TEXT_DARK};font-weight:700;word-break:break-word;">Hello ${safeName},</p>
<p style="margin:0;font-size:14px;line-height:1.7;color:${TEXT_BODY};">Congratulations on being selected as a Campus Ambassador for NextGen CTO. You are now part of a student-led community working to make industry learning, career guidance and technology opportunities more accessible on campus.</p>
${detailsBlock}
</td></tr></table>

<!-- role introduction -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px 0;">
<tr><td>
<p style="margin:0 0 8px 0;font-size:18px;line-height:1.35;color:${TEXT_DARK};font-weight:800;">This is more than a campus title</p>
<p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:${TEXT_BODY};">It is an opportunity to take ownership, connect with students, lead meaningful initiatives and build experience that goes beyond the classroom.</p>
</td></tr></table>

<!-- responsibilities: 2-col desktop / stack mobile -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="ca-role-grid" style="margin:0 0 8px 0;width:100%;">
<tr>
${roleCard(1, 'Represent NextGen CTO at your campus', 'Be the official student point of contact and help us understand what students at your campus need.')}
${roleCard(2, 'Build a strong student community', 'Bring together students who are serious about technology, placements and career growth.')}
</tr>
<tr>
${roleCard(3, 'Lead campus initiatives', 'Support workshops, sessions, campaigns and community activities in coordination with the NextGen CTO team.')}
${roleCard(4, 'Grow through real responsibility', 'Develop communication, leadership, networking and execution skills through practical experience.')}
</tr>
</table>

<!-- what you can earn -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 24px 0;">
<tr><td style="border:1px solid ${BORDER_NEUTRAL};border-radius:10px;padding:18px 18px 10px 18px;background:#ffffff;">
<p style="margin:0 0 12px 0;font-size:16px;line-height:1.35;color:${TEXT_DARK};font-weight:800;">What you can earn along the way</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
${benefitItem('Performance-based certificates and recognition')}
${benefitItem('Opportunity to earn exclusive NextGen CTO merchandise and rewards')}
${benefitItem('Access to selected workshops and community sessions')}
${benefitItem('Networking opportunities with students and industry mentors')}
${benefitItem('Leadership and community-building experience')}
${benefitItem('Internship or extended-role consideration for top performers, based on program performance')}
</table>
</td></tr></table>

<!-- getting started -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px 0;">
<tr><td style="border:1px solid ${BORDER_NEUTRAL};border-radius:10px;padding:18px;background:#F8FAFC;">
<p style="margin:0 0 14px 0;font-size:16px;line-height:1.35;color:${TEXT_DARK};font-weight:800;">Your first steps</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
${checklistItem(1, 'Join the official Campus Ambassador community')}
${checklistItem(2, 'Complete your ambassador profile')}
${checklistItem(3, 'Read the onboarding guidelines')}
${checklistItem(4, 'Introduce yourself to the community')}
${checklistItem(5, 'Review your first campus task')}
</table>
</td></tr></table>

<!-- CTA -->
${primaryCta(ctaLabel, dashboardUrl)}
${ctaFallbackLink(dashboardUrl)}

<!-- support -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px 0;">
<tr><td style="border:1px solid ${BORDER_NEUTRAL};border-radius:10px;padding:16px 18px;background:#ffffff;">
<p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:${TEXT_DARK};">Need help getting started?</p>
<p style="margin:0;font-size:13px;line-height:1.65;color:${TEXT_MUTED};">Our team is here to help you with onboarding, campus activities and program-related questions. Write to <a href="mailto:${escapeHtml(supportEmail)}" style="color:${BRAND_PRIMARY};text-decoration:underline;font-weight:600;">${escapeHtml(supportEmail)}</a>.</p>
</td></tr></table>

<!-- sign-off -->
<p style="margin:0 0 4px 0;font-size:15px;line-height:1.7;color:${TEXT_BODY};">Let's build something meaningful at your campus.</p>
<p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:${TEXT_DARK};font-weight:700;">Team NextGen CTO</p>
`.trim();

  const footerNote =
    'You received this email because your NextGen CTO Campus Ambassador application was approved.';

  const responsiveCss = [
    '@media only screen and (max-width:600px){',
    '.email-container{width:100%!important;max-width:100%!important;}',
    '.email-outer-pad{padding-left:12px!important;padding-right:12px!important;}',
    '.mobile-padding{padding-left:18px!important;padding-right:18px!important;}',
    /* Force table rows/cells to stack — Gmail Android honors block on th more reliably than td */
    '.ca-role-grid,.ca-role-grid tbody,.ca-role-grid tr{display:block!important;width:100%!important;max-width:100%!important;}',
    '.benefit-column,.ca-stack{display:block!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;padding-left:0!important;padding-right:0!important;padding-bottom:14px!important;float:none!important;clear:both!important;}',
    '.benefit-card{width:100%!important;max-width:100%!important;box-sizing:border-box!important;}',
    '.benefit-card-pad{padding:20px 22px!important;}',
    '.benefit-inner,.benefit-inner tbody,.benefit-inner tr{display:block!important;width:100%!important;}',
    /* Badge above heading so text gets full card width */
    '.benefit-badge-cell{display:block!important;width:100%!important;max-width:100%!important;padding:0 0 10px 0!important;}',
    '.benefit-text-cell{display:block!important;width:100%!important;max-width:100%!important;padding:0!important;}',
    '.benefit-heading{display:block!important;width:auto!important;max-width:none!important;font-size:18px!important;line-height:1.35!important;word-break:normal!important;overflow-wrap:normal!important;white-space:normal!important;hyphens:none!important;-webkit-hyphens:none!important;}',
    '.benefit-description{display:block!important;width:auto!important;max-width:none!important;font-size:15px!important;line-height:1.65!important;word-break:normal!important;overflow-wrap:normal!important;white-space:normal!important;hyphens:none!important;-webkit-hyphens:none!important;}',
    '}',
  ].join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(subject)}</title><style type="text/css">${responsiveCss}</style><!--[if mso]><style type="text/css">body,table,td,th{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]--></head><body style="margin:0;padding:0;background-color:#F8FAFC;font-family:Arial,Helvetica,sans-serif;color:#111827;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:transparent;opacity:0;">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F8FAFC" style="background-color:#F8FAFC;mso-table-lspace:0;mso-table-rspace:0;"><tr><td class="email-outer-pad" align="center" style="padding:24px 12px;"><table role="presentation" class="email-container" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:680px;background-color:#ffffff;border:1px solid #E5E7EB;border-radius:10px;mso-table-lspace:0;mso-table-rspace:0;"><tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-bottom:2px solid #F59E0B;padding:22px 24px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF;width:100%;mso-table-lspace:0;mso-table-rspace:0;"><tr><td width="52" valign="middle" bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:0 12px 0 0;vertical-align:middle;">${buildEmailLogoImgHtml(logoUrl, 48, 'NextGen CTO Logo')}</td><td valign="middle" bgcolor="#FFFFFF" style="background-color:#FFFFFF;color:#1E3A8A;font-size:18px;font-weight:800;line-height:1.25;padding:0;vertical-align:middle;">${escapeHtml(HEADER_BRAND)}</td></tr></table></td></tr><tr><td class="mobile-padding" bgcolor="#ffffff" style="background-color:#FFFFFF;padding:20px 22px 24px 22px;">${bodyHtml}<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#94A3B8;">${escapeHtml(footerNote)}</p></td></tr>${launchEmailFooter(supportEmail)}</table></td></tr></table></body></html>`;

  const textLines = [
    HEADER_BRAND,
    '',
    preheader,
    '',
    `Welcome aboard, ${ambassadorName}!`,
    '',
    "You're officially a part of the NextGen CTO Campus Ambassador Program.",
    '',
    'We are excited to have you represent NextGen CTO at your campus. This journey is designed to help you build practical leadership, communication and community-building experience while helping students discover meaningful learning and career opportunities.',
    '',
    `Hello ${ambassadorName},`,
    '',
    'Congratulations on being selected as a Campus Ambassador for NextGen CTO. You are now part of a student-led community working to make industry learning, career guidance and technology opportunities more accessible on campus.',
  ];

  if (collegeName) textLines.push('', `College: ${collegeName}`);
  if (ambassadorId) textLines.push(`Ambassador ID: ${ambassadorId}`);
  if (cohortName) textLines.push(`Cohort: ${cohortName}`);
  if (couponCode) textLines.push(`Referral coupon: ${couponCode}`);

  textLines.push(
    '',
    'This is more than a campus title',
    'It is an opportunity to take ownership, connect with students, lead meaningful initiatives and build experience that goes beyond the classroom.',
    '',
    '1. Represent NextGen CTO at your campus',
    '2. Build a strong student community',
    '3. Lead campus initiatives',
    '4. Grow through real responsibility',
    '',
    'What you can earn along the way',
    '- Performance-based certificates and recognition',
    '- Opportunity to earn exclusive NextGen CTO merchandise and rewards',
    '- Access to selected workshops and community sessions',
    '- Networking opportunities with students and industry mentors',
    '- Leadership and community-building experience',
    '- Internship or extended-role consideration for top performers, based on program performance',
    '',
    'Your first steps',
    '1. Join the official Campus Ambassador community',
    '2. Complete your ambassador profile',
    '3. Read the onboarding guidelines',
    '4. Introduce yourself to the community',
    '5. Review your first campus task',
    '',
    `${ctaLabel}: ${dashboardUrl}`,
    '',
    `Need help getting started? Write to ${supportEmail}`,
    '',
    "Let's build something meaningful at your campus.",
    'Team NextGen CTO',
    '',
    footerNote,
    '',
    `Have questions? Write to ${supportEmail}`,
    '',
    '© Copyright 2026. NextGen CTO Pvt Ltd. All Rights Reserved.',
  );

  return { subject, html, text: textLines.join('\n') };
}
