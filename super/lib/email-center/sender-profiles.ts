/**
 * Approved Email Center sender profiles (Custom Email / No Template).
 * Browser may submit profile IDs only; server resolves From / Reply-To.
 */

export const EMAIL_SENDER_DOMAIN = 'nextgen-cto.in' as const;

export const EMAIL_SENDER_PROFILE_IDS = ['hello', 'support', 'anuj'] as const;
export type EmailSenderProfileId = (typeof EMAIL_SENDER_PROFILE_IDS)[number];

export const DEFAULT_EMAIL_SENDER_PROFILE_ID: EmailSenderProfileId = 'hello';

export type EmailSenderProfile = {
  id: EmailSenderProfileId;
  label: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  enabled: boolean;
};

export const EMAIL_SENDER_PROFILES = {
  hello: {
    id: 'hello',
    label: 'NextGen CTO',
    fromName: 'NextGen CTO',
    fromEmail: 'hello@nextgen-cto.in',
    replyTo: 'hello@nextgen-cto.in',
    enabled: true,
  },
  support: {
    id: 'support',
    label: 'NextGen CTO Support',
    fromName: 'NextGen CTO Support',
    fromEmail: 'support@nextgen-cto.in',
    replyTo: 'support@nextgen-cto.in',
    enabled: true,
  },
  anuj: {
    id: 'anuj',
    label: 'Anuj Kumar — NextGen CTO',
    fromName: 'Anuj Kumar',
    fromEmail: 'anuj@nextgen-cto.in',
    replyTo: 'anuj@nextgen-cto.in',
    enabled: true,
  },
} as const satisfies Record<EmailSenderProfileId, EmailSenderProfile>;

export type EmailSenderSnapshot = {
  profileId: EmailSenderProfileId;
  fromName: string;
  fromEmail: string;
  replyTo: string;
};

