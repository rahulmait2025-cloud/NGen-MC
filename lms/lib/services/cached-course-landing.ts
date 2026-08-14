import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyMasterCourseKeyFilter } from '@/lib/utils/master-course-key';
import type { PaidCourseSourceType } from '@/lib/services/paid-course-catalog';

type MetadataObj = Record<string, unknown> & { [k: string]: MetadataObj | unknown };

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function parseCourseDescriptionField(description: string | null | undefined): {
  text: string | null;
  bulletPoints: string[];
} {
  if (!description?.trim()) return { text: null, bulletPoints: [] };
  const trimmed = description.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        const bulletPoints = parsed.reduce<string[]>((acc, item) => {
          if (typeof item === 'string') {
            const t = item.trim();
            if (t.length > 0) acc.push(t);
          }
          return acc;
        }, []);
        if (bulletPoints.length > 0) {
          return { text: bulletPoints.join(' '), bulletPoints };
        }
      }
    } catch {
      // fall through
    }
  }
  return { text: trimmed, bulletPoints: [] };
}

/** Static course landing data — safe to cache long-term. No user-specific data. */
export interface CachedCourseLandingStatic {
  masterCourseId: string;
  sourceType: PaidCourseSourceType;
  sourceId: string;
  pillarSlug: string;
  pillarTitle: string;
  title: string;
  slug: string;
  subtitle: string | null;
  shortDescription: string | null;
  description: string | null;
  coverImageUrl: string | null;
  thumbnailUrl: string | null;
  previewVideoUrl: string | null;
  level: string;
  isFree: boolean;
  moduleCount: number;
  videoCount: number;
  modules: Array<{
    id: string;
    title: string;
    description?: string | null;
    item_count: number;
    items: Array<{ id: string; title: string; preview_enabled: boolean }>;
  }>;
  outcomes: string[];
  whatYouWillLearn: string[];
  includedFeatures: string[];
  bestFor: string[];
  prerequisites: string[];
  faqs: Array<{ q: string; a: string }>;
  fallbackPriceMinor: number | null;
  fallbackCurrency: string;
  isPublished: boolean;
  isVisible: boolean;
}

function normalizeFaqs(
  landingMeta: { faqs?: Array<{ question?: string; answer?: string; q?: string; a?: string }> | null } | null,
  courseMetadata: MetadataObj | null | undefined,
  pillarMetadata: MetadataObj | null | undefined,
): Array<{ q: string; a: string }> {
  const fromTable = (landingMeta?.faqs ?? []).reduce((acc, f) => {
    const item = { q: f.question ?? f.q ?? '', a: f.answer ?? f.a ?? '' };
    if (item.q && item.a) acc.push(item);
    return acc;
  }, [] as Array<{ q: string; a: string }>);

  if (fromTable.length > 0) return fromTable;

  const getFaqs = (m: MetadataObj | null | undefined) => {
    if (!m) return null;
    const lp = m.landing_page as MetadataObj | undefined;
    return lp?.faq || lp?.faqs || m.faqs || m.faq || m.FAQs || m.FAQ || m.faq_data || m.curriculum_faqs;
  };

  const items = getFaqs(courseMetadata) || getFaqs(pillarMetadata) || [];
  const list = Array.isArray(items) ? items : [];
  return list.reduce((acc, f: Record<string, string>) => {
    const item = { q: f.q || f.question || f.Question || '', a: f.a || f.answer || f.Answer || '' };
    if (item.q && item.a) acc.push(item);
    return acc;
  }, [] as Array<{ q: string; a: string }>);
}

/**
 * Cached static course landing data. Returns only safe-to-cache fields:
 * title, description, curriculum, FAQs, outcomes, level, thumbnails, pricing display.
 *
 * No user-specific data (entitlement, progress, access, enrollment) is included.
 * Dynamic CTA/enrollment data must be fetched separately.
 */
