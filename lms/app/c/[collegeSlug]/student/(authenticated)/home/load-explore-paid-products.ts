import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { PaidCourseSourceType } from '@/lib/services/paid-course-catalog';
import { isPaidProductMetadataComplete } from '@/lib/services/paid-product-metadata-validation';
import { buildPillarCourseDetailHref } from '@/lib/utils/variant-learn-url';
import {
  loadPaidCoursesData,
  loadPaidCatalogDiscoverableItemsFromGroups,
  type PaidCourseCatalogDiscoverableItem,
} from '@/app/c/[collegeSlug]/student/(public)/paid-courses/load-paid-courses-data';
import type { GlobalDiscoverablePillarGroup } from '@/lib/services/global-courses';
import type { MasterCoursePillarsRow } from '@/types/database';

export type ExplorePaidProductCard = {
  id: string;
  sourceType: PaidCourseSourceType;
  sourceId: string;
  title: string;
  slug: string | null;
  description: string | null;
  thumbnailImageUrl: string | null;
  coverImageUrl: string | null;
  previewVideoUrl: string | null;
  pillarSlug: string;
  pillarTitle: string;
  moduleCount: number;
  videoCount: number;
  isEnrolled: boolean;
  entitled: boolean;
  progressPercentage: number | null;
  priceMinor: number | null;
  currency: string;
  detailUrl: string;
  masterCourseId: string;
  variantId: string | null;
  catalogKind: 'master_course' | 'variant';
};

type LandingMetaRow = {
  source_type: string;
  source_id: string;
  slug: string | null;
  title: string | null;
  short_description: string | null;
  description: string | null;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  preview_video_url: string | null;
  is_published: boolean;
  is_visible: boolean;
};

type PricePlanRow = {
  source_type: string;
  source_id: string;
  price_minor: number;
  currency: string;
  is_default: boolean;
  sort_order: number;
};

function landingMetaKey(sourceType: string, sourceId: string): string {
  return `${sourceType}:${sourceId}`;
}

function resolvePaidSource(item: PaidCourseCatalogDiscoverableItem): {
  sourceType: PaidCourseSourceType;
  sourceId: string;
} {
  if (item.catalog_kind === 'variant' && item.variant_id) {
    return { sourceType: 'course_variant', sourceId: item.variant_id };
  }
  return { sourceType: item.paid_source_type, sourceId: item.id };
}

function resolvePaidCardImages(
  item: PaidCourseCatalogDiscoverableItem,
  meta: LandingMetaRow | null,
): { thumbnailImageUrl: string | null; coverImageUrl: string | null } {
  const paidEnabled =
    item.show_as_paid_course
    || item.paid_source_type === 'paid_course_builder'
    || item.paid_source_type === 'course_variant';

  const thumbnailImageUrl =
    meta?.thumbnail_url?.trim()
    || meta?.cover_image_url?.trim()
    || (paidEnabled ? item.thumbnailUrl?.trim() || null : null);

  const coverImageUrl =
    meta?.cover_image_url?.trim()
    || meta?.thumbnail_url?.trim()
    || null;

  return { thumbnailImageUrl, coverImageUrl };
}

function buildExploreDetailUrl(
  collegeSlug: string,
  item: PaidCourseCatalogDiscoverableItem,
): string {
  const variantParam = item.catalog_kind === 'variant' ? item.variant_id : null;
  return buildPillarCourseDetailHref(collegeSlug, item.pillar_slug, item.id, variantParam);
}

async function batchLoadLandingMetadata(
  items: PaidCourseCatalogDiscoverableItem[],
): Promise<Map<string, LandingMetaRow>> {
  const masterSourceIds = new Set<string>();
  const variantSourceIds = new Set<string>();
  const builderSourceIds = new Set<string>();

  for (const item of items) {
    if (item.paid_source_type === 'paid_course_builder') {
      builderSourceIds.add(item.id);
      continue;
    }
    if (item.catalog_kind === 'variant' && item.variant_id) {
      variantSourceIds.add(item.variant_id);
      continue;
    }
    masterSourceIds.add(item.id);
  }

  const sb = createAdminClient();
  const queries = [];

  if (masterSourceIds.size > 0) {
    queries.push(
      sb
        .from('paid_course_landing_metadata')
        .select(
          'source_type, source_id, slug, title, short_description, description, cover_image_url, thumbnail_url, preview_video_url, is_published, is_visible',
        )
        .in('source_id', Array.from(masterSourceIds))
        .in('source_type', ['master_course', 'paid_course_builder']),
    );
  }
  if (variantSourceIds.size > 0) {
    queries.push(
      sb
        .from('paid_course_landing_metadata')
        .select(
          'source_type, source_id, slug, title, short_description, description, cover_image_url, thumbnail_url, preview_video_url, is_published, is_visible',
        )
        .in('source_id', Array.from(variantSourceIds))
        .eq('source_type', 'course_variant'),
    );
  }
  if (builderSourceIds.size > 0) {
    queries.push(
      sb
        .from('paid_course_landing_metadata')
        .select(
          'source_type, source_id, slug, title, short_description, description, cover_image_url, thumbnail_url, preview_video_url, is_published, is_visible',
        )
        .in('source_id', Array.from(builderSourceIds))
        .eq('source_type', 'paid_course_builder'),
    );
  }

  const metaByKey = new Map<string, LandingMetaRow>();
  const results = await Promise.all(queries);
  for (const result of results) {
    if (result.error) continue;
    for (const row of (result.data ?? []) as LandingMetaRow[]) {
      metaByKey.set(landingMetaKey(row.source_type, row.source_id), row);
    }
  }
  return metaByKey;
}

