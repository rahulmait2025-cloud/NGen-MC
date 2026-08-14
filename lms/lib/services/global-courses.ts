import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStudentLearningContext } from '@/lib/services/student-courses';
import {
  getStudentAccessibleCourses,
  listStudentContentEntitlements,
} from '@/lib/services/course-access-manager';
import { batchCourseProgress } from '@/lib/services/batch-course-progress';
import { normUuid } from '@/lib/utils';
import type { MasterCoursePillarsRow, MasterCoursesRow } from '@/types/database';
import {
  fetchDiscoverableVariantsForCatalog,
  loadEntitledVariantIdsForStudent,
  masterCourseCatalogKey,
  mergeDiscoverableCoursesByPillar,
  type GlobalDiscoverableCourse,
} from '@/lib/services/student-discoverable-catalog';
import {
  LEGACY_BOOTCAMP_PILLAR_ID,
  LEGACY_BOOTCAMP_PILLAR_SLUG,
  paidBuilderPillarPresentation,
  resolvePaidCourseSourceType,
} from '@/lib/services/paid-course-catalog';

export type { GlobalDiscoverableCourse, DiscoverableCatalogKind } from '@/lib/services/student-discoverable-catalog';

export interface GlobalDiscoverablePillarGroup {
  pillar: Pick<MasterCoursePillarsRow, 'id' | 'title' | 'description' | 'short_description' | 'slug'>;
  courses: GlobalDiscoverableCourse[];
}

export interface GlobalCoursePreviewModule {
  id: string;
  title: string;
  description: string | null;
  item_count: number;
}

export interface GlobalCourseDiscoveryDetail {
  course: Pick<MasterCoursesRow, 'id' | 'code' | 'title' | 'description' | 'short_description' | 'slug'>;
  pillar: Pick<MasterCoursePillarsRow, 'id' | 'title' | 'description' | 'short_description' | 'slug'>;
  modules: GlobalCoursePreviewModule[];
  module_count: number;
  video_count: number;
  entitled: boolean;
  progress_percentage: number | null;
}

/**
 * Resolve variant info for entitled course IDs.
 * Returns a map of master_course_id -> { variantId, variantTitle, variantItemIds }.
 */
