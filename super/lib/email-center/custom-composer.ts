import { z } from 'zod';
import { wrapInBrandedEmailShell } from './email-shell';
import { RECIPIENT_VARIABLE_KEYS } from './template-variables';
import type { EmailCenterLane } from './email-category';

export const CUSTOM_COMPOSER_SCHEMA_VERSION = 1 as const;
export const MAX_CUSTOM_CTAS = 3;
export const MAX_COMPOSER_BODY_HTML_CHARS = 200_000;
export const MAX_COMPOSER_HEADING_CHARS = 200;
export const MAX_CTA_LABEL_CHARS = 80;
export const MAX_CTA_URL_CHARS = 2000;
export const MAX_COMPILED_HTML_WARN_CHARS = 102_400;

/** Verified merge variables admins may insert in Custom Email. */
export const CUSTOM_EMAIL_INSERTABLE_VARIABLES = [
  { key: 'first_name', label: 'First name', sample: 'Anuj' },
  { key: 'full_name', label: 'Full name', sample: 'Anuj Sharma' },
  { key: 'college_name', label: 'College name', sample: 'MAIT' },
  { key: 'dashboard_url', label: 'Dashboard URL', sample: 'https://nextgencto.com/dashboard' },
] as const;

/** Platform-recipient-only variables — blocked for external audience Custom Email. */
export const CUSTOM_EMAIL_PLATFORM_ONLY_VARIABLE_KEYS = new Set([
  'college_name',
  'dashboard_url',
]);

export function getCustomEmailInsertableVariables(audienceMode: 'platform' | 'external' = 'platform') {
  if (audienceMode === 'external') {
    return CUSTOM_EMAIL_INSERTABLE_VARIABLES.filter(
      (v) => !CUSTOM_EMAIL_PLATFORM_ONLY_VARIABLE_KEYS.has(v.key),
    );
  }
  return [...CUSTOM_EMAIL_INSERTABLE_VARIABLES];
}

export const CUSTOM_EMAIL_ALLOWED_VARIABLE_KEYS = new Set([
  ...CUSTOM_EMAIL_INSERTABLE_VARIABLES.map((v) => v.key),
  'unsubscribe_url',
  'email_logo_url',
  'email_website_url',
  'email_header_display',
  'support_url',
]);

const SAFE_HTTPS_URL = z
  .string()
  .trim()
  .min(1, 'URL is required')
  .max(MAX_CTA_URL_CHARS, 'URL too long')
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'URL must be a valid https:// address')
  .refine((value) => {
    const lower = value.toLowerCase();
    return !lower.startsWith('javascript:') && !lower.startsWith('data:') && !lower.startsWith('vbscript:');
  }, 'Unsafe URL protocol');

export const customEmailCtaSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().trim().min(1, 'CTA label is required').max(MAX_CTA_LABEL_CHARS),
  url: SAFE_HTTPS_URL,
  style: z.enum(['primary', 'secondary']),
});

export const customEmailComposerStateSchema = z.object({
  schema_version: z.literal(CUSTOM_COMPOSER_SCHEMA_VERSION),
  heading: z.string().max(MAX_COMPOSER_HEADING_CHARS).default(''),
  body_html: z.string().max(MAX_COMPOSER_BODY_HTML_CHARS),
  body_text: z.string().max(MAX_COMPOSER_BODY_HTML_CHARS).default(''),
  ctas: z.array(customEmailCtaSchema).max(MAX_CUSTOM_CTAS, `At most ${MAX_CUSTOM_CTAS} CTAs allowed`),
});

export type CustomEmailCta = z.infer<typeof customEmailCtaSchema>;
export type CustomEmailComposerState = z.infer<typeof customEmailComposerStateSchema>;

export type CampaignContentMode = 'template' | 'custom_composer' | 'legacy_html';

export function createEmptyComposerState(): CustomEmailComposerState {
  return {
    schema_version: CUSTOM_COMPOSER_SCHEMA_VERSION,
    heading: '',
    body_html: '',
    body_text: '',
    ctas: [],
  };
}

export function createCtaId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cta_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function escapeHtmlText(text: string | undefined | null): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function isSafeHttpsUrl(url: string): boolean {
  return SAFE_HTTPS_URL.safeParse(url).success;
}

export function extractMergeVariableKeys(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
}

