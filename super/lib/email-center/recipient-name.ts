export type RecipientNameInput = {
  first_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  display_name?: string | null;
  email?: string | null;
  given_name?: string | null;
};

/** Minimal user shape from Supabase Auth (browser or server). */
export type AuthUserLike = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  raw_user_meta_data?: Record<string, unknown> | null;
  identities?: unknown;
};

export type DerivedRecipientName = {
  first_name: string;
  full_name: string;
  display_name: string;
};

/** Shared greeting fallback — never use "Student". */
export const DEFAULT_RECIPIENT_FIRST_NAME_FALLBACK = 'there';

function trimStr(v: string | null | undefined): string {
  return v == null ? '' : String(v).trim();
}

function isBlank(v: string | null | undefined): boolean {
  return trimStr(v).length === 0;
}

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Legacy Email Center placeholders — never treat as a real greeting name.
  if (/^(student|valued student|admin|user|there)$/i.test(trimmed)) return null;
  return trimmed;
}

/** First meaningful word from a full name string. */
function splitFirstName(fullName: string | null | undefined): string {
  const w = trimStr(fullName).split(/\s+/).filter(Boolean)[0];
  return w ?? '';
}

function deriveNameFromIdentities(identities: unknown): {
  given_name: string;
  full_name: string;
} {
  if (!Array.isArray(identities)) return { given_name: '', full_name: '' };
  for (const identity of identities) {
    if (typeof identity !== 'object' || identity === null) continue;
    const data = (identity as { identity_data?: Record<string, unknown> }).identity_data;
    if (!data || typeof data !== 'object') continue;
    const given = trimStr(data['given_name'] as string | undefined);
    const full =
      trimStr(data['full_name'] as string | undefined)
      || trimStr(data['name'] as string | undefined);
    if (given || full) return { given_name: given, full_name: full };
  }
  return { given_name: '', full_name: '' };
}

/**
 * Shared first-name resolver for preview, test-send, and campaign delivery.
 *
 * Priority:
 * 1. googleGivenName / given_name
 * 2. first word of googleFullName
 * 3. first word of googleName
 * 4. profileFirstName
 * 5. first word of profileFullName
 * 6. fallback (`there` by default — never `Student`)
 */
export function resolveRecipientFirstName(input: {
  googleGivenName?: unknown;
  googleFullName?: unknown;
  googleName?: unknown;
  profileFirstName?: unknown;
  profileFullName?: unknown;
  fallback?: string;
}): string {
  const fallback = cleanName(input.fallback) ?? DEFAULT_RECIPIENT_FIRST_NAME_FALLBACK;

  const givenName = cleanName(input.googleGivenName);
  if (givenName) return givenName;

  const googleFull = cleanName(input.googleFullName);
  if (googleFull) {
    const first = splitFirstName(googleFull);
    if (first) return first;
  }

  const googleName = cleanName(input.googleName);
  if (googleName) {
    const first = splitFirstName(googleName);
    if (first) return first;
  }

  const profileFirst = cleanName(input.profileFirstName);
  if (profileFirst) return profileFirst;

  const profileFull = cleanName(input.profileFullName);
  if (profileFull) {
    const first = splitFirstName(profileFull);
    if (first) return first;
  }

  return fallback;
}

/**
 * Display / full name for merge. Never returns empty string.
 */
function getDisplayNameFromRecipient(
  input: RecipientNameInput,
  fallback = DEFAULT_RECIPIENT_FIRST_NAME_FALLBACK
): string {
  const full = trimStr(input.full_name);
  if (full) return full;

  const name = trimStr(input.name);
  if (name) return name;

  const display = trimStr(input.display_name);
  if (display) return display;

  const first = trimStr(input.first_name) || trimStr(input.given_name);
  if (first) return first;

  return fallback;
}

/**
 * Greeting first name. Never returns empty string. Fallback defaults to "there".
 */
function getFirstNameFromRecipient(
  input: RecipientNameInput,
  options?: { fallback?: string; allowEmailLocalPart?: boolean }
): string {
  const fallback = options?.fallback ?? DEFAULT_RECIPIENT_FIRST_NAME_FALLBACK;

  const resolved = resolveRecipientFirstName({
    googleGivenName: input.given_name,
    googleFullName: input.full_name,
    googleName: input.name ?? input.display_name,
    profileFirstName: input.first_name,
    profileFullName: input.full_name,
    fallback,
  });

  if (resolved !== fallback) return resolved;

  if (options?.allowEmailLocalPart) {
    const em = trimStr(input.email);
    if (em) {
      const local = em.split('@')[0] ?? '';
      const word = splitFirstName(local.replace(/[._+-]+/g, ' '));
      if (word) return word;
    }
  }

  return fallback;
}