async function _resolveVariantMapForStudent(
  studentId: string,
  entitledCourseIds: string[],
  collegeId?: string | null,
): Promise<Map<string, { variantId: string; variantTitle: string; variantItemIds: string[] }>> {
  if (entitledCourseIds.length === 0) return new Map();

  const sb = createAdminClient();
  const contentEntitlements = await listStudentContentEntitlements(studentId);
  const variantEntitlements = contentEntitlements.filter(
    (e) => e.assigned_entity_type === 'variant',
  );

  const candidateVariantIds = variantEntitlements.map((e) => e.assigned_entity_id);
  const candidateVariantIdSet = new Set(candidateVariantIds);

  if (collegeId) {
    const { data: assignments } = await sb
      .from('content_assignments')
      .select('assigned_entity_id')
      .eq('assignment_type', 'college')
      .eq('target_id', collegeId)
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

  if (candidateVariantIds.length === 0) return new Map();

  const { data: variants } = await sb
    .from('course_variants')
    .select('id, master_course_id, title')
    .in('id', candidateVariantIds)
    .eq('publish_status', 'published');

  if (!variants || variants.length === 0) return new Map();

  const wantIds = new Set(entitledCourseIds.map((id) => normUuid(id)));
  const matchingVariants = variants.filter(
    (v) => v.master_course_id && wantIds.has(normUuid(v.master_course_id as string)),
  );

  if (matchingVariants.length === 0) return new Map();

  const variantIds = matchingVariants.map((v) => v.id);
  const { data: allVariantItems } = await sb
    .from('course_variant_items')
    .select('course_variant_id, master_course_item_id')
    .in('course_variant_id', variantIds);

  const itemMap = new Map<string, string[]>();
  for (const row of allVariantItems ?? []) {
    const vid = row.course_variant_id as string;
    if (!itemMap.has(vid)) itemMap.set(vid, []);
    itemMap.get(vid)!.push(row.master_course_item_id as string);
  }

  const result = new Map<string, { variantId: string; variantTitle: string; variantItemIds: string[] }>();
  for (const v of matchingVariants) {
    const mcId = v.master_course_id as string;
    const itemIds = itemMap.get(v.id) ?? [];
    result.set(normUuid(mcId), {
      variantId: v.id,
      variantTitle: v.title,
      variantItemIds: itemIds,
    });
  }

  return result;
}

export async function listGlobalDiscoverableCourses(
  collegeSlug: string,
): Promise<GlobalDiscoverablePillarGroup[]> {
  const ctx = await getStudentLearningContext(collegeSlug);
  if (!ctx.isGlobal) return [];
  return listGlobalDiscoverableCoursesInner(ctx.studentId);
}

async function listGlobalDiscoverableCoursesInner(
  studentId: string,
): Promise<GlobalDiscoverablePillarGroup[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('courses', 'pillars', 'entitlements');

  const sb = createAdminClient();

  const [{ data: pillars }, { data: courses }, { data: bootcampCourses }, entitledCourseIds] = await Promise.all([
    sb.from('master_course_pillars')
      .select('id, title, description, short_description, slug')
      .eq('publish_status', 'published')
      .order('sort_order', { ascending: true }),
    sb.from('master_courses')
      .select('id, pillar_id, code, title, description, short_description, slug, is_free, pricing_model, selling_price, currency, metadata, show_as_paid_course, catalog_type, bootcamp_id, created_at')
      .eq('publish_status', 'published')
      .not('pillar_id', 'is', null)
      .order('created_at', { ascending: true }),
    sb.from('master_courses')
      .select('id, pillar_id, code, title, description, short_description, slug, is_free, pricing_model, selling_price, currency, bootcamp_id, catalog_type, show_as_paid_course, metadata, created_at')
      .eq('publish_status', 'published')
      .or('bootcamp_id.not.is.null,catalog_type.eq.bootcamp')
      .order('created_at', { ascending: true }),
    getStudentAccessibleCourses(studentId, { isGlobal: true, collegeId: null }),
  ]);

  const validBootcampCourses = (bootcampCourses ?? []).filter(
    (c) => c.catalog_type === 'bootcamp' || !!c.bootcamp_id,
  );

  if (!pillars?.length && !courses?.length && !validBootcampCourses.length) return [];

  const pillarMap = new Map((pillars ?? []).map((pillar) => [pillar.id, pillar]));
  const validCourses = (courses ?? []).filter((course) => !!course.pillar_id && pillarMap.has(course.pillar_id));

  // Bootcamp courses go under a virtual "Bootcamp" pillar
  if (validCourses.length === 0 && validBootcampCourses.length === 0) return [];

  const allCourseIds = [...validCourses.map((c) => c.id), ...validBootcampCourses.map((c) => c.id)];
  const [modulesRes, itemsRes] = await Promise.all([
    sb.from('master_course_modules')
      .select('id, master_course_id, title, description, publish_status, visible_to_students')
      .in('master_course_id', allCourseIds),
    sb.from('master_course_items')
      .select('id, master_course_id, module_id, item_type, publish_status')
      .in('master_course_id', allCourseIds),
  ]);

  const entitledIds = new Set(entitledCourseIds.map(c => c.master_course_id));

  const progressMap = await batchCourseProgress(
    studentId,
    allCourseIds.filter((id) => entitledIds.has(id)),
  );

  const grouped = new Map<string, GlobalDiscoverableCourse[]>();

  for (const course of validCourses) {
    const visibleModules = (modulesRes.data ?? []).filter(
      (module) =>
        module.master_course_id === course.id &&
        module.publish_status === 'published'
    );
    const visibleModuleIds = new Set(visibleModules.map((module) => module.id));
    const allVisibleItems = (itemsRes.data ?? []).filter(
      (item) =>
        item.master_course_id === course.id &&
        item.publish_status === 'published' &&
        visibleModuleIds.has(item.module_id)
    );

    const pillarId = course.pillar_id as string;
    const isEnrolled = entitledIds.has(course.id);
    const discoverableCourse: GlobalDiscoverableCourse = {
      catalog_key: masterCourseCatalogKey(course.id),
      catalog_kind: 'master_course',
      id: course.id,
      variant_id: null,
      pillar_id: pillarId,
      code: course.code,
      title: course.title.replace('Algotirhms', 'Algorithms'),
      parent_course_title: null,
      description: course.description,
      short_description: course.short_description,
      module_count: visibleModules.length,
      video_count: allVisibleItems.filter((item) => item.item_type === 'video').length,
      entitled: isEnrolled || !!course.is_free || course.pricing_model === 'free',
      is_enrolled: isEnrolled,
      progress_percentage: isEnrolled ? (progressMap.get(course.id)?.percentage ?? 0) : null,
      is_free: !!course.is_free,
      pricing_model: course.pricing_model,
      selling_price: course.selling_price,
      currency: course.currency,
      thumbnail_url: (course.metadata as Record<string, unknown> | null)?.thumbnail_url as string ?? null,
      show_as_paid_course: !!course.show_as_paid_course,
      paid_source_type: resolvePaidCourseSourceType(course),
      created_at: course.created_at,
    };

    grouped.set(pillarId, [...(grouped.get(pillarId) ?? []), discoverableCourse]);
  }

  // Paid Course Builder courses under virtual paid catalog pillar (slug bootcamp for URL compat)
  const BOOTCAMP_PILLAR_ID = LEGACY_BOOTCAMP_PILLAR_ID;
  for (const course of validBootcampCourses) {
    const visibleModules = (modulesRes.data ?? []).filter(
      (module) =>
        module.master_course_id === course.id &&
        module.publish_status === 'published'
    );
    const visibleModuleIds = new Set(visibleModules.map((module) => module.id));
    const allVisibleItems = (itemsRes.data ?? []).filter(
      (item) =>
        item.master_course_id === course.id &&
        item.publish_status === 'published' &&
        visibleModuleIds.has(item.module_id)
    );

    const discoverableCourse: GlobalDiscoverableCourse = {
      catalog_key: masterCourseCatalogKey(course.id),
      catalog_kind: 'master_course',
      id: course.id,
      variant_id: null,
      pillar_id: BOOTCAMP_PILLAR_ID,
      code: course.code,
      title: course.title,
      parent_course_title: null,
      description: course.description,
      short_description: course.short_description,
      module_count: visibleModules.length,
      video_count: allVisibleItems.filter((item) => item.item_type === 'video').length,
      entitled: entitledIds.has(course.id) || !!course.is_free || course.pricing_model === 'free',
      is_enrolled: entitledIds.has(course.id),
      progress_percentage: entitledIds.has(course.id) ? (progressMap.get(course.id)?.percentage ?? 0) : null,
      is_free: !!course.is_free,
      pricing_model: course.pricing_model,
      selling_price: course.selling_price,
      currency: course.currency,
      thumbnail_url: (course.metadata as Record<string, unknown> | null)?.thumbnail_url as string ?? null,
      show_as_paid_course: true,
      paid_source_type: 'paid_course_builder',
      created_at: course.created_at,
    };

    grouped.set(BOOTCAMP_PILLAR_ID, [...(grouped.get(BOOTCAMP_PILLAR_ID) ?? []), discoverableCourse]);
  }

  const publishedPillarIds = new Set((pillars ?? []).map((p) => p.id as string));
  const entitledVariantIds = await loadEntitledVariantIdsForStudent(studentId);
  const variantRows = await fetchDiscoverableVariantsForCatalog({
    collegeId: null,
    publishedPillarIds,
    entitledMasterCourseIds: entitledIds,
    entitledVariantIds,
    studentId: studentId,
  });
  mergeDiscoverableCoursesByPillar(
    grouped,
    variantRows,
    (row) => row.pillar_id,
  );

  const pillarGroups: GlobalDiscoverablePillarGroup[] = (pillars ?? []).reduce((acc, pillar) => {
    const courses = (grouped.get(pillar.id) ?? []).sort((a, b) =>
      String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''))
    );
    if (courses.length > 0) {
      acc.push({
        pillar: { id: pillar.id, title: pillar.title, description: pillar.description, short_description: pillar.short_description, slug: pillar.slug },
        courses,
      });
    }
    return acc;
  }, [] as GlobalDiscoverablePillarGroup[]);

  // Add virtual paid course builder pillar group if there are builder courses
  const bootcampGrouped = grouped.get(BOOTCAMP_PILLAR_ID) ?? [];
  if (bootcampGrouped.length > 0) {
    const paidBuilderPresentation = paidBuilderPillarPresentation();
    pillarGroups.unshift({
      pillar: {
        id: BOOTCAMP_PILLAR_ID,
        title: paidBuilderPresentation.title,
        description: paidBuilderPresentation.description,
        short_description: paidBuilderPresentation.short_description,
        slug: LEGACY_BOOTCAMP_PILLAR_SLUG,
      },
      courses: bootcampGrouped.sort((a, b) =>
        String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''))
      ),
    });
  }

  return pillarGroups;
}

