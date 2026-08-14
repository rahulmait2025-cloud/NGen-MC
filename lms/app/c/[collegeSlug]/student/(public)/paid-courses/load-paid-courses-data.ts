import 'server-only';

import { unstable_cache } from 'next/cache';
import {
  listCollegeDiscoverableCourses,
  listGlobalDiscoverableCourses,
} from '@/lib/services/global-courses';
import {
  fetchPaidCatalogVariantsForStudent,
  loadEntitledVariantIdsForStudent,
  type GlobalDiscoverableCourse,
} from '@/lib/services/student-discoverable-catalog';
import { getActivePricePlansForSource } from '@/lib/services/course-price-plans';
import { getVariantPurchaseInfo } from '@/lib/services/variant-purchase';
import { listVisiblePillarsForAudience, listVisiblePillarsForStudent } from '@/lib/services/student-courses';
import type { GlobalDiscoverablePillarGroup } from '@/lib/services/global-courses';
import type { MasterCoursePillarsRow } from '@/types/database';
import { listDiscoverableBundles, type DiscoverableBundleCard } from '@/lib/services/student-bundles';
import {
  LEGACY_BOOTCAMP_PILLAR_ID,
  LEGACY_BOOTCAMP_PILLAR_SLUG,
  isPaidCatalogEligible,
  isPaidCatalogPremiumItem,
  isPaidLandingPubliclyVisible,
  paidBuilderPillarPresentation,
  resolvePaidCourseSourceType,
  type PaidCourseSourceType,
} from '@/lib/services/paid-course-catalog';

export type PaidCourseCatalogTab = 'all' | 'bootcamp' | 'paid' | 'free';

export interface PaidCourseCatalogDiscoverableItem {
  kind: 'discoverable';
  catalog_key: string;
  catalog_kind: 'master_course' | 'variant';
  id: string;
  variant_id: string | null;
  title: string;
  description: string | null;
  pillar_id: string | null;
  pillar_title: string;
  pillar_slug: string;
  module_count: number;
  video_count: number;
  entitled: boolean;
  is_enrolled: boolean;
  progress_percentage: number | null;
  is_free: boolean;
  pricing_model: string | null;
  selling_price: number | null;
  currency: string | null;
  show_as_paid_course: boolean;
  paid_source_type: PaidCourseSourceType;
  tab: PaidCourseCatalogTab;
  thumbnailUrl: string | null;
}

export interface PaidCourseCatalogYouTubeItem {
  kind: 'youtube';
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoCount?: number;
  playlistId: string;
  tab: 'free';
}

export type PaidCourseCatalogItem = PaidCourseCatalogDiscoverableItem | PaidCourseCatalogYouTubeItem;

export interface PaidCourseCatalogPillarGroup {
  pillar: Pick<MasterCoursePillarsRow, 'id' | 'title' | 'slug' | 'short_description' | 'description'>;
  courses: PaidCourseCatalogDiscoverableItem[];
}

export interface PaidCourseCatalogData {
  pillarGroups: PaidCourseCatalogPillarGroup[];
  discoverableItems: PaidCourseCatalogDiscoverableItem[];
  youtubeItems: PaidCourseCatalogYouTubeItem[];
  allItems: PaidCourseCatalogItem[];
  bundles: DiscoverableBundleCard[];
  loadError?: string;
}

export const EMPTY_PAID_COURSE_CATALOG: PaidCourseCatalogData = {
  pillarGroups: [],
  discoverableItems: [],
  youtubeItems: [],
  allItems: [],
  bundles: [],
};

const IS_DEV = process.env.NODE_ENV !== 'production';

type PaidCatalogDebugStage = 'publication' | 'visibility' | 'paid eligibility' | 'landing visibility' | 'pricing';

function logPaidCatalogStage(stage: PaidCatalogDebugStage, rows: number): void {
  if (!IS_DEV) return;
  console.info('[paid-catalog] stage', { stage, rows });
}

