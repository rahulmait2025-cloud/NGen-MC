import 'server-only';

/**
 * Resolved Content Service (Phase 1A).
 *
 * Provides fully resolved read models for master courses, course variants,
 * and course bundles — joining through the hierarchy to produce complete
 * video metadata without calling TPStreams.
 *
 * Resolution chain:
 *   master_course_pillars
 *     -> master_courses
 *       -> master_course_modules
 *         -> master_course_items
 *           -> video_assets (tp_asset_id, playback_url, dash_url, etc.)
 *
 * SAFETY: This file MUST NOT import from:
 *   - lib/tpstreams/*
 *   - lib/services/tpstreams-*
 *   - Any TPStreams client/API module
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  PricingModel,
  MasterCoursePublishStatus,
  VideoAssetProcessingStatus,
  VideoAssetSyncStatus,
  BundleItemType,
  BundleLifecycleStatus,
  BundlePublishStatus,
  CourseVariantPublishStatus,
  VariantInclusionType,
} from '@/types/database';

// ─── Resolved Types ──────────────────────────────────────────────────────────

export interface ResolvedPillar {
  id: string;
  title: string;
  code: string;
  slug: string;
}

export interface ResolvedVideoAsset {
  id: string;
  tp_asset_id: string;
  tp_folder_uuid: string;
  playback_url: string | null;
  dash_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  resolutions: string[] | null;
  content_protection_type: 'drm' | 'aes' | 'disable' | null;
  processing_status: VideoAssetProcessingStatus;
  sync_status: VideoAssetSyncStatus;
}

export interface ResolvedItem {
  id: string;
  title: string;
  item_type: string;
  sort_order: number;
  duration_seconds: number | null;
  is_preview: boolean;
  is_required: boolean;
  publish_status: MasterCoursePublishStatus;
  video_asset: ResolvedVideoAsset | null;
}

export interface ResolvedModule {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  items: ResolvedItem[];
}

export interface ResolvedMasterCourse {
  id: string;
  title: string;
  code: string;
  slug: string | null;
  description: string | null;
  publish_status: MasterCoursePublishStatus;
  pricing_model: PricingModel | null;
  base_price: number | null;
  selling_price: number | null;
  discounted_price: number | null;
  internal_cost: number | null;
  currency: string;
  default_validity_days: number | null;
  is_free: boolean;
  is_invite_only: boolean;
  pillar: ResolvedPillar | null;
  modules: ResolvedModule[];
}

export interface ResolvedVariantItem {
  course_variant_item_id: string;
  inclusion_type: VariantInclusionType;
  sort_order: number;
  module: { id: string; title: string; sort_order: number };
  master_course_item: ResolvedItem;
}

export interface ResolvedVariant {
  id: string;
  title: string;
  code: string;
  slug: string;
  description: string | null;
  publish_status: CourseVariantPublishStatus;
  master_course: { id: string; title: string; code: string; slug: string | null };
  pillar: ResolvedPillar | null;
  selected_items: ResolvedVariantItem[];
}

export interface ResolvedBundleItemEntry {
  bundle_item_id: string;
  item_type: BundleItemType;
  reference_id: string;
  sort_order: number;
  resolved_entity: ResolvedMasterCourse | ResolvedVariant | ResolvedItem | ResolvedBundle | UnresolvedReference;
}

export interface UnresolvedReference {
  unresolved: true;
  reason: 'missing_reference' | 'unknown_item_type';
  item_type?: string;
  reference_id?: string;
}

export interface ResolvedBundle {
  id: string;
  title: string;
  code: string;
  slug: string;
  description: string | null;
  publish_status: BundlePublishStatus;
  lifecycle_status: BundleLifecycleStatus;
  bundle_items_resolved: ResolvedBundleItemEntry[];
}

export interface FlattenedVideo {
  source_type: 'master_course' | 'variant' | 'bundle' | 'master_course_item';
  source_id: string;
  pillar_id: string | null;
  pillar_title: string | null;
  master_course_id: string;
  master_course_title: string;
  module_id: string;
  module_title: string;
  master_course_item_id: string;
  item_title: string;
  video_asset_id: string;
  tp_asset_id: string;
  playback_url: string | null;
  dash_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  sort_path: string;
}

export interface ContentIntegrityReport {
  entity_type: string;
  entity_id: string;
  missing_video_asset_links: string[];
  missing_tp_asset_ids: string[];
  missing_playback_urls: string[];
  unresolved_bundle_references: string[];
  total_videos: number;
  playable_videos: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapVideoAsset(va: Record<string, unknown> | null): ResolvedVideoAsset | null {
  if (!va) return null;
  return {
    id: va.id as string,
    tp_asset_id: va.tp_asset_id as string,
    tp_folder_uuid: va.tp_folder_uuid as string,
    playback_url: (va.playback_url as string) ?? null,
    dash_url: (va.dash_url as string) ?? null,
    thumbnail_url: (va.thumbnail_url as string) ?? null,
    duration_seconds: (va.duration_seconds as number) ?? null,
    resolutions: (va.resolutions as string[]) ?? null,
    content_protection_type: (va.content_protection_type as ResolvedVideoAsset['content_protection_type']) ?? null,
    processing_status: va.processing_status as VideoAssetProcessingStatus,
    sync_status: (va.sync_status as VideoAssetSyncStatus) ?? 'active',
  };
}

function mapItem(item: Record<string, unknown>): ResolvedItem {
  const videoAssetRaw = item.video_assets as Record<string, unknown> | null | undefined;
  return {
    id: item.id as string,
    title: item.title as string,
    item_type: item.item_type as string,
    sort_order: item.sort_order as number,
    duration_seconds: (item.duration_seconds as number) ?? null,
    is_preview: (item.is_preview as boolean) ?? (item.preview_enabled as boolean) ?? false,
    is_required: (item.is_required as boolean) ?? false,
    publish_status: item.publish_status as MasterCoursePublishStatus,
    video_asset: videoAssetRaw ? mapVideoAsset(videoAssetRaw) : null,
  };
}

// ─── 1. getResolvedMasterCourse ──────────────────────────────────────────────

async function getResolvedMasterCourse(
  courseId: string,
): Promise<ResolvedMasterCourse | null> {
  const sb = createAdminClient();

  const { data: course, error } = await sb
    .from('master_courses')
    .select(`
      id, title, code, slug, description, publish_status,
      pricing_model, base_price, selling_price, discounted_price,
      internal_cost, currency, default_validity_days, is_free, is_invite_only,
      master_course_pillars (
        id, title, code, slug
      )
    `)
    .eq('id', courseId)
    .single();

  if (error || !course) return null;

  const { data: modules } = await sb
    .from('master_course_modules')
    .select('id, title, description, sort_order')
    .eq('master_course_id', courseId)
    .order('sort_order', { ascending: true });

  const moduleIds = (modules ?? []).map((m) => m.id);

  let itemRows: Record<string, unknown>[] = [];
  if (moduleIds.length > 0) {
    const { data } = await sb
      .from('master_course_items')
      .select(`
        id, title, item_type, sort_order, duration_seconds,
        is_preview, is_required, publish_status, module_id,
        video_assets (
          id, tp_asset_id, tp_folder_uuid, playback_url, dash_url,
          thumbnail_url, duration_seconds, resolutions,
          content_protection_type, processing_status, sync_status
        )
      `)
      .eq('master_course_id', courseId)
      .in('module_id', moduleIds)
      .order('sort_order', { ascending: true });

    itemRows = (data ?? []) as Record<string, unknown>[];
  }

  const itemsByModule = new Map<string, ResolvedItem[]>();
  for (const row of itemRows) {
    const modId = row.module_id as string;
    if (!itemsByModule.has(modId)) itemsByModule.set(modId, []);
    itemsByModule.get(modId)!.push(mapItem(row));
  }

  const pillarRaw = course.master_course_pillars as unknown as Record<string, unknown> | null;

  return {
    id: course.id,
    title: course.title,
    code: course.code,
    slug: course.slug,
    description: course.description,
    publish_status: course.publish_status as MasterCoursePublishStatus,
    pricing_model: (course.pricing_model as PricingModel) ?? null,
    base_price: (course.base_price as number) ?? null,
    selling_price: (course.selling_price as number) ?? null,
    discounted_price: (course.discounted_price as number) ?? null,
    internal_cost: (course.internal_cost as number) ?? null,
    currency: (course.currency as string) ?? 'INR',
    default_validity_days: (course.default_validity_days as number) ?? null,
    is_free: (course.is_free as boolean) ?? false,
    is_invite_only: (course.is_invite_only as boolean) ?? false,
    pillar: pillarRaw
      ? { id: pillarRaw.id as string, title: pillarRaw.title as string, code: pillarRaw.code as string, slug: pillarRaw.slug as string }
      : null,
    modules: (modules ?? []).map((mod) => ({
      id: mod.id,
      title: mod.title,
      description: mod.description,
      sort_order: mod.sort_order,
      items: itemsByModule.get(mod.id) ?? [],
    })),
  };
}

// ─── 2. getResolvedVariant ───────────────────────────────────────────────────

export async function getResolvedVariant(
  variantId: string,
): Promise<ResolvedVariant | null> {
  const sb = createAdminClient();

  const { data: variant, error } = await sb
    .from('course_variants')
    .select(`
      id, title, code, slug, description, publish_status, master_course_id,
      master_courses (
        id, title, code, slug, pillar_id,
        master_course_pillars (
          id, title, code, slug
        )
      )
    `)
    .eq('id', variantId)
    .single();

  if (error || !variant) return null;

  const { data: variantItems } = await sb
    .from('course_variant_items')
    .select(`
      id, sort_order, inclusion_type, master_course_item_id,
      master_course_items (
        id, title, item_type, sort_order, duration_seconds,
        is_preview, is_required, publish_status, module_id,
        video_assets (
          id, tp_asset_id, tp_folder_uuid, playback_url, dash_url,
          thumbnail_url, duration_seconds, resolutions,
          content_protection_type, processing_status, sync_status
        )
      )
    `)
    .eq('course_variant_id', variantId)
    .order('sort_order', { ascending: true });

  const moduleIds = new Set<string>();
  for (const vi of variantItems ?? []) {
    const mci = vi.master_course_items as unknown as Record<string, unknown> | null;
    if (mci?.module_id) moduleIds.add(mci.module_id as string);
  }

  const moduleMap = new Map<string, { id: string; title: string; sort_order: number }>();
  if (moduleIds.size > 0) {
    const { data: mods } = await sb
      .from('master_course_modules')
      .select('id, title, sort_order')
      .in('id', Array.from(moduleIds));

    for (const m of mods ?? []) {
      moduleMap.set(m.id, { id: m.id, title: m.title, sort_order: m.sort_order });
    }
  }

  const mc = variant.master_courses as unknown as Record<string, unknown>;
  const pillarRaw = mc.master_course_pillars as unknown as Record<string, unknown> | null;

  const selectedItems: ResolvedVariantItem[] = (variantItems ?? []).map((vi) => {
    const mci = vi.master_course_items as unknown as Record<string, unknown>;
    const modId = mci.module_id as string;

    return {
      course_variant_item_id: vi.id,
      inclusion_type: vi.inclusion_type as VariantInclusionType,
      sort_order: vi.sort_order,
      module: moduleMap.get(modId) ?? { id: modId, title: 'Unknown Module', sort_order: 0 },
      master_course_item: mapItem(mci),
    };
  });

  return {
    id: variant.id,
    title: variant.title,
    code: variant.code,
    slug: variant.slug,
    description: variant.description,
    publish_status: variant.publish_status as CourseVariantPublishStatus,
    master_course: {
      id: mc.id as string,
      title: mc.title as string,
      code: mc.code as string,
      slug: (mc.slug as string) ?? null,
    },
    pillar: pillarRaw
      ? { id: pillarRaw.id as string, title: pillarRaw.title as string, code: pillarRaw.code as string, slug: pillarRaw.slug as string }
      : null,
    selected_items: selectedItems,
  };
}

// ─── 3. getResolvedBundle ────────────────────────────────────────────────────

export async function getResolvedBundle(
  bundleId: string,
  options?: { visitedBundleIds?: Set<string> },
): Promise<ResolvedBundle | null> {
  const sb = createAdminClient();
  const visited = options?.visitedBundleIds ?? new Set<string>();

  // Cycle protection: if we've already visited this bundle, return cycle marker
  if (visited.has(bundleId)) {
    return {
      id: bundleId,
      title: '[Cycle detected]',
      code: '',
      slug: '',
      description: null,
      publish_status: 'draft',
      lifecycle_status: 'draft',
      bundle_items_resolved: [],
    };
  }
  visited.add(bundleId);

  const { data: bundle, error } = await sb
    .from('course_bundles')
    .select(`
      id, title, code, slug, description, publish_status, lifecycle_status,
      bundle_items (
        id, item_type, reference_id, sort_order
      )
    `)
    .eq('id', bundleId)
    .order('sort_order', { referencedTable: 'bundle_items', ascending: true })
    .single();

  if (error || !bundle) return null;

  const rawItems = (bundle.bundle_items ?? []) as Array<{
    id: string;
    item_type: string;
    reference_id: string;
    sort_order: number;
  }>;

  const resolvedEntries = await Promise.all(rawItems.map(async (bi) => {
    let resolvedEntity: ResolvedMasterCourse | ResolvedVariant | ResolvedItem | ResolvedBundle | UnresolvedReference;

    try {
      if (bi.item_type === 'master_course') {
        const resolved = await getResolvedMasterCourse(bi.reference_id);
        resolvedEntity = resolved ?? { unresolved: true, reason: 'missing_reference', item_type: bi.item_type, reference_id: bi.reference_id };
      } else if (bi.item_type === 'variant') {
        const resolved = await getResolvedVariant(bi.reference_id);
        resolvedEntity = resolved ?? { unresolved: true, reason: 'missing_reference', item_type: bi.item_type, reference_id: bi.reference_id };
      } else if (bi.item_type === 'master_course_item') {
        const resolved = await resolveSingleItem(bi.reference_id);
        resolvedEntity = resolved ?? { unresolved: true, reason: 'missing_reference', item_type: bi.item_type, reference_id: bi.reference_id };
      } else if (bi.item_type === 'bundle') {
        // Nested bundle: recursively resolve with cycle protection
        const nestedResolved = await getResolvedBundle(bi.reference_id, { visitedBundleIds: new Set(visited) });
        if (nestedResolved) {
          resolvedEntity = nestedResolved;
        } else {
          resolvedEntity = { unresolved: true, reason: 'missing_reference', item_type: bi.item_type, reference_id: bi.reference_id };
        }
      } else {
        resolvedEntity = { unresolved: true, reason: 'unknown_item_type', item_type: bi.item_type, reference_id: bi.reference_id };
      }
    } catch {
      resolvedEntity = { unresolved: true, reason: 'missing_reference', item_type: bi.item_type, reference_id: bi.reference_id };
    }

    return {
      bundle_item_id: bi.id,
      item_type: bi.item_type as BundleItemType,
      reference_id: bi.reference_id,
      sort_order: bi.sort_order,
      resolved_entity: resolvedEntity,
    };
  }));

  return {
    id: bundle.id,
    title: bundle.title,
    code: bundle.code,
    slug: bundle.slug,
    description: bundle.description,
    publish_status: bundle.publish_status as BundlePublishStatus,
    lifecycle_status: bundle.lifecycle_status as BundleLifecycleStatus,
    bundle_items_resolved: resolvedEntries,
  };
}

async function resolveSingleItem(
  itemId: string,
): Promise<ResolvedItem | null> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('master_course_items')
    .select(`
      id, title, item_type, sort_order, duration_seconds,
      is_preview, is_required, publish_status,
      video_assets (
        id, tp_asset_id, tp_folder_uuid, playback_url, dash_url,
        thumbnail_url, duration_seconds, resolutions,
        content_protection_type, processing_status, sync_status
      )
    `)
    .eq('id', itemId)
    .single();

  if (error || !data) return null;
  return mapItem(data as Record<string, unknown>);
}

// ─── 4. flattenResolvedVideos ────────────────────────────────────────────────

function flattenResolvedVideos(
  input: { type: 'master_course'; data: ResolvedMasterCourse }
    | { type: 'variant'; data: ResolvedVariant }
    | { type: 'bundle'; data: ResolvedBundle },
): FlattenedVideo[] {
  const videos: FlattenedVideo[] = [];

  if (input.type === 'master_course') {
    flattenFromCourse(input.data, input.data.id, 'master_course', videos);
  } else if (input.type === 'variant') {
    flattenFromVariant(input.data, videos);
  } else if (input.type === 'bundle') {
    flattenFromBundle(input.data, videos);
  }

  return videos;
}

function flattenFromCourse(
  course: ResolvedMasterCourse,
  sourceId: string,
  sourceType: FlattenedVideo['source_type'],
  out: FlattenedVideo[],
): void {
  for (const mod of course.modules) {
    for (const item of mod.items) {
      if (!item.video_asset) continue;
      out.push({
        source_type: sourceType,
        source_id: sourceId,
        pillar_id: course.pillar?.id ?? null,
        pillar_title: course.pillar?.title ?? null,
        master_course_id: course.id,
        master_course_title: course.title,
        module_id: mod.id,
        module_title: mod.title,
        master_course_item_id: item.id,
        item_title: item.title,
        video_asset_id: item.video_asset.id,
        tp_asset_id: item.video_asset.tp_asset_id,
        playback_url: item.video_asset.playback_url,
        dash_url: item.video_asset.dash_url,
        thumbnail_url: item.video_asset.thumbnail_url,
        duration_seconds: item.video_asset.duration_seconds,
        sort_path: `${String(mod.sort_order).padStart(4, '0')}.${String(item.sort_order).padStart(4, '0')}`,
      });
    }
  }
}

function flattenFromVariant(
  variant: ResolvedVariant,
  out: FlattenedVideo[],
): void {
  for (const si of variant.selected_items) {
    const item = si.master_course_item;
    if (!item.video_asset) continue;
    out.push({
      source_type: 'variant',
      source_id: variant.id,
      pillar_id: variant.pillar?.id ?? null,
      pillar_title: variant.pillar?.title ?? null,
      master_course_id: variant.master_course.id,
      master_course_title: variant.master_course.title,
      module_id: si.module.id,
      module_title: si.module.title,
      master_course_item_id: item.id,
      item_title: item.title,
      video_asset_id: item.video_asset.id,
      tp_asset_id: item.video_asset.tp_asset_id,
      playback_url: item.video_asset.playback_url,
      dash_url: item.video_asset.dash_url,
      thumbnail_url: item.video_asset.thumbnail_url,
      duration_seconds: item.video_asset.duration_seconds,
      sort_path: `${String(si.module.sort_order).padStart(4, '0')}.${String(si.sort_order).padStart(4, '0')}`,
    });
  }
}

function flattenFromBundle(
  bundle: ResolvedBundle,
  out: FlattenedVideo[],
): void {
  for (const entry of bundle.bundle_items_resolved) {
    if ('unresolved' in entry.resolved_entity) continue;

    if (entry.item_type === 'master_course') {
      flattenFromCourse(entry.resolved_entity as ResolvedMasterCourse, bundle.id, 'bundle', out);
    } else if (entry.item_type === 'variant') {
      const v = entry.resolved_entity as ResolvedVariant;
      for (const si of v.selected_items) {
        const item = si.master_course_item;
        if (!item.video_asset) continue;
        out.push({
          source_type: 'bundle',
          source_id: bundle.id,
          pillar_id: v.pillar?.id ?? null,
          pillar_title: v.pillar?.title ?? null,
          master_course_id: v.master_course.id,
          master_course_title: v.master_course.title,
          module_id: si.module.id,
          module_title: si.module.title,
          master_course_item_id: item.id,
          item_title: item.title,
          video_asset_id: item.video_asset.id,
          tp_asset_id: item.video_asset.tp_asset_id,
          playback_url: item.video_asset.playback_url,
          dash_url: item.video_asset.dash_url,
          thumbnail_url: item.video_asset.thumbnail_url,
          duration_seconds: item.video_asset.duration_seconds,
          sort_path: `${String(entry.sort_order).padStart(4, '0')}.${String(si.sort_order).padStart(4, '0')}`,
        });
      }
    } else if (entry.item_type === 'master_course_item') {
      const item = entry.resolved_entity as ResolvedItem;
      if (!item.video_asset) continue;
      out.push({
        source_type: 'bundle',
        source_id: bundle.id,
        pillar_id: null,
        pillar_title: null,
        master_course_id: '',
        master_course_title: '',
        module_id: '',
        module_title: '',
        master_course_item_id: item.id,
        item_title: item.title,
        video_asset_id: item.video_asset.id,
        tp_asset_id: item.video_asset.tp_asset_id,
        playback_url: item.video_asset.playback_url,
        dash_url: item.video_asset.dash_url,
        thumbnail_url: item.video_asset.thumbnail_url,
        duration_seconds: item.video_asset.duration_seconds,
        sort_path: `${String(entry.sort_order).padStart(4, '0')}.0000`,
      });
    } else if (entry.item_type === 'bundle') {
      // Nested bundle: recursively flatten
      const nestedBundle = entry.resolved_entity as ResolvedBundle;
      flattenFromBundle(nestedBundle, out);
    }
  }
}

// ─── 5. Validation / Integrity ───────────────────────────────────────────────

export async function validateResolvedContentIntegrity(
  entityType: 'master_course' | 'variant' | 'bundle',
  entityId: string,
): Promise<ContentIntegrityReport> {
  const report: ContentIntegrityReport = {
    entity_type: entityType,
    entity_id: entityId,
    missing_video_asset_links: [],
    missing_tp_asset_ids: [],
    missing_playback_urls: [],
    unresolved_bundle_references: [],
    total_videos: 0,
    playable_videos: 0,
  };

  let videos: FlattenedVideo[] = [];

  if (entityType === 'master_course') {
    const resolved = await getResolvedMasterCourse(entityId);
    if (!resolved) return report;
    videos = flattenResolvedVideos({ type: 'master_course', data: resolved });

    for (const mod of resolved.modules) {
      for (const item of mod.items) {
        if (item.item_type === 'video' && !item.video_asset) {
          report.missing_video_asset_links.push(item.id);
        }
      }
    }
  } else if (entityType === 'variant') {
    const resolved = await getResolvedVariant(entityId);
    if (!resolved) return report;
    videos = flattenResolvedVideos({ type: 'variant', data: resolved });

    for (const si of resolved.selected_items) {
      if (si.master_course_item.item_type === 'video' && !si.master_course_item.video_asset) {
        report.missing_video_asset_links.push(si.master_course_item.id);
      }
    }
  } else if (entityType === 'bundle') {
    const resolved = await getResolvedBundle(entityId);
    if (!resolved) return report;
    videos = flattenResolvedVideos({ type: 'bundle', data: resolved });

    for (const entry of resolved.bundle_items_resolved) {
      if ('unresolved' in entry.resolved_entity) {
        report.unresolved_bundle_references.push(entry.reference_id);
      }
    }
  }

  report.total_videos = videos.length;

  for (const v of videos) {
    if (!v.tp_asset_id) {
      report.missing_tp_asset_ids.push(v.video_asset_id);
    }
    if (!v.playback_url) {
      report.missing_playback_urls.push(v.video_asset_id);
    }
    if (v.tp_asset_id && v.playback_url) {
      report.playable_videos++;
    }
  }

  return report;
}