async function batchLoadDefaultPrices(
  items: PaidCourseCatalogDiscoverableItem[],
): Promise<Map<string, { priceMinor: number; currency: string }>> {
  const byType = new Map<PaidCourseSourceType, Set<string>>();
  for (const item of items) {
    const { sourceType, sourceId } = resolvePaidSource(item);
    if (!byType.has(sourceType)) byType.set(sourceType, new Set());
    byType.get(sourceType)!.add(sourceId);
  }

  const sb = createAdminClient();
  const priceByKey = new Map<string, { priceMinor: number; currency: string }>();
  const queries = Array.from(byType.entries()).map(([sourceType, ids]) =>
    sb
      .from('course_price_plans')
      .select('source_type, source_id, price_minor, currency, is_default, sort_order')
      .eq('source_type', sourceType)
      .in('source_id', Array.from(ids))
      .eq('is_active', true),
  );

  const results = await Promise.all(queries);
  const plansByKey = new Map<string, PricePlanRow[]>();
  for (const result of results) {
    if (result.error) continue;
    for (const row of (result.data ?? []) as PricePlanRow[]) {
      const key = landingMetaKey(row.source_type, row.source_id);
      plansByKey.set(key, [...(plansByKey.get(key) ?? []), row]);
    }
  }

  for (const [key, plans] of plansByKey) {
    const sorted = plans.toSorted((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.price_minor - b.price_minor;
    });
    const defaultPlan = sorted[0];
    if (defaultPlan) {
      priceByKey.set(key, {
        priceMinor: defaultPlan.price_minor,
        currency: defaultPlan.currency || 'INR',
      });
    }
  }

  return priceByKey;
}

function resolveMetaForItem(
  item: PaidCourseCatalogDiscoverableItem,
  metaByKey: Map<string, LandingMetaRow>,
): LandingMetaRow | null {
  if (item.paid_source_type === 'paid_course_builder') {
    return metaByKey.get(landingMetaKey('paid_course_builder', item.id)) ?? null;
  }
  if (item.catalog_kind === 'variant' && item.variant_id) {
    return metaByKey.get(landingMetaKey('course_variant', item.variant_id)) ?? null;
  }
  return (
    metaByKey.get(landingMetaKey('master_course', item.id))
    ?? metaByKey.get(landingMetaKey(item.paid_source_type, item.id))
    ?? null
  );
}

/**
 * Explore / landing premium cards — only paid-product eligible sources with
 * complete metadata and (for sellable rows) an active default price plan.
 */
export async function loadExplorePaidProductCards(
  collegeSlug: string,
  isGlobal: boolean,
  studentId?: string,
  collegeId?: string | null,
  preloaded?: {
    discoverableGroups: GlobalDiscoverablePillarGroup[];
    visiblePillars: MasterCoursePillarsRow[];
  },
): Promise<ExplorePaidProductCard[]> {
  let discoverableItems: PaidCourseCatalogDiscoverableItem[];
  try {
    if (preloaded) {
      const catalog = await loadPaidCatalogDiscoverableItemsFromGroups(
        preloaded.discoverableGroups,
        preloaded.visiblePillars,
        studentId
          ? {
              isGlobal,
              collegeId: collegeId ?? null,
              studentId,
            }
          : undefined,
      );
      discoverableItems = catalog.discoverableItems;
    } else {
      const catalog = await loadPaidCoursesData(collegeSlug, isGlobal, studentId, collegeId);
      discoverableItems = catalog.discoverableItems;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[explore-paid-products] catalog load failed:', error);
    }
    return [];
  }

  const paidItems = discoverableItems.filter((item) => !item.is_free);

  if (paidItems.length === 0) return [];

  const [metaByKey, priceByKey] = await Promise.all([
    batchLoadLandingMetadata(paidItems),
    batchLoadDefaultPrices(paidItems),
  ]);

  const cards: ExplorePaidProductCard[] = [];

  for (const item of paidItems) {
    const { sourceType, sourceId } = resolvePaidSource(item);
    const meta = resolveMetaForItem(item, metaByKey);
    const completeness = isPaidProductMetadataComplete(meta);
    const priceKey = landingMetaKey(sourceType, sourceId);
    const price = priceByKey.get(priceKey) ?? null;
    const isEnrolled = item.is_enrolled;

    if (!isEnrolled) {
      if (!completeness.ok) continue;
      if (!price) continue;
    }

    const { thumbnailImageUrl, coverImageUrl } = resolvePaidCardImages(item, meta);
    const slug = meta?.slug?.trim() || null;
    const title = meta?.title?.trim() || item.title;
    const description =
      meta?.short_description?.trim()
      || meta?.description?.trim()
      || item.description;

    cards.push({
      id: item.catalog_key,
      sourceType,
      sourceId,
      title,
      slug,
      description,
      thumbnailImageUrl,
      coverImageUrl,
      previewVideoUrl: meta?.preview_video_url?.trim() || null,
      pillarSlug: item.pillar_slug,
      pillarTitle: item.pillar_title,
      moduleCount: item.module_count,
      videoCount: item.video_count,
      isEnrolled,
      entitled: item.entitled,
      progressPercentage: item.progress_percentage,
      priceMinor: price?.priceMinor ?? null,
      currency: price?.currency ?? 'INR',
      detailUrl: buildExploreDetailUrl(collegeSlug, item),
      masterCourseId: item.id,
      variantId: item.variant_id,
      catalogKind: item.catalog_kind,
    });
  }

  return cards;
}