function logPaidCatalogRemoved(
  stage: PaidCatalogDebugStage,
  item: Pick<PaidCourseCatalogDiscoverableItem, 'catalog_key' | 'title'>,
  reason: string,
): void {
  if (!IS_DEV) return;
  console.info('[paid-catalog] removed', {
    stage,
    catalogKey: item.catalog_key,
    title: item.title,
    reason,
  });
}

function logSupabaseQueryError(scope: string, error: unknown): void {
  if (!IS_DEV || !error) return;
  console.warn('[paid-catalog] Supabase query failed:', { scope, error });
}

function classifyDiscoverableTab(
  course: GlobalDiscoverablePillarGroup['courses'][number],
): PaidCourseCatalogTab {
  if (course.is_free || course.pricing_model === 'free') {
    return 'free';
  }
  if (course.catalog_kind === 'variant') {
    return 'bootcamp';
  }
  return 'paid';
}

function mapGroups(
  groups: GlobalDiscoverablePillarGroup[],
): {
  pillarGroups: PaidCourseCatalogPillarGroup[];
  discoverableItems: PaidCourseCatalogDiscoverableItem[];
} {
  const discoverableItems: PaidCourseCatalogDiscoverableItem[] = [];
  const pillarGroups: PaidCourseCatalogPillarGroup[] = groups.map((group) => {
    const courses = group.courses.map((course) => {
      const item: PaidCourseCatalogDiscoverableItem = {
        kind: 'discoverable',
        catalog_key: course.catalog_key,
        catalog_kind: course.catalog_kind,
        id: course.id,
        variant_id: course.variant_id,
        title: course.title,
        description: course.short_description?.trim() || course.description?.trim() || null,
        pillar_id: group.pillar.id,
        pillar_title: group.pillar.title,
        pillar_slug: group.pillar.slug,
        module_count: course.module_count,
        video_count: course.video_count,
        entitled: course.entitled,
        is_enrolled: course.is_enrolled,
        progress_percentage: course.progress_percentage,
        is_free: course.is_free,
        pricing_model: course.pricing_model,
        selling_price: course.selling_price ?? null,
        currency: course.currency ?? null,
        show_as_paid_course: course.show_as_paid_course,
        paid_source_type: course.paid_source_type,
        tab: classifyDiscoverableTab(course),
        thumbnailUrl: course.thumbnail_url ?? null,
      };
      discoverableItems.push(item);
      return item;
    });
    return { pillar: group.pillar, courses };
  });

  return { pillarGroups, discoverableItems };
}

export async function loadPaidCatalogDiscoverableItemsFromGroups(
  groups: GlobalDiscoverablePillarGroup[],
  visiblePillars: MasterCoursePillarsRow[],
  options?: {
    isGlobal: boolean;
    collegeId: string | null;
    studentId?: string;
  },
): Promise<{
  pillarGroups: PaidCourseCatalogPillarGroup[];
  discoverableItems: PaidCourseCatalogDiscoverableItem[];
}> {
  const groupPillarIds = new Set(groups.map((g) => g.pillar.id));
  const extraPillarGroups: GlobalDiscoverablePillarGroup[] = visiblePillars.reduce((acc, p) => {
    if (!groupPillarIds.has(p.id)) {
      acc.push({
        pillar: {
          id: p.id,
          title: p.title,
          description: p.description,
          short_description: p.short_description,
          slug: p.slug,
        },
        courses: [],
      });
    }
    return acc;
  }, [] as GlobalDiscoverablePillarGroup[]);

  const { pillarGroups: rawPillarGroups, discoverableItems: rawDiscoverableItems } = mapGroups([
    ...groups,
    ...extraPillarGroups,
  ]);

  const { pillarGroups: mergedPillarGroups, discoverableItems: mergedDiscoverableItems } =
    options?.studentId
      ? await mergePaidCatalogVariantSupplement(
          rawPillarGroups,
          rawDiscoverableItems,
          visiblePillars,
          { ...options, studentId: options.studentId },
        )
      : { pillarGroups: rawPillarGroups, discoverableItems: rawDiscoverableItems };

  const afterEligibility = filterPaidCatalogDiscoverableItems(mergedDiscoverableItems);
  logPaidCatalogStage('paid eligibility', afterEligibility.length);
  const afterMetadata = await applyPaidCatalogLandingVisibility(afterEligibility);
  logPaidCatalogStage('landing visibility', afterMetadata.length);
  const discoverableItems = await applyPaidCatalogActivePriceFilter(afterMetadata, options?.collegeId ?? null);
  logPaidCatalogStage('pricing', discoverableItems.length);
  const visibleIds = new Set(discoverableItems.map((item) => item.catalog_key));
  const pillarGroups: PaidCourseCatalogPillarGroup[] = mergedPillarGroups.reduce((acc, group) => {
    const filteredCourses = group.courses.filter((course) => visibleIds.has(course.catalog_key));
    if (filteredCourses.length > 0) {
      acc.push({
        ...group,
        courses: filteredCourses,
      });
    }
    return acc;
  }, [] as PaidCourseCatalogPillarGroup[]);

  return { pillarGroups, discoverableItems };
}

