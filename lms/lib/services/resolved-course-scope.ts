import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { normUuid } from '@/lib/utils';
import { isAssignmentActive } from '@/lib/services/access-helpers';
import { listStudentContentEntitlements } from '@/lib/services/course-access-manager';

export interface ResolvedVariantInfo {
  variantId: string;
  masterCourseId: string;
  displayTitle: string;
  displayDescription: string | null;
  displayCode: string | null;
  sourceMasterCourseTitle: string | null;
  variantItemIds: string[];
}

export interface ResolvedCourseScope {
  scopeType: 'master_course' | 'variant';
  masterCourseId: string;
  variant: ResolvedVariantInfo | null;
}

export interface CourseVariantLandingOption {
  variantId: string;
  title: string;
  code: string;
  description: string | null;
  moduleCount: number;
  videoCount: number;
  lessonCount: number;
  isAccessible: boolean;
}

async function collectAccessibleVariantIds(
  studentId: string,
  context: { isGlobal: boolean; collegeId: string | null },
): Promise<Set<string>> {
  const accessible = new Set<string>();

  const contentEntitlements = await listStudentContentEntitlements(studentId);
  for (const e of contentEntitlements) {
    if (e.assigned_entity_type === 'variant') {
      accessible.add(e.assigned_entity_id);
    }
  }

  if (!context.isGlobal && context.collegeId) {
    const sb = createAdminClient();
    const { data: assignments } = await sb
      .from('content_assignments')
      .select('assigned_entity_id, status, start_date, end_date')
      .eq('assignment_type', 'college')
      .eq('target_id', context.collegeId)
      .eq('assigned_entity_type', 'variant')
      .eq('status', 'active');

    for (const assignment of assignments ?? []) {
      if (isAssignmentActive(assignment)) {
        accessible.add(assignment.assigned_entity_id as string);
      }
    }
  }

  return accessible;
}

async function buildVariantLandingStats(
  variantIds: string[],
): Promise<Map<string, { moduleCount: number; videoCount: number; lessonCount: number }>> {
  const stats = new Map<string, { moduleCount: number; videoCount: number; lessonCount: number }>();
  if (variantIds.length === 0) {
    return stats;
  }

  const sb = createAdminClient();
  const { data: variantItems } = await sb
    .from('course_variant_items')
    .select('course_variant_id, master_course_item_id')
    .in('course_variant_id', variantIds);

  if (!variantItems || variantItems.length === 0) {
    for (const id of variantIds) {
      stats.set(id, { moduleCount: 0, videoCount: 0, lessonCount: 0 });
    }
    return stats;
  }

  const itemIds = [...new Set(variantItems.map((row) => row.master_course_item_id as string))];
  const { data: items } = await sb
    .from('master_course_items')
    .select('id, module_id, item_type')
    .in('id', itemIds)
    .eq('publish_status', 'published');

  const itemById = new Map((items ?? []).map((item) => [item.id as string, item]));
  const variantToItemIds = new Map<string, string[]>();

  for (const row of variantItems) {
    const variantId = row.course_variant_id as string;
    const itemId = row.master_course_item_id as string;
    const existing = variantToItemIds.get(variantId) ?? [];
    existing.push(itemId);
    variantToItemIds.set(variantId, existing);
  }

  for (const variantId of variantIds) {
    const linkedItemIds = variantToItemIds.get(variantId) ?? [];
    const moduleIds = new Set<string>();
    let videoCount = 0;

    for (const itemId of linkedItemIds) {
      const item = itemById.get(itemId);
      if (!item) {
        continue;
      }
      if (item.module_id) {
        moduleIds.add(item.module_id as string);
      }
      if (item.item_type === 'video') {
        videoCount += 1;
      }
    }

    stats.set(variantId, {
      moduleCount: moduleIds.size,
      videoCount,
      lessonCount: linkedItemIds.filter((id) => itemById.has(id)).length,
    });
  }

  return stats;
}

/** B2C checkout variants auto-created by SuperAdmin pricing sync — not program paths. */
function isDirectPurchaseVariant(variant: { title: string; slug: string }): boolean {
  if (variant.slug.startsWith('direct-purchase-')) {
    return true;
  }
  if (/^direct\s*purchase/i.test(variant.title.trim())) {
    return true;
  }
  return false;
}

