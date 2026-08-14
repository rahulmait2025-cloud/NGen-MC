/**
 * Shared header branding for Custom Email (and any shell using {{email_header_display}}).
 *
 * College branding is selected by **explicit audience context**, not by whether a
 * college-name string happens to be empty.
 */

const PLACEHOLDER_COLLEGE_NAMES = new Set([
  'your college',
  'college',
  'unknown college',
  'n/a',
  'na',
  '-',
  '—',
  'tbd',
]);

export type EmailAudienceBrandMode = 'platform' | 'external';

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Return a real college name, or null when missing / placeholder. */
export function normalizeRecipientCollegeName(
  raw: string | null | undefined
): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  if (PLACEHOLDER_COLLEGE_NAMES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

/**
 * Resolve brand mode from explicit audience / recipient context.
 * Manual / external recipients always get NextGen CTO-only branding.
 */
export function resolveEmailAudienceBrandMode(input: {
  audienceMode?: EmailAudienceBrandMode | null;
  recipientType?: string | null;
  audienceType?: string | null;
}): EmailAudienceBrandMode {
  if (input.audienceMode === 'external') return 'external';
  if (input.audienceMode === 'platform') return 'platform';
  if (input.recipientType === 'manual') return 'external';
  if (input.audienceType === 'manual_emails') return 'external';
  return 'platform';
}

export type BuildEmailHeaderDisplayOptions = {
  /**
   * When `external`, always return `NextGen CTO` (no college, no separator).
   * When `platform`, use college name when a real one exists.
   */
  audienceMode?: EmailAudienceBrandMode;
  showCollegeBranding?: boolean;
};

/**
 * HTML header title for the branded navy bar.
 * Platform + known college → `NextGen CTO &times; MAIT`
 * External / no college → `NextGen CTO`
 * Never → `NextGen CTO × ` or `NextGen CTO × Your College`
 */
export function buildEmailHeaderDisplay(
  collegeName: string | null | undefined,
  options?: BuildEmailHeaderDisplayOptions
): string {
  const mode =
    options?.audienceMode
    ?? (options?.showCollegeBranding === false ? 'external' : 'platform');

  if (mode === 'external') {
    return 'NextGen CTO';
  }

  const college = normalizeRecipientCollegeName(collegeName);
  if (!college) return 'NextGen CTO';
  return `NextGen CTO &times; ${escapeHtmlText(college)}`;
}

/** True when a header string still contains the forbidden placeholder branding. */
export function isPlaceholderEmailHeaderDisplay(header: string | null | undefined): boolean {
  const value = (header ?? '').trim();
  if (!value) return true;
  return /your\s+college/i.test(value) || /nextgen\s+cto\s*(&times;|×)\s*$/i.test(value);
}
