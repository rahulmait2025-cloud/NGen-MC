import { escapeHtml } from '../escape';
import { bodyParagraph, wrapCareerReadinessEmail } from './career-readiness-shell';

export type TransactionalEmailContent = {
  subject: string;
  html: string;
  text: string;
};

/** @deprecated Prefer wrapCareerReadinessEmail — kept for any legacy callers. */
function _wrapTransactionalEmail(params: {
  preheader: string;
  headline: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote: string;
}): { html: string; text: string } {
  return wrapCareerReadinessEmail({
    preheader: params.preheader,
    heroTitle: params.headline,
    bodyHtml: params.bodyHtml,
    ctaLabel: params.ctaLabel,
    ctaUrl: params.ctaUrl,
    footerNote: params.footerNote,
  });
}

function _paragraph(text: string): string {
  return bodyParagraph(text);
}

function _strongLine(label: string, value: string): string {
  return `<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#334155;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;
}