/**
 * Published variants for a master course, scoped to what the student may see on the landing page.
 * College: variants assigned to the college or held in student content entitlements.
 * Excludes global "Direct Purchase" pricing variants (B2C checkout only).
 */
export async function listCourseVariantsForStudentLanding(
  studentId: string | null,
  masterCourseId: string,
  context: { isGlobal: boolean; collegeId: string | null },
): Promise<CourseVariantLandingOption[]> {
  const sb = createAdminClient();
  const hasStudent = !!(studentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId));
  const [accessibleVariantIds, { data: publishedVariants }] = await Promise.all([
    hasStudent ? collectAccessibleVariantIds(studentId, context) : Promise.resolve(new Set<string>()),
    sb
      .from('course_variants')
      .select('id, title, code, description, slug, created_at')
      .eq('master_course_id', masterCourseId)
      .eq('publish_status', 'published')
      .order('created_at', { ascending: true }),
  ]);

  if (!publishedVariants || publishedVariants.length === 0) {
    return [];
  }

  const programVariants = publishedVariants.filter(
    (variant) =>
      !isDirectPurchaseVariant({
        title: variant.title,
        slug: variant.slug,
      }),
  );

  if (programVariants.length === 0) {
    return [];
  }

  const variantsToShow = context.isGlobal
    ? programVariants
    : programVariants.filter((variant) => accessibleVariantIds.has(variant.id));

  if (variantsToShow.length === 0) {
    return [];
  }

  const variantIds = variantsToShow.map((variant) => variant.id);
  const statsMap = await buildVariantLandingStats(variantIds);

  return variantsToShow.map((variant) => {
    const stats = statsMap.get(variant.id) ?? { moduleCount: 0, videoCount: 0, lessonCount: 0 };
    return {
      variantId: variant.id,
      title: variant.title,
      code: variant.code,
      description: variant.description ?? null,
      moduleCount: stats.moduleCount,
      videoCount: stats.videoCount,
      lessonCount: stats.lessonCount,
      isAccessible: context.isGlobal || accessibleVariantIds.has(variant.id),
    };
  });
}

/**
 * Resolve the effective course scope for a student.
 *
 * Checks active variant entitlements (student_content_entitlements)
 * and college assignments (content_assignments) to determine whether
 * the student's access is through a master_course or a variant.
 *
 * When `explicitVariantId` is provided, it is used directly.
 * When omitted, the best active variant is auto-resolved.
 */
export async function resolveStudentCourseScope(
  studentId: string | null,
  masterCourseId: string,
  context: { isGlobal: boolean; collegeId: string | null },
  explicitVariantId?: string | null,
): Promise<ResolvedCourseScope> {
  if (explicitVariantId) {
    const info = await resolveVariantInfo(explicitVariantId, masterCourseId);
    if (info) {
      return { scopeType: 'variant', masterCourseId, variant: info };
    }
  }

  if (studentId) {
    const variantInfo = await findActiveVariantForStudent(studentId, masterCourseId, context);
    if (variantInfo) {
      return { scopeType: 'variant', masterCourseId, variant: variantInfo };
    }
  }

  return { scopeType: 'master_course', masterCourseId, variant: null };
}

async function resolveVariantInfo(
  variantId: string,
  expectedMasterCourseId: string,
): Promise<ResolvedVariantInfo | null> {
  const sb = createAdminClient();

  const { data: variant } = await sb
    .from('course_variants')
    .select('id, master_course_id, title, description, code')
    .eq('id', variantId)
    .eq('master_course_id', expectedMasterCourseId)
    .eq('publish_status', 'published')
    .maybeSingle();

  if (!variant) return null;

  const [{ data: parent }, { data: variantItems }] = await Promise.all([
    sb
      .from('master_courses')
      .select('title')
      .eq('id', expectedMasterCourseId)
      .maybeSingle(),
    sb
      .from('course_variant_items')
      .select('master_course_item_id')
      .eq('course_variant_id', variantId),
  ]);

  const variantItemIds = (variantItems ?? []).map((r) => r.master_course_item_id as string);

  return {
    variantId: variant.id,
    masterCourseId: expectedMasterCourseId,
    displayTitle: variant.title,
    displayDescription: variant.description,
    displayCode: variant.code,
    sourceMasterCourseTitle: parent?.title ?? null,
    variantItemIds,
  };
}

