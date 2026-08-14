import 'server-only';
import { cache } from 'react';

import { createAdminClient } from '@/lib/supabase/admin';
import { isUuid } from '@/lib/utils/slug';

export interface ResolvedEntity {
  id: string;
  slug: string;
}

export type ResolveCourseByKeyOptions = {
  pillarId?: string;
  bootcampId?: string;
  /** When slug matches multiple published courses, prefer the entitled course for this student. */
  studentId?: string;
  /** Explicit course id hint (e.g. from My Courses entitlement row). */
  preferCourseId?: string;
};

type CourseSlugCandidate = ResolvedEntity & {
  course_kind?: string | null;
  is_free?: boolean | null;
  pricing_model?: string | null;
  updated_at?: string;
};

function isFreeCourseCandidate(course: CourseSlugCandidate): boolean {
  return (
    course.course_kind === 'free_course'
    || course.is_free === true
    || course.pricing_model === 'free'
  );
}

async function pickCourseFromSlugMatches(
  candidates: CourseSlugCandidate[],
  opts?: Pick<ResolveCourseByKeyOptions, 'studentId' | 'preferCourseId'>,
): Promise<ResolvedEntity | null> {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) {
    return { id: candidates[0].id, slug: candidates[0].slug };
  }

  if (opts?.preferCourseId) {
    const preferred = candidates.find((c) => c.id === opts.preferCourseId);
    if (preferred) return { id: preferred.id, slug: preferred.slug };
  }

  if (opts?.studentId) {
    const sb = createAdminClient();
    const nowIso = new Date().toISOString();
    const ids = candidates.map((c) => c.id);
    const { data: entitlements } = await sb
      .from('student_entitlements')
      .select('master_course_id, metadata, source_type, created_at')
      .eq('student_id', opts.studentId)
      .in('master_course_id', ids)
      .eq('status', 'active')
      .lte('valid_from', nowIso)
      .or('valid_until.is.null,valid_until.gt.' + nowIso)
      .order('created_at', { ascending: false });

    if (entitlements && entitlements.length > 0) {
      const freeEnrollment = entitlements.find((row) => {
        const meta = row.metadata as Record<string, unknown> | null;
        return (
          row.source_type === 'free_course'
          || meta?.enrollment_type === 'free_course'
          || meta?.source === 'free_course_enrollment'
        );
      });
      const pickId = (freeEnrollment ?? entitlements[0]).master_course_id as string;
      const match = candidates.find((c) => c.id === pickId);
      if (match) return { id: match.id, slug: match.slug };
    }
  }

  const sorted = [...candidates].sort((a, b) => {
    const aFree = isFreeCourseCandidate(a) ? 1 : 0;
    const bFree = isFreeCourseCandidate(b) ? 1 : 0;
    if (aFree !== bFree) return bFree - aFree;
    const aTime = a.updated_at ? Date.parse(a.updated_at) : 0;
    const bTime = b.updated_at ? Date.parse(b.updated_at) : 0;
    return bTime - aTime;
  });

  if (process.env.NODE_ENV !== 'production') {
    console.info('[resolveCourseByKey] slug collision disambiguated', {
      candidateIds: candidates.map((c) => c.id),
      pickedId: sorted[0].id,
      studentId: opts?.studentId ?? null,
      preferCourseId: opts?.preferCourseId ?? null,
    });
  }

  return { id: sorted[0].id, slug: sorted[0].slug };
}

/**
 * Resolve a bootcamp by UUID id or slug.
 * Returns { id, slug } for internal use, or null if not found.
 */
async function _resolveBootcampByKey(key: string): Promise<ResolvedEntity | null> {
  if (!key) return null;
  const sb = createAdminClient();
  const query = sb.from('bootcamps').select('id, slug');
  const { data } = isUuid(key)
    ? await query.eq('id', key).maybeSingle()
    : await query.eq('slug', key).maybeSingle();
  return (data as ResolvedEntity) ?? null;
}

/**
 * Resolve a pillar by UUID id or slug.
 */
export async function resolvePillarByKey(key: string): Promise<ResolvedEntity | null> {
  if (!key) return null;
  const sb = createAdminClient();
  const query = sb.from('master_course_pillars').select('id, slug');
  const { data } = isUuid(key)
    ? await query.eq('id', key).maybeSingle()
    : await query.eq('slug', key).maybeSingle();
  return (data as ResolvedEntity) ?? null;
}

/**
 * Resolve a course by UUID id or slug, optionally scoped to a pillar or bootcamp.
 */
