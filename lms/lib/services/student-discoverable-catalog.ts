import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { listStudentContentEntitlements } from '@/lib/services/course-access-manager';
import type { CatalogVisibilityScope } from '@/types/database';

export type DiscoverableCatalogKind = 'master_course' | 'variant';

export interface GlobalDiscoverableCourse {
  catalog_key: string;
  catalog_kind: DiscoverableCatalogKind;
  id: string;
  variant_id: string | null;
  pillar_id: string | null;
  code: string;
  title: string;
  parent_course_title: string | null;
  description: string | null;
  short_description: string | null;
  module_count: number;
  video_count: number;
  entitled: boolean;
  /** Actual enrollment/access record — distinct from free-course catalog `entitled` flag. */
  is_enrolled: boolean;
  progress_percentage: number | null;
  is_free: boolean;
  pricing_model: string | null;
  selling_price?: number | null;
  currency?: string | null;
  thumbnail_url: string | null;
  /** Paid catalog visibility toggle (pillar master courses). */
  show_as_paid_course: boolean;
  /** master_course, course_variant (paid variant product), or paid_course_builder. */
  paid_source_type: 'master_course' | 'course_variant' | 'paid_course_builder';
  created_at?: string;
}

type VariantRow = {
  id: string;
  master_course_id: string;
  pillar_id: string | null;
  title: string;
  slug: string;
  code: string;
  description: string | null;
  show_as_paid_course: boolean | null;
  pricing_model: string | null;
  selling_price: number | null;
  currency: string | null;
  publish_status: string;
  visibility_scope: CatalogVisibilityScope;
  created_at?: string;
  master_courses: ParentCourseRow | ParentCourseRow[] | null;
};

type ParentCourseRow = {
  id: string;
  pillar_id: string | null;
  title: string;
  code: string;
  is_free: boolean | null;
  pricing_model: string | null;
  selling_price?: number | null;
  currency?: string | null;
  created_at?: string;
};

type VariantItemJoin = {
  id: string;
  module_id: string;
  item_type: string;
  publish_status: string;
};

type VariantItemRow = {
  course_variant_id: string;
  master_course_item_id: string;
  master_course_items: VariantItemJoin | VariantItemJoin[] | null;
};

function resolveVariantItemJoin(
  joined: VariantItemJoin | VariantItemJoin[] | null | undefined,
): VariantItemJoin | null {
  if (!joined) return null;
  if (Array.isArray(joined)) return joined[0] ?? null;
  return joined;
}

export function masterCourseCatalogKey(masterCourseId: string): string {
  return `master_course:${masterCourseId}`;
}

function variantCatalogKey(variantId: string): string {
  return `variant:${variantId}`;
}

function isVariantVisibleToStudent(
  visibilityScope: CatalogVisibilityScope,
  collegeId: string | null,
  visibleCollegeIds: Set<string>,
): boolean {
  if (visibilityScope === 'private') return false;
  if (visibilityScope === 'global') return true;
  if (visibilityScope === 'selected_colleges') {
    return !!collegeId && visibleCollegeIds.has(collegeId);
  }
  return false;
}

function countVariantDeliveryStats(
  variantId: string,
  variantItems: VariantItemRow[],
): { module_count: number; video_count: number } {
  const moduleIds = new Set<string>();
  let videoCount = 0;

  for (const row of variantItems) {
    if (row.course_variant_id !== variantId) continue;
    const item = resolveVariantItemJoin(row.master_course_items);
    if (!item || item.publish_status !== 'published') continue;
    moduleIds.add(item.module_id);
    if (item.item_type === 'video') videoCount++;
  }

  return { module_count: moduleIds.size, video_count: videoCount };
}

function resolveParentCourse(
  joined: ParentCourseRow | ParentCourseRow[] | null | undefined,
): ParentCourseRow | null {
  if (!joined) return null;
  if (Array.isArray(joined)) return joined[0] ?? null;
  return joined;
}