async function findActiveVariantForStudent(
  studentId: string,
  masterCourseId: string,
  context: { isGlobal: boolean; collegeId: string | null },
): Promise<ResolvedVariantInfo | null> {
  const wantCourse = normUuid(masterCourseId);

  const contentEntitlements = await listStudentContentEntitlements(studentId);
  const variantEntitlements = contentEntitlements.filter(
    (e) => e.assigned_entity_type === 'variant',
  );

  const candidateVariantIds = variantEntitlements.map((e) => e.assigned_entity_id);
  const candidateVariantIdSet = new Set(candidateVariantIds);

  if (!context.isGlobal && context.collegeId) {
    const sb = createAdminClient();
    const { data: assignments } = await sb
      .from('content_assignments')
      .select('assigned_entity_id')
      .eq('assignment_type', 'college')
      .eq('target_id', context.collegeId)
      .eq('assigned_entity_type', 'variant')
      .eq('status', 'active');

    if (assignments) {
      for (const a of assignments) {
        const id = a.assigned_entity_id as string;
        if (!candidateVariantIdSet.has(id)) {
          candidateVariantIdSet.add(id);
          candidateVariantIds.push(id);
        }
      }
    }
  }

  if (candidateVariantIds.length === 0) return null;

  const sb = createAdminClient();
  const { data: variants } = await sb
    .from('course_variants')
    .select('id, master_course_id, title, description, code')
    .in('id', candidateVariantIds)
    .eq('publish_status', 'published');

  const matchingVariant = (variants ?? []).find(
    (v) => normUuid(v.master_course_id as string) === wantCourse,
  );

  if (!matchingVariant) return null;

  const [{ data: parent }, { data: variantItems }] = await Promise.all([
    sb
      .from('master_courses')
      .select('title')
      .eq('id', masterCourseId)
      .maybeSingle(),
    sb
      .from('course_variant_items')
      .select('master_course_item_id')
      .eq('course_variant_id', matchingVariant.id),
  ]);

  const variantItemIds = (variantItems ?? []).map((r) => r.master_course_item_id as string);

  return {
    variantId: matchingVariant.id,
    masterCourseId,
    displayTitle: matchingVariant.title,
    displayDescription: matchingVariant.description,
    displayCode: matchingVariant.code,
    sourceMasterCourseTitle: parent?.title ?? null,
    variantItemIds,
  };
}

/**
 * Fetch variant items for a given variantId, verifying it belongs to masterCourseId.
 */
async function _getVariantSelectedItemIds(
  variantId: string,
  masterCourseId: string,
): Promise<string[] | null> {
  const sb = createAdminClient();

  const { data: variant } = await sb
    .from('course_variants')
    .select('id')
    .eq('id', variantId)
    .eq('master_course_id', masterCourseId)
    .eq('publish_status', 'published')
    .maybeSingle();

  if (!variant) return null;

  const { data: variantItems } = await sb
    .from('course_variant_items')
    .select('master_course_item_id')
    .eq('course_variant_id', variantId)
    .order('sort_order', { ascending: true });

  return (variantItems ?? []).map((r) => r.master_course_item_id as string);
}

/**
 * Get variant + parent master course info for CollegeAdmin detail view.
 */
async function _getVariantDetailForAdmin(
  variantId: string,
  _collegeId: string,
): Promise<{
  variantId: string;
  masterCourseId: string;
  displayTitle: string;
  displayDescription: string | null;
  displayCode: string | null;
  sourceMasterCourseTitle: string | null;
  variantItemIds: string[];
} | null> {
  const sb = createAdminClient();

  const { data: variant } = await sb
    .from('course_variants')
    .select('id, master_course_id, title, description, code')
    .eq('id', variantId)
    .eq('publish_status', 'published')
    .maybeSingle();

  if (!variant) return null;

  const [{ data: parent }, { data: variantItems }] = await Promise.all([
    sb
      .from('master_courses')
      .select('title')
      .eq('id', variant.master_course_id)
      .maybeSingle(),
    sb
      .from('course_variant_items')
      .select('master_course_item_id')
      .eq('course_variant_id', variantId)
      .order('sort_order', { ascending: true }),
  ]);

  const variantItemIds = (variantItems ?? []).map((r) => r.master_course_item_id as string);

  return {
    variantId: variant.id,
    masterCourseId: variant.master_course_id,
    displayTitle: variant.title,
    displayDescription: variant.description,
    displayCode: variant.code,
    sourceMasterCourseTitle: parent?.title ?? null,
    variantItemIds,
  };
}
