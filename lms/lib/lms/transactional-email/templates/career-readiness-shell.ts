import { buildEmailLogoImgHtml } from '@/lib/brand/email-logo-markup';
import { escapeHtml } from '../escape';
import { EMAIL_BRAND, firstNameFrom } from './email-brand';

const HEADER_STYLE = `.crl-top-header,.crl-top-header table,.crl-top-header td{background:#0B0F19!important;background-color:#0B0F19!important;color:#FFFFFF!important;-webkit-text-fill-color:#FFFFFF!important}`;

function statusBadge(label: string, tone: 'success' | 'payment' | 'enrollment'): string {
  const colors =
    tone === 'payment'
      ? { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857' }
      : tone === 'enrollment'
        ? { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' }
        : { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c' };
  return `<div style="display:inline-block;margin:0 0 20px 0;padding:8px 14px;border-radius:999px;background:${colors.bg};border:1px solid ${colors.border};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${colors.text};">${escapeHtml(label)}</div>`;
}

export function detailCard(title: string, rows: Array<{ label: string; value: string }>): string {
  const rowHtml = rows
    .map(
      (r) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #E5E7EB;font-size:13px;color:#64748B;width:38%;">${escapeHtml(r.label)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #E5E7EB;font-size:14px;color:#0F172A;font-weight:600;">${escapeHtml(r.value)}</td></tr>`,
    )
    .join('');
  return `<div style="background:#f8fafc;border-radius:10px;padding:18px 20px;margin:0 0 20px 0;border:1px solid #E5E7EB;">
    <p style="margin:0 0 12px 0;font-size:15px;color:#0F172A;font-weight:700;">${escapeHtml(title)}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rowHtml}</table>
  </div>`;
}

function _nextStepsBlock(steps: string[]): string {
  const items = steps
    .map((s) => `<li style="margin:0 0 10px 0;">${escapeHtml(s)}</li>`)
    .join('');
  return `<div style="background:#ffffff;border-radius:10px;padding:18px;margin:0 0 20px 0;border:1px solid #E5E7EB;">
    <p style="margin:0 0 10px 0;font-size:15px;color:#0F172A;font-weight:700;">Your next steps</p>
    <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.75;color:#334155;">${items}</ol>
  </div>`;
}

function primaryCta(label: string, url: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px 0;">
<tr><td align="left">
<a href="${escapeHtml(url)}" style="display:inline-block;background:${EMAIL_BRAND.accentGradient};color:#FFFFFF;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;padding:14px 26px;border-radius:50px;box-shadow:0 6px 20px rgba(229,140,51,0.35);letter-spacing:0.5px;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

function secondaryLink(label: string, url: string): string {
  return `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
<a href="${escapeHtml(url)}" style="color:#d97a1f;font-weight:600;text-decoration:underline;">${escapeHtml(label)}</a></p>`;
}

function emailFooter(supportLine: string): string {
  return `<tr><td align="center" bgcolor="#ffffff" style="text-align:center;padding:22px 20px;background:#ffffff;border-top:1px solid #E5E7EB;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 12px auto;">
<tr>
<td valign="middle" style="padding-right:10px;">
<a href="${escapeHtml(EMAIL_BRAND.websiteUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
${buildEmailLogoImgHtml(EMAIL_BRAND.logoUrl, 48)}
</a>
</td>
<td valign="middle" style="font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;color:#1E335C;">NextGen CTO</td>
</tr></table>
<p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#64748B;">${escapeHtml(supportLine)}</p>
<p style="margin:0;font-size:12px;color:#94A3B8;">Learn. Build. Get career-ready. · NextGen CTO</p>
</td></tr>`;
}

function stripHtmlToText(html: string): string {
  let listNum = 0;
  return html
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
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Career Readiness–style shell for enrollment + payment transactional emails. */
export function wrapCareerReadinessEmail(params: {
  preheader: string;
  heroTitle: string;
  heroSubtitle?: string;
  badge?: { label: string; tone: 'success' | 'payment' | 'enrollment' };
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  secondaryLink?: { label: string; url: string };
  footerNote: string;
  supportEmail?: string;
}): { html: string; text: string } {
  const preheader = escapeHtml(params.preheader);
  const heroTitle = escapeHtml(params.heroTitle);
  const heroSubtitle = params.heroSubtitle ? escapeHtml(params.heroSubtitle) : '';
  const badge = params.badge ? statusBadge(params.badge.label, params.badge.tone) : '';
  const cta =
    params.ctaLabel && params.ctaUrl ? primaryCta(params.ctaLabel, params.ctaUrl) : '';
  const secondary =
    params.secondaryLink ? secondaryLink(params.secondaryLink.label, params.secondaryLink.url) : '';
  const supportLine = params.supportEmail
    ? `Need help? Contact ${params.supportEmail}`
    : 'Need help? Reply to this email for support.';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/><style type="text/css">${HEADER_STYLE}</style>
<title>${heroTitle}</title></head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:Arial,Helvetica,sans-serif;color:#111827;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:transparent;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F8FAFC" style="background-color:#F8FAFC;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="max-width:680px;background-color:#ffffff;border:1px solid #E5E7EB;border-radius:10px;">
<tr><td class="crl-top-header" bgcolor="${EMAIL_BRAND.headerBg}" style="background-color:${EMAIL_BRAND.headerBg};border-bottom:2px solid ${EMAIL_BRAND.accent};padding:22px 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${EMAIL_BRAND.headerBg}" class="crl-top-header">
<tr><td width="52" valign="middle">${buildEmailLogoImgHtml(EMAIL_BRAND.logoUrl, 48)}</td>
<td valign="middle" style="color:#FFFFFF;font-size:18px;font-weight:800;padding-left:12px;">${escapeHtml(EMAIL_BRAND.headerDisplay)}</td></tr></table></td></tr>
<tr><td bgcolor="#ffffff" style="padding:22px 24px 8px 24px;">
<div style="text-align:center;margin-bottom:8px;">
<h1 style="margin:0 0 8px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">${heroTitle}</h1>
${heroSubtitle ? `<p style="margin:0;font-size:14px;line-height:1.5;color:#64748B;">${heroSubtitle}</p>` : ''}
</div>
${badge}
${params.bodyHtml}
${cta}
${secondary}
<p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#94A3B8;">${escapeHtml(params.footerNote)}</p>
</td></tr>
${emailFooter(supportLine)}
</table></td></tr></table></body></html>`;

  const ctaText =
    params.ctaLabel && params.ctaUrl ? `\n\n${params.ctaLabel}: ${params.ctaUrl}` : '';
  const secondaryText = params.secondaryLink
    ? `\n${params.secondaryLink.label}: ${params.secondaryLink.url}`
    : '';
  const text = `${params.heroTitle}\n\n${stripHtmlToText(params.bodyHtml)}${ctaText}${secondaryText}\n\n${params.footerNote}\n\n${supportLine}`;

  return { html, text };
}

/** Student invite visual shell — no college name, no invitation wording (Google OAuth welcome). */
function _wrapInviteStyleWelcomeEmail(params: {
  preheader: string;
  firstName: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
}): { html: string; text: string } {
  const firstName = escapeHtml(firstNameFrom(params.firstName));
  const preheader = escapeHtml(params.preheader);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/><style type="text/css">${HEADER_STYLE}</style>
<title>Welcome to NextGen CTO</title></head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:Arial,Helvetica,sans-serif;color:#111827;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:transparent;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F8FAFC" style="background-color:#F8FAFC;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="max-width:680px;background-color:#ffffff;border:1px solid #E5E7EB;border-radius:10px;">
<tr><td class="crl-top-header" bgcolor="${EMAIL_BRAND.headerBg}" style="background-color:${EMAIL_BRAND.headerBg};border-bottom:2px solid ${EMAIL_BRAND.accent};padding:22px 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${EMAIL_BRAND.headerBg}" class="crl-top-header">
<tr><td width="52" valign="middle">${buildEmailLogoImgHtml(EMAIL_BRAND.logoUrl, 48, 'NextGen CTO Logo')}</td>
<td valign="middle" style="color:#FFFFFF;font-size:18px;font-weight:800;padding-left:12px;">${escapeHtml(EMAIL_BRAND.headerDisplay)}</td></tr></table></td></tr>
<tr><td bgcolor="#ffffff" style="padding:20px 22px 24px 22px;">
<div style="text-align:center;margin-bottom:24px;">
<h1 style="margin:0 0 8px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Welcome to NextGen CTO</h1>
<p style="margin:0;font-size:14px;line-height:1.5;color:#64748B;">Building the next generation of technology leaders</p>
</div>
<p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#334155;">Dear <strong>${firstName}</strong>,</p>
${params.bodyHtml}
${primaryCta(params.ctaLabel, params.ctaUrl)}
<p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#64748B;">If the button does not work, copy this link into your browser:<br/>
<a href="${escapeHtml(params.ctaUrl)}" style="color:#d97a1f;text-decoration:underline;word-break:break-all;">${escapeHtml(params.ctaUrl)}</a></p>
<p style="margin:0 0 4px 0;font-size:15px;line-height:1.7;color:#334155;">Warm regards,</p>
<p style="margin:0;font-size:15px;line-height:1.7;color:#334155;"><strong>Anuj (CTO Bhaiya)</strong><br/>Founder &amp; CEO<br/>NextGen CTO Private Limited</p>
<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#94A3B8;">${escapeHtml(params.footerNote)}</p>
</td></tr>
${emailFooter('Questions? Reply to this email — we are here to help.')}
</table></td></tr></table></body></html>`;

  const text = `Welcome to NextGen CTO\n\nDear ${firstNameFrom(params.firstName)},\n\n${stripHtmlToText(params.bodyHtml)}\n\n${params.ctaLabel}: ${params.ctaUrl}\n\n${params.footerNote}`;
  return { html, text };
}

export function bodyParagraph(text: string): string {
  return `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">${escapeHtml(text)}</p>`;
}

/**
 * Body paragraph with a structural `<strong>` around a dynamic phrase.
 * Escapes each text segment separately — never put HTML tags inside the args.
 */
export function bodyParagraphWithStrong(before: string, strongText: string, after = ''): string {
  return `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">${escapeHtml(before)}<strong>${escapeHtml(strongText)}</strong>${escapeHtml(after)}</p>`;
}