export function findUnsupportedVariables(
  state: CustomEmailComposerState,
  subject = '',
  previewText = '',
  audienceMode: 'platform' | 'external' = 'platform',
): string[] {
  const keys = extractMergeVariableKeys(
    `${subject} ${previewText} ${state.heading} ${state.body_html} ${state.body_text} ${state.ctas.map((c) => `${c.label} ${c.url}`).join(' ')}`
  );
  return keys.filter((key) => {
    if (!CUSTOM_EMAIL_ALLOWED_VARIABLE_KEYS.has(key)) return true;
    if (audienceMode === 'external' && CUSTOM_EMAIL_PLATFORM_ONLY_VARIABLE_KEYS.has(key)) {
      return true;
    }
    return false;
  });
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*p\s*>/gi, '\n\n')
    .replace(/<\s*\/\s*h[1-6]\s*>/gi, '\n\n')
    .replace(/<\s*\/\s*li\s*>/gi, '\n')
    .replace(/<\s*hr\b[^>]*>/gi, '\n---\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function renderCtaButtonsHtml(ctas: CustomEmailCta[]): string {
  if (ctas.length === 0) return '';

  const rows = ctas.map((cta) => {
    const label = escapeHtmlText(cta.label);
    const href = escapeHtmlText(cta.url);
    const isPrimary = cta.style === 'primary';
    const style = isPrimary
      ? 'display:inline-block;background:linear-gradient(135deg,#e58c33 0%,#d97a1f 100%);color:#FFFFFF;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;padding:14px 22px;border-radius:50px;box-shadow:0 6px 20px rgba(229,140,51,0.35);letter-spacing:0.5px;'
      : 'display:inline-block;background:#FFFFFF;color:#0F172A;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;padding:12px 20px;border-radius:50px;border:2px solid #E5E7EB;';

    return `<tr><td align="left" style="padding:0 0 12px 0;"><a href="${href}" style="${style}">${label}</a></td></tr>`;
  });

  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 8px 0;">${rows.join('')}</table>`;
}

export function renderCtaButtonsText(ctas: CustomEmailCta[]): string {
  if (ctas.length === 0) return '';
  return ctas.map((cta) => `${cta.label}: ${cta.url}`).join('\n');
}

export function buildComposerInnerHtml(state: CustomEmailComposerState): string {
  const parts: string[] = [];
  const heading = state.heading.trim();
  if (heading) {
    parts.push(
      `<h1 style="margin:0 0 14px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">${escapeHtmlText(heading)}</h1>`
    );
  }
  if (state.body_html.trim()) {
    parts.push(
      `<div class="email-custom-body" style="font-size:15px;line-height:1.7;color:#334155;">${state.body_html}</div>`
    );
  }
  parts.push(renderCtaButtonsHtml(state.ctas));
  return parts.join('');
}

export function buildComposerPlainText(state: CustomEmailComposerState, subject?: string): string {
  const sections: string[] = [];
  if (subject?.trim()) sections.push(subject.trim());
  if (state.heading.trim()) sections.push(state.heading.trim());
  const bodyText = state.body_text.trim() || htmlToPlainText(state.body_html);
  if (bodyText) sections.push(bodyText);
  const ctaText = renderCtaButtonsText(state.ctas);
  if (ctaText) sections.push(ctaText);
  sections.push('');
  sections.push('Unsubscribe or manage preferences:');
  sections.push('{{unsubscribe_url}}');
  return sections.join('\n\n').trim();
}

export interface ComposerValidationIssue {
  code: string;
  message: string;
  level: 'error' | 'warning';
}

export interface ValidateComposerOptions {
  subject: string;
  previewText?: string | null;
  emailCategory?: EmailCenterLane | null;
  transactionalConfirmed?: boolean;
  requireNonEmptyBody?: boolean;
}

export function validateComposerState(
  rawState: unknown,
  options: ValidateComposerOptions
): { ok: boolean; state?: CustomEmailComposerState; issues: ComposerValidationIssue[] } {
  const issues: ComposerValidationIssue[] = [];
  const parsed = customEmailComposerStateSchema.safeParse(rawState);

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({
        code: 'schema',
        message: issue.message,
        level: 'error',
      });
    }
    return { ok: false, issues };
  }

  const state = parsed.data;
  const requireBody = options.requireNonEmptyBody !== false;

  if (!options.subject.trim()) {
    issues.push({ code: 'subject_empty', message: 'Subject is required', level: 'error' });
  } else if (options.subject.trim().length > 120) {
    issues.push({ code: 'subject_long', message: 'Subject is unusually long', level: 'warning' });
  }

  if (!options.previewText?.trim()) {
    issues.push({ code: 'preview_empty', message: 'Preview text is empty', level: 'warning' });
  }

  const bodyPlain = state.body_text.trim() || htmlToPlainText(state.body_html);
  if (requireBody && !bodyPlain && !state.heading.trim() && state.ctas.length === 0) {
    issues.push({ code: 'body_empty', message: 'Email body is empty', level: 'error' });
  }

  const primaryCount = state.ctas.filter((c) => c.style === 'primary').length;
  if (primaryCount > 1) {
    issues.push({ code: 'primary_cta', message: 'Only one Primary CTA is allowed', level: 'error' });
  }

  if (state.ctas.length > MAX_CUSTOM_CTAS) {
    issues.push({ code: 'cta_max', message: `At most ${MAX_CUSTOM_CTAS} CTAs allowed`, level: 'error' });
  }

  const urlCounts = new Map<string, number>();
  for (const cta of state.ctas) {
    if (!cta.label.trim()) {
      issues.push({ code: 'cta_label', message: 'CTA label is required', level: 'error' });
    }
    if (!isSafeHttpsUrl(cta.url)) {
      issues.push({ code: 'cta_url', message: `Invalid CTA URL: ${cta.url || '(empty)'}`, level: 'error' });
    }
    const normalized = cta.url.trim().toLowerCase();
    urlCounts.set(normalized, (urlCounts.get(normalized) ?? 0) + 1);
  }
  for (const [url, count] of urlCounts) {
    if (count > 1) {
      issues.push({ code: 'cta_duplicate', message: `Duplicate CTA destination: ${url}`, level: 'warning' });
    }
  }

  const unsupported = findUnsupportedVariables(state, options.subject, options.previewText ?? '');
  for (const key of unsupported) {
    issues.push({
      code: 'unsupported_variable',
      message: `Unsupported variable {{${key}}}`,
      level: 'error',
    });
  }

  if (!options.emailCategory) {
    issues.push({ code: 'category_missing', message: 'Email category is required', level: 'error' });
  }

  if (options.emailCategory === 'transactional_essential' && options.transactionalConfirmed === false) {
    issues.push({
      code: 'transactional_confirm',
      message: 'Confirm transactional / essential send before continuing',
      level: 'error',
    });
  }

  const hasError = issues.some((i) => i.level === 'error');
  return { ok: !hasError, state, issues };
}

