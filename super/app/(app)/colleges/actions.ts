'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { isAssignmentActive } from '@/lib/services/access-helpers';

const emailSchema = z.email();
import {
  createCollege as createCollegeService,
  deleteCollegeAdminCredential as deleteCollegeAdminCredentialService,
  deleteCollegeCascade as deleteCollegeCascadeService,
  inviteCollegeAdmin as inviteCollegeAdminService,
  updateCollege as updateCollegeService,
} from '@/lib/services/colleges';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { logAudit } from '@/lib/services/audit';
import { trackActivity } from '@/lib/activity/emit';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { parseFormData } from '@/lib/validation/form-data';
import { isDirectLearnerCollegeSlug } from '@/lib/services/students';
import {
  grantContentEntitlement,
  findActiveContentEntitlement,
  revokeContentEntitlement,
} from '@/lib/services/student-content-entitlements';
import {
  findActivePaidEntitlement,
  findActivePaidVariantEntitlement,
  findActivePaidBundleEntitlement,
  revokeEntitlement,
} from '@/lib/services/student-entitlements';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const optionalText = z.string().trim().optional().transform((value) => {
  if (!value) return null;
  return value;
});

const createCollegeSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.'),
    slug: z
      .string()
      .trim()
      .min(1, 'Slug is required.')
      .transform((value) => value.toLowerCase().replace(/\s+/g, '-'))
      .refine((value) => SLUG_PATTERN.test(value), {
        message: 'Slug must use lowercase letters, numbers, and hyphens only.',
      }),
    short_name: optionalText,
    status: z.enum(['active', 'inactive', 'suspended']).default('active'),
    support_email: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value : null))
      .refine((value) => value === null || emailSchema.safeParse(value).success, {
        message: 'Support email is invalid.',
      }),
    support_phone: optionalText,
    admin_email: z.string().trim().optional().transform((value) => (value ? value : '')),
    admin_full_name: z.string().trim().optional().transform((value) => (value ? value : '')),
    admin_password: z.string().optional().transform((value) => (value ? value : ''))
      .refine((value) => !value || value === value.trim(), {
        message: 'Admin password cannot start or end with spaces.',
      }),
  })
  .superRefine((value, ctx) => {
    const hasAnyAdminField = Boolean(value.admin_email || value.admin_full_name || value.admin_password);
    if (!hasAnyAdminField) return;

    if (!value.admin_email || !value.admin_full_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Admin email and full name are required.',
        path: ['admin_email'],
      });
      return;
    }

    if (!z.email().safeParse(value.admin_email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Admin email is invalid.',
        path: ['admin_email'],
      });
    }

    if (value.admin_password && value.admin_password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Admin password must be at least 8 characters.',
        path: ['admin_password'],
      });
    }
  });

const updateCollegeSchema = z.object({
  college_id: z.string().trim().min(1, 'College is required.'),
  name: z.string().trim().optional(),
  short_name: optionalText,
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  support_email: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || emailSchema.safeParse(value).success, {
      message: 'Support email is invalid.',
    }),
  support_phone: optionalText,
});

const inviteCollegeAdminSchema = z.object({
  college_id: z.string().trim().min(1, 'College is required.'),
  email: z.string().trim().toLowerCase().refine((value) => emailSchema.safeParse(value).success, { message: 'Email is invalid.' }),
  full_name: z.string().trim().min(1, 'Full name is required.'),
  password: z.string().optional().transform((value) => (value ? value : ''))
    .refine((value) => !value || value.length >= 8, {
      message: 'Password must be at least 8 characters.',
    })
    .refine((value) => !value || value === value.trim(), {
      message: 'Password cannot start or end with spaces.',
    }),
});

const deleteCollegeAdminSchema = z.object({
  college_id: z.string().trim().min(1, 'College is required.'),
  user_id: z.string().trim().min(1, 'User is required.'),
});

const deleteCollegeSchema = z.object({
  college_id: z.string().trim().min(1, 'College is required.'),
});

