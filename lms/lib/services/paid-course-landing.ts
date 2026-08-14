import 'server-only';

import type { PaidCourseSourceType } from '@/lib/services/paid-course-catalog';
import type { PaidProductCtaState } from '@/lib/services/paid-product-enrollment';
import { parseYouTubeVideoId, youTubeThumbnailUrl } from '@/lib/youtube/parse-video-url';

export interface PaidCourseLandingFaq {
  question: string;
  answer: string;
}

export interface PaidCourseLandingMetadata {
  id: string;
  source_type: PaidCourseSourceType;
  source_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  short_description: string | null;
  description: string | null;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  preview_video_url: string | null;
  level: string | null;
  language: string | null;
  category: string | null;
  tags: string[];
  best_for: string[];
  outcomes: string[];
  what_you_will_learn: string[];
  included_features: string[];
  prerequisites: string[];
  faqs: PaidCourseLandingFaq[];
  is_published: boolean;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaidCourseLandingMetadataInput {
  slug?: string;
  title?: string;
  subtitle?: string | null;
  short_description?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  thumbnail_url?: string | null;
  preview_video_url?: string | null;
  level?: string | null;
  language?: string | null;
  category?: string | null;
  tags?: string[];
  best_for?: string[];
  outcomes?: string[];
  what_you_will_learn?: string[];
  included_features?: string[];
  prerequisites?: string[];
  faqs?: PaidCourseLandingFaq[];
  is_published?: boolean;
  is_visible?: boolean;
}

export interface PaidCoursePricePlanView {
  id: string;
  plan_name: string;
  description: string | null;
  validity_days: number | null;
  price_minor: number;
  currency: string;
  is_default: boolean;
  badge_label?: string | null;
}

export interface PaidCourseLandingModuleItem {
  id: string;
  title: string;
  preview_enabled?: boolean;
}

export interface PaidCourseLandingModule {
  id: string;
  title: string;
  description?: string | null;
  item_count: number;
  items: PaidCourseLandingModuleItem[];
}

/** Normalized view model for PremiumCourseLandingClient + checkout. */
export interface PaidCourseLandingViewModel {
  sourceType: PaidCourseSourceType;
  /** Checkout/payment entity id (master course id or variant id). */
  sourceId: string;
  /** Parent master course id for player URLs and curriculum scope. */
  masterCourseId: string;
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
  level: string | null;
  isFree: boolean;
  moduleCount: number;
  videoCount: number;
  totalDurationSeconds: number;
  modules: PaidCourseLandingModule[];
  outcomes: string[];
  whatYouWillLearn: string[];
  includedFeatures: string[];
  bestFor: string[];
  prerequisites: string[];
  faqs: Array<{ q: string; a: string }>;
  pricePlans: PaidCoursePricePlanView[];
  defaultPricePlan: PaidCoursePricePlanView | null;
  fallbackPriceMinor: number | null;
  fallbackCurrency: string;
  /** Broad learning access (bootcamp, college, purchase, etc.). */
  hasLearningAccess: boolean;
  /** Exact paid product purchase only — use for checkout / "Already Enrolled". */
  isProductEnrolled: boolean;
  /** @deprecated Use hasLearningAccess — kept for callers not yet migrated. */
  isEntitled: boolean;
  ctaState: PaidProductCtaState;
  inclusionMessage?: string;
  progressPercentage: number | null;
  ctaLabel: string;
  accessSourceLabels?: string[];
  accessExpired?: boolean;
  checkoutPayload: {
    sourceType: PaidCourseSourceType;
    sourceId: string;
    pricePlanId?: string;
  };
  /** Shape expected by PremiumCourseLandingClient.detail */
  landingDetail: {
    course: {
      title: string;
      short_description?: string | null;
      is_free?: boolean;
      thumbnail_url?: string;
      level?: string | null;
      faqs: Array<{ q: string; a: string }>;
    };
    entitled: boolean;
    has_learning_access: boolean;
    is_product_enrolled: boolean;
    inclusion_message?: string;
    progress_percentage?: number | null;
    module_count: number;
    video_count: number;
    modules: PaidCourseLandingModule[];
  };
}

type LandingMetadataRow = {
  id: string;
  source_type: PaidCourseSourceType;
  source_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  short_description: string | null;
  description: string | null;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  preview_video_url: string | null;
  level: string | null;
  language: string | null;
  category: string | null;
  tags: string[] | null;
  best_for: string[] | null;
  outcomes: string[] | null;
  what_you_will_learn: string[] | null;
  included_features: string[] | null;
  prerequisites: string[] | null;
  faqs: Array<{ question?: string; answer?: string; q?: string; a?: string }> | null;
  is_published: boolean;
  is_visible: boolean;
};

type MetadataObj = Record<string, unknown> & { [k: string]: MetadataObj | unknown };

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

/** Parse description fields that may be stored as JSON string arrays in Super Admin. */
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
            const trimmed = item.trim();
            if (trimmed.length > 0) acc.push(trimmed);
          }
          return acc;
        }, []);
        if (bulletPoints.length > 0) {
          return { text: bulletPoints.join(' '), bulletPoints };
        }
      }
    } catch {
      // fall through to plain text
    }
  }
  return { text: trimmed, bulletPoints: [] };
}