function mapCourseToPaidCatalogItem(
  course: GlobalDiscoverableCourse,
  pillar: PaidCourseCatalogPillarGroup['pillar'],
): PaidCourseCatalogDiscoverableItem {
  return {
    kind: 'discoverable',
    catalog_key: course.catalog_key,
    catalog_kind: course.catalog_kind,
    id: course.id,
    variant_id: course.variant_id,
    title: course.title,
    description: course.short_description?.trim() || course.description?.trim() || null,
    pillar_id: pillar.id,
    pillar_title: pillar.title,
    pillar_slug: pillar.slug,
    module_count: course.module_count,
    video_count: course.video_count,
    entitled: course.entitled,
    is_enrolled: course.is_enrolled,
    progress_percentage: course.progress_percentage,
    is_free: course.is_free,
    pricing_model: course.pricing_model,
    selling_price: course.selling_price ?? null,
    currency: course.currency ?? null,
    show_as_paid_course: course.show_as_paid_course,
    paid_source_type: course.paid_source_type,
    tab: classifyDiscoverableTab(course),
    thumbnailUrl: course.thumbnail_url ?? null,
  };
}

async function mergePaidCatalogVariantSupplement(
  rawPillarGroups: PaidCourseCatalogPillarGroup[],
  rawDiscoverableItems: PaidCourseCatalogDiscoverableItem[],
  visiblePillars: MasterCoursePillarsRow[],
  options: {
    isGlobal: boolean;
    collegeId: string | null;
    studentId: string;
  },
): Promise<{
  pillarGroups: PaidCourseCatalogPillarGroup[];
  discoverableItems: PaidCourseCatalogDiscoverableItem[];
}> {
  const publishedPillarIds = new Set(visiblePillars.map((p) => p.id));
  if (publishedPillarIds.size === 0) {
    return { pillarGroups: rawPillarGroups, discoverableItems: rawDiscoverableItems };
  }

  const entitledVariantIds = await loadEntitledVariantIdsForStudent(options.studentId);
  const paidVariants = await fetchPaidCatalogVariantsForStudent({
    collegeId: options.isGlobal ? null : options.collegeId,
    publishedPillarIds,
    entitledVariantIds,
    studentId: options.studentId,
  });

  const pillarLookup = new Map<string, PaidCourseCatalogPillarGroup['pillar']>();
  for (const group of rawPillarGroups) {
    pillarLookup.set(group.pillar.id, group.pillar);
  }
  for (const pillar of visiblePillars) {
    if (!pillarLookup.has(pillar.id)) {
      pillarLookup.set(pillar.id, {
        id: pillar.id,
        title: pillar.title,
        slug: pillar.slug,
        short_description: pillar.short_description,
        description: pillar.description,
      });
    }
  }

  const pillarGroups = rawPillarGroups.map((group) => ({
    ...group,
    courses: [...group.courses],
  }));
  const pillarGroupById = new Map<string, typeof pillarGroups[number]>();
  for (const group of pillarGroups) {
    pillarGroupById.set(group.pillar.id, group);
  }
  const discoverableItems = [...rawDiscoverableItems];
  const existingKeys = new Set(discoverableItems.map((item) => item.catalog_key));

  for (const course of paidVariants) {
    if (!course.pillar_id || existingKeys.has(course.catalog_key)) continue;
    const pillar = pillarLookup.get(course.pillar_id);
    if (!pillar) continue;

    const item = mapCourseToPaidCatalogItem(course, pillar);
    discoverableItems.push(item);
    existingKeys.add(course.catalog_key);

    const group = pillarGroupById.get(course.pillar_id);
    if (group) {
      group.courses.push(item);
    } else {
      const newGroup = { pillar, courses: [item] };
      pillarGroups.push(newGroup);
      pillarGroupById.set(course.pillar_id, newGroup);
    }
  }

  return { pillarGroups, discoverableItems };
}