export type CreateCollegeResult = { ok: true; slug: string } | { ok: false; error: string };
export type InviteCollegeAdminResult = { ok: true; invite_link?: string } | { ok: false; error: string };
export type UpdateCollegeResult = { ok: true } | { ok: false; error: string };
export type DeleteCollegeAdminResult = { ok: true } | { ok: false; error: string };
export type DeleteCollegeResult = { ok: true; deletedUsers: number } | { ok: false; error: string };

function revalidateSuperadminDashboardTags() {
  revalidateTag('superadmin-dashboard-stats', 'max');
  revalidateTag('superadmin-dashboard-extended', 'max');
  revalidateTag('superadmin-colleges-list', 'max');
}

const directLearnerAccessSchema = z.object({
  collegeId: z.string().trim().min(1, 'College is required.'),
  contentId: z.string().trim().min(1, 'Content is required.'),
  contentType: z.enum(['master_course', 'variant', 'bundle']),
  studentId: z.string().trim().min(1, 'Student is required.'),
});

const directLearnerSearchSchema = z.object({
  collegeId: z.string().trim().min(1, 'College is required.'),
  contentId: z.string().trim().min(1, 'Content is required.'),
  contentType: z.enum(['master_course', 'variant', 'bundle']),
  query: z.string().trim().max(200).optional(),
});

export type DirectLearnerAccessSource = 'payment' | 'manual_superadmin' | 'b2c_direct' | 'assignment' | 'unknown';

export interface DirectLearnerAccessRow {
  student_id: string;
  full_name: string | null;
  email: string | null;
  membership_status: 'active';
  joined_at: string | null;
  access: {
    enabled: boolean;
    entitlement_id?: string;
    source: DirectLearnerAccessSource;
    is_payment: boolean;
    can_disable: boolean;
    has_manual_grant: boolean;
    has_payment: boolean;
  };
}

type DirectLearnerContentType = 'master_course' | 'variant' | 'bundle';

function isAssignmentActiveNow(assignment: { status?: string | null; start_date?: string | null; end_date?: string | null }) {
  return isAssignmentActive(assignment);
}

async function assertDirectLearnerCollege(collegeId: string) {
  const admin = createAdminClient();
  const { data: college, error } = await admin
    .from('colleges')
    .select('id, slug, name')
    .eq('id', collegeId)
    .maybeSingle();

  if (error || !college) {
    throw new Error('College not found.');
  }

  if (!isDirectLearnerCollegeSlug(college.slug)) {
    throw new Error('Direct learner access is only available for the Direct Learners college.');
  }

  return college;
}

async function requireActiveCollegeAssignment(
  collegeId: string,
  contentType: DirectLearnerContentType,
  contentId: string,
) {
  const admin = createAdminClient();
  const { data: assignments, error } = await admin
    .from('content_assignments')
    .select('id, status, start_date, end_date')
    .eq('assignment_type', 'college')
    .eq('target_id', collegeId)
    .eq('assigned_entity_type', contentType)
    .eq('assigned_entity_id', contentId)
    .eq('status', 'active');

  if (error) throw new Error(error.message);

  const activeAssignment = (assignments ?? []).find(isAssignmentActiveNow);
  if (!activeAssignment) {
    throw new Error('Content is not assigned to the Direct Learners college.');
  }

  return activeAssignment;
}

async function assertDirectLearnerContent(
  collegeId: string,
  contentType: DirectLearnerContentType,
  contentId: string,
) {
  const admin = createAdminClient();

  if (contentType === 'master_course') {
    const { data: course, error } = await admin
      .from('master_courses')
      .select('id, title, publish_status, visible_to_global_students')
      .eq('id', contentId)
      .maybeSingle();

    if (error || !course) {
      throw new Error('Course not found.');
    }

    if (course.publish_status !== 'published') {
      throw new Error('Course is not published.');
    }

    if (course.visible_to_global_students !== true) {
      await requireActiveCollegeAssignment(collegeId, contentType, contentId);
    }

    return course;
  }

  if (contentType === 'variant') {
    const { data: variant, error } = await admin
      .from('course_variants')
      .select('id, title, publish_status')
      .eq('id', contentId)
      .maybeSingle();

    if (error || !variant) {
      throw new Error('Variant not found.');
    }

    if (variant.publish_status !== 'published') {
      throw new Error('Variant is not published.');
    }

    await requireActiveCollegeAssignment(collegeId, contentType, contentId);
    return variant;
  }

  const { data: bundle, error } = await admin
    .from('course_bundles')
    .select('id, title, publish_status, lifecycle_status')
    .eq('id', contentId)
    .maybeSingle();

  if (error || !bundle) {
    throw new Error('Bundle not found.');
  }

  if (bundle.publish_status !== 'published' || bundle.lifecycle_status !== 'active') {
    throw new Error('Bundle is not published or active.');
  }

  await requireActiveCollegeAssignment(collegeId, contentType, contentId);
  return bundle;
}