function normalizeFaqs(
  landingMeta: LandingMetadataRow | null,
  courseMetadata: MetadataObj | null | undefined,
  pillarMetadata: MetadataObj | null | undefined,
  descriptionFaqs: Array<Record<string, string>> | null,
): Array<{ q: string; a: string }> {
  const fromTable = (landingMeta?.faqs ?? []).reduce((acc, f) => {
    const item = { q: f.question ?? f.q ?? '', a: f.answer ?? f.a ?? '' };
    if (item.q && item.a) acc.push(item);
    return acc;
  }, [] as Array<{ q: string; a: string }>);

  const getFaqs = (m: MetadataObj | null | undefined) => {
    if (!m) return null;
    const lp = m.landing_page as MetadataObj | undefined;
    return lp?.faq || lp?.faqs || m.faqs || m.faq || m.FAQs || m.FAQ || m.faq_data || m.curriculum_faqs;
  };

  const raw: Array<{ q: string; a: string }> = fromTable.length > 0
    ? fromTable
    : (() => {
        const items = getFaqs(courseMetadata) || getFaqs(pillarMetadata) || descriptionFaqs || [];
        const list = Array.isArray(items) ? items : [];
        return list.reduce((acc, f: Record<string, string>) => {
          const item = { q: f.q || f.question || f.Question || '', a: f.a || f.answer || f.Answer || '' };
          if (item.q && item.a) acc.push(item);
          return acc;
        }, [] as Array<{ q: string; a: string }>);
      })();

  const defaultFaqs = [
    {
      q: 'Who is this course for?',
      a: 'This course is for students who want structured learning instead of scattered tutorials. The exact level depends on the course difficulty and prerequisites.',
    },
    {
      q: 'Do I need prior experience?',
      a: 'Some courses are beginner-friendly, while others require basic programming knowledge. Check the course details and prerequisites before enrolling.',
    },
    {
      q: 'Will I get lifetime access?',
      a: 'Access depends on the course plan, college eligibility, or enrollment type. Exact access details are shown before enrollment.',
    },
    {
      q: 'Will my progress be tracked?',
      a: 'Yes. Courses inside the LMS include progress tracking, lesson completion, and resume/continue learning support.',
    },
    {
      q: 'Will I get a certificate?',
      a: 'Certificate eligibility depends on the course rules and completion requirements.',
    },
  ];

  const existingQuestions = new Set(raw.map((f) => f.q.toLowerCase().trim()));
  const uniqueDefaults = defaultFaqs.filter((d) => !existingQuestions.has(d.q.toLowerCase().trim()));
  return [...raw, ...uniqueDefaults];
}