/** @deprecated Use getFirstNameFromRecipient / resolveRecipientFirstName */
export const deriveFirstNameFromRecipient = getFirstNameFromRecipient;

export function deriveRecipientName(
  input: RecipientNameInput,
  options?: {
    fallback?: string;
    recipientType?: 'student' | 'college_admin' | 'manual' | 'super_admin' | string;
    allowEmailLocalPart?: boolean;
  }
): DerivedRecipientName {
  const fallback = options?.fallback ?? DEFAULT_RECIPIENT_FIRST_NAME_FALLBACK;

  const first_name = getFirstNameFromRecipient(input, {
    fallback,
    allowEmailLocalPart: options?.allowEmailLocalPart ?? false,
  });
  const full_name = getDisplayNameFromRecipient(
    input,
    first_name === fallback ? fallback : first_name,
  );
  const display_name = full_name;

  return { first_name, full_name, display_name };
}

function readMetaString(meta: Record<string, unknown>, key: string): string {
  return trimStr(meta[key] as string | undefined);
}

/**
 * Preview / test: Google auth user_metadata + raw_user_meta_data + identities.
 */
export function deriveFirstNameFromAuthUser(user: AuthUserLike | null | undefined): string {
  if (!user) return DEFAULT_RECIPIENT_FIRST_NAME_FALLBACK;
  const meta = user.user_metadata ?? {};
  const raw = user.raw_user_meta_data ?? {};
  const fromIdentities = deriveNameFromIdentities(user.identities);

  return resolveRecipientFirstName({
    googleGivenName:
      readMetaString(meta, 'given_name')
      || readMetaString(raw, 'given_name')
      || fromIdentities.given_name
      || null,
    googleFullName:
      readMetaString(meta, 'full_name')
      || readMetaString(raw, 'full_name')
      || fromIdentities.full_name
      || null,
    googleName:
      readMetaString(meta, 'name')
      || readMetaString(raw, 'name')
      || null,
    profileFirstName:
      readMetaString(meta, 'first_name')
      || readMetaString(raw, 'first_name')
      || null,
    profileFullName: null,
    fallback: DEFAULT_RECIPIENT_FIRST_NAME_FALLBACK,
  });
}

export function buildRecipientNameFromAuthUser(
  user: AuthUserLike & { email?: string | null },
  _recipientType?: string
): DerivedRecipientName {
  const meta = user.user_metadata ?? {};
  const raw = user.raw_user_meta_data ?? {};
  const fromIdentities = deriveNameFromIdentities(user.identities);

  const given =
    readMetaString(meta, 'given_name')
    || readMetaString(raw, 'given_name')
    || fromIdentities.given_name
    || '';
  const full =
    readMetaString(meta, 'full_name')
    || readMetaString(raw, 'full_name')
    || readMetaString(meta, 'name')
    || readMetaString(raw, 'name')
    || fromIdentities.full_name
    || '';
  const name =
    readMetaString(meta, 'name')
    || readMetaString(raw, 'name')
    || '';
  const profileFirst =
    readMetaString(meta, 'first_name')
    || readMetaString(raw, 'first_name')
    || '';

  const first_name = resolveRecipientFirstName({
    googleGivenName: given || null,
    googleFullName: full || null,
    googleName: name || null,
    profileFirstName: profileFirst || null,
    profileFullName: full || null,
    fallback: DEFAULT_RECIPIENT_FIRST_NAME_FALLBACK,
  });

  const full_name = full || [first_name !== DEFAULT_RECIPIENT_FIRST_NAME_FALLBACK ? first_name : '', name]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ')
    || first_name;

  return { first_name, full_name, display_name: full_name };
}

/** Normalize merge map so first_name/full_name are never blank after render. */
export function normalizeRecipientMergeValues(
  values: Record<string, string | undefined | null>,
  options?: { fallback?: string; email?: string | null }
): Record<string, string> {
  const fallback = options?.fallback ?? DEFAULT_RECIPIENT_FIRST_NAME_FALLBACK;
  const derived = deriveRecipientName(
    {
      first_name: values.first_name,
      full_name: values.full_name,
      name: values.name,
      given_name: values.given_name,
      email: options?.email ?? values.email ?? null,
    },
    { fallback, allowEmailLocalPart: false }
  );

  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v !== undefined && v !== null) out[k] = String(v);
  }

  if (isBlank(out.first_name)) out.first_name = derived.first_name;
  if (isBlank(out.full_name)) out.full_name = derived.full_name;

  return out;
}