function matchesContent(
  entitlement: {
    master_course_id?: string | null;
    metadata?: Record<string, unknown> | null;
  },
  contentType: DirectLearnerContentType,
  contentId: string,
) {
  const metadata = (entitlement.metadata ?? {}) as Record<string, unknown>;
  const assignedType = metadata.assigned_entity_type as string | undefined;
  const assignedId = metadata.assigned_entity_id as string | undefined;

  if (contentType === 'master_course') {
    if (entitlement.master_course_id === contentId) return true;
    return assignedType === 'master_course' && assignedId === contentId;
  }

  return assignedType === contentType && assignedId === contentId;
}

function resolveAccessSource(
  entitlements: Array<{ source_type?: string | null; metadata?: Record<string, unknown> | null }>,
) {
  const hasManualGrant = entitlements.some((entitlement) => {
    const metadata = (entitlement.metadata ?? {}) as Record<string, unknown>;
    return entitlement.source_type === 'manual_grant' && metadata.source === 'manual_superadmin_direct_learner';
  });

  const hasPayment = entitlements.some((entitlement) => {
    const metadata = (entitlement.metadata ?? {}) as Record<string, unknown>;
    const hasPaymentMeta = Boolean(
      metadata.payment_id || metadata.order_id || metadata.purchase_type || metadata.razorpay_order_id,
    );
    return entitlement.source_type === 'b2c_direct' && hasPaymentMeta;
  });

  if (hasPayment) {
    return {
      source: 'payment' as const,
      is_payment: true,
      has_payment: true,
      has_manual_grant: hasManualGrant,
      can_disable: hasManualGrant,
    };
  }

  if (hasManualGrant) {
    return {
      source: 'manual_superadmin' as const,
      is_payment: false,
      has_payment: false,
      has_manual_grant: true,
      can_disable: true,
    };
  }

  if (entitlements.some((entitlement) => (entitlement.metadata ?? {})?.assignment_id)) {
    return {
      source: 'assignment' as const,
      is_payment: false,
      has_payment: false,
      has_manual_grant: false,
      can_disable: false,
    };
  }

  if (entitlements.some((entitlement) => entitlement.source_type === 'b2c_direct')) {
    return {
      source: 'b2c_direct' as const,
      is_payment: false,
      has_payment: false,
      has_manual_grant: false,
      can_disable: false,
    };
  }

  return {
    source: 'unknown' as const,
    is_payment: false,
    has_payment: false,
    has_manual_grant: false,
    can_disable: false,
  };
}