const HEADER_INJECTION_RE = /[\r\n\0]/;
const APPROVED_ID_SET = new Set<string>(EMAIL_SENDER_PROFILE_IDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isEmailSenderProfileId(value: unknown): value is EmailSenderProfileId {
  return typeof value === 'string' && APPROVED_ID_SET.has(value);
}

export function listEnabledSenderProfiles(): EmailSenderProfile[] {
  return EMAIL_SENDER_PROFILE_IDS.map((id) => EMAIL_SENDER_PROFILES[id]).filter((p) => p.enabled);
}

export function formatSenderOptionLabel(profile: Pick<EmailSenderProfile, 'fromName' | 'fromEmail'>): string {
  return `${profile.fromName} <${profile.fromEmail}>`;
}

export function formatEmailFromHeader(fromName: string, fromEmail: string): string {
  return `${fromName} <${fromEmail}>`;
}

export function snapshotFromProfile(profile: EmailSenderProfile): EmailSenderSnapshot {
  return {
    profileId: profile.id,
    fromName: profile.fromName,
    fromEmail: profile.fromEmail,
    replyTo: profile.replyTo,
  };
}

/**
 * Resolve an approved enabled profile by ID.
 * Rejects unknown IDs, disabled profiles, and never accepts raw From addresses.
 */
export function resolveSenderProfile(
  profileId: unknown,
): { ok: true; profile: EmailSenderProfile } | { ok: false; error: string } {
  if (profileId === undefined || profileId === null || profileId === '') {
    const profile = EMAIL_SENDER_PROFILES[DEFAULT_EMAIL_SENDER_PROFILE_ID];
    return { ok: true, profile };
  }

  if (typeof profileId !== 'string') {
    return { ok: false, error: 'Invalid sender profile.' };
  }

  const trimmed = profileId.trim();
  if (HEADER_INJECTION_RE.test(trimmed)) {
    return { ok: false, error: 'Invalid sender profile.' };
  }

  // Reject anything that looks like an email / From header (client must send ID only).
  if (trimmed.includes('@') || trimmed.includes('<') || trimmed.includes('>')) {
    return { ok: false, error: 'Sender must be selected from the approved list.' };
  }

  if (!isEmailSenderProfileId(trimmed)) {
    return { ok: false, error: 'Unknown sender profile.' };
  }

  const profile = EMAIL_SENDER_PROFILES[trimmed];
  if (!profile.enabled) {
    return { ok: false, error: 'That sender profile is disabled.' };
  }

  if (!profile.fromEmail.toLowerCase().endsWith(`@${EMAIL_SENDER_DOMAIN}`)) {
    return { ok: false, error: 'Sender address is outside the approved domain.' };
  }

  if (
    HEADER_INJECTION_RE.test(profile.fromName)
    || HEADER_INJECTION_RE.test(profile.fromEmail)
    || HEADER_INJECTION_RE.test(profile.replyTo)
  ) {
    return { ok: false, error: 'Sender profile failed safety checks.' };
  }

  return { ok: true, profile };
}

/** Soft resolve for drafts / legacy: unknown → default hello (never throws). */
export function resolveSenderProfileOrDefault(profileId: unknown): EmailSenderProfile {
  const resolved = resolveSenderProfile(profileId);
  if (resolved.ok) return resolved.profile;
  return EMAIL_SENDER_PROFILES[DEFAULT_EMAIL_SENDER_PROFILE_ID];
}

/**
 * Strict resolve for send paths: missing ID falls back to hello;
 * present-but-invalid fails (no silent swap on test/send).
 */
export function resolveSenderProfileForSend(
  profileId: unknown,
): { ok: true; profile: EmailSenderProfile } | { ok: false; error: string } {
  if (profileId === undefined || profileId === null || profileId === '') {
    return { ok: true, profile: EMAIL_SENDER_PROFILES[DEFAULT_EMAIL_SENDER_PROFILE_ID] };
  }
  return resolveSenderProfile(profileId);
}

export function extractSenderProfileIdFromComposerState(raw: unknown): EmailSenderProfileId | null {
  if (!isRecord(raw)) return null;
  const id = raw.sender_profile_id;
  return isEmailSenderProfileId(id) ? id : null;
}

export function extractSenderSnapshotFromComposerState(raw: unknown): EmailSenderSnapshot | null {
  if (!isRecord(raw)) return null;
  const snap = raw.sender_snapshot;
  if (!isRecord(snap)) return null;
  const profileId = snap.profileId;
  const fromName = snap.fromName;
  const fromEmail = snap.fromEmail;
  const replyTo = snap.replyTo;
  if (!isEmailSenderProfileId(profileId)) return null;
  if (typeof fromName !== 'string' || typeof fromEmail !== 'string' || typeof replyTo !== 'string') {
    return null;
  }
  if (
    HEADER_INJECTION_RE.test(fromName)
    || HEADER_INJECTION_RE.test(fromEmail)
    || HEADER_INJECTION_RE.test(replyTo)
  ) {
    return null;
  }
  if (!fromEmail.toLowerCase().endsWith(`@${EMAIL_SENDER_DOMAIN}`)) {
    return null;
  }
  // Snapshot must use the approved address for that profile ID (no tampered From/Reply-To).
  // fromName may stay frozen from queue time even if the label is later edited in code.
  const approved = EMAIL_SENDER_PROFILES[profileId];
  if (
    !approved.enabled
    || approved.fromEmail !== fromEmail
    || approved.replyTo !== replyTo
  ) {
    return null;
  }
  return { profileId, fromName, fromEmail, replyTo };
}

/**
 * Resolve the effective sender for a campaign.
 * Prefer locked send-time snapshot, then profile ID, then default hello.
 */
export function resolveCampaignSender(rawComposerState: unknown): {
  ok: true;
  profile: EmailSenderProfile;
  snapshot: EmailSenderSnapshot;
  fromHeader: string;
} | { ok: false; error: string } {
  const locked = extractSenderSnapshotFromComposerState(rawComposerState);
  if (locked) {
    const profile = EMAIL_SENDER_PROFILES[locked.profileId];
    return {
      ok: true,
      profile,
      snapshot: locked,
      fromHeader: formatEmailFromHeader(locked.fromName, locked.fromEmail),
    };
  }

  const id = extractSenderProfileIdFromComposerState(rawComposerState);
  const resolved = resolveSenderProfileForSend(id);
  if (!resolved.ok) return resolved;

  const snapshot = snapshotFromProfile(resolved.profile);
  return {
    ok: true,
    profile: resolved.profile,
    snapshot,
    fromHeader: formatEmailFromHeader(resolved.profile.fromName, resolved.profile.fromEmail),
  };
}

export function mergeSenderIntoComposerState(
  contentState: Record<string, unknown>,
  profileId: EmailSenderProfileId,
  options?: { lockSnapshot?: boolean },
): Record<string, unknown> {
  const profile = EMAIL_SENDER_PROFILES[profileId];
  const next: Record<string, unknown> = {
    ...contentState,
    sender_profile_id: profileId,
  };
  if (options?.lockSnapshot) {
    next.sender_snapshot = snapshotFromProfile(profile);
  }
  return next;
}

/**
 * Safe config inspection only — does not call Resend or print secrets.
 * Cannot confirm dashboard domain verification from source alone.
 */
export function inspectApprovedSenderResendReadiness(): {
  approvedFromEmails: string[];
  envFrom: string | null;
  envFromDomain: string | null;
  provider: string | null;
  canConfirmDomainVerification: false;
  notes: string[];
} {
  const envFrom = (process.env.EMAIL_FROM ?? process.env.SENDGRID_FROM_EMAIL ?? '').trim() || null;
  let envFromDomain: string | null = null;
  if (envFrom) {
    const at = envFrom.lastIndexOf('@');
    if (at > 0) envFromDomain = envFrom.slice(at + 1).toLowerCase();
  }
  const provider = (process.env.EMAIL_PROVIDER ?? '').trim().toLowerCase() || null;
  const approvedFromEmails = listEnabledSenderProfiles().map((p) => p.fromEmail);

  const notes: string[] = [
    'Approved senders are server-defined for nextgen-cto.in.',
    'Source inspection cannot confirm Resend dashboard domain verification for hello / support / anuj.',
    'Confirm in the Resend dashboard that nextgen-cto.in is verified and all three addresses are permitted before production use.',
  ];
  if (envFromDomain && envFromDomain !== EMAIL_SENDER_DOMAIN) {
    notes.push(
      `Configured EMAIL_FROM / SENDGRID_FROM_EMAIL domain is "${envFromDomain}", which differs from ${EMAIL_SENDER_DOMAIN}.`,
    );
  }
  if (provider && provider !== 'resend') {
    notes.push(`EMAIL_PROVIDER is "${provider}" (not resend). Sender profiles still resolve server-side.`);
  }

  return {
    approvedFromEmails,
    envFrom,
    envFromDomain,
    provider,
    canConfirmDomainVerification: false,
    notes,
  };
}