export async function resolvePaidCourseLandingData(options: {
  collegeSlug: string;
  pillarSlug: string;
  courseId: string;
  studentId: string | null;
  isGlobal: boolean;
  collegeId: string | null;
  explicitVariantId?: string | null;
}): Promise<PaidCourseLandingViewModel | null> {
  const { collegeSlug, pillarSlug, courseId, studentId, isGlobal, collegeId, explicitVariantId } = options;

  const [
    { createAdminClient },
    { getGlobalCoursePurchaseInfo, getCoursePricePlans },
    { getStudentCourseDetail },
    { getPaidProductCtaState },
    { resolveStudentCourseScope },
    { resolveDiscoverableVariantItemScope },
    { batchCourseProgress },
    {
      LEGACY_BOOTCAMP_PILLAR_SLUG,
      resolvePaidCourseSourceType,
      isPaidCourseBuilderCourse,
      isPaidLandingPubliclyVisible,
    },
    { applyMasterCourseKeyFilter },
  ] = await Promise.all([
    import('@/lib/supabase/admin'),
    import('@/lib/services/global-courses'),
    import('@/lib/services/student-courses'),
    import('@/lib/services/paid-product-enrollment'),
    import('@/lib/services/resolved-course-scope'),
    import('@/lib/services/student-discoverable-catalog'),
    import('@/lib/services/batch-course-progress'),
    import('@/lib/services/paid-course-catalog'),
    import('@/lib/utils/master-course-key'),
  ]);

  const sb = createAdminClient();
  const isVirtualBuilder = pillarSlug === LEGACY_BOOTCAMP_PILLAR_SLUG;

  let pillar: { id: string; title: string; slug: string; metadata?: MetadataObj | null } | null = null;

  if (isVirtualBuilder) {
    pillar = {
      id: '__bootcamp__',
      title: 'Paid Courses',
      slug: LEGACY_BOOTCAMP_PILLAR_SLUG,
      metadata: {},
    };
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

  const courseSelect =
    'id, code, title, description, short_description, slug, pillar_id, bootcamp_id, catalog_type, show_as_paid_course, is_free, pricing_model, selling_price, currency, publish_status, visible_to_college_students, visible_to_global_students, metadata';

  const keyLookupQuery = isVirtualBuilder
    ? sb
        .from('master_courses')
        .select('id')
        .eq('publish_status', 'published')
        .or('bootcamp_id.not.is.null,catalog_type.eq.bootcamp')
    : sb
        .from('master_courses')
        .select('id')
        .eq('publish_status', 'published')
        .eq('pillar_id', pillar.id)
        .eq(isGlobal ? 'visible_to_global_students' : 'visible_to_college_students', true);

  const { data: courseKeyRow } = await applyMasterCourseKeyFilter(keyLookupQuery, courseId).maybeSingle();
  if (!courseKeyRow?.id) return null;

  const { data: courseRow } = await sb
    .from('master_courses')
    .select(courseSelect)
    .eq('id', courseKeyRow.id)
    .maybeSingle();
  if (!courseRow) return null;

  const sourceType = resolvePaidCourseSourceType(courseRow);

  type PaidVariantRow = {
    id: string;
    master_course_id: string;
    title: string;
    slug: string;
    show_as_paid_course: boolean | null;
    selling_price: number | null;
    pricing_model: string | null;
    publish_status: string;
  };

  let paidVariant: PaidVariantRow | null = null;
  if (explicitVariantId) {
    const variantLookup = sb
      .from('course_variants')
      .select('id, master_course_id, title, slug, show_as_paid_course, selling_price, pricing_model, publish_status')
      .eq('master_course_id', courseRow.id)
      .eq('publish_status', 'published');

    const { data: variantById } = await variantLookup.eq('id', explicitVariantId).maybeSingle();
    const { data: variantBySlug } = variantById
      ? { data: variantById }
      : await variantLookup.eq('slug', explicitVariantId).maybeSingle();
    paidVariant = (variantById ?? variantBySlug) as PaidVariantRow | null;
  }

  const isPaidVariantProduct = !!paidVariant?.show_as_paid_course;
  const effectiveSourceType: PaidCourseSourceType = isPaidVariantProduct
    ? 'course_variant'
    : sourceType;
  const effectiveSourceId = isPaidVariantProduct ? paidVariant!.id : (courseRow.id as string);

  const accessContext = { isGlobal, collegeId };
  const earlyIsFree = isPaidVariantProduct && paidVariant
    ? paidVariant.pricing_model === 'free'
    : !!(courseRow.is_free || courseRow.pricing_model === 'free');
  const ctaResolution = studentId
    ? await getPaidProductCtaState({
        userId: studentId,
        sourceType: effectiveSourceType,
        sourceId: effectiveSourceId,
        masterCourseId: courseRow.id as string,
        context: accessContext,
      })
    : {
        state: 'not_purchased' as PaidProductCtaState,
        isProductEnrolled: false,
        hasLearningAccess: false,
        primaryLabel: earlyIsFree ? 'Enroll Free' : 'Enroll Now',
        inclusionMessage: undefined,
      };
  const hasLearningAccessEarly = ctaResolution.hasLearningAccess;
  const isProductEnrolledEarly = ctaResolution.isProductEnrolled;

  if (
    !hasLearningAccessEarly
    && !isProductEnrolledEarly
    && !isPaidCourseBuilderCourse(courseRow)
    && !courseRow.show_as_paid_course
    && !isPaidVariantProduct
    && !courseRow.is_free
    && courseRow.pricing_model !== 'free'
  ) {
    // Non-paid-catalog pillar courses still use this page when navigated from pillars.
  }

  const { data: landingMetaRaw } = await sb
    .from('paid_course_landing_metadata')
    .select('id, source_type, source_id, slug, title, subtitle, short_description, description, cover_image_url, thumbnail_url, preview_video_url, level, language, category, tags, best_for, outcomes, what_you_will_learn, included_features, prerequisites, faqs, is_published, is_visible, created_at, updated_at')
    .eq('source_type', effectiveSourceType)
    .eq('source_id', effectiveSourceId)
    .maybeSingle();

  const landingMeta = landingMetaRaw as LandingMetadataRow | null;

  const { data: landingMetaByType } = landingMeta
    ? { data: landingMeta }
    : effectiveSourceType === sourceType
      ? await sb
          .from('paid_course_landing_metadata')
          .select('id, source_type, source_id, slug, title, subtitle, short_description, description, cover_image_url, thumbnail_url, preview_video_url, level, language, category, tags, best_for, outcomes, what_you_will_learn, included_features, prerequisites, faqs, is_published, is_visible, created_at, updated_at')
          .eq('source_type', sourceType)
          .eq('source_id', courseRow.id)
          .maybeSingle()
      : { data: null };

  const meta = (landingMetaByType ?? landingMeta) as LandingMetadataRow | null;
  const courseMetadata = courseRow.metadata as MetadataObj | null;

  const isPaidCatalogCourse =
    isPaidCourseBuilderCourse(courseRow)
    || !!courseRow.show_as_paid_course
    || isPaidVariantProduct;

  if (
    isPaidCatalogCourse
    && !hasLearningAccessEarly
    && !isProductEnrolledEarly
    && isPaidCourseBuilderCourse(courseRow)
    && meta?.is_visible === false
  ) {
    return null;
  }

  if (
    isPaidCatalogCourse
    && !hasLearningAccessEarly
    && !isProductEnrolledEarly
    && !isPaidCourseBuilderCourse(courseRow)
    && !isPaidLandingPubliclyVisible(meta, {
      hasPaidCatalogFlag: isPaidCatalogCourse,
    })
  ) {
    return null;
  }

  const title = meta?.title?.trim() || paidVariant?.title || (courseRow.title as string);
  const slug = meta?.slug?.trim() || paidVariant?.slug || (courseRow.slug as string) || courseRow.id;
  const subtitle =
    meta?.subtitle?.trim()
    || (((courseMetadata?.landing_page as MetadataObj | undefined)?.hero as MetadataObj | undefined)?.subtitle as string | undefined)
    || null;
  const parsedDescription = parseCourseDescriptionField(courseRow.description as string | null);
  const parsedShortDescription = parseCourseDescriptionField(courseRow.short_description as string | null);
  const descriptionLearningPoints =
    parsedDescription.bulletPoints.length > 0 ? parsedDescription.bulletPoints : parsedShortDescription.bulletPoints;
  const shortDescription =
    meta?.short_description?.trim()
    || parsedShortDescription.text
    || (typeof courseRow.short_description === 'string' && !courseRow.short_description.trim().startsWith('[')
      ? (courseRow.short_description as string)
      : null)
    || parsedDescription.text
    || subtitle;
  const landingHero = (courseMetadata?.landing_page as MetadataObj | undefined)?.hero as MetadataObj | undefined;
  const thumbnailUrl =
    meta?.thumbnail_url
    || meta?.cover_image_url
    || (courseMetadata?.thumbnail_url as string | undefined)
    || (landingHero?.image_url as string | undefined)
    || null;
  const level = meta?.level?.trim() || 'Beginner+';
  const heroShortDescription =
    'Master the core concepts and advanced patterns of this domain with our industry-leading curriculum.';

  let hasLearningAccess = hasLearningAccessEarly;
  let isProductEnrolled = isProductEnrolledEarly;
  let ctaState = ctaResolution.state;
  let inclusionMessage = ctaResolution.inclusionMessage;
  const [purchaseInfo, initialPricePlans] = await Promise.all([
    getGlobalCoursePurchaseInfo(courseRow.id),
    getCoursePricePlans(courseRow.id).catch(() => []),
  ]);
  let pricePlans = initialPricePlans;

  if (isPaidVariantProduct && paidVariant) {
    const { getActivePricePlansForSource } = await import('@/lib/services/course-price-plans');
    const variantPlans = await getActivePricePlansForSource('course_variant', paidVariant.id);
    if (variantPlans.length > 0) {
      pricePlans = variantPlans.map((p) => ({
        id: p.id,
        plan_name: p.plan_name,
        description: p.description,
        validity_days: p.validity_days,
        price_minor: p.price_minor,
        currency: p.currency,
        is_default: p.is_default,
        badge_label: p.badge_label ?? null,
      }));
    }
  } else if (effectiveSourceType === 'paid_course_builder') {
    const { getActivePricePlansForSource } = await import('@/lib/services/course-price-plans');
    const builderPlans = await getActivePricePlansForSource('paid_course_builder', courseRow.id as string);
    if (builderPlans.length > 0) {
      pricePlans = builderPlans.map((p) => ({
        id: p.id,
        plan_name: p.plan_name,
        description: p.description,
        validity_days: p.validity_days,
        price_minor: p.price_minor,
        currency: p.currency,
        is_default: p.is_default,
        badge_label: p.badge_label ?? null,
      }));
    }
  } else if (effectiveSourceType === 'master_course' && courseRow.show_as_paid_course) {
    const { getActivePricePlansForSource } = await import('@/lib/services/course-price-plans');
    const masterPlans = await getActivePricePlansForSource('master_course', courseRow.id as string);
    if (masterPlans.length > 0) {
      pricePlans = masterPlans.map((p) => ({
        id: p.id,
        plan_name: p.plan_name,
        description: p.description,
        validity_days: p.validity_days,
        price_minor: p.price_minor,
        currency: p.currency,
        is_default: p.is_default,
        badge_label: p.badge_label ?? null,
      }));
    }
  }

  const resolvedExplicitVariantId = paidVariant?.id ?? explicitVariantId;

  // Run scope resolution and catalog visibility check in parallel (independent)
  const [catalogVisible, scope] = await Promise.all([
    resolvedExplicitVariantId
      ? resolveDiscoverableVariantItemScope(
          resolvedExplicitVariantId,
          courseRow.id,
          isGlobal ? null : collegeId,
        )
      : Promise.resolve(true),
    resolveStudentCourseScope(
      studentId,
      courseRow.id,
      { isGlobal, collegeId },
      resolvedExplicitVariantId ?? undefined,
    ),
  ]);

  if (!catalogVisible && !isProductEnrolled) return null;

  const variantInfo = scope.scopeType === 'variant' ? scope.variant : null;
  const effectiveCourseId = variantInfo?.masterCourseId ?? courseRow.id;

  let collegeDetail = null;
  if (!isGlobal && studentId) {
    collegeDetail = await getStudentCourseDetail(collegeSlug, effectiveCourseId, {
      variantId: resolvedExplicitVariantId ?? undefined,
    }).catch(() => null);
    if (collegeDetail) {
      const refreshed = await getPaidProductCtaState({
        userId: studentId,
        sourceType: effectiveSourceType,
        sourceId: effectiveSourceId,
        masterCourseId: courseRow.id as string,
        context: accessContext,
      });
      hasLearningAccess = refreshed.hasLearningAccess;
      isProductEnrolled = refreshed.isProductEnrolled;
      ctaState = refreshed.state;
      inclusionMessage = refreshed.inclusionMessage;
    }
  }

  const [modulesRes, itemsRes] = await Promise.all([
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
  ]);

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

  let modules: PaidCourseLandingModule[] = fetchedModules.map((mod) => {
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

  if (variantInfo && variantInfo.variantItemIds.length > 0) {
    const allowed = new Set(variantInfo.variantItemIds);
    modules = modules.reduce((acc, mod) => {
      const filteredItems = mod.items.filter((i) => allowed.has(i.id));
      if (filteredItems.length > 0) {
        acc.push({
          ...mod,
          items: filteredItems,
          item_count: filteredItems.length,
        });
      }
      return acc;
    }, [] as typeof modules);
  }

  if (collegeDetail?.modules?.some((m) => (m.items?.length ?? 0) > 0)) {
    modules = collegeDetail.modules.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      item_count: m.items?.length ?? 0,
      items: (m.items ?? []).map((i) => ({
        id: i.id,
        title: i.title,
        preview_enabled: i.preview_enabled,
      })),
    }));
  }

  const videoCountFromModules = modules.reduce((acc, m) => acc + m.item_count, 0);

  // Pre-import for parallel batch below
  const { hasExpiredPaidProductEnrollment } = await import('@/lib/services/paid-product-enrollment');

  // Run delivery stats, progress, and expired enrollment checks in parallel (independent)
  const [{ data: deliveryStats }, progressMap, accessExpired] = await Promise.all([
    sb
      .from('master_course_delivery_stats')
      .select('module_count, video_count')
      .eq('master_course_id', effectiveCourseId)
      .maybeSingle(),
    hasLearningAccess && studentId
      ? batchCourseProgress(studentId, [effectiveCourseId])
      : Promise.resolve(new Map()),
    !isProductEnrolled && studentId
      ? hasExpiredPaidProductEnrollment({
          userId: studentId,
          sourceType: effectiveSourceType,
          sourceId: effectiveSourceId,
          masterCourseId: courseRow.id as string,
          context: { collegeId, isGlobal },
        })
      : Promise.resolve(false),
  ]);

  const moduleCount = Number(deliveryStats?.module_count ?? modules.length);
  const videoCount = Number(deliveryStats?.video_count ?? videoCountFromModules);
  const progressPercentage = hasLearningAccess
    ? (progressMap.get(effectiveCourseId)?.percentage ?? 0)
    : null;

  const descriptionFaqs = (() => {
    try {
      if (!courseRow.description) return null;
      const parsed = JSON.parse(courseRow.description as string);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        return parsed as Array<Record<string, string>>;
      }
    } catch {
      return null;
    }
    return null;
  })();

  const faqs = normalizeFaqs(meta, courseMetadata, pillar.metadata ?? null, descriptionFaqs);
  const isFree = isPaidVariantProduct && paidVariant
    ? paidVariant.pricing_model === 'free'
    : !!(courseRow.is_free || courseRow.pricing_model === 'free');

  const defaultPlan = pricePlans.find((p) => p.is_default) ?? pricePlans[0] ?? null;
  const variantPurchaseFallback = isPaidVariantProduct && paidVariant?.selling_price
    ? { priceMinor: paidVariant.selling_price, currency: (courseRow.currency as string) ?? 'INR' }
    : null;
  const ctaLabel = hasLearningAccess
    ? (progressPercentage ? 'Continue' : 'Start')
    : (isFree ? 'Enroll Free' : 'Enroll Now');

  let accessSourceLabels: string[] | undefined;
  if (hasLearningAccess && studentId) {
    const { buildCourseAccessDisplayMap } = await import('@/lib/services/student-accessible-learning');
    const displayMap = await buildCourseAccessDisplayMap(studentId, collegeId);
    const labels = displayMap.get(courseRow.id as string)?.sourceLabels;
    if (labels?.length) accessSourceLabels = labels;
  }

  const previewVideoRaw =
    meta?.preview_video_url?.trim()
    || (landingHero?.video_url as string | undefined)?.trim()
    || null;
  const previewVideoId = previewVideoRaw ? parseYouTubeVideoId(previewVideoRaw) : null;
  const previewPosterUrl = previewVideoId ? youTubeThumbnailUrl(previewVideoId) : undefined;

  const metaLearningPoints = asStringArray(meta?.what_you_will_learn);
  const learningPoints = metaLearningPoints.length > 0 ? metaLearningPoints : descriptionLearningPoints;

  const landingDetail = {
    course: {
      title: variantInfo?.displayTitle ?? title,
      short_description: shortDescription?.trim() || heroShortDescription,
      learning_points: learningPoints.length > 0 ? learningPoints : undefined,
      is_free: isFree,
      thumbnail_url: thumbnailUrl ?? undefined,
      preview_video_id: previewVideoId ?? undefined,
      preview_video_url: previewVideoRaw ?? undefined,
      preview_poster_url: previewPosterUrl,
      level,
      faqs,
    },
    entitled: hasLearningAccess,
    has_learning_access: hasLearningAccess,
    is_product_enrolled: isProductEnrolled,
    inclusion_message: inclusionMessage,
    progress_percentage: progressPercentage,
    module_count: moduleCount,
    video_count: videoCount,
    modules,
  };

  return {
    sourceType: effectiveSourceType,
    sourceId: effectiveSourceId,
    masterCourseId: courseRow.id as string,
    pillarSlug: pillar.slug,
    pillarTitle: pillar.title,
    title: variantInfo?.displayTitle ?? title,
    slug,
    subtitle,
    shortDescription,
    description: meta?.description || (courseRow.description as string | null),
    coverImageUrl: meta?.cover_image_url || meta?.thumbnail_url || thumbnailUrl,
    thumbnailUrl,
    previewVideoUrl: previewVideoRaw,
    level,
    isFree,
    moduleCount,
    videoCount,
    totalDurationSeconds: 0,
    modules,
    outcomes: asStringArray(meta?.outcomes),
    whatYouWillLearn: learningPoints,
    includedFeatures: asStringArray(meta?.included_features),
    bestFor: asStringArray(meta?.best_for),
    prerequisites: asStringArray(meta?.prerequisites),
    faqs,
    pricePlans,
    defaultPricePlan: defaultPlan,
    fallbackPriceMinor:
      variantPurchaseFallback?.priceMinor
      ?? purchaseInfo?.priceMinor
      ?? (courseRow.selling_price as number | null),
    fallbackCurrency:
      variantPurchaseFallback?.currency
      ?? purchaseInfo?.currency
      ?? (courseRow.currency as string)
      ?? 'INR',
    hasLearningAccess,
    isProductEnrolled,
    isEntitled: hasLearningAccess,
    ctaState,
    inclusionMessage,
    progressPercentage,
    ctaLabel,
    accessSourceLabels,
    accessExpired,
    checkoutPayload: {
      sourceType: effectiveSourceType,
      sourceId: effectiveSourceId,
      pricePlanId: defaultPlan?.id,
    },
    landingDetail,
  };
}
