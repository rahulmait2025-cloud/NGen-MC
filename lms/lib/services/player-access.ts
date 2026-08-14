import 'server-only';

import { cacheTag, cacheLife } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  resolvePaidCourseSourceType,
  LEGACY_BOOTCAMP_PILLAR_SLUG,
  type PaidCourseSourceType,
} from '@/lib/services/paid-course-catalog';
import {
  type StudentAccessContext,
} from '@/lib/services/course-access-manager';

export interface PlayerCourseSourceIdentity {
  sourceType: PaidCourseSourceType;
  sourceId: string;
  masterCourseId: string;
  courseSlug: string | null;
  pillarSlug: string | null;
}

export interface PlayerAccessValidation {
  allowed: boolean;
  accessLevel: 'full' | 'partial' | 'none';
  source: PlayerCourseSourceIdentity;
  entitlementId: string | null;
  allowedItemIds: Set<string> | null;
  redirectHref: string | null;
  denyReason: string | null;
}

type CourseRow = {
  id: string;
  slug: string | null;
  pillar_id: string | null;
  bootcamp_id: string | null;
  catalog_type: string | null;
  is_free: boolean | null;
  pricing_model: string | null;
  course_kind: string | null;
};

async function loadCourseRow(masterCourseId: string): Promise<CourseRow | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('courses');
  const sb = createAdminClient();
  const { data } = await sb
    .from('master_courses')
    .select('id, slug, pillar_id, bootcamp_id, catalog_type, is_free, pricing_model, course_kind')
    .eq('id', masterCourseId)
    .maybeSingle();
  return (data as CourseRow | null) ?? null;
}

async function resolvePillarSlug(pillarId: string): Promise<string | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('pillars');
  const sb = createAdminClient();
  const { data } = await sb
    .from('master_course_pillars')
    .select('slug')
    .eq('id', pillarId)
    .maybeSingle();
  return (data?.slug as string | null) ?? null;
}

/**
 * Resolve paid-course source identity for player access checks.
 * masterCourseId always points at curriculum storage; sourceType/sourceId
 * reflect checkout/entitlement identity.
 */
async function resolvePlayerCourseSource(
  masterCourseId: string,
  options?: { variantId?: string | null },
): Promise<PlayerCourseSourceIdentity | null> {
  const course = await loadCourseRow(masterCourseId);
  if (!course) return null;

  const variantId = options?.variantId?.trim() || null;
  let sourceType = resolvePaidCourseSourceType(course);
  let sourceId = course.id;

  if (variantId) {
    const sb = createAdminClient();
    const { data: variant } = await sb
      .from('course_variants')
      .select('id, master_course_id, show_as_paid_course')
      .eq('id', variantId)
      .eq('master_course_id', masterCourseId)
      .maybeSingle();

    if (variant) {
      sourceType = 'course_variant';
      sourceId = variant.id as string;
    }
  }

  const pillarSlug = course.bootcamp_id
    ? LEGACY_BOOTCAMP_PILLAR_SLUG
    : course.pillar_id
      ? await resolvePillarSlug(course.pillar_id)
      : null;

  return {
    sourceType,
    sourceId,
    masterCourseId: course.id,
    courseSlug: course.slug,
    pillarSlug,
  };
}

/**
 * Source-aware player access validation for master_course, course_variant,
 * and paid_course_builder products.
 */
/**
 * Validate a student's access to a course for the video player.
 * Requires enrollment, purchase, college assignment, bundle, or bootcamp access.
 */
export async function validatePlayerCourseAccess(
  studentId: string,
  masterCourseId: string,
  context: StudentAccessContext,
  options?: {
    collegeSlug?: string;
    variantId?: string | null;
    lessonId?: string | null;
  },
): Promise<PlayerAccessValidation> {
  const source = await resolvePlayerCourseSource(masterCourseId, {
    variantId: options?.variantId,
  });

  const defaultSource: PlayerCourseSourceIdentity = source ?? {
    sourceType: 'master_course',
    sourceId: masterCourseId,
    masterCourseId,
    courseSlug: null,
    pillarSlug: null,
  };

  // 1. Direct entitlement check via course-access-manager
  const { validateStudentCourseAccess, resolveCollegeAssignedCourseIds } = await import('@/lib/services/course-access-manager');
  const courseAccess = await validateStudentCourseAccess(studentId, masterCourseId, context);
  if (courseAccess) {
    return {
      allowed: true,
      accessLevel: 'full',
      source: defaultSource,
      entitlementId: courseAccess.source_entitlement_id,
      allowedItemIds: null,
      redirectHref: null,
      denyReason: null,
    };
  }

  // 2. College assignment check
  if (context.collegeId) {
    const assigned = await resolveCollegeAssignedCourseIds(context.collegeId);
    const { normUuid } = await import('@/lib/utils');
    const want = normUuid(masterCourseId);
    if (assigned.some((id) => normUuid(id) === want)) {
      return {
        allowed: true,
        accessLevel: 'full',
        source: defaultSource,
        entitlementId: null,
        allowedItemIds: null,
        redirectHref: null,
        denyReason: null,
      };
    }
  }

  // 3. Job Ready Bootcamp inheritance (bootcamp enrollment grants access to bootcamp pillar courses)
  const { canAccessBootcampCourse } = await import('@/lib/services/job-ready-bootcamp');
  if (await canAccessBootcampCourse(studentId, masterCourseId, context.collegeId)) {
    return {
      allowed: true,
      accessLevel: 'full',
      source: defaultSource,
      entitlementId: null,
      allowedItemIds: null,
      redirectHref: null,
      denyReason: null,
    };
  }

  return {
    allowed: false,
    accessLevel: 'none',
    source: defaultSource,
    entitlementId: null,
    allowedItemIds: null,
    redirectHref: null,
    denyReason: 'No active entitlement, college assignment, or bootcamp access found.',
  };
}