export async function fetchDiscoverableVariantsForCatalog(options: {
  collegeId: string | null;
  publishedPillarIds: Set<string>;
  requireCollegeVisibleParent?: boolean;
  /** When true, only paid-sale variants (show_as_paid_course) and skip parent college visibility. */
  paidCatalogOnly?: boolean;
  entitledMasterCourseIds: Set<string>;
  entitledVariantIds: Set<string>;
  studentId: string;
}): Promise<GlobalDiscoverableCourse[]> {
  const {
    collegeId,
    publishedPillarIds,
    requireCollegeVisibleParent = false,
    paidCatalogOnly = false,
    entitledMasterCourseIds: _entitledMasterCourseIds,
    entitledVariantIds,
    studentId,
  } = options;
  if (publishedPillarIds.size === 0) return [];

  const sb = createAdminClient();

  let variantQuery = sb
    .from('course_variants')
    .select(
      'id, master_course_id, pillar_id, title, slug, code, description, show_as_paid_course, pricing_model, selling_price, currency, publish_status, visibility_scope, created_at, master_courses!inner(id, pillar_id, title, code, is_free, pricing_model, publish_status, visible_to_college_students, created_at)',
    )
    .eq('publish_status', 'published')
    .eq('master_courses.publish_status', 'published')
    .limit(200); // #7 Safety cap to prevent unbounded catalog growth

  if (paidCatalogOnly) {
    variantQuery = variantQuery.eq('show_as_paid_course', true);
  }

  if (requireCollegeVisibleParent && !paidCatalogOnly) {
    variantQuery = variantQuery.eq('master_courses.visible_to_college_students', true);
  }

  const { data: variants, error } = await variantQuery;

  if (error || !variants?.length) return [];

  const publishedVariants = variants as VariantRow[];
  const variantIds = publishedVariants.map((v) => v.id);

  const [{ data: visibilityRows }, { data: variantItemRows }] = await Promise.all([
    sb
      .from('course_variant_visibility_colleges')
      .select('variant_id, college_id')
      .in('variant_id', variantIds),
    sb
      .from('course_variant_items')
      .select(
        'course_variant_id, master_course_item_id, master_course_items!inner(id, module_id, item_type, publish_status)',
      )
      .in('course_variant_id', variantIds),
  ]);

  const collegesByVariant = new Map<string, Set<string>>();
  for (const row of visibilityRows ?? []) {
    const vid = row.variant_id as string;
    if (!collegesByVariant.has(vid)) collegesByVariant.set(vid, new Set());
    collegesByVariant.get(vid)!.add(row.college_id as string);
  }

  const variantItems = (variantItemRows ?? []) as unknown as VariantItemRow[];

  const progressItemIdsByVariant = new Map<string, string[]>();
  for (const variant of publishedVariants) {
    const itemIds = variantItems.reduce((acc, row) => {
      if (row.course_variant_id === variant.id && row.master_course_item_id) acc.push(row.master_course_item_id);
      return acc;
    }, [] as string[]);
    progressItemIdsByVariant.set(variant.id, itemIds);
  }

  const videoItemIds = new Set<string>();
  const otherItemIds = new Set<string>();

  for (const row of variantItems) {
    const item = resolveVariantItemJoin(row.master_course_items);
    if (!item || item.publish_status !== 'published') continue;
    if (item.item_type === 'video') {
      videoItemIds.add(item.id);
    } else {
      otherItemIds.add(item.id);
    }
  }

  const completedItemIds = new Set<string>();
  const videoCompletionPercentageThreshold = 66;

  if (videoItemIds.size > 0) {
    const { data } = await sb
      .from('student_video_progress')
      .select('lesson_id, completed, completion_percentage')
      .eq('student_id', studentId)
      .in('lesson_id', Array.from(videoItemIds));
    for (const row of data ?? []) {
      if (!row.lesson_id || !((row.completed ?? false) || Number(row.completion_percentage ?? 0) >= videoCompletionPercentageThreshold)) continue;
      completedItemIds.add(row.lesson_id);
    }
  }

  if (otherItemIds.size > 0) {
    const { data } = await sb
      .from('student_progress')
      .select('item_id')
      .eq('student_id', studentId)
      .eq('completed', true)
      .in('item_id', Array.from(otherItemIds));
    for (const row of data ?? []) {
      completedItemIds.add(row.item_id);
    }
  }

  const results: GlobalDiscoverableCourse[] = [];

  for (const variant of publishedVariants) {
    const parent = resolveParentCourse(variant.master_courses);
    if (!parent) continue;

    const displayPillarId = variant.pillar_id ?? parent.pillar_id;
    if (!displayPillarId || !publishedPillarIds.has(displayPillarId)) continue;

    const scope = (variant.visibility_scope ?? 'global') as CatalogVisibilityScope;
    const visibleCollegeIds = collegesByVariant.get(variant.id) ?? new Set<string>();
    if (!isVariantVisibleToStudent(scope, collegeId, visibleCollegeIds)) continue;

    const stats = countVariantDeliveryStats(variant.id, variantItems);
    const isEnrolled = entitledVariantIds.has(variant.id);
    const entitled = isEnrolled || variant.pricing_model === 'free';

    let progressPercentage: number | null = null;
    if (isEnrolled) {
      const itemIds = progressItemIdsByVariant.get(variant.id) ?? [];
      const total = itemIds.length;
      const completed = itemIds.filter((id) => completedItemIds.has(id)).length;
      progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    results.push({
      catalog_key: variantCatalogKey(variant.id),
      catalog_kind: 'variant',
      id: variant.master_course_id,
      variant_id: variant.id,
      pillar_id: displayPillarId,
      code: variant.code,
      title: variant.title,
      parent_course_title: parent.title,
      description: variant.description,
      short_description: variant.description,
      module_count: stats.module_count,
      video_count: stats.video_count,
      entitled,
      is_enrolled: isEnrolled,
      progress_percentage: progressPercentage,
      is_free: variant.pricing_model === 'free',
      pricing_model: variant.pricing_model,
      selling_price: variant.selling_price,
      currency: variant.currency,
      thumbnail_url: null,
      show_as_paid_course: !!variant.show_as_paid_course,
      paid_source_type: variant.show_as_paid_course ? 'course_variant' : 'master_course',
      created_at: variant.created_at || parent.created_at,
    });
  }

  return results;
}

/** Paid catalog variants — not gated by parent master course college visibility. */
export async function fetchPaidCatalogVariantsForStudent(options: {
  collegeId: string | null;
  publishedPillarIds: Set<string>;
  entitledVariantIds: Set<string>;
  studentId: string;
}): Promise<GlobalDiscoverableCourse[]> {
  return fetchDiscoverableVariantsForCatalog({
    ...options,
    entitledMasterCourseIds: new Set(),
    paidCatalogOnly: true,
    requireCollegeVisibleParent: false,
  });
}

export async function resolveDiscoverableVariantItemScope(
  variantId: string,
  masterCourseId: string,
  collegeId: string | null,
): Promise<{ itemIds: Set<string>; title: string } | null> {
  const sb = createAdminClient();

  const { data: variant } = await sb
    .from('course_variants')
    .select('id, master_course_id, title, publish_status, visibility_scope')
    .eq('id', variantId)
    .eq('master_course_id', masterCourseId)
    .eq('publish_status', 'published')
    .maybeSingle();

  if (!variant) return null;

  const scope = (variant.visibility_scope ?? 'global') as CatalogVisibilityScope;
  if (scope === 'private') return null;

  if (scope === 'selected_colleges') {
    if (!collegeId) return null;
    const { data: mapping } = await sb
      .from('course_variant_visibility_colleges')
      .select('college_id')
      .eq('variant_id', variantId)
      .eq('college_id', collegeId)
      .maybeSingle();
    if (!mapping) return null;
  }

  const { data: variantItems } = await sb
    .from('course_variant_items')
    .select('master_course_item_id, master_course_items!inner(id, publish_status)')
    .eq('course_variant_id', variantId)
    .eq('master_course_items.publish_status', 'published');

  const itemIds = new Set<string>();
  for (const row of variantItems ?? []) {
    const item = resolveVariantItemJoin(
      row.master_course_items as VariantItemJoin | VariantItemJoin[] | null,
    );
    if (item?.id) itemIds.add(item.id);
  }

  if (itemIds.size === 0) return null;

  return { itemIds, title: variant.title as string };
}

export async function loadEntitledVariantIdsForStudent(studentId: string): Promise<Set<string>> {
  const entitlements = await listStudentContentEntitlements(studentId);
  return new Set(
    entitlements.reduce((acc, e) => {
      if (e.assigned_entity_type === 'variant') acc.push(e.assigned_entity_id);
      return acc;
    }, [] as string[]),
  );
}

export function mergeDiscoverableCoursesByPillar(
  grouped: Map<string, GlobalDiscoverableCourse[]>,
  rows: GlobalDiscoverableCourse[],
  resolvePillarId: (row: GlobalDiscoverableCourse) => string | null,
): void {
  for (const row of rows) {
    const pillarId = resolvePillarId(row);
    if (!pillarId) continue;
    const existing = grouped.get(pillarId) ?? [];
    if (existing.some((c) => c.catalog_key === row.catalog_key)) continue;
    grouped.set(pillarId, [...existing, row]);
  }
}