export const resolveCourseByKey = cache(
  async function resolveCourseByKey(
    courseKey: string,
    opts?: ResolveCourseByKeyOptions,
  ): Promise<ResolvedEntity | null> {
    if (!courseKey) return null;
    const sb = createAdminClient();

    if (isUuid(courseKey)) {
      const { data } = await sb
        .from('master_courses')
        .select('id, slug')
        .eq('id', courseKey)
        .maybeSingle();
      return (data as ResolvedEntity) ?? null;
    }

    let query = sb
      .from('master_courses')
      .select('id, slug, course_kind, is_free, pricing_model, updated_at')
      .eq('slug', courseKey);

    if (opts?.pillarId) query = query.eq('pillar_id', opts.pillarId);
    if (opts?.bootcampId) query = query.eq('bootcamp_id', opts.bootcampId);

    const { data: rows, error } = await query;
    if (error) return null;

    return pickCourseFromSlugMatches((rows ?? []) as CourseSlugCandidate[], {
      studentId: opts?.studentId,
      preferCourseId: opts?.preferCourseId,
    });
  },
);

/**
 * Resolve a course from a route key, including paid-variant landing slugs and ?variant= context.
 */
export async function resolveCourseByKeyWithPaidContext(
  courseKey: string,
  opts?: ResolveCourseByKeyOptions & { explicitVariantId?: string | null },
): Promise<ResolvedEntity | null> {
  const direct = await resolveCourseByKey(courseKey, opts);
  if (direct) return direct;

  const sb = createAdminClient();
  const explicitVariantId = opts?.explicitVariantId?.trim();
  if (explicitVariantId) {
    const variantQuery = sb
      .from('course_variants')
      .select('master_course_id')
      .eq('publish_status', 'published');

    const { data: variant } = isUuid(explicitVariantId)
      ? await variantQuery.eq('id', explicitVariantId).maybeSingle()
      : await variantQuery.eq('slug', explicitVariantId).maybeSingle();

    if (variant?.master_course_id) {
      return resolveCourseByKey(variant.master_course_id as string, opts);
    }
  }

  if (!isUuid(courseKey)) {
    const { data: meta } = await sb
      .from('paid_course_landing_metadata')
      .select('source_type, source_id')
      .eq('slug', courseKey)
      .eq('is_published', true)
      .maybeSingle();

    if (meta?.source_type === 'master_course' || meta?.source_type === 'paid_course_builder') {
      return resolveCourseByKey(meta.source_id as string, opts);
    }

    if (meta?.source_type === 'course_variant') {
      const { data: variant } = await sb
        .from('course_variants')
        .select('master_course_id')
        .eq('id', meta.source_id as string)
        .maybeSingle();

      if (variant?.master_course_id) {
        return resolveCourseByKey(variant.master_course_id as string, opts);
      }
    }
  }

  return null;
}

/**
 * Resolve a bundle by UUID id or slug.
 * Only returns published + active bundles.
 */
async function _resolveBundleByKey(key: string): Promise<ResolvedEntity | null> {
  if (!key) return null;
  const sb = createAdminClient();
  const query = sb
    .from('course_bundles')
    .select('id, slug')
    .eq('publish_status', 'published')
    .eq('lifecycle_status', 'active');
  const { data } = isUuid(key)
    ? await query.eq('id', key).maybeSingle()
    : await query.eq('slug', key).maybeSingle();
  return (data as ResolvedEntity) ?? null;
}

/**
 * Resolve a variant by UUID id or slug, optionally scoped to a course.
 */
async function _resolveVariantByKey(
  variantKey: string,
  courseId?: string,
): Promise<ResolvedEntity | null> {
  if (!variantKey) return null;
  const sb = createAdminClient();
  let query = sb.from('course_variants').select('id, slug');

  if (isUuid(variantKey)) {
    query = query.eq('id', variantKey);
  } else {
    query = query.eq('slug', variantKey);
  }

  if (courseId) query = query.eq('master_course_id', courseId);

  const { data } = await query.maybeSingle();
  return (data as ResolvedEntity) ?? null;
}

/**
 * Resolve a lesson item by UUID or slug within a course.
 * Returns { id, slug } for internal use, or null if not found.
 */
export async function resolveItemByKey(
  courseId: string,
  itemKey: string,
): Promise<ResolvedEntity | null> {
  if (!courseId || !itemKey) return null;
  const sb = createAdminClient();
  let query = sb
    .from('master_course_items')
    .select('id, slug')
    .eq('master_course_id', courseId);

  if (isUuid(itemKey)) {
    query = query.eq('id', itemKey);
  } else {
    query = query.eq('slug', itemKey);
  }

  const { data } = await query.maybeSingle();
  return (data as ResolvedEntity) ?? null;
}