export interface CompileCustomEmailInput {
  state: CustomEmailComposerState;
  subject: string;
  previewText?: string | null;
  emailCategory?: EmailCenterLane | null;
  /** Already sanitized body HTML (server must sanitize before compile). */
  sanitizedBodyHtml: string;
}

export interface CompiledCustomEmail {
  html_body: string;
  text_body: string;
  composer_state: CustomEmailComposerState;
  includeUnsubscribe: boolean;
  warnings: ComposerValidationIssue[];
}

export function compileCustomEmail(input: CompileCustomEmailInput): CompiledCustomEmail {
  const includeUnsubscribe = input.emailCategory !== 'transactional_essential';
  const state: CustomEmailComposerState = {
    ...input.state,
    body_html: input.sanitizedBodyHtml,
    body_text: input.state.body_text.trim() || htmlToPlainText(input.sanitizedBodyHtml),
  };

  const inner = buildComposerInnerHtml(state);
  const html_body = wrapInBrandedEmailShell({
    bodyHtml: inner,
    previewText: input.previewText,
    title: input.subject,
    includeUnsubscribe,
  });
  const text_body = buildComposerPlainText(state, input.subject);

  const warnings: ComposerValidationIssue[] = [];
  if (html_body.length > MAX_COMPILED_HTML_WARN_CHARS) {
    warnings.push({
      code: 'html_large',
      message: 'Compiled HTML is large and may be clipped by some clients',
      level: 'warning',
    });
  }
  if (!text_body.trim()) {
    warnings.push({
      code: 'text_missing',
      message: 'Plain-text content is missing',
      level: 'warning',
    });
  }

  return { html_body, text_body, composer_state: state, includeUnsubscribe, warnings };
}

export function parseComposerState(raw: unknown): CustomEmailComposerState | null {
  const parsed = customEmailComposerStateSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function resolveContentMode(campaign: {
  content_mode?: string | null;
  template_id?: string | null;
  composer_state?: unknown;
  html_body?: string | null;
}): CampaignContentMode {
  if (campaign.content_mode === 'custom_composer' || parseComposerState(campaign.composer_state)) {
    return 'custom_composer';
  }
  if (campaign.content_mode === 'legacy_html') {
    return 'legacy_html';
  }
  // Null-template persisted rows (including empty drafts) are legacy — never auto-upgrade.
  if (!campaign.template_id && typeof campaign.html_body === 'string') {
    return 'legacy_html';
  }
  if (campaign.content_mode === 'template' || campaign.template_id) {
    return 'template';
  }
  return 'custom_composer';
}

/** Detect full email documents that must not be nested inside the branded shell. */
export function looksLikeFullEmailDocument(html: string): boolean {
  const sample = html.slice(0, 8000).toLowerCase();
  return (
    sample.includes('<!doctype html')
    || sample.includes('<html')
    || sample.includes('<body')
    || (sample.includes('#0b0f19') && sample.includes('{{unsubscribe_url}}'))
    || (sample.includes('max-width:680px') && sample.includes('{{email_logo_url}}'))
  );
}

export function highlightUnresolvedVariables(html: string): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    if (CUSTOM_EMAIL_ALLOWED_VARIABLE_KEYS.has(key) || RECIPIENT_VARIABLE_KEYS.has(key)) {
      return `{{${key}}}`;
    }
    return `<mark style="background:#FEF3C7;color:#92400E;" title="Unresolved variable">{{${key}}}</mark>`;
  });
}
