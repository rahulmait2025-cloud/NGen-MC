import 'server-only';

import { cache } from 'react';
import { cacheTag, cacheLife } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { normUuid } from '@/lib/utils';
import { isAssignmentActive, isEntitlementActive } from '@/lib/services/access-helpers';
import { listStudentContentEntitlements } from '@/lib/services/course-access-manager';
import { batchCourseProgress } from '@/lib/services/batch-course-progress';
import { buildLearnHref, buildPillarCourseDetailHref } from '@/lib/utils/variant-learn-url';
import { buildBundleLearnHref, isCareerReadinessBundle } from '@/lib/utils/bundle-routes';
import {
  resolveBundleCourseEntriesBatch,
  resolveBundleCurriculum,
  bundleCourseStageLabel,
  type BundleCurriculumCourse,
} from '@/lib/services/bundle-resolver';
import { resolveBundlePricing } from '@/lib/services/bundle-price-plans';
import {
  isBundleVisibleToStudent,
  matchesBundleListSection,
  type BundleListSection,
} from '@/lib/services/bundle-catalog-visibility';
import type { CourseBundlesRow, CatalogVisibilityScope } from '@/types/database';

const BUNDLE_FALLBACK_DESCRIPTION =
  'A guided learning bundle that connects selected courses, practice tasks, milestones, and outcomes inside your NextGen CTO workspace.';

const DEFAULT_PATH_STEPS = [
  { id: 'foundations', title: 'Foundations' },
  { id: 'core-skills', title: 'Core Skills' },
  { id: 'practice', title: 'Practice' },
  { id: 'output', title: 'Output' },
  { id: 'review', title: 'Review' },
  { id: 'continue', title: 'Continue', isFinal: true },
] as const;

const DEFAULT_PHASE = {
  title: 'Laying The Groundwork',
  description:
    'Start by mastering the foundational concepts before moving into complex applications.',
  checklist: [
    'Complete foundational modules',
    'Pass initial knowledge checks',
    'Set up your local environment',
  ],
} as const;

/** Curated section supports 6 total cards: 1 hardcoded Career Readiness + 5 DB curated bundles. */
const MAX_TOTAL_CURATED_CARDS = 6;
export const MAX_DB_CURATED_CARDS = MAX_TOTAL_CURATED_CARDS - 1;
/** Fetch extra curated rows before client-side dedupe + slice. */
const CURATED_FETCH_BUFFER = 10;

export interface DiscoverableBundleCard {
  id: string;
  slug: string;
  title: string;
  description: string;
  courseCount: number;
  priceMinor: number | null;
  currency: string;
  accessLabel: 'Premium' | 'Free' | 'Included' | 'Assigned';
  featured?: boolean;
  badgeLabel?: string;
  badgeVariant?: string;
  highlights?: string[];
  footerNote?: string;
}

export interface BundleConnectedCourse {
  sequence: number;
  id: string;
  title: string;
  shortDescription: string | null;
  pillarSlug: string | null;
  variantId: string | null;
  moduleCount: number;
  lessonCount: number;
  stageLabel: string | null;
  entitled: boolean;
  detailHref: string | null;
  learnHref: string | null;
}