export async function searchDirectLearnerAccessAction(input: {
  collegeId: string;
  contentId: string;
  contentType: DirectLearnerContentType;
  query?: string;
}): Promise<{ ok: true; learners: DirectLearnerAccessRow[] } | { ok: false; error: string }> {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return { ok: false, error: authResult.error };

    const parsed = directLearnerSearchSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

    await assertDirectLearnerCollege(parsed.data.collegeId);
    await assertDirectLearnerContent(parsed.data.collegeId, parsed.data.contentType, parsed.data.contentId);

    const admin = createAdminClient();
    const query = parsed.data.query?.trim() ?? '';
    const limit = 200;

    let userIds: string[] = [];
    let profileRows: Array<{ id: string; full_name: string | null; email: string | null }> = [];

    if (query.length > 0) {
      const { data: profiles, error: profileError } = await admin
        .from('profiles')
        .select('id, full_name, email')
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(limit);

      if (profileError) throw new Error(profileError.message);
      profileRows = profiles ?? [];
      userIds = profileRows.map((row) => row.id);
    }

    const membershipsQuery = admin
      .from('college_memberships')
      .select('user_id')
      .eq('college_id', parsed.data.collegeId)
      .eq('role', 'student')
      .eq('status', 'active');

    const { data: memberships, error: membershipError } =
      userIds.length > 0
        ? await membershipsQuery.in('user_id', userIds)
        : await membershipsQuery.limit(limit);

    if (membershipError) throw new Error(membershipError.message);

    const activeUserIds = (memberships ?? []).map((m) => m.user_id as string);
    if (activeUserIds.length === 0) return { ok: true, learners: [] };

    if (query.length === 0) {
      const { data: profiles, error: profileError } = await admin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', activeUserIds)
        .limit(limit);
      if (profileError) throw new Error(profileError.message);
      profileRows = profiles ?? [];
      userIds = profileRows.map((row) => row.id);
    }

    const { data: students, error: studentsError } = await admin
      .from('students')
      .select('id, user_id, created_at')
      .eq('college_id', parsed.data.collegeId)
      .in('user_id', activeUserIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (studentsError) throw new Error(studentsError.message);

    const studentRows = students ?? [];
    if (studentRows.length === 0) return { ok: true, learners: [] };

    const profileMap = new Map(profileRows.map((row) => [row.id, row]));
    const studentIds = studentRows.map((row) => row.id);

    const [entitlementsRes, contentEntitlementsRes] = await Promise.all([
      admin
        .from('student_entitlements')
        .select('id, student_id, master_course_id, source_type, status, metadata')
        .eq('status', 'active')
        .in('student_id', studentIds),
      admin
        .from('student_content_entitlements')
        .select('id, student_id, assigned_entity_type, assigned_entity_id, source_type, status, metadata')
        .eq('status', 'active')
        .in('student_id', studentIds),
    ]);

    if (entitlementsRes.error) throw new Error(entitlementsRes.error.message);
    if (contentEntitlementsRes.error) throw new Error(contentEntitlementsRes.error.message);

    // Merge both entitlement sources into a common format
    const allEntitlements = [
      ...(entitlementsRes.data ?? []).map((e) => ({
        id: e.id as string,
        student_id: e.student_id as string,
        master_course_id: e.master_course_id as string,
        source_type: e.source_type as string | null,
        status: e.status as string,
        metadata: (e.metadata ?? {}) as Record<string, unknown>,
      })),
      ...(contentEntitlementsRes.data ?? []).map((e) => ({
        id: e.id as string,
        student_id: e.student_id as string,
        master_course_id: e.assigned_entity_type === 'master_course' ? (e.assigned_entity_id as string) : '',
        source_type: e.source_type as string | null,
        status: e.status as string,
        metadata: {
          ...((e.metadata ?? {}) as Record<string, unknown>),
          assigned_entity_type: e.assigned_entity_type,
          assigned_entity_id: e.assigned_entity_id,
        },
      })),
    ];

    const entitlementMap = new Map<string, Array<typeof allEntitlements[number]>>();
    allEntitlements.forEach((entitlement) => {
      const key = entitlement.student_id;
      const existing = entitlementMap.get(key) ?? [];
      existing.push(entitlement);
      entitlementMap.set(key, existing);
    });

    const learners = studentRows.map((student) => {
      const profile = profileMap.get(student.user_id);
      const entitlementsForStudent = entitlementMap.get(student.id) ?? [];
      const matchedEntitlements = entitlementsForStudent.filter((entitlement) =>
        matchesContent(entitlement, parsed.data.contentType, parsed.data.contentId),
      );
      const access = matchedEntitlements.length > 0
        ? { enabled: true, ...resolveAccessSource(matchedEntitlements) }
        : { enabled: false, ...resolveAccessSource([]) };

      return {
        student_id: student.id,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        membership_status: 'active' as const,
        joined_at: student.created_at ?? null,
        access,
      } as DirectLearnerAccessRow;
    });

    return { ok: true, learners };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load learners.' };
  }
}

export async function grantDirectLearnerAccessAction(input: {
  collegeId: string;
  contentId: string;
  contentType: DirectLearnerContentType;
  studentId: string;
}): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return { ok: false, error: authResult.error };
    const user = authResult.user;

    const parsed = directLearnerAccessSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

