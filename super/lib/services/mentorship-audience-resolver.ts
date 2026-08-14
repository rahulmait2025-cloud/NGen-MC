import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { isEntitlementActive } from '@/lib/services/access-helpers';
import {
  deriveRecipientName,
  buildRecipientNameFromAuthUser,
  type AuthUserLike,
} from '@/lib/email-center/recipient-name';
import type {
  MentorshipAudienceTargetInput,
  MentorshipAudienceTargetType,
  MentorshipRecipientPreview,
  ResolvedMentorshipRecipient,
} from '@/lib/services/mentorship-audience-types';

type AdminClient = ReturnType<typeof createAdminClient>;

interface InternalRecipient {
  studentId: string;
  collegeId: string | null;
  sourceType: string | null;
  sourceId: string | null;
}

function normalizeTargets(
  targets: MentorshipAudienceTargetInput[],
): MentorshipAudienceTargetInput[] {
  const seen = new Set<string>();
  const normalized: MentorshipAudienceTargetInput[] = [];

  for (const target of targets) {
    const type = target.targetType;
    const id = target.targetId ?? null;
    const key = type === 'all_bootcamp_enrolled' ? type : `${type}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ targetType: type, targetId: id });
  }

  return normalized;
}

async function mapUserIdsToStudents(
  admin: AdminClient,
  userIds: string[],
  sourceType: string | null,
  sourceId: string | null,
): Promise<InternalRecipient[]> {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return [];

  const { data: students, error } = await admin
    .from('students')
    .select('id, user_id, college_id')
    .in('user_id', uniqueUserIds);

  if (error) throw new Error(`Failed to load students: ${error.message}`);

  return (students ?? []).map((row) => ({
    studentId: row.id as string,
    collegeId: (row.college_id as string | null) ?? null,
    sourceType,
    sourceId,
  }));
}

async function resolveBootcampEnrolled(admin: AdminClient): Promise<InternalRecipient[]> {
  const { data: enrollments, error } = await admin
    .from('job_ready_bootcamp_enrollments')
    .select('student_id, college_id, status, valid_from, valid_until')
    .eq('status', 'active');

  if (error) throw new Error(`Failed to load bootcamp enrollments: ${error.message}`);

  const active = (enrollments ?? []).filter((row) => isEntitlementActive(row));
  return active.map((row) => ({
    studentId: row.student_id as string,
    collegeId: (row.college_id as string | null) ?? null,
    sourceType: 'all_bootcamp_enrolled',
    sourceId: null,
  }));
}

async function resolveCollegeStudents(
  admin: AdminClient,
  collegeId: string,
): Promise<InternalRecipient[]> {
  const { data: students, error } = await admin
    .from('students')
    .select('id, college_id')
    .eq('college_id', collegeId);

  if (error) throw new Error(`Failed to load college students: ${error.message}`);

  return (students ?? []).map((row) => ({
    studentId: row.id as string,
    collegeId: (row.college_id as string | null) ?? null,
    sourceType: 'college',
    sourceId: collegeId,
  }));
}

async function resolveStudentTarget(
  admin: AdminClient,
  studentId: string,
): Promise<InternalRecipient[]> {
  const { data: student, error } = await admin
    .from('students')
    .select('id, college_id')
    .eq('id', studentId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load student: ${error.message}`);
  if (!student) return [];

  return [{
    studentId: student.id as string,
    collegeId: (student.college_id as string | null) ?? null,
    sourceType: 'student',
    sourceId: studentId,
  }];
}

async function resolveMasterCourseEntitlements(
  admin: AdminClient,
  masterCourseId: string,
  sourceType: string,
): Promise<InternalRecipient[]> {
  const { data, error } = await admin
    .from('student_entitlements')
    .select('student_id, college_id, status, valid_from, valid_until')
    .eq('master_course_id', masterCourseId)
    .eq('status', 'active');

  if (error) throw new Error(`Failed to load course entitlements: ${error.message}`);

  return (data ?? []).reduce((acc, row) => {
    if (isEntitlementActive(row)) {
      acc.push({
        studentId: row.student_id as string,
        collegeId: (row.college_id as string | null) ?? null,
        sourceType,
        sourceId: masterCourseId,
      });
    }
    return acc;
  }, [] as InternalRecipient[]);
}