export interface BundleLandingData {
  bundle: {
    id: string;
    slug: string;
    title: string;
    heroTitle: string;
    heroSubtitle: string | null;
    description: string;
    thumbnailUrl: string | null;
    categoryLabel: string;
    badgeLabel: string | null;
    badgeVariant: string | null;
    priceMinor: number | null;
    pricePlanId: string | null;
    discountedPriceMinor: number | null;
    currency: string;
    pricingModel: string | null;
    courseCount: number;
    moduleCount: number;
    lessonCount: number;
    pricePlans: Array<{
      id: string;
      plan_name: string;
      description: string | null;
      validity_days: number | null;
      price_minor: number;
      currency: string;
      is_default: boolean;
      badge_label?: string | null;
    }>;
  };
  access: {
    entitled: boolean;
    assigned: boolean;
    purchasable: boolean;
    isFree: boolean;
    accessExpired: boolean;
    accessLabel: 'Premium' | 'Free' | 'Included' | 'Assigned';
    continueHref: string | null;
  };
  progress: {
    hasRealProgress: boolean;
    percentage: number;
    completedModules: number;
    completedLessons: number;
    totalModules: number;
    totalLessons: number;
    previewLabel: string | null;
  };
  connectedCourses: BundleConnectedCourse[];
  curriculum: BundleCurriculumCourse[];
  outcomes: string[];
  audiencePoints: string[];
  pathSteps: { id: string; title: string; isFinal?: boolean }[];
  phaseDetail: {
    title: string;
    description: string;
    checklist: string[];
  };
  includesInterviewPrep: boolean;
}

function formatAccessLabel(
  entitled: boolean,
  assigned: boolean,
  purchasable: boolean,
  isFree: boolean,
  pricingModel: string | null,
): DiscoverableBundleCard['accessLabel'] {
  if (entitled || assigned) return assigned && !entitled ? 'Assigned' : 'Included';
  if (isFree || pricingModel === 'free' || !purchasable) return 'Free';
  return 'Premium';
}

function parseBundleThumbnail(description: string | null): string | null {
  if (!description) return null;
  try {
    const parsed = JSON.parse(description) as Record<string, unknown>;
    const url = parsed.thumbnail_url ?? parsed.thumbnailUrl;
    return typeof url === 'string' && url.startsWith('/') ? url : null;
  } catch {
    return null;
  }
}