await assertDirectLearnerCollege(parsed.data.collegeId);
    await assertDirectLearnerContent(parsed.data.collegeId, parsed.data.contentType, parsed.data.contentId);

    const admin = createAdminClient();
    const { data: studentRow, error: studentError } = await admin
      .from('students')
      .select('id, user_id')
      .eq('id', parsed.data.studentId)
      .eq('college_id', parsed.data.collegeId)
      .maybeSingle();

    if (studentError || !studentRow) throw new Error('Student not found for Direct Learners college.');

    const { data: membership } = await admin
      .from('college_memberships')
      .select('id')
      .eq('college_id', parsed.data.collegeId)
      .eq('user_id', studentRow.user_id)
      .eq('role', 'student')
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) throw new Error('Student is not active in Direct Learners college.');

    const existing = await findActiveContentEntitlement(
      parsed.data.studentId,
      parsed.data.contentType,
      parsed.data.contentId,
    );
    if (existing) {
      return { ok: true, message: 'Access is already active for this learner.' };
    }

    await grantContentEntitlement({
      student_id: parsed.data.studentId,
      assigned_entity_type: parsed.data.contentType,
      assigned_entity_id: parsed.data.contentId,
      created_by: user.id,
      metadata: {
        source: 'manual_superadmin_direct_learner',
        direct_learner_access: true,
        college_id: parsed.data.collegeId,
        granted_by: user.id,
        granted_at: new Date().toISOString(),
      },
    });

    revalidatePath(`/colleges/${parsed.data.collegeId}`);
    revalidateSuperadminDashboardTags();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to enable access.' };
  }
}

export async function revokeDirectLearnerAccessAction(input: {
  collegeId: string;
  contentId: string;
  contentType: DirectLearnerContentType;
  studentId: string;
}): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return { ok: false, error: authResult.error };
    const user = authResult.user;

    const parsed = directLearnerAccessSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

    await assertDirectLearnerCollege(parsed.data.collegeId);
    await assertDirectLearnerContent(parsed.data.collegeId, parsed.data.contentType, parsed.data.contentId);

    const admin = createAdminClient();
    const { data: studentRow, error: studentError } = await admin
      .from('students')
      .select('id, user_id')
      .eq('id', parsed.data.studentId)
      .eq('college_id', parsed.data.collegeId)
      .maybeSingle();

    if (studentError || !studentRow) throw new Error('Student not found for Direct Learners college.');

    const { data: membership } = await admin
      .from('college_memberships')
      .select('id')
      .eq('college_id', parsed.data.collegeId)
      .eq('user_id', studentRow.user_id)
      .eq('role', 'student')
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) throw new Error('Student is not active in Direct Learners college.');

    // Revoke manual SuperAdmin grants in student_content_entitlements
    const manualEntitlement = await findActiveContentEntitlement(
      parsed.data.studentId,
      parsed.data.contentType,
      parsed.data.contentId,
    );

    if (manualEntitlement) {
      await revokeContentEntitlement(manualEntitlement.id, user.id, 'Direct learner access revoked');
      revalidatePath(`/colleges/${parsed.data.collegeId}`);
      revalidateSuperadminDashboardTags();
      return { ok: true };
    }

    // Fallback: check for paid post-payment entitlements in student_entitlements
    // Use metadata matching for variant/bundle to avoid revoking unrelated access
    if (parsed.data.contentType === 'master_course') {
      const paidEntitlement = await findActivePaidEntitlement(
        parsed.data.studentId,
        parsed.data.contentId,
      );
      if (paidEntitlement) {
        await revokeEntitlement(paidEntitlement.id, user.id, 'Direct learner access revoked');
        revalidatePath(`/colleges/${parsed.data.collegeId}`);
        revalidateSuperadminDashboardTags();
        return { ok: true, message: 'Paid access revoked successfully. Payment/order history was not changed.' };
      }
    } else if (parsed.data.contentType === 'variant') {
      const paidEntitlement = await findActivePaidVariantEntitlement(
        parsed.data.studentId,
        parsed.data.contentId,
      );
      if (paidEntitlement) {
        await revokeEntitlement(paidEntitlement.id, user.id, 'Direct learner access revoked');
        revalidatePath(`/colleges/${parsed.data.collegeId}`);
        revalidateSuperadminDashboardTags();
        return { ok: true, message: 'Paid access revoked successfully. Payment/order history was not changed.' };
      }
    } else if (parsed.data.contentType === 'bundle') {
      const paidEntitlement = await findActivePaidBundleEntitlement(
        parsed.data.studentId,
        parsed.data.contentId,
      );
      if (paidEntitlement) {
        await revokeEntitlement(paidEntitlement.id, user.id, 'Direct learner access revoked');
        revalidatePath(`/colleges/${parsed.data.collegeId}`);
        revalidateSuperadminDashboardTags();
        return { ok: true, message: 'Paid access revoked successfully. Payment/order history was not changed.' };
      }
    }

    revalidatePath(`/colleges/${parsed.data.collegeId}`);
    return { ok: true, message: 'No exact active paid access found to revoke for this learner and content.' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to disable access.' };
  }
}

