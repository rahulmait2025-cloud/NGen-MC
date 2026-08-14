import 'server-only';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  deriveRecipientName,
  type AuthUserLike,
  buildRecipientNameFromAuthUser,
} from './recipient-name';
import type { EmailCenterLane } from '@/lib/email-center/email-category';
import { isEmailSuppressedForLane } from '@/lib/email-center/tokens';
import {
  MAX_EXTERNAL_EMAIL_RECIPIENTS,
  parseExternalEmailList,
} from '@/lib/email-center/external-emails';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AUDIENCE_TYPES = [
  'manual_emails',
  'all_students',
  'all_college_admins',
  'specific_college_students',
  'specific_college_admins',
  'individual_students',
  'individual_college_admins',
] as const;

export type AudienceType = (typeof AUDIENCE_TYPES)[number];

const selectedStudentSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid().optional(),
  email: z.string(),
  full_name: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  college_id: z.uuid().nullable().optional(),
  college_name: z.string().nullable().optional(),
});

const selectedAdminSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid().optional(),
  email: z.string(),
  full_name: z.string().nullable().optional(),
  college_id: z.uuid().nullable().optional(),
  college_name: z.string().nullable().optional(),
});

export const audienceConfigSchema = z.object({
  type: z.enum(AUDIENCE_TYPES),
  college_ids: z.array(z.uuid()).optional().default([]),
  student_ids: z.array(z.uuid()).optional().default([]),
  admin_ids: z.array(z.uuid()).optional().default([]),
  manual_emails: z.string().optional().default(''),
  /**
   * Custom Email UI mode. When `external`, recipients are arbitrary emails
   * (`type` must be `manual_emails`) and college branding is suppressed.
   */
  custom_audience_mode: z.enum(['platform', 'external']).optional(),
  selected_students: z.array(selectedStudentSchema).optional().default([]),
  selected_admins: z.array(selectedAdminSchema).optional().default([]),
});

export type AudienceConfig = z.infer<typeof audienceConfigSchema>;

export interface AudienceCandidate {
  email: string;
  recipient_type: 'student' | 'college_admin' | 'super_admin' | 'manual';
  source_table: string | null;
  source_id: string | null;
  auth_user_id: string | null;
  college_id: string | null;
  college_name: string | null;
  full_name: string | null;
  first_name: string | null;
  variables: Record<string, unknown>;
}

export interface AudiencePreviewResult {
  totalRaw: number;
  duplicateCount: number;
  suppressedCount: number;
  validCount: number;
  candidates: AudienceCandidate[];
  sampleRecipients: AudienceCandidate[];
  warnings: string[];
}

type ResolvedUserProfile = {
  email: string;
  full_name: string | null;
  first_name: string | null;
};

function toAudienceCandidate(
  base: Omit<AudienceCandidate, 'first_name' | 'full_name' | 'variables' | 'college_name'> & {
    full_name?: string | null;
    profile?: ResolvedUserProfile | null;
  },
  collegeName: string | null | undefined,
  collegeSlug?: string | null
): AudienceCandidate {
  const profile = base.profile;
  const email = profile?.email ?? base.email;
  const derived = deriveRecipientName(
    {
      first_name: profile?.first_name ?? null,
      full_name: base.full_name ?? profile?.full_name ?? null,
      email,
    },
    { recipientType: base.recipient_type }
  );

  return {
    email,
    recipient_type: base.recipient_type,
    source_table: base.source_table,
    source_id: base.source_id,
    auth_user_id: base.auth_user_id,
    college_id: base.college_id,
    college_name: collegeName ?? null,
    full_name: derived.full_name,
    first_name: derived.first_name,
    variables: buildVariables(derived, collegeName, collegeSlug),
  };
}