async function resolveContentEntitlementsByEntity(
  admin: AdminClient,
  entityType: 'master_course' | 'variant' | 'bundle',
  entityId: string,
  sourceType: string,
): Promise<InternalRecipient[]> {
  const { data, error } = await admin
    .from('student_content_entitlements')
    .select('student_id, status, valid_from, valid_until')
    .eq('assigned_entity_type', entityType)
    .eq('assigned_entity_id', entityId)
    .eq('status', 'active');

  if (error) throw new Error(`Failed to load content entitlements: ${error.message}`);

  const activeUserIds = (data ?? []).reduce((acc, row) => {
    if (isEntitlementActive(row)) acc.push(row.student_id as string);
    return acc;
  }, [] as string[]);

  return mapUserIdsToStudents(admin, activeUserIds, sourceType, entityId);
}

async function resolveCourseTarget(
  admin: AdminClient,
  courseOrVariantId: string,
): Promise<InternalRecipient[]> {
  const variantContent = await resolveContentEntitlementsByEntity(
    admin,
    'variant',
    courseOrVariantId,
    'course',
  );
  if (variantContent.length > 0) return variantContent;

  const { data: variant } = await admin
    .from('course_variants')
    .select('id, master_course_id')
    .eq('id', courseOrVariantId)
    .maybeSingle();

  if (variant) {
    const fromEntitlements = await resolveMasterCourseEntitlements(
      admin,
      variant.master_course_id as string,
      'course',
    );

    const { data: variantEntRows } = await admin
      .from('student_entitlements')
      .select('student_id, college_id, status, valid_from, valid_until')
      .eq('status', 'active')
      .or(
        `metadata->>variant_id.eq.${courseOrVariantId},metadata->>course_variant_id.eq.${courseOrVariantId}`,
      );

    const fromVariantMeta = (variantEntRows ?? []).reduce((acc, row) => {
      if (isEntitlementActive(row)) {
        acc.push({
          studentId: row.student_id as string,
          collegeId: (row.college_id as string | null) ?? null,
          sourceType: 'course',
          sourceId: courseOrVariantId,
        });
      }
      return acc;
    }, [] as InternalRecipient[]);

    return [...fromEntitlements, ...fromVariantMeta];
  }

  const [masterEntitlements, masterContent] = await Promise.all([
    resolveMasterCourseEntitlements(admin, courseOrVariantId, 'course'),
    resolveContentEntitlementsByEntity(
      admin,
      'master_course',
      courseOrVariantId,
      'course',
    ),
  ]);
  return [...masterEntitlements, ...masterContent];
}

async function resolveProductTarget(
  admin: AdminClient,
  productId: string,
): Promise<InternalRecipient[]> {
  const { data: course } = await admin
    .from('master_courses')
    .select('id')
    .eq('id', productId)
    .maybeSingle();

  if (course) {
    const [paid, master, content] = await Promise.all([
      resolveMasterCourseEntitlements(admin, productId, 'paid_course'),
      resolveMasterCourseEntitlements(admin, productId, 'master_course'),
      resolveContentEntitlementsByEntity(
        admin,
        'master_course',
        productId,
        'product',
      ),
    ]);
    return [...paid, ...master, ...content];
  }

  const { data: variant } = await admin
    .from('course_variants')
    .select('id')
    .eq('id', productId)
    .maybeSingle();

  if (variant) {
    return resolveCourseTarget(admin, productId);
  }

  const { data: bundle } = await admin
    .from('course_bundles')
    .select('id')
    .eq('id', productId)
    .maybeSingle();

  if (bundle) {
    return resolveContentEntitlementsByEntity(admin, 'bundle', productId, 'bundle');
  }

  return [];
}