type PaidCatalogPriceKey = {
  sourceType: PaidCourseSourceType;
  sourceId: string;
  masterCourseId: string;
};

function paidCatalogPriceKey(item: PaidCourseCatalogDiscoverableItem): PaidCatalogPriceKey | null {
  if (item.catalog_kind === 'variant' && item.variant_id) {
    return { sourceType: 'course_variant', sourceId: item.variant_id, masterCourseId: item.id };
  }
  if (item.paid_source_type === 'paid_course_builder') {
    return { sourceType: 'paid_course_builder', sourceId: item.id, masterCourseId: item.id };
  }
  if (item.paid_source_type === 'master_course') {
    return { sourceType: 'master_course', sourceId: item.id, masterCourseId: item.id };
  }
  return null;
}

function isPaidCatalogPaidOnlyItem(
  item: Pick<PaidCourseCatalogDiscoverableItem, 'is_free' | 'pricing_model' | 'tab'>,
): boolean {
  return !item.is_free && item.pricing_model !== 'free' && item.tab !== 'free';
}

type LandingVisibilityRow = {
  source_type: string;
  source_id: string;
  is_published: boolean;
  is_visible: boolean;
};

const fetchLandingMetadataCached = unstable_cache(
  async (sortedMasterIds: string[], sortedVariantIds: string[]): Promise<LandingVisibilityRow[]> => {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const sb = createAdminClient();
    const metaQueries = [];
    if (sortedMasterIds.length > 0) {
      metaQueries.push(
        sb
          .from('paid_course_landing_metadata')
          .select('source_type, source_id, is_published, is_visible')
          .in('source_id', sortedMasterIds)
          .in('source_type', ['master_course', 'paid_course_builder']),
      );
    }
    if (sortedVariantIds.length > 0) {
      metaQueries.push(
        sb
          .from('paid_course_landing_metadata')
          .select('source_type, source_id, is_published, is_visible')
          .in('source_id', sortedVariantIds)
          .eq('source_type', 'course_variant'),
      );
    }
    const metaResults = await Promise.all(metaQueries);
    const rows: LandingVisibilityRow[] = [];
    for (const result of metaResults) {
      if (result.data) {
        rows.push(...(result.data as LandingVisibilityRow[]));
      }
    }
    return rows;
  },
  ['landing-metadata-by-ids'],
  { revalidate: 60, tags: ['landing-metadata'] }
);

async function hasActivePaidCatalogPrice(
  item: PaidCourseCatalogDiscoverableItem,
  collegeId: string | null,
): Promise<boolean> {
  const key = paidCatalogPriceKey(item);
  if (!key) return false;

  if (key.sourceType === 'course_variant') {
    const purchaseInfo = await getVariantPurchaseInfo(key.sourceId, key.masterCourseId, collegeId);
    return !!purchaseInfo;
  }

  const plans = await getActivePricePlansForSource(key.sourceType, key.sourceId);
  if (plans.length > 0) return true;

  return typeof item.selling_price === 'number' && item.selling_price > 0;
}