function individualAudienceSelectionWarnings(config: AudienceConfig): string[] {
  const warnings: string[] = [];
  if (config.type === 'individual_students') {
    const selected = config.selected_students ?? [];
    const ids = config.student_ids ?? [];
    if (ids.length > 0 || selected.length > 0) {
      const missingEmail = selected.filter((s) => !s.email?.trim());
      for (const row of missingEmail) {
        const label = row.full_name?.trim() || row.id;
        warnings.push(`Selected student "${label}" has no email and was excluded.`);
      }
    }
  }
  if (config.type === 'individual_college_admins') {
    const selected = config.selected_admins ?? [];
    const missingEmail = selected.filter((a) => !a.email?.trim());
    for (const row of missingEmail) {
      const label = row.full_name?.trim() || row.id;
      warnings.push(`Selected admin "${label}" has no email and was excluded.`);
    }
  }
  return warnings;
}

export async function resolveAudiencePreview(
  config: AudienceConfig,
  emailCategory: EmailCenterLane = 'growth_marketing',
): Promise<AudiencePreviewResult> {
  const candidates = await resolveAudienceCandidates(config);
  const totalRaw = candidates.length;

  const seen = new Set<string>();
  const deduped: AudienceCandidate[] = [];
  for (const c of candidates) {
    const key = c.email.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(c);
    }
  }
  const duplicateCount = totalRaw - deduped.length;

  const suppressed = await resolveSuppressedEmails(deduped.map((c) => c.email), emailCategory);
  const suppressedEmails = new Set(suppressed.map((e) => e.toLowerCase().trim()));

  const valid: AudienceCandidate[] = [];
  let suppressedCount = 0;
  for (const c of deduped) {
    if (suppressedEmails.has(c.email.toLowerCase().trim())) {
      suppressedCount++;
    } else {
      valid.push(c);
    }
  }

  const validCount = valid.length;
  const sampleRecipients = valid.slice(0, 25);

  const warnings: string[] = [...individualAudienceSelectionWarnings(config)];
  if (config.type === 'manual_emails' && config.manual_emails?.trim()) {
    const parsed = parseExternalEmailList(config.manual_emails);
    if (parsed.invalidEntries.length > 0) {
      warnings.push(
        `${parsed.invalidEntries.length} invalid email address(es) must be fixed before send: ${parsed.invalidEntries.slice(0, 3).join(', ')}${
          parsed.invalidEntries.length > 3 ? '…' : ''
        }`,
      );
    }
    if (parsed.duplicateCount > 0) {
      warnings.push(`${parsed.duplicateCount} duplicate email(s) found and removed.`);
    }
    if (parsed.overLimit) {
      warnings.push(
        `Recipient list exceeds the maximum of ${MAX_EXTERNAL_EMAIL_RECIPIENTS}. Remove addresses before sending.`,
      );
    }
  }
  if (duplicateCount > 0 && config.type !== 'manual_emails') {
    warnings.push(`${duplicateCount} duplicate email(s) found and removed.`);
  }
  if (suppressedCount > 0) warnings.push(`${suppressedCount} suppressed email(s) excluded.`);
  if (validCount === 0) {
    if (
      config.type === 'individual_students'
      && ((config.student_ids?.length ?? 0) > 0 || (config.selected_students?.length ?? 0) > 0)
    ) {
      warnings.push(
        'No valid recipients found. Selected students may be missing emails or only exist as profile IDs without a student row.'
      );
    } else if (
      config.type === 'individual_college_admins'
      && ((config.admin_ids?.length ?? 0) > 0 || (config.selected_admins?.length ?? 0) > 0)
    ) {
      warnings.push('No valid recipients found. Selected admins may be missing emails.');
    } else {
      warnings.push('No valid recipients found.');
    }
  }

  return {
    totalRaw,
    duplicateCount,
    suppressedCount,
    validCount,
    candidates: valid,
    sampleRecipients,
    warnings,
  };
}

async function resolveSuppressedEmails(
  emails: string[],
  emailCategory: EmailCenterLane,
): Promise<string[]> {
  if (emails.length === 0) return [];

  const suppressedResults = await Promise.allSettled(
    emails.map(async (email) => {
      const result = await isEmailSuppressedForLane(email, emailCategory);
      return { email, suppressed: result.suppressed };
    }),
  );

  const suppressed: string[] = [];
  for (const r of suppressedResults) {
    if (r.status === 'fulfilled' && r.value.suppressed) {
      suppressed.push(r.value.email);
    }
  }
  return suppressed;
}