function parseBundleMetadata(description: string | null): Record<string, unknown> | null {
  if (!description) return null;
  try {
    const parsed = JSON.parse(description);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function mapBadgeVariantToAccess(
  variant: string | null | undefined,
): DiscoverableBundleCard['accessLabel'] | undefined {
  switch (variant) {
    case 'free':
      return 'Free';
    case 'included':
      return 'Included';
    case 'assigned':
      return 'Assigned';
    case 'premium':
      return 'Premium';
    default:
      return undefined;
  }
}

async function resolveBundleConnectedCourses(
  bundleId: string,
  collegeSlug: string,
  bundleEntitled: boolean,
  preResolvedEntries?: import('@/lib/services/bundle-resolver').BundleCourseEntry[],
): Promise<BundleConnectedCourse[]> {
  const entries =
    preResolvedEntries ??
    (await resolveBundleCourseEntriesBatch([bundleId])).get(bundleId) ??
    [];

  return entries.map((entry, index) => ({
    sequence: entry.sequence,
    id: entry.courseId,
    title: entry.title,
    shortDescription: entry.shortDescription,
    pillarSlug: entry.pillarSlug,
    variantId: entry.variantId,
    moduleCount: entry.moduleCount,
    lessonCount: entry.lessonCount,
    stageLabel: bundleCourseStageLabel(index),
    entitled: bundleEntitled,
    detailHref:
      entry.pillarSlug != null
        ? buildPillarCourseDetailHref(collegeSlug, entry.pillarSlug, entry.courseId, entry.variantId)
        : null,
    learnHref: bundleEntitled
      ? buildLearnHref(collegeSlug, entry.courseId, { variantId: entry.variantId })
      : null,
  }));
}

const BUNDLE_SELECT_COLUMNS =
  'id, title, slug, code, description, selling_price, discounted_price, pricing_model, publish_status, lifecycle_status, visibility_scope, created_at, landing_card_title, landing_card_description, landing_badge_label, landing_badge_variant, landing_highlights, landing_footer_note, landing_hero_title, landing_hero_subtitle, landing_outcomes, landing_audience_points, show_on_lms_catalog, show_on_lms_curated, curated_sort_order, catalog_sort_order';

const BUNDLE_SELECT_FALLBACK =
  'id, title, slug, code, description, selling_price, discounted_price, pricing_model, publish_status, lifecycle_status, visibility_scope, created_at';

async function loadPublishedBundles(): Promise<CourseBundlesRow[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('course_bundles')
    .select(BUNDLE_SELECT_COLUMNS)
    .eq('publish_status', 'published')
    .eq('lifecycle_status', 'active')
    .limit(100); // #7 Safety cap to prevent unbounded bundle list growth

  if (!error && data?.length) {
    return data as CourseBundlesRow[];
  }

  if (error && process.env.NODE_ENV !== 'production') {
    console.warn('[student-bundles] LMS column query failed, using fallback:', error.message);
  }

  const { data: fallback, error: fallbackError } = await sb
    .from('course_bundles')
    .select(BUNDLE_SELECT_FALLBACK)
    .eq('publish_status', 'published')
    .eq('lifecycle_status', 'active')
    .limit(100); // #7 Safety cap

  if (fallbackError || !fallback?.length) return [];
  return fallback as CourseBundlesRow[];
}

/** DB-driven curated fallback when no bundles are flagged curated. */
export function resolveCuratedBundleFallback(
  curated: DiscoverableBundleCard[],
  catalog: DiscoverableBundleCard[],
  limit = MAX_DB_CURATED_CARDS,
): DiscoverableBundleCard[] {
  if (curated.length > 0) return curated;
  return catalog.slice(0, limit).map((bundle) => ({
    ...bundle,
    featured: true,
    badgeLabel: bundle.badgeLabel ?? 'Bundle',
  }));
}

export const listDiscoverableBundles = cache(
  async (
    collegeSlug: string,
    studentId: string | null,
    collegeId: string | null,
    section: BundleListSection = 'all',
  ): Promise<DiscoverableBundleCard[]> => {
    return listDiscoverableBundlesInner(collegeSlug, studentId, collegeId, section);
  }
);

async function listDiscoverableBundlesInner(
  collegeSlug: string,
  studentId: string | null,
  collegeId: string | null,
  section: BundleListSection,
): Promise<DiscoverableBundleCard[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('bundles', 'entitlements');
  const sb = createAdminClient();
  const bundles = await loadPublishedBundles();
  if (!bundles.length) return [];

    const eligible = bundles.filter((b) => !isCareerReadinessBundle(b));
    if (!eligible.length) return [];

    const bundleIds = eligible.map((b) => b.id);

    const [visibilityRes, entitlements, assignmentsRes] = await Promise.all([
      sb
        .from('course_bundle_visibility_colleges')
        .select('bundle_id, college_id')
        .in('bundle_id', bundleIds),
      studentId
        ? listStudentContentEntitlements(studentId)
        : Promise.resolve([]),
      collegeId
        ? sb
            .from('content_assignments')
            .select('assigned_entity_id, status, start_date, end_date')
            .eq('assignment_type', 'college')
            .eq('target_id', collegeId)
            .eq('assigned_entity_type', 'bundle')
            .eq('status', 'active')
            .in('assigned_entity_id', bundleIds)
        : Promise.resolve({
            data: [] as {
              assigned_entity_id: string;
              status: string;
              start_date: string;
              end_date: string | null;
            }[],
          }),
    ]);

    const collegesByBundle = new Map<string, Set<string>>();
    for (const row of visibilityRes.data ?? []) {
      const bid = row.bundle_id as string;
      if (!collegesByBundle.has(bid)) collegesByBundle.set(bid, new Set());
      collegesByBundle.get(bid)!.add(row.college_id as string);
    }

    const entitledBundleIds = new Set(
      entitlements.reduce((acc, e) => {
        if (e.assigned_entity_type === 'bundle' && e.status === 'active') acc.push(normUuid(e.assigned_entity_id));
        return acc;
      }, [] as string[]),
    );

    const assignedBundleIds = new Set(
      (assignmentsRes.data ?? []).reduce((acc, a) => {
        if (isAssignmentActive(a)) acc.push(normUuid(a.assigned_entity_id as string));
        return acc;
      }, [] as string[]),
    );

    const visibleBundles = eligible.filter((bundle) => {
      const scope = (bundle.visibility_scope ?? 'global') as CatalogVisibilityScope;
      const showOnCurated = bundle.show_on_lms_curated ?? false;
      const showOnCatalog = bundle.show_on_lms_catalog ?? true;
      if (!matchesBundleListSection(section, showOnCurated, showOnCatalog)) return false;
      return isBundleVisibleToStudent(
        scope,
        collegeId,
        collegesByBundle.get(bundle.id) ?? new Set(),
      );
    });

    // Batch-resolve course entries for all visible bundles upfront (eliminates N+1)
    const visibleBundleIds = visibleBundles.map((b) => b.id);
    const bundleEntriesMap = await resolveBundleCourseEntriesBatch(visibleBundleIds);

    const cards = await Promise.all(
      visibleBundles.map(async (bundle) => {
        const entitled = entitledBundleIds.has(normUuid(bundle.id));
        const assigned = assignedBundleIds.has(normUuid(bundle.id));
        let pricing: Awaited<ReturnType<typeof resolveBundlePricing>>;
        try {
          pricing = await resolveBundlePricing(
            bundle.id,
            bundle.pricing_model,
            bundle.selling_price,
          );
        } catch (pricingError) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[student-bundles] pricing resolve failed:', bundle.id, pricingError);
          }
          pricing = {
            priceMinor: bundle.selling_price,
            currency: 'INR',
            pricePlanId: null,
            validityDays: null,
            isFree: bundle.pricing_model === 'free' || !bundle.selling_price,
            isPurchasable: !!(bundle.selling_price && bundle.selling_price > 0),
            plans: [],
          };
        }
        let courseCount = 0;
        try {
          courseCount = (bundleEntriesMap.get(bundle.id) ?? []).length;
        } catch {
          courseCount = 0;
        }
        const meta = parseBundleMetadata(bundle.description);
        const plainDescription =
          bundle.landing_card_description?.trim()
          || (meta?.summary && typeof meta.summary === 'string' ? meta.summary : null)
          || (typeof bundle.description === 'string' && !bundle.description.trim().startsWith('{')
            ? bundle.description
            : BUNDLE_FALLBACK_DESCRIPTION);

        const highlights = parseStringArray(bundle.landing_highlights).slice(0, 3);
        const badgeFromMeta = mapBadgeVariantToAccess(bundle.landing_badge_variant);

        return {
          id: bundle.id,
          slug: bundle.slug,
          title: bundle.landing_card_title?.trim() || bundle.title,
          description: plainDescription,
          courseCount,
          priceMinor: pricing.priceMinor,
          currency: pricing.currency,
          accessLabel: formatAccessLabel(
            entitled,
            assigned,
            pricing.isPurchasable,
            pricing.isFree,
            bundle.pricing_model,
          ),
          featured: section === 'curated',
          badgeLabel: bundle.landing_badge_label?.trim() || 'Bundle',
          badgeVariant: bundle.landing_badge_variant ?? undefined,
          highlights: highlights.length > 0 ? highlights : undefined,
          footerNote: bundle.landing_footer_note?.trim() || undefined,
          _sortCurated: bundle.curated_sort_order ?? 9999,
          _sortCatalog: bundle.catalog_sort_order ?? 9999,
          _createdAt: bundle.created_at,
          _badgeOverride: badgeFromMeta,
        };
      }),
    );

    const sorted = cards.toSorted((a, b) => {
      if (section === 'curated') {
        if (a._sortCurated !== b._sortCurated) return a._sortCurated - b._sortCurated;
        const aCreated = new Date(a._createdAt).getTime();
        const bCreated = new Date(b._createdAt).getTime();
        if (bCreated !== aCreated) return bCreated - aCreated;
        return a.title.localeCompare(b.title);
      }
      if (a._sortCatalog !== b._sortCatalog) return a._sortCatalog - b._sortCatalog;
      return a.title.localeCompare(b.title);
    });

    const mapped = sorted.map(({ _sortCurated, _sortCatalog, _createdAt, _badgeOverride, ...card }) => ({
      ...card,
      accessLabel: _badgeOverride ?? card.accessLabel,
    }));

    if (section === 'curated') {
      return mapped.slice(0, CURATED_FETCH_BUFFER);
    }

    return mapped;
  }