/** Sellable paid catalog rows need an active price plan unless already enrolled. */
async function applyPaidCatalogActivePriceFilter(
  items: PaidCourseCatalogDiscoverableItem[],
  collegeId: string | null,
): Promise<PaidCourseCatalogDiscoverableItem[]> {
  const paidItems = items.filter(isPaidCatalogPaidOnlyItem);
  const needsPrice = paidItems.filter((item) => !item.is_enrolled);
  if (needsPrice.length === 0) return paidItems;

  const priced = new Map<string, boolean>();
  await Promise.all(needsPrice.map(async (item) => {
    priced.set(item.catalog_key, await hasActivePaidCatalogPrice(item, collegeId));
  }));

  return paidItems.filter((item) => {
    if (item.is_enrolled) return true;
    const keep = priced.get(item.catalog_key) === true;
    if (!keep) {
      logPaidCatalogRemoved('pricing', item, 'no active price plan or supported legacy selling price');
    }
    return keep;
  });
}

export async function loadPaidCoursesData(
  collegeSlug: string,
  isGlobal: boolean,
  studentId?: string,
  collegeId?: string | null,
): Promise<PaidCourseCatalogData> {
  try {
    return await loadPaidCoursesDataInner(collegeSlug, isGlobal, studentId, collegeId);
  } catch (error) {
    console.error('[paid-catalog] loadPaidCoursesData failed:', error);
    return {
      ...EMPTY_PAID_COURSE_CATALOG,
      loadError: 'Catalog loading failed',
    };
  }
}

async function listPublicPaidDiscoverableCourses(
  _isGlobal: boolean,
): Promise<GlobalDiscoverablePillarGroup[]> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const sb = createAdminClient();

  const [{ data: pillars, error: pillarsError }, { data: courses, error: coursesError }] = await Promise.all([
    sb
      .from('master_course_pillars')
      .select('id, title, description, short_description, slug')
      .eq('publish_status', 'published')
      .order('sort_order', { ascending: true }),
    (() => {
      // Visibility is already gated by publish_status = 'published'.
      // Do NOT filter by visible_to_global_students / visible_to_college_students here
      // because the authenticated path does not apply those filters either, and
      // omitting them ensures paid courses are visible to anonymous / incognito visitors.
      const query = sb
        .from('master_courses')
        .select('id, pillar_id, code, title, description, short_description, slug, is_free, pricing_model, selling_price, currency, course_kind, metadata, show_as_paid_course, catalog_type, bootcamp_id, created_at')
        .eq('publish_status', 'published')
        .or('course_kind.is.null,course_kind.neq.free_course')
        .or('pricing_model.is.null,pricing_model.neq.free')
        .order('created_at', { ascending: true });

      return query;
    })(),
  ]);

  if (pillarsError) {
    logSupabaseQueryError('master_course_pillars public paid catalog', pillarsError);
    throw pillarsError;
  }
  if (coursesError) {
    logSupabaseQueryError('master_courses public paid catalog', coursesError);
    throw coursesError;
  }

  logPaidCatalogStage('publication', courses?.length ?? 0);

  const publishedPillars = pillars ?? [];
  const pillarMap = new Map(publishedPillars.map((pillar) => [pillar.id, pillar]));
  const visibleCourses = (courses ?? []).filter((course) => {
    if (course.is_free || course.pricing_model === 'free' || course.course_kind === 'free_course') return false;
    if (course.catalog_type === 'bootcamp' || course.bootcamp_id) return true;
    return !!course.pillar_id && pillarMap.has(course.pillar_id);
  });
  logPaidCatalogStage('visibility', visibleCourses.length);

  if (visibleCourses.length === 0) return [];

  const courseIds = visibleCourses.map((course) => course.id);
  const [{ data: modules, error: modulesError }, { data: items, error: itemsError }] = await Promise.all([
    sb
      .from('master_course_modules')
      .select('id, master_course_id, publish_status')
      .in('master_course_id', courseIds)
      .eq('publish_status', 'published'),
    sb
      .from('master_course_items')
      .select('id, master_course_id, module_id, item_type, publish_status')
      .in('master_course_id', courseIds)
      .eq('publish_status', 'published'),
  ]);

  if (modulesError) {
    logSupabaseQueryError('master_course_modules public paid catalog', modulesError);
    throw modulesError;
  }
  if (itemsError) {
    logSupabaseQueryError('master_course_items public paid catalog', itemsError);
    throw itemsError;
  }

  const modulesByCourse = new Map<string, number>();
  for (const courseModule of modules ?? []) {
    modulesByCourse.set(courseModule.master_course_id, (modulesByCourse.get(courseModule.master_course_id) ?? 0) + 1);
  }

  const videosByCourse = new Map<string, number>();
  for (const item of items ?? []) {
    if (item.item_type !== 'video') continue;
    videosByCourse.set(item.master_course_id, (videosByCourse.get(item.master_course_id) ?? 0) + 1);
  }

  const grouped = new Map<string, GlobalDiscoverablePillarGroup>();
  const paidBuilderPresentation = paidBuilderPillarPresentation();
  for (const course of visibleCourses) {
    const isPaidBuilder = course.catalog_type === 'bootcamp' || !!course.bootcamp_id;
    const pillar = isPaidBuilder
      ? {
          id: LEGACY_BOOTCAMP_PILLAR_ID,
          title: paidBuilderPresentation.title,
          description: paidBuilderPresentation.description,
          short_description: paidBuilderPresentation.short_description,
          slug: LEGACY_BOOTCAMP_PILLAR_SLUG,
        }
      : course.pillar_id
        ? pillarMap.get(course.pillar_id)
        : null;
    if (!pillar) continue;

    if (!grouped.has(pillar.id)) {
      grouped.set(pillar.id, {
        pillar,
        courses: [],
      });
    }

    grouped.get(pillar.id)!.courses.push({
      catalog_key: `master_course:${course.id}`,
      catalog_kind: 'master_course',
      id: course.id,
      variant_id: null,
      pillar_id: pillar.id,
      code: course.code,
      title: course.title,
      parent_course_title: null,
      description: course.description,
      short_description: course.short_description,
      module_count: modulesByCourse.get(course.id) ?? 0,
      video_count: videosByCourse.get(course.id) ?? 0,
      entitled: false,
      is_enrolled: false,
      progress_percentage: null,
      is_free: !!course.is_free || course.pricing_model === 'free',
      pricing_model: course.pricing_model,
      selling_price: course.selling_price,
      currency: course.currency,
      thumbnail_url:
        ((course.metadata as Record<string, unknown> | null)?.thumbnail_url as string | undefined)
        ?? ((course.metadata as Record<string, unknown> | null)?.youtube_playlist_thumbnail_url as string | undefined)
        ?? null,
      show_as_paid_course: !!course.show_as_paid_course,
      paid_source_type: resolvePaidCourseSourceType(course),
      created_at: course.created_at,
    });
  }

  return Array.from(grouped.values());
}