async function resolveTarget(
  admin: AdminClient,
  target: MentorshipAudienceTargetInput,
): Promise<InternalRecipient[]> {
  switch (target.targetType) {
    case 'all_bootcamp_enrolled':
      return resolveBootcampEnrolled(admin);
    case 'college':
      if (!target.targetId) return [];
      return resolveCollegeStudents(admin, target.targetId);
    case 'student':
      if (!target.targetId) return [];
      return resolveStudentTarget(admin, target.targetId);
    case 'master_course':
      if (!target.targetId) return [];
      const master = await resolveMasterCourseEntitlements(admin, target.targetId, 'master_course');
      const content = await resolveContentEntitlementsByEntity(
        admin,
        'master_course',
        target.targetId,
        'master_course',
      );
      return [...master, ...content];
    case 'paid_course':
      if (!target.targetId) return [];
      const paidEnt = await resolveMasterCourseEntitlements(admin, target.targetId, 'paid_course');
      const paidContent = await resolveContentEntitlementsByEntity(
        admin,
        'master_course',
        target.targetId,
        'paid_course',
      );
      return [...paidEnt, ...paidContent];
    case 'course':
      if (!target.targetId) return [];
      return resolveCourseTarget(admin, target.targetId);
    case 'bundle':
      if (!target.targetId) return [];
      return resolveContentEntitlementsByEntity(admin, 'bundle', target.targetId, 'bundle');
    case 'product':
      if (!target.targetId) return [];
      return resolveProductTarget(admin, target.targetId);
    default:
      return [];
  }
}

function mergeRecipients(recipients: InternalRecipient[]): Map<string, InternalRecipient> {
  const map = new Map<string, InternalRecipient>();
  for (const recipient of recipients) {
    if (!map.has(recipient.studentId)) {
      map.set(recipient.studentId, recipient);
    }
  }
  return map;
}

async function resolveStudentProfiles(
  admin: AdminClient,
  userIds: string[],
): Promise<Map<string, { email: string; full_name: string; first_name: string }>> {
  const map = new Map<string, { email: string; full_name: string; first_name: string }>();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return map;

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .in('id', uniqueIds);

  for (const profile of profiles ?? []) {
    const derived = deriveRecipientName(
      { full_name: profile.full_name, email: profile.email },
      { recipientType: 'student' },
    );
    map.set(profile.id, {
      email: (profile.email ?? '').trim(),
      full_name: derived.full_name,
      first_name: derived.first_name,
    });
  }

  const chunkSize = 15;
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const batch = uniqueIds.slice(i, i + chunkSize);
    await Promise.all(
      batch.map(async (userId) => {
        const existing = map.get(userId);
        if (existing?.email) return;

        try {
          const { data, error } = await admin.auth.admin.getUserById(userId);
          if (error || !data?.user) return;

          const authUser = data.user as AuthUserLike & { email?: string | null; id: string };
          const fromAuth = buildRecipientNameFromAuthUser(authUser);
          const email = (authUser.email ?? existing?.email ?? '').trim();
          if (!email) return;

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
          // best-effort
        }
      }),
    );
  }

  return map;
}

export async function resolveMentorshipSessionRecipients(
  targets: MentorshipAudienceTargetInput[],
): Promise<ResolvedMentorshipRecipient[]> {
  const admin = createAdminClient();
  const normalized = normalizeTargets(targets);
  if (normalized.length === 0) return [];

  const batches = await Promise.all(normalized.map((target) => resolveTarget(admin, target)));
  const merged = mergeRecipients(batches.flat());
  const studentIds = [...merged.keys()];
  if (studentIds.length === 0) return [];

  const { data: students, error } = await admin
    .from('students')
    .select('id, user_id, college_id')
    .in('id', studentIds);

  if (error) throw new Error(`Failed to load student profiles: ${error.message}`);

  const userIds = (students ?? []).reduce<string[]>((acc, row) => { if (row.user_id) acc.push(row.user_id as string); return acc; }, []);
  const profileByUserId = await resolveStudentProfiles(admin, userIds);

  const collegeIds = [...new Set((students ?? []).reduce<string[]>((acc, row) => { if (row.college_id) acc.push(row.college_id as string); return acc; }, []))];
  const collegeNameById = new Map<string, string>();
  if (collegeIds.length > 0) {
    const { data: colleges } = await admin.from('colleges').select('id, name').in('id', collegeIds);
    for (const college of colleges ?? []) {
      collegeNameById.set(college.id, college.name);
    }
  }

  const results: ResolvedMentorshipRecipient[] = [];

  for (const row of students ?? []) {
    const internal = merged.get(row.id as string);
    const profile = profileByUserId.get(row.user_id as string);
    if (!internal || !profile?.email) continue;

    const collegeId = (row.college_id as string | null) ?? internal.collegeId;
    results.push({
      studentId: row.id as string,
      collegeId,
      sourceType: internal.sourceType,
      sourceId: internal.sourceId,
      email: profile.email.toLowerCase(),
      fullName: profile.full_name,
      firstName: profile.first_name,
      authUserId: row.user_id as string,
      collegeName: collegeId ? (collegeNameById.get(collegeId) ?? null) : null,
    });
  }

  return results;
}