export async function getCachedCourseLandingStatic(options: {
  collegeSlug: string;
  pillarSlug: string;
  courseId: string;
  isGlobal: boolean;
  collegeId: string | null;
  explicitVariantId?: string | null;
}): Promise<CachedCourseLandingStatic | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag(`course:${options.courseId}:landing`);

  const { pillarSlug, courseId, isGlobal, explicitVariantId: _explicitVariantId } = options;
  const sb = createAdminClient();

  // Resolve pillar
  const isVirtualBuilder = pillarSlug === 'bootcamp';
  const isVirtualFreeCourses = pillarSlug === 'free-courses';
  let pillar: { id: string; title: string; slug: string; metadata?: MetadataObj | null } | null = null;

  if (isVirtualBuilder) {
    pillar = { id: '__bootcamp__', title: 'Paid Courses', slug: 'bootcamp', metadata: {} };
  } else if (isVirtualFreeCourses) {
    pillar = { id: '__free_courses__', title: 'Free Courses', slug: 'free-courses', metadata: {} };
  } else {
    const { data } = await sb
      .from('master_course_pillars')
      .select('id, title, slug, metadata')
      .eq('slug', pillarSlug)
      .eq('publish_status', 'published')
      .maybeSingle();
    pillar = data as typeof pillar;
  }

  if (!pillar) return null;

  // Resolve course
  const keyLookupQuery = isVirtualBuilder
    ? sb
        .from('master_courses')
        .select('id')
        .eq('publish_status', 'published')
        .or('bootcamp_id.not.is.null,catalog_type.eq.bootcamp')
    : isVirtualFreeCourses
      ? sb
          .from('master_courses')
          .select('id')
          .eq('publish_status', 'published')
          .eq('course_kind', 'free_course')
          .eq(isGlobal ? 'visible_to_global_students' : 'visible_to_college_students', true)
    : sb
        .from('master_courses')
        .select('id')
        .eq('publish_status', 'published')
        .eq('pillar_id', pillar.id)
        .eq(isGlobal ? 'visible_to_global_students' : 'visible_to_college_students', true);

  const { data: courseKeyRow } = await applyMasterCourseKeyFilter(keyLookupQuery, courseId).maybeSingle();
  if (!courseKeyRow?.id) return null;

  const courseSelect =
    'id, code, title, description, short_description, slug, pillar_id, bootcamp_id, is_free, pricing_model, selling_price, currency, publish_status, visible_to_college_students, visible_to_global_students, metadata, show_as_paid_course, catalog_type';

  const { data: courseRow } = await sb
    .from('master_courses')
    .select(courseSelect)
    .eq('id', courseKeyRow.id)
    .maybeSingle();

  if (!courseRow) return null;

  // Determine source type
  const isPaidBuilder = courseRow.catalog_type === 'paid_course_builder' || !!courseRow.bootcamp_id;
  const sourceType: PaidCourseSourceType = isPaidBuilder
    ? 'paid_course_builder'
    : courseRow.show_as_paid_course
      ? 'master_course'
      : 'master_course';

  const effectiveSourceId = courseRow.id as string;
  const effectiveCourseId = courseRow.id as string;

  // Fetch landing metadata, modules, items, and delivery stats in parallel
  const [landingMetaResult, modulesRes, itemsRes, deliveryStatsResult] = await Promise.all([
    sb
      .from('paid_course_landing_metadata')
      .select('id, source_type, source_id, slug, title, subtitle, short_description, description, cover_image_url, thumbnail_url, preview_video_url, level, language, category, tags, best_for, outcomes, what_you_will_learn, included_features, prerequisites, faqs, is_published, is_visible, created_at, updated_at')
      .eq('source_type', sourceType)
      .eq('source_id', effectiveSourceId)
      .maybeSingle(),
    sb.from('master_course_modules')
      .select('id, title, description, master_course_id, sort_order, created_at')
      .eq('master_course_id', effectiveCourseId)
      .eq('publish_status', 'published')
      .eq('visible_to_students', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    sb.from('master_course_items')
      .select('id, module_id, master_course_id, title, description, item_type, publish_status, sort_order, preview_enabled:is_preview, created_at')
      .eq('master_course_id', effectiveCourseId)
      .eq('publish_status', 'published')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    sb
      .from('master_course_delivery_stats')
      .select('module_count, video_count')
      .eq('master_course_id', effectiveCourseId)
      .maybeSingle(),
  ]);

  const landingMeta = (landingMetaResult.data as Record<string, unknown> | null) ?? null;
  const deliveryStats = deliveryStatsResult.data;
  const courseMetadata = courseRow.metadata as MetadataObj | null;

  // Build title, slug, description from landing metadata or course data
  const title = (landingMeta?.title as string)?.trim() || (courseRow.title as string);
  const slug = (landingMeta?.slug as string)?.trim() || (courseRow.slug as string) || courseRow.id;
  const subtitle = (landingMeta?.subtitle as string)?.trim() || null;
  const parsedDescription = parseCourseDescriptionField(courseRow.description as string | null);
  const parsedShortDescription = parseCourseDescriptionField(courseRow.short_description as string | null);
  const shortDescription =
    (landingMeta?.short_description as string)?.trim()
    || parsedShortDescription.text
    || parsedDescription.text
    || subtitle;
  const description = (landingMeta?.description as string) || parsedDescription.text;
  const thumbnailUrl =
    (landingMeta?.thumbnail_url as string)
    || (landingMeta?.cover_image_url as string)
    || (courseMetadata?.thumbnail_url as string)
    || null;
  const coverImageUrl = (landingMeta?.cover_image_url as string) || thumbnailUrl;
  const previewVideoUrl = (landingMeta?.preview_video_url as string)?.trim() || null;
  const level = ((landingMeta?.level as string)?.trim()) || 'Beginner+';
  const isFree = !!(courseRow.is_free || courseRow.pricing_model === 'free');

  const fetchedModules = (modulesRes.data ?? []).toSorted((a, b) => {
    const diff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (diff !== 0) return diff;
    return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
  });
  const moduleIds = new Set(fetchedModules.map((m) => m.id));
  const fetchedItems = (itemsRes.data ?? [])
    .filter((item) => moduleIds.has(item.module_id))
    .toSorted((a, b) => {
      const diff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (diff !== 0) return diff;
      return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
    });

  const modules = fetchedModules.map((mod) => {
    const items = fetchedItems.filter((item) => item.module_id === mod.id);
    return {
      id: mod.id,
      title: mod.title,
      description: mod.description,
      item_count: items.length,
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        preview_enabled: !!(item as { preview_enabled?: boolean }).preview_enabled,
      })),
    };
  });

  const videoCountFromModules = modules.reduce((acc, m) => acc + m.item_count, 0);

  const moduleCount = Number(deliveryStats?.module_count ?? modules.length);
  const videoCount = Number(deliveryStats?.video_count ?? videoCountFromModules);

  // FAQs and static metadata
  const faqs = normalizeFaqs(
    landingMeta as { faqs?: Array<{ question?: string; answer?: string; q?: string; a?: string }> } | null,
    courseMetadata,
    pillar.metadata ?? null,
  );

  // Price display (informational only — checkout must fetch fresh server price)
  const sellingPrice = courseRow.selling_price as number | null;
  const currency = (courseRow.currency as string) ?? 'INR';

  return {
    masterCourseId: courseRow.id as string,
    sourceType,
    sourceId: effectiveSourceId,
    pillarSlug: pillar.slug,
    pillarTitle: pillar.title,
    title,
    slug,
    subtitle,
    shortDescription,
    description,
    coverImageUrl,
    thumbnailUrl,
    previewVideoUrl,
    level,
    isFree,
    moduleCount,
    videoCount,
    modules,
    outcomes: asStringArray(landingMeta?.outcomes),
    whatYouWillLearn: asStringArray(landingMeta?.what_you_will_learn),
    includedFeatures: asStringArray(landingMeta?.included_features),
    bestFor: asStringArray(landingMeta?.best_for),
    prerequisites: asStringArray(landingMeta?.prerequisites),
    faqs,
    fallbackPriceMinor: sellingPrice,
    fallbackCurrency: currency,
    isPublished: courseRow.publish_status === 'published',
    isVisible: true,
  };
}