/**
 * College LMS: catalog of published, college-visible courses per pillar - same discovery shape as
 * {@link listGlobalDiscoverableCourses}. Entitlement gates **Start course** (`entitled`),
 * but rows appear for enrolled and non-enrolled students so pillar pages align with sidebar.
 */
export async function listCollegeDiscoverableCourses(
  collegeSlug: string,
): Promise<GlobalDiscoverablePillarGroup[]> {
  const ctx = await getStudentLearningContext(collegeSlug);
  if (ctx.isGlobal || !ctx.collegeId) return [];
  return listCollegeDiscoverableCoursesInner(ctx.studentId, ctx.collegeId);
}

async function listCollegeDiscoverableCoursesInner(
  studentId: string,
  collegeId: string,
): Promise<GlobalDiscoverablePillarGroup[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('courses', 'pillars', 'entitlements');

  const sb = createAdminClient();

  const entitledAccess = await getStudentAccessibleCourses(studentId, {
    isGlobal: false,
    collegeId: collegeId,
  });
  const entitledCourseIds = entitledAccess.map((a) => a.master_course_id);

  const [{ data: allPillars }, { data: allPublishedCourses }, { data: bootcampCourses }] = await Promise.all([
    sb
      .from('master_course_pillars')
      .select('id, title, description, short_description, slug, visible_to_college_students')
      .eq('publish_status', 'published')
      .order('sort_order', { ascending: true }),
    sb
      .from('master_courses')
      .select('id, pillar_id, code, title, description, short_description, slug, is_free, pricing_model, selling_price, currency, metadata, show_as_paid_course, catalog_type, bootcamp_id, created_at')
      .eq('publish_status', 'published')
      .eq('visible_to_college_students', true)
      .not('pillar_id', 'is', null)
      .order('created_at', { ascending: true }),
    sb
      .from('master_courses')
      .select('id, pillar_id, code, title, description, short_description, slug, is_free, pricing_model, selling_price, currency, bootcamp_id, catalog_type, show_as_paid_course, metadata, created_at')
      .eq('publish_status', 'published')
      .or('bootcamp_id.not.is.null,catalog_type.eq.bootcamp')
      .order('created_at', { ascending: true }),
  ]);

  const validBootcampCourses = (bootcampCourses ?? []).filter(
    (c) => c.catalog_type === 'bootcamp' || !!c.bootcamp_id,
  );

  const pillars = (allPillars ?? []).filter(p => p.visible_to_college_students);

  if (!pillars?.length && !(allPublishedCourses?.length) && validBootcampCourses.length === 0) {
    return [];
  }

  const pillarMap = new Map(pillars.map((pillar) => [pillar.id, pillar]));
  const validCourses = (allPublishedCourses ?? []).filter((course) => !!course.pillar_id && pillarMap.has(course.pillar_id));

  const allCourseIds = [...validCourses.map((c) => c.id), ...validBootcampCourses.map((c) => c.id)];
  if (allCourseIds.length === 0) return [];

  const [modulesRes, itemsRes] = await Promise.all([
    sb
      .from('master_course_modules')
      .select('id, master_course_id, title, description, publish_status, visible_to_students')
      .in('master_course_id', allCourseIds),
    sb
      .from('master_course_items')
      .select('id, master_course_id, module_id, item_type, publish_status')
      .in('master_course_id', allCourseIds),
  ]);

  const entitledIds = new Set(entitledCourseIds);

  const progressMap = await batchCourseProgress(
    studentId,
    allCourseIds.filter((id) => entitledIds.has(id)),
  );

  const grouped = new Map<string, GlobalDiscoverableCourse[]>();

  for (const course of validCourses) {
    const visibleModules = (modulesRes.data ?? []).filter(
      (module) =>
        module.master_course_id === course.id &&
        module.publish_status === 'published',
    );
    const visibleModuleIds = new Set(visibleModules.map((module) => module.id));
    const allVisibleItems = (itemsRes.data ?? []).filter(
      (item) =>
        item.master_course_id === course.id &&
        item.publish_status === 'published' &&
        visibleModuleIds.has(item.module_id),
    );

    const pillarId = course.pillar_id as string;
    const isEnrolled = entitledIds.has(course.id);
    const discoverableCourse: GlobalDiscoverableCourse = {
      catalog_key: masterCourseCatalogKey(course.id),
      catalog_kind: 'master_course',
      id: course.id,
      variant_id: null,
      pillar_id: pillarId,
      code: course.code,
      title: course.title.replace('Algotirhms', 'Algorithms'),
      parent_course_title: null,
      description: course.description,
      short_description: course.short_description,
      module_count: visibleModules.length,
      video_count: allVisibleItems.filter((item) => item.item_type === 'video').length,
      entitled: isEnrolled,
      is_enrolled: isEnrolled,
      progress_percentage: isEnrolled ? (progressMap.get(course.id)?.percentage ?? 0) : null,
      is_free: !!course.is_free || course.pricing_model === 'free',
      pricing_model: course.pricing_model,
      selling_price: course.selling_price,
      currency: course.currency,
      thumbnail_url: (course.metadata as Record<string, unknown> | null)?.thumbnail_url as string ?? null,
      show_as_paid_course: !!course.show_as_paid_course,
      paid_source_type: resolvePaidCourseSourceType(course),
      created_at: course.created_at,
    };

    grouped.set(pillarId, [...(grouped.get(pillarId) ?? []), discoverableCourse]);
  }

  const BOOTCAMP_PILLAR_ID = LEGACY_BOOTCAMP_PILLAR_ID;
  for (const course of validBootcampCourses) {
    const visibleModules = (modulesRes.data ?? []).filter(
      (module) =>
        module.master_course_id === course.id &&
        module.publish_status === 'published',
    );
    const visibleModuleIds = new Set(visibleModules.map((module) => module.id));
    const allVisibleItems = (itemsRes.data ?? []).filter(
      (item) =>
        item.master_course_id === course.id &&
        item.publish_status === 'published' &&
        visibleModuleIds.has(item.module_id),
    );

    const discoverableCourse: GlobalDiscoverableCourse = {
      catalog_key: masterCourseCatalogKey(course.id),
      catalog_kind: 'master_course',
      id: course.id,
      variant_id: null,
      pillar_id: BOOTCAMP_PILLAR_ID,
      code: course.code,
      title: course.title,
      parent_course_title: null,
      description: course.description,
      short_description: course.short_description,
      module_count: visibleModules.length,
      video_count: allVisibleItems.filter((item) => item.item_type === 'video').length,
      entitled: entitledIds.has(course.id),
      is_enrolled: entitledIds.has(course.id),
      progress_percentage: entitledIds.has(course.id) ? (progressMap.get(course.id)?.percentage ?? 0) : null,
      is_free: !!course.is_free || course.pricing_model === 'free',
      pricing_model: course.pricing_model,
      selling_price: course.selling_price,
      currency: course.currency,
      thumbnail_url: (course.metadata as Record<string, unknown> | null)?.thumbnail_url as string ?? null,
      show_as_paid_course: true,
      paid_source_type: 'paid_course_builder',
      created_at: course.created_at,
    };

    grouped.set(BOOTCAMP_PILLAR_ID, [...(grouped.get(BOOTCAMP_PILLAR_ID) ?? []), discoverableCourse]);
  }

  const publishedPillarIds = new Set(pillars.map((p) => p.id as string));
  const entitledVariantIds = await loadEntitledVariantIdsForStudent(studentId);
  const variantRows = await fetchDiscoverableVariantsForCatalog({
    collegeId: collegeId,
    publishedPillarIds,
    requireCollegeVisibleParent: true,
    entitledMasterCourseIds: entitledIds,
    entitledVariantIds,
    studentId: studentId,
  });
  mergeDiscoverableCoursesByPillar(
    grouped,
    variantRows,
    (row) => row.pillar_id,
  );

  const pillarGroups: GlobalDiscoverablePillarGroup[] = (pillars ?? []).reduce((acc, pillar) => {
    const courses = (grouped.get(pillar.id) ?? []).sort((a, b) =>
      String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''))
    );
    if (courses.length > 0) {
      acc.push({
        pillar: { id: pillar.id, title: pillar.title, description: pillar.description, short_description: pillar.short_description, slug: pillar.slug },
        courses,
      });
    }
    return acc;
  }, [] as GlobalDiscoverablePillarGroup[]);

  // Add virtual paid course builder pillar group if there are builder courses
  const bootcampGrouped = grouped.get(BOOTCAMP_PILLAR_ID) ?? [];
  if (bootcampGrouped.length > 0) {
    const paidBuilderPresentation = paidBuilderPillarPresentation();
    pillarGroups.unshift({
      pillar: {
        id: BOOTCAMP_PILLAR_ID,
        title: paidBuilderPresentation.title,
        description: paidBuilderPresentation.description,
        short_description: paidBuilderPresentation.short_description,
        slug: LEGACY_BOOTCAMP_PILLAR_SLUG,
      },
      courses: bootcampGrouped.sort((a, b) =>
        String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''))
      ),
    });
  }

  return pillarGroups;
}