async function resolveAudienceCandidates(config: AudienceConfig): Promise<AudienceCandidate[]> {
  const admin = createAdminClient();

  switch (config.type) {
    case 'manual_emails': {
      if (!config.manual_emails?.trim()) return [];
      const parsed = parseExternalEmailList(config.manual_emails);
      const candidates: AudienceCandidate[] = [];
      for (const entry of parsed.emails) {
        if (candidates.length >= MAX_EXTERNAL_EMAIL_RECIPIENTS) break;
        const derived = deriveRecipientName(
          { full_name: entry.full_name, email: entry.email },
          { recipientType: 'manual' }
        );
        candidates.push({
          email: entry.email,
          recipient_type: 'manual',
          source_table: null,
          source_id: null,
          auth_user_id: null,
          college_id: null,
          college_name: null,
          full_name: derived.full_name,
          first_name: derived.first_name,
          variables: buildVariables(derived, null, null),
        });
      }
      return candidates;
    }

    case 'all_students': {
      const { data: students } = await admin
        .from('students')
        .select('id, user_id, college_id');
      if (!students) return [];

      const userIds: string[] = [];
      const collegeIds: string[] = [];
      for (const s of students) {
        if (s.user_id) userIds.push(s.user_id);
        if (s.college_id) collegeIds.push(s.college_id);
      }
      const users = await resolveUserProfiles(userIds);
      const colleges = await resolveCollegeBranding([...new Set(collegeIds)]);

      return students.flatMap((s) => {
        const user = users.get(s.user_id);
        const meta = colleges.get(s.college_id);
        if (!user?.email) return [];
        return [toAudienceCandidate(
          {
            email: user.email,
            recipient_type: 'student',
            source_table: 'students',
            source_id: s.id,
            auth_user_id: s.user_id,
            college_id: s.college_id,
            profile: user,
          },
          meta?.name,
          meta?.slug ?? null
        )];
      });
    }

    case 'all_college_admins': {
      const { data: members } = await admin
        .from('college_memberships')
        .select('user_id, college_id')
        .eq('role', 'college_admin')
        .eq('status', 'active');
      if (!members) return [];

      const userIds = [...new Set(members.map((m) => m.user_id))];
      const users = await resolveUserProfiles(userIds);
      const collegeIds: string[] = [];
      for (const m of members) {
        if (m.college_id) collegeIds.push(m.college_id);
      }
      const colleges = await resolveCollegeBranding([...new Set(collegeIds)]);

      return members.flatMap((m) => {
        const user = users.get(m.user_id);
        const meta = colleges.get(m.college_id);
        if (!user?.email) return [];
        return [toAudienceCandidate(
          {
            email: user.email,
            recipient_type: 'college_admin',
            source_table: 'college_memberships',
            source_id: m.user_id,
            auth_user_id: m.user_id,
            college_id: m.college_id,
            profile: user,
          },
          meta?.name,
          meta?.slug ?? null
        )];
      });
    }

    case 'specific_college_students': {
      const inputCollegeIds = config.college_ids ?? [];
      if (inputCollegeIds.length === 0) return [];

      const { data: students } = await admin
        .from('students')
        .select('id, user_id, college_id')
        .in('college_id', inputCollegeIds);
      if (!students) return [];

      const userIds: string[] = [];
      const studentCollegeIds: string[] = [];
      for (const s of students) {
        if (s.user_id) userIds.push(s.user_id);
        if (s.college_id) studentCollegeIds.push(s.college_id);
      }
      const users = await resolveUserProfiles(userIds);
      const colleges = await resolveCollegeBranding([...new Set(studentCollegeIds)]);

      return students.flatMap((s) => {
        const user = users.get(s.user_id);
        const meta = colleges.get(s.college_id);
        if (!user?.email) return [];
        return [toAudienceCandidate(
          {
            email: user.email,
            recipient_type: 'student',
            source_table: 'students',
            source_id: s.id,
            auth_user_id: s.user_id,
            college_id: s.college_id,
            profile: user,
          },
          meta?.name,
          meta?.slug ?? null
        )];
      });
    }

    case 'specific_college_admins': {
      const inputCollegeIds = config.college_ids ?? [];
      if (inputCollegeIds.length === 0) return [];

      const { data: members } = await admin
        .from('college_memberships')
        .select('user_id, college_id')
        .eq('role', 'college_admin')
        .eq('status', 'active')
        .in('college_id', inputCollegeIds);
      if (!members) return [];

      const userIds = [...new Set(members.map((m) => m.user_id))];
      const users = await resolveUserProfiles(userIds);
      const memberCollegeIds: string[] = [];
      for (const m of members) {
        if (m.college_id) memberCollegeIds.push(m.college_id);
      }
      const colleges = await resolveCollegeBranding([...new Set(memberCollegeIds)]);

      return members.flatMap((m) => {
        const user = users.get(m.user_id);
        const meta = colleges.get(m.college_id);
        if (!user?.email) return [];
        return [toAudienceCandidate(
          {
            email: user.email,
            recipient_type: 'college_admin',
            source_table: 'college_memberships',
            source_id: m.user_id,
            auth_user_id: m.user_id,
            college_id: m.college_id,
            profile: user,
          },
          meta?.name,
          meta?.slug ?? null
        )];
      });
    }

    case 'individual_students': {
      const studentIds = config.student_ids ?? [];
      const selected = config.selected_students ?? [];
      if (studentIds.length === 0 && selected.length === 0) return [];

      const candidates: AudienceCandidate[] = [];
      const seenStudentIds = new Set<string>();

      if (studentIds.length > 0) {
        let { data: students } = await admin
          .from('students')
          .select('id, user_id, college_id')
          .in('id', studentIds);

        if ((!students || students.length === 0) && studentIds.length > 0) {
          const { data: byUser } = await admin
            .from('students')
            .select('id, user_id, college_id')
            .in('user_id', studentIds);
          students = byUser ?? [];
        }

        const rows = students ?? [];
        const userIds: string[] = [];
        const studentCollegeIds: string[] = [];
        for (const s of rows) {
          if (s.user_id) userIds.push(s.user_id);
          if (s.college_id) studentCollegeIds.push(s.college_id);
        }
        const users = await resolveUserProfiles(userIds);
        const colleges = await resolveCollegeBranding([...new Set(studentCollegeIds)]);

        for (const s of rows) {
          seenStudentIds.add(s.id);
          const user = users.get(s.user_id);
          const meta = colleges.get(s.college_id);
          const selectedRef = selected.find((r) => r.id === s.id);
          const email = user?.email?.trim() || selectedRef?.email?.trim() || '';
          if (!email || !EMAIL_REGEX.test(email)) continue;

          candidates.push(
            toAudienceCandidate(
              {
                email,
                recipient_type: 'student',
                source_table: 'students',
                source_id: s.id,
                auth_user_id: s.user_id,
                college_id: s.college_id,
                full_name: selectedRef?.full_name ?? user?.full_name ?? null,
                profile: user ?? {
                  email,
                  full_name: selectedRef?.full_name ?? null,
                  first_name: selectedRef?.first_name ?? null,
                },
              },
              selectedRef?.college_name ?? meta?.name,
              meta?.slug ?? null
            )
          );
        }
      }

      for (const ref of selected) {
        if (seenStudentIds.has(ref.id)) continue;
        const email = ref.email?.trim() ?? '';
        if (!email) continue;
        if (!EMAIL_REGEX.test(email)) continue;

        const derived = deriveRecipientName(
          {
            first_name: ref.first_name,
            full_name: ref.full_name,
            email,
          },
          { recipientType: 'student' }
        );

        candidates.push({
          email,
          recipient_type: 'student',
          source_table: 'students',
          source_id: ref.id,
          auth_user_id: ref.user_id ?? null,
          college_id: ref.college_id ?? null,
          college_name: ref.college_name ?? null,
          full_name: derived.full_name,
          first_name: derived.first_name,
          variables: buildVariables(derived, ref.college_name, null),
        });
        seenStudentIds.add(ref.id);
      }

      return candidates;
    }

    case 'individual_college_admins': {
      const adminIds = config.admin_ids ?? [];
      if (adminIds.length === 0) return [];

      const { data: members } = await admin
        .from('college_memberships')
        .select('user_id, college_id')
        .eq('role', 'college_admin')
        .eq('status', 'active')
        .in('user_id', adminIds);
      if (!members) return [];

      const userIds = [...new Set(members.map((m) => m.user_id))];
      const users = await resolveUserProfiles(userIds);
      const memberCollegeIds: string[] = [];
      for (const m of members) {
        if (m.college_id) memberCollegeIds.push(m.college_id);
      }
      const colleges = await resolveCollegeBranding([...new Set(memberCollegeIds)]);

      return members.flatMap((m) => {
        const user = users.get(m.user_id);
        const meta = colleges.get(m.college_id);
        if (!user?.email) return [];
        return [toAudienceCandidate(
          {
            email: user.email,
            recipient_type: 'college_admin',
            source_table: 'college_memberships',
            source_id: m.user_id,
            auth_user_id: m.user_id,
            college_id: m.college_id,
            profile: user,
          },
          meta?.name,
          meta?.slug ?? null
        )];
      });
    }

    default:
      return [];
  }
}