export async function updateCollegeAction(formData: FormData): Promise<UpdateCollegeResult> {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return { ok: false, error: authResult.error };
    const user = authResult.user;

    const limited = await consumeRateLimit({ key: `update-college:${user.id}`, limit: 60, windowMs: 5 * 60 * 1000 });
    if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

    const parsed = parseFormData(updateCollegeSchema, formData);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    await updateCollegeService(parsed.data.college_id, {
      name: parsed.data.name,
      short_name: parsed.data.short_name,
      status: parsed.data.status,
      support_email: parsed.data.support_email,
      support_phone: parsed.data.support_phone,
    });

    await trackActivity({
      tenantId: parsed.data.college_id,
      actorUserId: user.id,
      actorRole: 'superadmin',
      actorType: 'superadmin',
      eventName: 'college_updated',
      entityType: 'college',
      entityId: parsed.data.college_id,
      metadata: {},
    });

    revalidatePath('/colleges');
    revalidatePath('/dashboard');
    revalidatePath(`/colleges/${parsed.data.college_id}`);
    revalidateSuperadminDashboardTags();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to update college.' };
  }
}

export async function createCollegeAction(formData: FormData): Promise<CreateCollegeResult> {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return { ok: false, error: authResult.error };
    const user = authResult.user;

    const limited = await consumeRateLimit({ key: `create-college:${user.id}`, limit: 20, windowMs: 5 * 60 * 1000 });
    if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

    const parsed = parseFormData(createCollegeSchema, formData);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const { id: collegeId, slug: createdSlug } = await createCollegeService({
      name: parsed.data.name,
      slug: parsed.data.slug,
      short_name: parsed.data.short_name,
      status: parsed.data.status,
      support_email: parsed.data.support_email,
      support_phone: parsed.data.support_phone,
    });

    if (parsed.data.admin_email && parsed.data.admin_full_name) {
      const { user_id } = await inviteCollegeAdminService({
        college_id: collegeId,
        email: parsed.data.admin_email,
        full_name: parsed.data.admin_full_name,
        password: parsed.data.admin_password || undefined,
      });

      await logAudit({
        actor_id: user.id,
        action: 'college_admin.invited',
        resource_type: 'user',
        resource_id: user_id,
        college_id: collegeId,
        payload: { email: parsed.data.admin_email, full_name: parsed.data.admin_full_name },
      });
    }

    await logAudit({
      actor_id: user.id,
      action: 'college.created',
      resource_type: 'college',
      resource_id: collegeId,
      college_id: collegeId,
      payload: { name: parsed.data.name, slug: createdSlug },
    });
    await trackActivity({
      tenantId: collegeId,
      actorUserId: user.id,
      actorRole: 'superadmin',
      actorType: 'superadmin',
      eventName: 'college_created',
      entityType: 'college',
      entityId: collegeId,
      metadata: { name: parsed.data.name, slug: createdSlug },
    });

    revalidatePath('/colleges');
    revalidatePath('/dashboard');
    revalidatePath(`/colleges/${collegeId}`);
    revalidateSuperadminDashboardTags();
    return { ok: true, slug: createdSlug };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create college.' };
  }
}