async function loadPaidCoursesDataInner(
  collegeSlug: string,
  isGlobal: boolean,
  studentId?: string,
  collegeId?: string | null,
): Promise<PaidCourseCatalogData> {
  const [groups, visiblePillars, bundles] = await Promise.all([
    studentId
      ? (isGlobal
          ? listGlobalDiscoverableCourses(collegeSlug)
          : listCollegeDiscoverableCourses(collegeSlug))
      : listPublicPaidDiscoverableCourses(isGlobal),
    studentId
      ? listVisiblePillarsForStudent(collegeSlug)
      : listVisiblePillarsForAudience(isGlobal ? null : collegeId ?? null, isGlobal),
    studentId
      ? listDiscoverableBundles(collegeSlug, studentId, collegeId ?? null).catch(() => [] as DiscoverableBundleCard[])
      : Promise.resolve([] as DiscoverableBundleCard[]),
  ]);

  const paidCatalog = await loadPaidCatalogDiscoverableItemsFromGroups(
    groups,
    visiblePillars,
    {
      isGlobal,
      collegeId: collegeId ?? null,
      studentId,
    },
  );

  return {
    pillarGroups: paidCatalog.pillarGroups,
    discoverableItems: paidCatalog.discoverableItems,
    youtubeItems: [],
    allItems: paidCatalog.discoverableItems,
    bundles,
  };
}