async function _getAccessibleCollegeCourseIds(studentId: string, collegeId: string): Promise<string[]> {
  const access = await getStudentAccessibleCourses(studentId, {
    isGlobal: false,
    collegeId,
  });

  return access.map((row) => row.master_course_id);
}

export interface GlobalCoursePurchaseInfo {
  variantId: string;
  priceMinor: number;
  currency: string;
  title: string;
}

export interface CoursePricePlanInfo {
  id: string;
  plan_name: string;
  description: string | null;
  validity_days: number | null;
  price_minor: number;
  currency: string;
  is_default: boolean;
}

export async function getGlobalCoursePurchaseInfo(
  courseId: string,
): Promise<GlobalCoursePurchaseInfo | null> {
  const sb = createAdminClient();

  // First try to get active price plans
  const { data: plans } = await sb
    .rpc('get_active_price_plans', { p_master_course_id: courseId });

  if (plans && plans.length > 0) {
    const defaultPlan = (plans as CoursePricePlanInfo[]).find((p) => p.is_default) ?? plans[0];
    return {
      variantId: defaultPlan.id,
      priceMinor: defaultPlan.price_minor,
      currency: defaultPlan.currency,
      title: defaultPlan.plan_name,
    };
  }

  const { getCachedMasterCourse } = await import('@/lib/services/course-cache');
  const course = await getCachedMasterCourse(courseId);

  if (!course || course.is_free || course.pricing_model === 'free') return null;
  if (!course.selling_price) return null;

  return {
    variantId: course.id,
    priceMinor: course.selling_price,
    currency: course.currency ?? 'INR',
    title: course.title,
  };
}

export async function getCoursePricePlans(
  courseId: string,
): Promise<CoursePricePlanInfo[]> {
  const sb = createAdminClient();

  const { data: plans } = await sb
    .rpc('get_active_price_plans', { p_master_course_id: courseId });

  return (plans as CoursePricePlanInfo[]) ?? [];
}