async function resolveUserProfiles(userIds: string[]): Promise<Map<string, ResolvedUserProfile>> {
  if (userIds.length === 0) return new Map();
  const admin = createAdminClient();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];

  const { data: users } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .in('id', uniqueIds);

  const map = new Map<string, ResolvedUserProfile>();
  for (const u of users ?? []) {
    const derived = deriveRecipientName(
      { full_name: u.full_name, email: u.email },
      { recipientType: 'student' }
    );
    map.set(u.id, {
      email: u.email ?? '',
      full_name: derived.full_name,
      first_name: derived.first_name,
    });
  }

  const chunkSize = 15;
  const batches: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    batches.push(uniqueIds.slice(i, i + chunkSize));
  }

  await Promise.allSettled(
    batches.map((batch) =>
      Promise.all(
        batch.map(async (userId) => {
          try {
            const { data, error } = await admin.auth.admin.getUserById(userId);
            if (error || !data?.user) return;

            const authUser = data.user as AuthUserLike & { email?: string | null; id: string };
            const fromAuth = buildRecipientNameFromAuthUser(authUser);
            const existing = map.get(userId);
            const email = authUser.email ?? existing?.email ?? '';

            const merged = deriveRecipientName({
              first_name: fromAuth.first_name,
              full_name: fromAuth.full_name || existing?.full_name || null,
              email,
            });

            map.set(userId, {
              email,
              full_name: merged.full_name,
              first_name: merged.first_name,
            });
          } catch {
            // Auth lookup is best-effort; profile row remains fallback.
          }
        }),
      ),
    ),
  );

  return map;
}

async function resolveCollegeBranding(
  collegeIds: string[]
): Promise<Map<string, { name: string; slug: string | null }>> {
  if (collegeIds.length === 0) return new Map();
  const admin = createAdminClient();
  const { data } = await admin
    .from('colleges')
    .select('id, name, slug')
    .in('id', collegeIds);

  const map = new Map<string, { name: string; slug: string | null }>();
  for (const c of data ?? []) {
    map.set(c.id, { name: c.name, slug: c.slug ?? null });
  }
  return map;
}

function buildVariables(
  derived: { first_name: string; full_name: string },
  collegeName: string | null | undefined,
  collegeSlug?: string | null
): Record<string, unknown> {
  return {
    first_name: derived.first_name,
    full_name: derived.full_name,
    // Never persist placeholder "Your College" into recipient snapshots.
    college_name: collegeName?.trim() || '',
    college_slug: collegeSlug ?? '',
    dashboard_url: 'https://nextgencto.com/dashboard',
    unsubscribe_url: 'https://nextgencto.com/unsubscribe',
    cta_url: '#',
    cta_label: 'Click Here',
  };
}