export async function previewMentorshipRecipients(
  targets: MentorshipAudienceTargetInput[],
): Promise<MentorshipRecipientPreview> {
  const normalized = normalizeTargets(targets);
  if (normalized.length === 0) {
    return {
      totalCount: 0,
      preview: [],
      countsByTargetType: {},
      zeroReason: 'Select at least one audience target.',
    };
  }

  const admin = createAdminClient();
  const countsByTargetType: Record<string, number> = {};
  await Promise.all(
    normalized.map(async (target) => {
      const resolved = await resolveTarget(admin, target);
      countsByTargetType[target.targetType] =
        (countsByTargetType[target.targetType] ?? 0) + resolved.length;
    }),
  );

  const recipients = await resolveMentorshipSessionRecipients(normalized);

  if (recipients.length === 0) {
    return {
      totalCount: 0,
      preview: [],
      countsByTargetType,
      zeroReason: 'No active students matched the selected audience.',
    };
  }

  return {
    totalCount: recipients.length,
    preview: recipients.slice(0, 50).map((r) => ({
      studentId: r.studentId,
      fullName: r.fullName,
      email: r.email,
      collegeName: r.collegeName,
      sourceType: r.sourceType,
    })),
    countsByTargetType,
  };
}

export async function saveMentorshipAudienceTargets(
  sessionId: string,
  targets: MentorshipAudienceTargetInput[],
): Promise<void> {
  const admin = createAdminClient();
  const normalized = normalizeTargets(targets);

  const { error: deleteError } = await admin
    .from('job_ready_bootcamp_mentorship_audience_targets')
    .delete()
    .eq('session_id', sessionId);

  if (deleteError) throw new Error(deleteError.message);

  if (normalized.length === 0) return;

  const rows = normalized.map((target) => ({
    session_id: sessionId,
    target_type: target.targetType,
    target_id: target.targetId ?? null,
  }));

  const { error: insertError } = await admin
    .from('job_ready_bootcamp_mentorship_audience_targets')
    .insert(rows);

  if (insertError) throw new Error(insertError.message);
}

export async function saveMentorshipRecipientSnapshot(
  sessionId: string,
  recipients: ResolvedMentorshipRecipient[],
  options?: { replaceExisting?: boolean },
): Promise<number> {
  const admin = createAdminClient();

  if (options?.replaceExisting) {
    const { error } = await admin
      .from('job_ready_bootcamp_mentorship_recipients')
      .delete()
      .eq('session_id', sessionId)
      .in('email_status', ['pending', 'skipped']);

    if (error) throw new Error(error.message);
  }

  if (recipients.length === 0) return 0;

  const rows = recipients.map((recipient) => ({
    session_id: sessionId,
    student_id: recipient.studentId,
    college_id: recipient.collegeId,
    source_type: recipient.sourceType,
    source_id: recipient.sourceId,
    email_status: 'pending',
  }));

  const batches: typeof rows[] = [];
  for (let i = 0; i < rows.length; i += 200) {
    batches.push(rows.slice(i, i + 200));
  }

  const batchResults = await Promise.allSettled(
    batches.map((batch) =>
      admin
        .from('job_ready_bootcamp_mentorship_recipients')
        .upsert(batch, { onConflict: 'session_id,student_id', ignoreDuplicates: true }),
    ),
  );

  for (const r of batchResults) {
    if (r.status === 'rejected') throw new Error(r.reason?.message ?? 'Upsert failed');
    if (r.value.error) throw new Error(r.value.error.message);
  }

  return recipients.length;
}

export async function listMentorshipAudienceTargets(
  sessionId: string,
): Promise<MentorshipAudienceTargetInput[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('job_ready_bootcamp_mentorship_audience_targets')
    .select('target_type, target_id')
    .eq('session_id', sessionId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    targetType: row.target_type as MentorshipAudienceTargetType,
    targetId: (row.target_id as string | null) ?? null,
  }));
}

