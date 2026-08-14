/**
 * Canonical Email Center branded shell (header + footer).
 *
 * Logo and social icons are resolved from shared brand config at wrap time
 * so preview and delivery share the same absolute HTTPS assets.
 */

import { buildEmailLogoImgHtml } from '@/lib/brand/email-logo-markup';
import { getEmailBrandLogoUrl } from '@/lib/brand/email-logo-url';
import {
  getEmailSocialAssets,
  getEmailSocialLinks,
} from '@/lib/email-center/brand-links';

/** Footer copyright year shown in the branded email shell. */
export const EMAIL_SHELL_COPYRIGHT_YEAR = 2026;

/** Rewrite stale © Copyright / (c) years in already-baked HTML (templates, drafts). */
export function normalizeEmailCopyrightYear(
  html: string,
  year: number = EMAIL_SHELL_COPYRIGHT_YEAR,
): string {
  if (!html) return html;
  return html
    .replace(/©\s*Copyright\s*20\d{2}\./gi, `© Copyright ${year}.`)
    .replace(/\(c\)\s*20\d{2}(\s+NextGen)/gi, `(c) ${year}$1`);
}
export interface EmailShellOptions {
  /** Inner body HTML already sanitized and including heading/CTAs. */
  bodyHtml: string;
  /** Preheader / preview text (escaped by caller or plain). */
  previewText?: string | null;
  /** Document title (escaped by caller or plain). */
  title?: string | null;
  /**
   * When false, omit unsubscribe preference link (transactional-style footer).
   * Default true — matches non-transactional Email Center templates.
   */
  includeUnsubscribe?: boolean;
}

function escapeHtml(text: string | undefined | null): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderSocialIconLink(href: string, iconSrc: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeIcon = escapeHtml(iconSrc);
  const safeLabel = escapeHtml(label);
  return `<td style="padding:0 6px;"><a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;cursor:pointer;text-decoration:none;"><img src="${safeIcon}" width="24" height="24" alt="${safeLabel}" style="display:block;width:24px;height:24px;border:0;outline:none;text-decoration:none;"/></a></td>`;
}

/** Social icon row — destinations + PNG icons from shared brand config. */
function renderSocialLinksHtml(): string {
  const assets = getEmailSocialAssets();
  const cells = [
    renderSocialIconLink(assets.instagramUrl, assets.instagramIcon, 'Instagram'),
    renderSocialIconLink(assets.linkedinUrl, assets.linkedinIcon, 'LinkedIn'),
    renderSocialIconLink(assets.youtubeUrl, assets.youtubeIcon, 'YouTube'),
  ].join('');
  return `<div style="margin:auto;text-align:center;"><p style="color:#172B4D;font-size:14px;font-weight:600;">Follow us on</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;"><tr>${cells}</tr></table></div>`;
}

function renderHeaderHtml(logoUrl: string): string {
  const logoImg = buildEmailLogoImgHtml(logoUrl, 48);
  return `<tr><td bgcolor="#0B0F19" style="background-color:#0B0F19;background:#0B0F19;border-bottom:2px solid #F59E0B;padding:22px 24px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0B0F19" style="background-color:#0B0F19;mso-table-lspace:0;mso-table-rspace:0;"><tr><td width="52" valign="middle" bgcolor="#0B0F19" style="background-color:#0B0F19;padding:0;vertical-align:middle;">${logoImg}</td><td valign="middle" bgcolor="#0B0F19" style="background-color:#0B0F19;color:#FFFFFF;font-size:18px;font-weight:800;padding-left:12px;vertical-align:middle;">{{email_header_display}}</td></tr></table></td></tr>`;
}

function renderFooterHtml(includeUnsubscribe: boolean, logoUrl: string): string {
  const compliance = includeUnsubscribe
    ? `<p style="font-weight:300;margin:0;padding:0;text-align:center;font-size:15px;">You are receiving this email because you are a subscriber of NextGen CTO.</p><p style="font-weight:300;margin:8px 0 0 0;padding:0;text-align:center;font-size:15px;">If you are no longer interested, click <a href="{{unsubscribe_url}}">here</a> to unsubscribe.</p>`
    : `<p style="font-weight:300;margin:0;padding:0;text-align:center;font-size:15px;">This is an essential account or service message from NextGen CTO.</p>`;

  const logoImg = buildEmailLogoImgHtml(logoUrl, 56);
  return `<tr><td align="center" bgcolor="#ffffff" style="text-align:center;margin-top:50px;font-size:0.9em;color:#777;padding:25px 20px;background:#ffffff;background-color:#ffffff;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;"><tr><td valign="middle" style="padding-right:10px;"><a href="{{email_website_url}}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">${logoImg}</a></td><td valign="middle" style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;line-height:1.2;color:#1E335C;">NextGen CTO</td></tr></table>${renderSocialLinksHtml()}<div style="flex-grow:1;height:1px;background-color:black;margin-top:2rem;"></div>${compliance}<p style="font-weight:300;margin:6px 0 0 0;padding:0;text-align:center;font-size:15px;">© Copyright ${EMAIL_SHELL_COPYRIGHT_YEAR}. NextGen-CTO Pvt. Ltd. All Rights Reserved.</p></td></tr>`;
}

/**
 * Wrap inner content in the canonical branded email shell.
 * Logo/social assets are absolute HTTPS at wrap time; header display / unsubscribe still merge later.
 */
export function wrapInBrandedEmailShell(options: EmailShellOptions): string {
  const includeUnsubscribe = options.includeUnsubscribe !== false;
  const title = escapeHtml(options.title?.trim() || 'NextGen CTO');
  const preview = escapeHtml(options.previewText?.trim() || '');
  const body = options.bodyHtml || '';
  const logoUrl = getEmailBrandLogoUrl();

  return normalizeEmailCopyrightYear(`<!DOCTYPE html><html><head><meta charset="utf-8"/><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="color-scheme" content="light"/><meta name="supported-color-schemes" content="light"/><title>${title}</title></head><body style="margin:0;padding:0;background-color:#F8FAFC;font-family:Arial,Helvetica,sans-serif;color:#111827;-webkit-text-size-adjust:100%;"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:transparent;opacity:0;">${preview}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F8FAFC" style="background-color:#F8FAFC;mso-table-lspace:0;mso-table-rspace:0;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="max-width:680px;background-color:#ffffff;border:1px solid #E5E7EB;border-radius:10px;mso-table-lspace:0;mso-table-rspace:0;">${renderHeaderHtml(logoUrl)}<tr><td bgcolor="#ffffff" style="background-color:#FFFFFF;padding:20px 22px 24px 22px;">${body}</td></tr>${renderFooterHtml(includeUnsubscribe, logoUrl)}</table></td></tr></table></body></html>`);
}

export function brandedShellIncludesUnsubscribe(html: string): boolean {
  return html.includes('{{unsubscribe_url}}') || /unsubscribe/i.test(html);
}

export function brandedShellIncludesHeader(html: string): boolean {
  return (/alt="NextGen CTO"/i.test(html) || html.includes('{{email_logo_url}}')) && /#0B0F19/i.test(html);
}

/** Exported for tests — social markup must use approved absolute HTTPS destinations. */
export function getEmailShellSocialLinksForTest() {
  return { ...getEmailSocialLinks() };
}