export async function loadBundleLandingData(
  collegeSlug: string,
  bundleSlugOrId: string,
  studentId: string | null,
  collegeId: string | null,
): Promise<BundleLandingData | null> {
  const sb = createAdminClient();
  const isUuid = /^[0-9a-f-]{36}$/i.test(bundleSlugOrId);

  let query = sb
    .from('course_bundles')
    .select(BUNDLE_SELECT_COLUMNS)
    .eq('publish_status', 'published')
    .eq('lifecycle_status', 'active');

  query = isUuid ? query.eq('id', bundleSlugOrId) : query.eq('slug', bundleSlugOrId);

  const { data: bundle, error } = await query.maybeSingle();
  if (error || !bundle) return null;

  const row = bundle as CourseBundlesRow;
  if (isCareerReadinessBundle(row)) return null;

  const scope = (row.visibility_scope ?? 'global') as CatalogVisibilityScope;
  if (scope === 'selected_colleges' && collegeId) {
    const { data: mapping } = await sb
      .from('course_bundle_visibility_colleges')
      .select('college_id')
      .eq('bundle_id', row.id)
      .eq('college_id', collegeId)
      .maybeSingle();
    if (!mapping) return null;
  } else if (scope === 'private') {
    return null;
  }

  const meta = parseBundleMetadata(row.description);
  const plainDescription =
    row.landing_card_description?.trim()
    || (meta?.summary && typeof meta.summary === 'string' ? meta.summary : null)
    || (typeof row.description === 'string' && !row.description.trim().startsWith('{')
      ? row.description
      : BUNDLE_FALLBACK_DESCRIPTION);

  const [entitlements, assignmentsRes, pricing] = await Promise.all([
    studentId ? listStudentContentEntitlements(studentId) : Promise.resolve([]),
    (collegeId && studentId)
      ? sb
          .from('content_assignments')
          .select('id, status, start_date, end_date')
          .eq('assignment_type', 'college')
          .eq('target_id', collegeId)
          .eq('assigned_entity_type', 'bundle')
          .eq('assigned_entity_id', row.id)
          .eq('status', 'active')
          .maybeSingle()
      : Promise.resolve({ data: null }),
    resolveBundlePricing(row.id, row.pricing_model, row.selling_price),
  ]);

  const entitled = entitlements.some(
    (e) =>
      e.assigned_entity_type === 'bundle'
      && normUuid(e.assigned_entity_id) === normUuid(row.id)
      && e.status === 'active'
      && isEntitlementActive(e),
  );
  const hadBundleEntitlement = entitlements.some(
    (e) =>
      e.assigned_entity_type === 'bundle'
      && normUuid(e.assigned_entity_id) === normUuid(row.id),
  );
  const accessExpired = hadBundleEntitlement && !entitled;
  const assigned = !!(assignmentsRes.data && isAssignmentActive(assignmentsRes.data));

  const [connectedCourses, curriculum] = await Promise.all([
    resolveBundleConnectedCourses(row.id, collegeSlug, entitled),
    resolveBundleCurriculum(row.id, entitled),
  ]);

  const courseIds = connectedCourses.map((c) => c.id);
  let progressPercentage = 0;
  let completedLessons = 0;
  let totalLessons = connectedCourses.reduce((sum, c) => sum + c.lessonCount, 0);
  const totalModules = connectedCourses.reduce((sum, c) => sum + c.moduleCount, 0);

  if (entitled && courseIds.length > 0 && studentId) {
    const progressMap = await batchCourseProgress(studentId, courseIds);
    let completed = 0;
    let total = 0;
    for (const courseId of courseIds) {
      const p = progressMap.get(courseId);
      if (!p) continue;
      completed += p.completed;
      total += p.total;
    }
    completedLessons = completed;
    totalLessons = total || totalLessons;
    progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  const continueHref = entitled || assigned
    ? buildBundleLearnHref(collegeSlug, row.slug)
    : null;

  const pathSteps =
    Array.isArray(meta?.path_steps) && meta.path_steps.length > 0
      ? (meta.path_steps as { id?: string; title: string; isFinal?: boolean }[]).map((step, i) => ({
          id: step.id ?? `step-${i + 1}`,
          title: step.title,
          isFinal: step.isFinal ?? i === (meta.path_steps as unknown[]).length - 1,
        }))
      : DEFAULT_PATH_STEPS.map((s) => ({ ...s }));

  const phaseDetail =
    meta?.phase_detail && typeof meta.phase_detail === 'object'
      ? {
          title:
            typeof (meta.phase_detail as Record<string, unknown>).title === 'string'
              ? ((meta.phase_detail as Record<string, unknown>).title as string)
              : DEFAULT_PHASE.title,
          description:
            typeof (meta.phase_detail as Record<string, unknown>).description === 'string'
              ? ((meta.phase_detail as Record<string, unknown>).description as string)
              : DEFAULT_PHASE.description,
          checklist: Array.isArray((meta.phase_detail as Record<string, unknown>).checklist)
            ? ((meta.phase_detail as Record<string, unknown>).checklist as string[])
            : [...DEFAULT_PHASE.checklist],
        }
      : { ...DEFAULT_PHASE, checklist: [...DEFAULT_PHASE.checklist] };

  const outcomes = parseStringArray(row.landing_outcomes);
  const audiencePoints = parseStringArray(row.landing_audience_points);

  const includesInterviewPrep =
    meta?.includes_interview_prep === true
    || connectedCourses.some((c) => /interview|resume|linkedin/i.test(c.title));

  const purchasable = pricing.isPurchasable && !entitled && !assigned;

  return {
    bundle: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      heroTitle: row.landing_hero_title?.trim() || row.title,
      heroSubtitle: row.landing_hero_subtitle?.trim() || null,
      description: plainDescription,
      thumbnailUrl: parseBundleThumbnail(row.description),
      categoryLabel:
        typeof meta?.category_label === 'string' ? meta.category_label : 'Premium Bundle Path',
      badgeLabel: row.landing_badge_label?.trim() || null,
      badgeVariant: row.landing_badge_variant ?? null,
      priceMinor: pricing.priceMinor,
      pricePlanId: pricing.pricePlanId,
      discountedPriceMinor: row.discounted_price,
      currency: pricing.currency,
      pricingModel: row.pricing_model,
      courseCount: connectedCourses.length,
      moduleCount: totalModules,
      lessonCount: totalLessons,
      pricePlans: pricing.plans.map((p) => ({
        id: p.id,
        plan_name: p.plan_name,
        description: p.description,
        validity_days: p.validity_days,
        price_minor: p.price_minor,
        currency: p.currency,
        is_default: p.is_default,
        badge_label: p.badge_label ?? null,
      })),
    },
    access: {
      entitled,
      assigned,
      purchasable,
      isFree: pricing.isFree,
      accessExpired,
      accessLabel: formatAccessLabel(
        entitled,
        assigned,
        purchasable,
        pricing.isFree,
        row.pricing_model,
      ),
      continueHref,
    },
    progress: {
      hasRealProgress: entitled && progressPercentage > 0,
      percentage: entitled ? progressPercentage : 0,
      completedModules: 0,
      completedLessons,
      totalModules,
      totalLessons,
      previewLabel: entitled ? null : 'Progress Preview',
    },
    connectedCourses,
    curriculum,
    outcomes,
    audiencePoints,
    pathSteps,
    phaseDetail,
    includesInterviewPrep,
  };
}