export async function countMentorshipRecipients(sessionId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from('job_ready_bootcamp_mentorship_recipients')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function countMentorshipRecipientsBySessionIds(
  sessionIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (sessionIds.length === 0) return counts;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('job_ready_bootcamp_mentorship_recipients')
    .select('session_id')
    .in('session_id', sessionIds);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const id = row.session_id as string;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

export async function mentorshipSessionHasQueuedOrSentEmails(sessionId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('job_ready_bootcamp_mentorship_recipients')
    .select('id')
    .eq('session_id', sessionId)
    .in('email_status', ['sent', 'queued'])
    .limit(1);

  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

export interface AudienceTargetChip {
  key: string;
  targetType: MentorshipAudienceTargetType;
  targetId?: string | null;
  label: string;
}

export async function resolveAudienceTargetLabels(
  targets: MentorshipAudienceTargetInput[],
): Promise<AudienceTargetChip[]> {
  const admin = createAdminClient();
  const normalized = normalizeTargets(targets);

  const chipResults = await Promise.all(
    normalized.map(async (target) => {
      const key = chipKeyFromTarget(target);
      if (target.targetType === 'all_bootcamp_enrolled') {
        return {
          key,
          targetType: target.targetType,
          targetId: null,
          label: 'All Job Ready Bootcamp enrolled students',
        };
      }

      if (!target.targetId) return null;

      if (target.targetType === 'college') {
        const { data } = await admin.from('colleges').select('name').eq('id', target.targetId).maybeSingle();
        return {
          key,
          targetType: target.targetType,
          targetId: target.targetId,
          label: data?.name ? `College: ${data.name}` : 'College',
        };
      }

      if (target.targetType === 'student') {
        const { data: student } = await admin
          .from('students')
          .select('user_id')
          .eq('id', target.targetId)
          .maybeSingle();
        let label = 'Student';
        if (student?.user_id) {
          const { data: profile } = await admin
            .from('profiles')
            .select('full_name, email')
            .eq('id', student.user_id)
            .maybeSingle();
          label = (profile?.full_name as string) || (profile?.email as string) || 'Student';
        }
        return {
          key,
          targetType: target.targetType,
          targetId: target.targetId,
          label: `Student: ${label}`,
        };
      }

      if (target.targetType === 'bundle') {
        const { data } = await admin.from('course_bundles').select('title').eq('id', target.targetId).maybeSingle();
        return {
          key,
          targetType: target.targetType,
          targetId: target.targetId,
          label: data?.title ? `Bundle: ${data.title}` : 'Bundle',
        };
      }

      if (
        target.targetType === 'master_course'
        || target.targetType === 'paid_course'
        || target.targetType === 'product'
      ) {
        const { data: course } = await admin
          .from('master_courses')
          .select('title')
          .eq('id', target.targetId)
          .maybeSingle();
        if (course) {
          const prefix =
            target.targetType === 'paid_course' ? 'Paid Course' : 'Master Course';
          return {
            key,
            targetType: target.targetType,
            targetId: target.targetId,
            label: `${prefix}: ${course.title}`,
          };
        }
      }

      if (target.targetType === 'course') {
        const { data: variant } = await admin
          .from('course_variants')
          .select('title')
          .eq('id', target.targetId)
          .maybeSingle();
        if (variant) {
          return {
            key,
            targetType: target.targetType,
            targetId: target.targetId,
            label: `Course: ${variant.title}`,
          };
        }
        const { data: course } = await admin
          .from('master_courses')
          .select('title')
          .eq('id', target.targetId)
          .maybeSingle();
        return {
          key,
          targetType: target.targetType,
          targetId: target.targetId,
          label: course?.title ? `Course: ${course.title}` : 'Course',
        };
      }

      return {
        key,
        targetType: target.targetType,
        targetId: target.targetId,
        label: target.targetType,
      };
    }),
  );

  return chipResults.filter((c): c is NonNullable<typeof c> => c !== null);
}

function chipKeyFromTarget(target: MentorshipAudienceTargetInput): string {
  return target.targetId ? `${target.targetType}:${target.targetId}` : target.targetType;
}