/** Dynamic CTA data — must be fetched fresh per request. Never cached long-term. */
export interface CourseLandingDynamicCta {
  hasLearningAccess: boolean;
  isProductEnrolled: boolean;
  ctaState: string;
  inclusionMessage: string | undefined;
  progressPercentage: number | null;
  accessExpired: boolean;
  accessSourceLabels: string[] | undefined;
}

/**
 * Resolve dynamic CTA/enrollment data for a course landing page.
 * This data is user-specific and must NOT be cached long-term.
 */
export async function resolveCourseLandingDynamicCta(options: {
  courseId: string;
  sourceType: PaidCourseSourceType;
  sourceId: string;
  studentId: string;
  isGlobal: boolean;
  collegeId: string | null;
}): Promise<CourseLandingDynamicCta> {
  const { courseId, sourceType, sourceId, studentId, isGlobal, collegeId } = options;
  const accessContext = { isGlobal, collegeId };

  const [
    { getPaidProductCtaState },
    { getGlobalCoursePurchaseInfo, getCoursePricePlans },
    { resolveStudentCourseScope },
    { batchCourseProgress },
    { hasExpiredPaidProductEnrollment },
  ] = await Promise.all([
    import('@/lib/services/paid-product-enrollment'),
    import('@/lib/services/global-courses'),
    import('@/lib/services/resolved-course-scope'),
    import('@/lib/services/batch-course-progress'),
    import('@/lib/services/paid-product-enrollment'),
  ]);

  // Fetch CTA state, purchase info, and price plans in parallel
  const [ctaResolution, _purchaseInfo, _pricePlans] = await Promise.all([
    getPaidProductCtaState({
      userId: studentId,
      sourceType,
      sourceId,
      masterCourseId: courseId,
      context: accessContext,
    }),
    getGlobalCoursePurchaseInfo(courseId),
    getCoursePricePlans(courseId).catch(() => []),
  ]);

  let hasLearningAccess = ctaResolution.hasLearningAccess;
  let isProductEnrolled = ctaResolution.isProductEnrolled;
  let inclusionMessage = ctaResolution.inclusionMessage;

  // Resolve scope and catalog visibility
  const _scope = await resolveStudentCourseScope(
    studentId,
    courseId,
    { isGlobal, collegeId },
  );

  // Check for college detail refresh
  if (!isGlobal) {
    const { getStudentCourseDetail } = await import('@/lib/services/student-courses');
    const collegeDetail = await getStudentCourseDetail(
      isGlobal ? '' : (collegeId ?? ''),
      courseId,
    ).catch(() => null);
    if (collegeDetail) {
      const refreshed = await getPaidProductCtaState({
        userId: studentId,
        sourceType,
        sourceId,
        masterCourseId: courseId,
        context: accessContext,
      });
      hasLearningAccess = refreshed.hasLearningAccess;
      isProductEnrolled = refreshed.isProductEnrolled;
      inclusionMessage = refreshed.inclusionMessage;
    }
  }

  // Progress and expired enrollment check
  const [progressMap, accessExpired] = await Promise.all([
    hasLearningAccess
      ? batchCourseProgress(studentId, [courseId])
      : Promise.resolve(new Map()),
    !isProductEnrolled
      ? hasExpiredPaidProductEnrollment({
          userId: studentId,
          sourceType,
          sourceId,
          masterCourseId: courseId,
          context: { collegeId, isGlobal },
        })
      : Promise.resolve(false),
  ]);

  const progressPercentage = hasLearningAccess
    ? (progressMap.get(courseId)?.percentage ?? 0)
    : null;

  // Access source labels
  let _accessSourceLabels: string[] | undefined;
  if (hasLearningAccess) {
    const { buildCourseAccessDisplayMap } = await import('@/lib/services/student-accessible-learning');
    const displayMap = await buildCourseAccessDisplayMap(studentId, collegeId);
    const labels = displayMap.get(courseId)?.sourceLabels;
    if (labels?.length) _accessSourceLabels = labels;
  }

  return {
    hasLearningAccess,
    isProductEnrolled,
    ctaState: ctaResolution.state,
    inclusionMessage,
    progressPercentage,
    accessExpired,
    accessSourceLabels: _accessSourceLabels,
  };
}
