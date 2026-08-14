import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { isUuid } from '@/lib/utils/slug';

export interface ResolvedEntity {
  id: string;
  slug: string;
}

/**
 * Resolve a bootcamp by UUID id or slug.
 * Returns { id, slug } for internal use, or null if not found.
 */
export async function resolveBootcampByKey(key: string): Promise<ResolvedEntity | null> {
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
export async function resolveCourseByKey(
  courseKey: string,
  opts?: { pillarId?: string; bootcampId?: string },
): Promise<ResolvedEntity | null> {
  if (!courseKey) return null;
  const sb = createAdminClient();
  let query = sb.from('master_courses').select('id, slug');

  if (isUuid(courseKey)) {
    query = query.eq('id', courseKey);
  } else {
    query = query.eq('slug', courseKey);
  }

  if (opts?.pillarId) query = query.eq('pillar_id', opts.pillarId);
  if (opts?.bootcampId) query = query.eq('bootcamp_id', opts.bootcampId);

  const { data } = await query.maybeSingle();
  return (data as ResolvedEntity) ?? null;
}

/**
 * Resolve a bundle by UUID id or slug.
 * Returns published + active bundles.
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
export async function resolveVariantByKey(
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