/** Filter discoverable rows for the paid course catalog (all 3 source types). */
function filterPaidCatalogDiscoverableItems(
  items: PaidCourseCatalogDiscoverableItem[],
): PaidCourseCatalogDiscoverableItem[] {
  return items.filter((item) => {
    if (!isPaidCatalogPaidOnlyItem(item)) {
      logPaidCatalogRemoved('paid eligibility', item, 'free catalog item');
      return false;
    }
    if (!isPaidCatalogPremiumItem(item, { isEntitled: item.is_enrolled })) {
      logPaidCatalogRemoved('paid eligibility', item, 'not a premium paid item');
      return false;
    }
    if (item.catalog_kind === 'variant') {
      const keep = isPaidCatalogEligible(
        {
          id: item.id,
          catalog_kind: 'variant',
          variant_id: item.variant_id,
          show_as_paid_course: item.show_as_paid_course,
          paid_source_type: item.paid_source_type,
          pricing_model: item.pricing_model,
        },
        { isEntitled: item.is_enrolled },
      );
      if (!keep) logPaidCatalogRemoved('paid eligibility', item, 'variant is not paid catalog eligible');
      return keep;
    }
    if (item.catalog_kind !== 'master_course') {
      logPaidCatalogRemoved('paid eligibility', item, 'unsupported catalog kind');
      return false;
    }
    const keep = isPaidCatalogEligible(item, { isEntitled: item.is_enrolled }) || isPaidCatalogPaidOnlyItem(item);
    if (!keep) logPaidCatalogRemoved('paid eligibility', item, 'master course is not paid catalog eligible');
    return keep;
  });
}

function landingMetaKey(sourceType: string, sourceId: string): string {
  return `${sourceType}:${sourceId}`;
}

/** Apply paid_course_landing_metadata visibility for non-entitled catalog rows. */
async function applyPaidCatalogLandingVisibility(
  items: PaidCourseCatalogDiscoverableItem[],
): Promise<PaidCourseCatalogDiscoverableItem[]> {
  const eligible = items;
  if (eligible.length === 0) return [];

  const needsMetaCheck = eligible.filter((item) => !item.is_enrolled);
  if (needsMetaCheck.length === 0) return eligible;

  const masterSourceIds = new Set<string>();
  const variantSourceIds = new Set<string>();
  for (const item of needsMetaCheck) {
    if (item.catalog_kind === 'variant' && item.variant_id) {
      variantSourceIds.add(item.variant_id);
    } else {
      masterSourceIds.add(item.id);
    }
  }

  const sortedMaster = Array.from(masterSourceIds).sort();
  const sortedVariant = Array.from(variantSourceIds).sort();

  const metaResults = await fetchLandingMetadataCached(sortedMaster, sortedVariant);
  const metaByKey = new Map<string, LandingVisibilityRow>();
  for (const row of metaResults) {
    metaByKey.set(landingMetaKey(row.source_type, row.source_id), row);
  }

  return eligible.filter((item) => {
    if (item.is_enrolled) return true;

    if (item.paid_source_type === 'paid_course_builder') {
      const metaKey = landingMetaKey('paid_course_builder', item.id);
      const meta = metaByKey.get(metaKey);
      if (meta?.is_visible === false) {
        logPaidCatalogRemoved('landing visibility', item, 'paid-course-builder landing is hidden');
        return false;
      }
      return true;
    }

    const metaKey =
      item.catalog_kind === 'variant' && item.variant_id
        ? landingMetaKey('course_variant', item.variant_id)
        : landingMetaKey(item.paid_source_type, item.id);
    const meta = metaByKey.get(metaKey);
    const hasPaidCatalogFlag =
      item.paid_source_type === 'course_variant'
      || item.show_as_paid_course
      || isPaidCatalogPaidOnlyItem(item);
    const keep = isPaidLandingPubliclyVisible(meta, { hasPaidCatalogFlag });
    if (!keep) logPaidCatalogRemoved('landing visibility', item, 'landing metadata is not publicly visible');
    return keep;
  });
}
