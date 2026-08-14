/**
 * Parse / validate arbitrary external recipient emails for Custom Email.
 * Shared by client (UX) and server (security). Never trust browser-only parsing.
 */

/** Conservative cap aligned with Email Center batching (snapshot 100 / send 25). */
export const MAX_EXTERNAL_EMAIL_RECIPIENTS = 2_000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ParsedExternalEmail = {
  /** Deliverable address (trimmed; lowercased for stable dedupe / delivery). */
  email: string;
  full_name: string | null;
};

export type ParseExternalEmailListResult = {
  emails: ParsedExternalEmail[];
  /** Unique valid count after dedupe (before limit truncation for display helpers). */
  validCount: number;
  duplicateCount: number;
  invalidEntries: string[];
  emptySkipped: number;
  overLimit: boolean;
};

function hasHeaderInjection(token: string): boolean {
  return /[\r\n\u0000]/.test(token);
}

/**
 * Parse one token: bare email or `Name <email@x.com>`.
 * Returns null when malformed or header-injection characters are present.
 */
export function parseExternalEmailToken(raw: string): ParsedExternalEmail | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (hasHeaderInjection(trimmed)) return null;

  const angle = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (angle) {
    const emailRaw = angle[2].trim();
    if (hasHeaderInjection(emailRaw) || !EMAIL_REGEX.test(emailRaw)) return null;
    const name = angle[1].trim();
    if (hasHeaderInjection(name)) return null;
    return {
      email: emailRaw.toLowerCase(),
      full_name: name || null,
    };
  }

  if (!EMAIL_REGEX.test(trimmed)) return null;
  return { email: trimmed.toLowerCase(), full_name: null };
}

/**
 * Split on newlines, commas, and semicolons; validate; dedupe case-insensitively.
 * Invalid tokens are listed — never silently discarded from the caller's view.
 */
export function parseExternalEmailList(raw: string): ParseExternalEmailListResult {
  const parts = (raw ?? '').split(/[\n,;]+/);
  const seen = new Set<string>();
  const emails: ParsedExternalEmail[] = [];
  const invalidEntries: string[] = [];
  let emptySkipped = 0;
  let duplicateCount = 0;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) {
      emptySkipped += 1;
      continue;
    }
    const parsed = parseExternalEmailToken(trimmed);
    if (!parsed) {
      invalidEntries.push(trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed);
      continue;
    }
    if (seen.has(parsed.email)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(parsed.email);
    emails.push(parsed);
  }

  const overLimit = emails.length > MAX_EXTERNAL_EMAIL_RECIPIENTS;

  return {
    emails,
    validCount: emails.length,
    duplicateCount,
    invalidEntries,
    emptySkipped,
    overLimit,
  };
}

export function formatExternalEmailsForStorage(parsed: ParsedExternalEmail[]): string {
  return parsed.map((e) => (e.full_name ? `${e.full_name} <${e.email}>` : e.email)).join('\n');
}

export type ExternalEmailValidationOk = { ok: true; emails: ParsedExternalEmail[]; parsed: ParseExternalEmailListResult };
export type ExternalEmailValidationErr = {
  ok: false;
  error: string;
  parsed: ParseExternalEmailListResult;
};
export type ExternalEmailValidationResult = ExternalEmailValidationOk | ExternalEmailValidationErr;

/** Server-side gate: at least one valid email, no invalids, under limit. */
export function validateExternalEmailList(raw: string): ExternalEmailValidationResult {
  const parsed = parseExternalEmailList(raw);

  if (parsed.invalidEntries.length > 0) {
    return {
      ok: false,
      error: `Invalid email address(es): ${parsed.invalidEntries.slice(0, 5).join(', ')}${
        parsed.invalidEntries.length > 5 ? ` (+${parsed.invalidEntries.length - 5} more)` : ''
      }`,
      parsed,
    };
  }

  if (parsed.overLimit) {
    return {
      ok: false,
      error: `Too many recipients (${parsed.validCount}). Maximum is ${MAX_EXTERNAL_EMAIL_RECIPIENTS}.`,
      parsed,
    };
  }

  if (parsed.emails.length === 0) {
    return {
      ok: false,
      error: 'Enter at least one valid external email address.',
      parsed,
    };
  }

  return { ok: true, emails: parsed.emails, parsed };
}