export async function inviteCollegeAdminAction(formData: FormData): Promise<InviteCollegeAdminResult> {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return { ok: false, error: authResult.error };
    const user = authResult.user;

    const limited = await consumeRateLimit({ key: `invite-college-admin:${user.id}`, limit: 30, windowMs: 5 * 60 * 1000 });
    if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

    const parsed = parseFormData(inviteCollegeAdminSchema, formData);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const { user_id, invite_link } = await inviteCollegeAdminService({
      college_id: parsed.data.college_id,
      email: parsed.data.email,
      full_name: parsed.data.full_name,
      password: parsed.data.password || undefined,
    });

    await Promise.all([
      logAudit({
        actor_id: user.id,
        action: 'college_admin.invited',
        resource_type: 'user',
        resource_id: user_id,
        college_id: parsed.data.college_id,
        payload: { email: parsed.data.email, full_name: parsed.data.full_name },
      }),
      trackActivity({
        tenantId: parsed.data.college_id,
        actorUserId: user.id,
        actorRole: 'superadmin',
        actorType: 'superadmin',
        eventName: 'invite_sent',
        entityType: 'user',
        entityId: user_id,
        metadata: { email: parsed.data.email, full_name: parsed.data.full_name, role: 'college_admin' },
      }),
    ]);

    revalidatePath('/colleges');
    revalidatePath('/dashboard');
    revalidatePath(`/colleges/${parsed.data.college_id}`);
    revalidateSuperadminDashboardTags();
    return { ok: true, invite_link };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to invite admin.' };
  }
}

export async function deleteCollegeAdminAction(formData: FormData): Promise<DeleteCollegeAdminResult> {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return { ok: false, error: authResult.error };
    const user = authResult.user;

    const limited = await consumeRateLimit({ key: `delete-college-admin:${user.id}`, limit: 20, windowMs: 5 * 60 * 1000 });
    if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

    const parsed = parseFormData(deleteCollegeAdminSchema, formData);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    await deleteCollegeAdminCredentialService(parsed.data.college_id, parsed.data.user_id);

    await Promise.all([
      logAudit({
        actor_id: user.id,
        action: 'college_admin.deleted',
        resource_type: 'user',
        resource_id: parsed.data.user_id,
        college_id: parsed.data.college_id,
        payload: { deleted_from_college: parsed.data.college_id },
      }),
      trackActivity({
        tenantId: parsed.data.college_id,
        actorUserId: user.id,
        actorRole: 'superadmin',
        actorType: 'superadmin',
        eventName: 'admin_deactivated',
        entityType: 'user',
        entityId: parsed.data.user_id,
        metadata: {},
      }),
    ]);

    revalidatePath('/colleges');
    revalidatePath('/dashboard');
    revalidatePath(`/colleges/${parsed.data.college_id}`);
    revalidateSuperadminDashboardTags();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to delete college admin.' };
  }
}

export async function deleteCollegeAction(formData: FormData): Promise<DeleteCollegeResult> {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return { ok: false, error: authResult.error };
    const user = authResult.user;

    const limited = await consumeRateLimit({ key: `delete-college:${user.id}`, limit: 10, windowMs: 5 * 60 * 1000 });
    if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

    const parsed = parseFormData(deleteCollegeSchema, formData);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const { deletedUsers } = await deleteCollegeCascadeService(parsed.data.college_id);

    // Log AFTER delete - college_id is null because the row no longer exists.
    // We store the deleted ID in the payload for traceability.
    await Promise.all([
      logAudit({
        actor_id: user.id,
        action: 'college.deleted',
        resource_type: 'college',
        resource_id: parsed.data.college_id,
        college_id: null,
        payload: { deleted_college_id: parsed.data.college_id, deleted_users: deletedUsers },
      }),
      trackActivity({
        tenantId: null,
        actorUserId: user.id,
        actorRole: 'superadmin',
        actorType: 'superadmin',
        eventName: 'college_deleted',
        entityType: 'college',
        entityId: parsed.data.college_id,
        metadata: { deleted_college_id: parsed.data.college_id, deleted_users: deletedUsers },
      }),
    ]);

    revalidatePath('/colleges');
    revalidatePath('/dashboard');
    revalidateSuperadminDashboardTags();
    return { ok: true, deletedUsers };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to delete college.' };
  }
}

