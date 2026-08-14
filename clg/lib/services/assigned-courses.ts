import { cacheTag, cacheLife } from 'next/cache';
import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { isAssignmentActive } from '@/lib/services/access-helpers';
import {
  getAssignedBundleDetail,
  getAssignedBundleStats,
  type AssignedBundleDetailData,
} from '@/lib/services/assigned-bundle-resolver';

export type { AssignedBundleDetailData };
import type {
  ContentAssignmentsRow,
  CourseBundlesRow,
  CourseVariantsRow,
  MasterCourseDeliveryStatsRow,
  MasterCourseItemsRow,
  MasterCourseModulesRow,
  MasterCoursePillarsRow,
  MasterCoursesRow,
  VideoAssetsRow,
} from '@/types/database';

type AssignedEntityType = 'master_course' | 'variant' | 'bundle';

export interface AssignedCourseListItem {
  id: string;
  assignment_id: string | null;
  assigned_entity_type: AssignedEntityType;
  assigned_entity_id: string;
  assignment_status: string | null;
  start_date: string | null;
  end_date: string | null;
  title: string;
  code: string;
  description: string | null;
  publish_status: string;
  lifecycle_status: string | null;
  module_count: number;
  video_count: number;
  detail_supported: boolean;
  assignment_state: 'assigned' | 'not_assigned';
}

export interface AssignedPillarGroup {
  pillar: {
    id: string;
    title: string;
    short_description: string | null;
    sort_order: number;
  };
  courses: AssignedCourseListItem[];
}

export interface AssignedCourseDetailData {
  course: MasterCoursesRow;
  pillar: MasterCoursePillarsRow;
  modules: MasterCourseModulesRow[];
  items: MasterCourseItemsRow[];
  videos: Record<string, VideoAssetsRow>;
  /** Present when the viewed entity is a variant */
  variantInfo?: {
    variantId: string;
    displayTitle: string;
    displayDescription: string | null;
    displayCode: string | null;
    variantItemIds: string[];
    sourceMasterCourseTitle: string;
  } | null;
}

interface ActiveAssignment extends ContentAssignmentsRow {
  assigned_entity_type: AssignedEntityType;
}

interface AssignmentEntityRecord {
  id: string;
  title: string;
  code: string;
  description: string | null;
  publish_status: string;
  lifecycle_status: string | null;
  pillar_id: string | null;
  detail_supported: boolean;
}

function isActiveAssignmentNow(assignment: ContentAssignmentsRow): boolean {
  return isAssignmentActive(assignment);
}

async function getCourseStats(
  courseIds: string[],
): Promise<Map<string, { module_count: number; video_count: number }>> {
  const stats = new Map<string, { module_count: number; video_count: number }>();
  if (courseIds.length === 0) {
    return stats;
  }

  const sb = createAdminClient();
  const { data, error } = await sb
    .from('master_course_delivery_stats')
    .select('master_course_id, module_count, video_count')
    .in('master_course_id', courseIds);

  if (error || !data) {
    return stats;
  }

  for (const row of data as MasterCourseDeliveryStatsRow[]) {
    stats.set(row.master_course_id, {
      module_count: row.module_count,
      video_count: row.video_count,
    });
  }

  return stats;
}

async function getVariantStats(
  variantIds: string[],
): Promise<Map<string, { module_count: number; video_count: number }>> {
  const stats = new Map<string, { module_count: number; video_count: number }>();
  if (variantIds.length === 0) {
    return stats;
  }

  const sb = createAdminClient();
  const { data: variantItems, error: variantItemsError } = await sb
    .from('course_variant_items')
    .select('course_variant_id, master_course_item_id')
    .in('course_variant_id', variantIds);

  if (variantItemsError || !variantItems) {
    for (const id of variantIds) {
      stats.set(id, { module_count: 0, video_count: 0 });
    }
    return stats;
  }

  if (variantItems.length === 0) {
    for (const id of variantIds) {
      stats.set(id, { module_count: 0, video_count: 0 });
    }
    return stats;
  }

  const itemIds = [...new Set(variantItems.map((row) => row.master_course_item_id as string))];
  const { data: items, error: itemsError } = await sb
    .from('master_course_items')
    .select('id, module_id, item_type')
    .in('id', itemIds)
    .eq('publish_status', 'published');

  const itemById = new Map(
    (itemsError || !items ? [] : items).map((item) => [item.id as string, item]),
  );

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

    stats.set(variantId, { module_count: moduleIds.size, video_count: videoCount });
  }

  return stats;
}

async function loadActiveCollegeAssignments(collegeId: string): Promise<ActiveAssignment[]> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('content_assignments')
    .select('*')
    .eq('assignment_type', 'college')
    .eq('target_id', collegeId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  const result: ActiveAssignment[] = [];
  for (const assignment of (data as ContentAssignmentsRow[])) {
    if (isActiveAssignmentNow(assignment)) {
      result.push(assignment as ActiveAssignment);
    }
  }
  return result;
}

async function loadVariantEntities(variantIds: string[]): Promise<AssignmentEntityRecord[]> {
  if (variantIds.length === 0) {
    return [];
  }

  const sb = createAdminClient();
  const { data, error } = await sb
    .from('course_variants')
    .select('id, title, code, description, publish_status, master_course_id, master_courses ( id, pillar_id )')
    .in('id', variantIds);

  if (error || !data) {
    return [];
  }

  return (data as unknown as Array<CourseVariantsRow & { master_courses?: { id: string; pillar_id: string | null } | null }>).map((variant) => ({
    id: variant.id,
    title: variant.title,
    code: variant.code,
    description: variant.description ?? null,
    publish_status: variant.publish_status,
    lifecycle_status: null,
    pillar_id: Array.isArray(variant.master_courses)
      ? (variant.master_courses[0]?.pillar_id ?? null)
      : (variant.master_courses?.pillar_id ?? null),
    detail_supported: true,
  }));
}

async function loadAllPublishedVariantsForCollege(): Promise<AssignmentEntityRecord[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('course_variants')
    .select('id, title, code, description, publish_status, master_course_id, master_courses ( id, pillar_id, publish_status, visible_to_college_admins )')
    .eq('publish_status', 'published');

  if (error || !data) {
    return [];
  }

  return (data as unknown as Array<CourseVariantsRow & { master_courses?: { id: string; pillar_id: string | null; publish_status: string; visible_to_college_admins: boolean } | null }>).reduce((acc, variant) => {
    const mc = Array.isArray(variant.master_courses) ? variant.master_courses[0] : variant.master_courses;
    if (mc && mc.publish_status === 'published' && mc.visible_to_college_admins === true && mc.pillar_id !== null) {
      acc.push({
        id: variant.id,
        title: variant.title,
        code: variant.code,
        description: variant.description ?? null,
        publish_status: variant.publish_status,
        lifecycle_status: null,
        pillar_id: mc?.pillar_id ?? null,
        detail_supported: true,
      });
    }
    return acc;
  }, [] as AssignmentEntityRecord[]);
}

async function loadBundleEntities(bundleIds: string[]): Promise<AssignmentEntityRecord[]> {
  if (bundleIds.length === 0) {
    return [];
  }

  const sb = createAdminClient();
  const { data, error } = await sb
    .from('course_bundles')
    .select('id, title, code, description, publish_status, lifecycle_status')
    .in('id', bundleIds);

  if (error || !data) {
    return [];
  }

  return (data as Array<CourseBundlesRow>).map((bundle) => ({
    id: bundle.id,
    title: bundle.title,
    code: bundle.code,
    description: bundle.description ?? null,
    publish_status: bundle.publish_status,
    lifecycle_status: bundle.lifecycle_status,
    pillar_id: null,
    detail_supported: true,
  }));
}

async function loadAllVisibleMasterCoursesForCollege(): Promise<AssignmentEntityRecord[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('master_courses')
    .select('id, title, code, description, publish_status, pillar_id')
    .eq('publish_status', 'published')
    .eq('visible_to_college_admins', true)
    .not('pillar_id', 'is', null);

  if (error || !data) {
    return [];
  }

  return (data as Array<MasterCoursesRow>).map((course) => ({
    id: course.id,
    title: course.title,
    code: course.code,
    description: course.description,
    publish_status: course.publish_status,
    lifecycle_status: null,
    pillar_id: course.pillar_id,
    detail_supported: true,
  }));
}

/**
 * Internal implementation of listAssignedCoursesForCollegeAdmin.
 * This is wrapped by unstable_cache for caching.
 */
async function _listAssignedCoursesForCollegeAdminInternal(
  collegeId: string,
): Promise<AssignedPillarGroup[]> {
  const assignments = await loadActiveCollegeAssignments(collegeId);

  const courseAssignments = assignments.filter((assignment) => assignment.assigned_entity_type === 'master_course');
  const variantAssignments = assignments.filter((assignment) => assignment.assigned_entity_type === 'variant');
  const bundleAssignments = assignments.filter((assignment) => assignment.assigned_entity_type === 'bundle');

  const assignedEntityIds = new Set(courseAssignments.map((a) => a.assigned_entity_id));
  const assignmentIdMap = new Map(courseAssignments.map((a) => [a.assigned_entity_id, a.id]));
  const assignmentStatusMap = new Map(courseAssignments.map((a) => [a.assigned_entity_id, a.status]));
  const assignmentStartDateMap = new Map(courseAssignments.map((a) => [a.assigned_entity_id, a.start_date]));
  const assignmentEndDateMap = new Map(courseAssignments.map((a) => [a.assigned_entity_id, a.end_date]));

  const assignedVariantIds = variantAssignments.map((assignment) => assignment.assigned_entity_id);
  const assignedVariantAssignmentMap = new Map(variantAssignments.map((a) => [a.assigned_entity_id, a]));

  const [allMasterCourses, assignedVariants, allPublishedVariants, bundles] = await Promise.all([
    loadAllVisibleMasterCoursesForCollege(),
    loadVariantEntities(assignedVariantIds),
    loadAllPublishedVariantsForCollege(),
    loadBundleEntities(bundleAssignments.map((assignment) => assignment.assigned_entity_id)),
  ]);

  const publishedVariantMap = new Map(allPublishedVariants.map((v) => [v.id, v]));
  for (const variant of assignedVariants) {
    publishedVariantMap.set(variant.id, variant);
  }
  const variants = Array.from(publishedVariantMap.values());

  const bundleMap = new Map(bundles.map((bundle) => [bundle.id, bundle]));

  const masterCourseIds = allMasterCourses.map((course) => course.id);
  const variantIds = variants.map((variant) => variant.id);
  const bundleIds = bundles.map((bundle) => bundle.id);
  const [courseStats, variantStats, bundleStats] = await Promise.all([
    getCourseStats(masterCourseIds),
    getVariantStats(variantIds),
    getAssignedBundleStats(bundleIds),
  ]);

  const sb = createAdminClient();
  const pillarIds = new Set<string>();

  for (const course of allMasterCourses) {
    if (course.pillar_id) {
      pillarIds.add(course.pillar_id);
    }
  }

  if (variantIds.length > 0) {
    const { data: variantCourses } = await sb
      .from('course_variants')
      .select('id, master_courses ( pillar_id )')
      .in('id', variantIds);

    for (const row of variantCourses ?? []) {
      const variantRow = row as unknown as { master_courses?: { pillar_id: string | null } | null };
      const mc = variantRow.master_courses;
      const pillarId = Array.isArray(mc) ? (mc[0]?.pillar_id ?? null) : (mc?.pillar_id ?? null);
      if (pillarId) {
        pillarIds.add(pillarId);
      }
    }
  }

  const { data: pillars } = await sb
    .from('master_course_pillars')
    .select('id, title, short_description, sort_order')
    .eq('publish_status', 'published')
    .in('id', Array.from(pillarIds));

  const pillarMap = new Map((pillars ?? []).map((pillar) => [pillar.id, pillar]));
  const groups = new Map<string, AssignedPillarGroup>();

  function ensureGroup(groupId: string, title: string, shortDescription: string | null, sortOrder: number) {
    if (!groups.has(groupId)) {
      groups.set(groupId, {
        pillar: { id: groupId, title, short_description: shortDescription, sort_order: sortOrder },
        courses: [],
      });
    }

    return groups.get(groupId)!;
  }

  for (const course of allMasterCourses) {
    const isAssigned = assignedEntityIds.has(course.id);
    const courseStatsEntry = courseStats.get(course.id) ?? { module_count: 0, video_count: 0 };
    const pillar = course.pillar_id ? pillarMap.get(course.pillar_id) : null;
    const group = pillar
      ? ensureGroup(pillar.id, pillar.title, pillar.short_description, pillar.sort_order)
      : ensureGroup('assigned-content', 'Assigned Content', 'Content explicitly assigned to this college.', 9999);

    group.courses.push({
      id: course.id,
      assignment_id: isAssigned ? (assignmentIdMap.get(course.id) ?? null) : null,
      assigned_entity_type: 'master_course',
      assigned_entity_id: course.id,
      assignment_status: isAssigned ? (assignmentStatusMap.get(course.id) ?? null) : null,
      start_date: isAssigned ? (assignmentStartDateMap.get(course.id) ?? null) : null,
      end_date: isAssigned ? (assignmentEndDateMap.get(course.id) ?? null) : null,
      title: course.title,
      code: course.code,
      description: course.description ?? null,
      publish_status: course.publish_status,
      lifecycle_status: null,
      module_count: courseStatsEntry.module_count,
      video_count: courseStatsEntry.video_count,
      detail_supported: true,
      assignment_state: isAssigned ? 'assigned' : 'not_assigned',
    });
  }

  for (const variant of variants) {
    const assignment = assignedVariantAssignmentMap.get(variant.id);

    const pillar = variant.pillar_id ? pillarMap.get(variant.pillar_id) : null;
    const group = pillar
      ? ensureGroup(pillar.id, pillar.title, pillar.short_description, pillar.sort_order)
      : ensureGroup('assigned-content', 'Assigned Content', 'Content explicitly assigned to this college.', 9999);

    const variantStatsEntry = variantStats.get(variant.id) ?? { module_count: 0, video_count: 0 };

    group.courses.push({
      id: variant.id,
      assignment_id: assignment?.id ?? null,
      assigned_entity_type: 'variant',
      assigned_entity_id: variant.id,
      assignment_status: assignment?.status ?? null,
      start_date: assignment?.start_date ?? null,
      end_date: assignment?.end_date ?? null,
      title: variant.title,
      code: variant.code,
      description: variant.description ?? null,
      publish_status: variant.publish_status,
      lifecycle_status: null,
      module_count: variantStatsEntry.module_count,
      video_count: variantStatsEntry.video_count,
      detail_supported: variant.detail_supported,
      assignment_state: assignment ? 'assigned' as const : 'not_assigned' as const,
    });
  }

  for (const assignment of bundleAssignments) {
    const bundle = bundleMap.get(assignment.assigned_entity_id);
    if (!bundle) {
      continue;
    }

    const group = ensureGroup('assigned-content', 'Assigned Content', 'Content explicitly assigned to this college.', 9999);
    const bundleStatsEntry = bundleStats.get(bundle.id) ?? {
      module_count: 0,
      video_count: 0,
      lesson_count: 0,
      total_duration_seconds: 0,
    };

    group.courses.push({
      id: bundle.id,
      assignment_id: assignment.id,
      assigned_entity_type: 'bundle',
      assigned_entity_id: assignment.assigned_entity_id,
      assignment_status: assignment.status,
      start_date: assignment.start_date,
      end_date: assignment.end_date,
      title: bundle.title,
      code: bundle.code,
      description: bundle.description ?? null,
      publish_status: bundle.publish_status,
      lifecycle_status: bundle.lifecycle_status ?? null,
      module_count: bundleStatsEntry.module_count,
      video_count: bundleStatsEntry.video_count,
      detail_supported: bundle.detail_supported,
      assignment_state: 'assigned' as const,
    });
  }

  const result = Array.from(groups.values())
    .map((group) => ({
      ...group,
      courses: group.courses.sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => a.pillar.sort_order - b.pillar.sort_order || a.pillar.title.localeCompare(b.pillar.title));
  
  return result;
}

// Cached version with 5s revalidation for near-instant content visibility
// Note: Content assignments are managed in SuperAdmin — short TTL ensures
// newly published courses/pillars appear almost immediately.
async function _listAssignedCoursesForCollegeAdminCached(collegeId: string): Promise<AssignedPillarGroup[]> {
  'use cache';
  cacheLife('halfMinute');
  cacheTag('college-admin-assigned-courses');
  return _listAssignedCoursesForCollegeAdminInternal(collegeId);
}

/**
 * Get assigned courses grouped by pillar for a college admin.
 * Cached for 60 seconds to reduce DB load on every page navigation.
 */
export async function listAssignedCoursesForCollegeAdmin(
  collegeId: string,
): Promise<AssignedPillarGroup[]> {
  return _listAssignedCoursesForCollegeAdminCached(collegeId);
}

export interface ExpiredAssignmentCourse {
  id: string;
  assigned_entity_type: 'master_course' | 'variant' | 'bundle';
  title: string;
  code: string;
  description: string | null;
  end_date: string | null;
  module_count: number;
  video_count: number;
  affected_students_count: number;
}

/**
 * Fetch expired content assignments for a college.
 * Returns courses whose assignments have passed their end_date.
 */
export async function listExpiredAssignmentsForCollegeAdmin(
  collegeId: string,
): Promise<ExpiredAssignmentCourse[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('expired-assignments');
  const sb = createAdminClient();
  const now = new Date().toISOString();

  // Fetch expired assignments (status = 'active' but end_date has passed)
  const { data: assignments, error } = await sb
    .from('content_assignments')
    .select('id, assigned_entity_type, assigned_entity_id, status, start_date, end_date')
    .eq('assignment_type', 'college')
    .eq('target_id', collegeId)
    .eq('status', 'active')
    .not('end_date', 'is', null)
    .lt('end_date', now)
    .order('end_date', { ascending: false });

  if (error || !assignments || assignments.length === 0) {
    return [];
  }

  // Group by entity type
  const courseAssignments = assignments.filter((a) => a.assigned_entity_type === 'master_course');
  const variantAssignments = assignments.filter((a) => a.assigned_entity_type === 'variant');
  const bundleAssignments = assignments.filter((a) => a.assigned_entity_type === 'bundle');

  const results: ExpiredAssignmentCourse[] = [];

  // Fetch master course details
  if (courseAssignments.length > 0) {
    const courseIds = courseAssignments.map((a) => a.assigned_entity_id);
    const [coursesRes, statsRes, studentCountRes] = await Promise.all([
      sb.from('master_courses').select('id, title, code, description').in('id', courseIds),
      sb.from('master_course_delivery_stats').select('master_course_id, module_count, video_count').in('master_course_id', courseIds),
      sb.from('student_content_entitlements').select('assigned_entity_id').eq('source_type', 'college_assignment').in('assigned_entity_id', courseIds),
    ]);

    const statsMap = new Map((statsRes.data ?? []).map((s) => [s.master_course_id, s]));
    const courseMap = new Map((coursesRes.data ?? []).map((c) => [c.id, c]));
    const studentCountMap = new Map<string, number>();
    for (const row of studentCountRes.data ?? []) {
      const id = row.assigned_entity_id as string;
      studentCountMap.set(id, (studentCountMap.get(id) ?? 0) + 1);
    }

    for (const a of courseAssignments) {
      const course = courseMap.get(a.assigned_entity_id);
      if (course) {
        const stats = statsMap.get(course.id);
        results.push({
          id: course.id,
          assigned_entity_type: 'master_course',
          title: course.title,
          code: course.code,
          description: course.description,
          end_date: a.end_date,
          module_count: stats?.module_count ?? 0,
          video_count: stats?.video_count ?? 0,
          affected_students_count: studentCountMap.get(course.id) ?? 0,
        });
      }
    }
  }

  // Fetch variant details
  if (variantAssignments.length > 0) {
    const variantIds = variantAssignments.map((a) => a.assigned_entity_id);
    const [variantsRes, _statsRes, studentCountRes] = await Promise.all([
      sb.from('course_variants').select('id, title, code, description').in('id', variantIds),
      sb.from('course_variant_stats').select('variant_id, module_count, video_count').in('variant_id', variantIds).maybeSingle(),
      sb.from('student_content_entitlements').select('assigned_entity_id').eq('source_type', 'college_assignment').in('assigned_entity_id', variantIds),
    ]);

    const variantMap = new Map((variantsRes.data ?? []).map((v) => [v.id, v]));
    const studentCountMap = new Map<string, number>();
    for (const row of studentCountRes.data ?? []) {
      const id = row.assigned_entity_id as string;
      studentCountMap.set(id, (studentCountMap.get(id) ?? 0) + 1);
    }

    for (const a of variantAssignments) {
      const variant = variantMap.get(a.assigned_entity_id);
      if (variant) {
        results.push({
          id: variant.id,
          assigned_entity_type: 'variant',
          title: variant.title,
          code: variant.code,
          description: variant.description,
          end_date: a.end_date,
          module_count: 0,
          video_count: 0,
          affected_students_count: studentCountMap.get(variant.id) ?? 0,
        });
      }
    }
  }

  // Fetch bundle details
  if (bundleAssignments.length > 0) {
    const bundleIds = bundleAssignments.map((a) => a.assigned_entity_id);
    const [bundlesRes, studentCountRes] = await Promise.all([
      sb.from('course_bundles').select('id, title, code, description').in('id', bundleIds),
      sb.from('student_content_entitlements').select('assigned_entity_id').eq('source_type', 'college_assignment').in('assigned_entity_id', bundleIds),
    ]);

    const bundleMap = new Map((bundlesRes.data ?? []).map((b) => [b.id, b]));
    const studentCountMap = new Map<string, number>();
    for (const row of studentCountRes.data ?? []) {
      const id = row.assigned_entity_id as string;
      studentCountMap.set(id, (studentCountMap.get(id) ?? 0) + 1);
    }

    for (const a of bundleAssignments) {
      const bundle = bundleMap.get(a.assigned_entity_id);
      if (bundle) {
        results.push({
          id: bundle.id,
          assigned_entity_type: 'bundle',
          title: bundle.title,
          code: bundle.code,
          description: bundle.description,
          end_date: a.end_date,
          module_count: 0,
          video_count: 0,
          affected_students_count: studentCountMap.get(bundle.id) ?? 0,
        });
      }
    }
  }

  return results;
}

interface NavPillarSummary {
  id: string;
  title: string;
  sort_order: number;
}

async function _getAssignedCourseNavSummaryCached(_collegeId: string): Promise<NavPillarSummary[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('college-admin-nav-summary');
  const sb = createAdminClient();

  // Fetch ALL published pillars visible to college admins
  const { data: pillars, error } = await sb
    .from('master_course_pillars')
    .select('id, title, sort_order')
    .eq('publish_status', 'published')
    .eq('visible_to_college_admins', true)
    .order('sort_order', { ascending: true });

  if (error || !pillars) {
    return [];
  }

  return pillars.map((p) => ({
    id: p.id as string,
    title: p.title as string,
    sort_order: p.sort_order as number,
  }));
}

/**
 * All published pillars visible to college admins for sidebar navigation.
 * Returns {id, title, sort_order} for every published pillar with
 * visible_to_college_admins = true, regardless of assignment status.
 * Cached for 5 minutes.
 *
 * @param collegeId - Required for cache key scoping (unused in query, kept for API compatibility).
 */
export async function getAssignedCourseNavSummaryForCollegeAdmin(
  collegeId: string,
): Promise<NavPillarSummary[]> {
  return _getAssignedCourseNavSummaryCached(collegeId);
}

/**
 * Get full details for a published course (or variant).
 */
export async function getAssignedCourseDetailForCollegeAdmin(
  collegeId: string,
  courseId: string,
): Promise<AssignedCourseDetailData | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('assigned-course-detail');
  const sb = createAdminClient();

  // 1. Try as master_course first
  const { data: course, error: courseError } = await sb
    .from('master_courses')
    .select('*')
    .eq('id', courseId)
    .not('pillar_id', 'is', null)
    .eq('publish_status', 'published')
    .maybeSingle();

  let masterCourseId: string;
  let effectiveCourseRow: MasterCoursesRow;
  let variantInfo: AssignedCourseDetailData['variantInfo'] = null;

  if (courseError || !course || !course.pillar_id) {
    // 2. Not a master_course — try as variant
    const { data: variant } = await sb
      .from('course_variants')
      .select('id, master_course_id, title, description, code, publish_status')
      .eq('id', courseId)
      .eq('publish_status', 'published')
      .maybeSingle();

    if (!variant) {
      return null;
    }

    masterCourseId = variant.master_course_id as string;

    const { data: parentCourse } = await sb
      .from('master_courses')
      .select('*')
      .eq('id', masterCourseId)
      .not('pillar_id', 'is', null)
      .eq('publish_status', 'published')
      .maybeSingle();

    if (!parentCourse || !parentCourse.pillar_id) {
      return null;
    }

    effectiveCourseRow = parentCourse;

    const { data: variantItems } = await sb
      .from('course_variant_items')
      .select('master_course_item_id')
      .eq('course_variant_id', variant.id);

    const variantItemIds = (variantItems ?? []).map((r) => r.master_course_item_id as string);

    variantInfo = {
      variantId: variant.id,
      displayTitle: variant.title,
      displayDescription: variant.description ?? null,
      displayCode: variant.code,
      variantItemIds,
      sourceMasterCourseTitle: parentCourse.title,
    };
  } else {
    masterCourseId = courseId;
    effectiveCourseRow = course;
  }

  // 3. Access check & Content Resolution
  let hasAccess = false;

  const { data: assignments } = await sb
    .from('content_assignments')
    .select('assigned_entity_id, assigned_entity_type, status, start_date, end_date')
    .eq('assignment_type', 'college')
    .eq('target_id', collegeId)
    .eq('status', 'active');

  const activeAssignments = (assignments ?? []).filter((a) => isActiveAssignmentNow(a as ContentAssignmentsRow));

  if (variantInfo) {
    // Navigated via Variant ID
    hasAccess = activeAssignments.some(a => 
      a.assigned_entity_type === 'variant' && a.assigned_entity_id === courseId
    );
    if (!hasAccess) {
      const bundleAssignments = activeAssignments.filter((a) => a.assigned_entity_type === 'bundle');
      if (bundleAssignments.length > 0) {
        const bundleIds = bundleAssignments.map(a => a.assigned_entity_id);
        const { data: bundleItems } = await sb
          .from('bundle_items')
          .select('item_type, reference_id')
          .in('bundle_id', bundleIds)
          .eq('item_type', 'variant')
          .eq('reference_id', courseId);
        if (bundleItems && bundleItems.length > 0) {
          hasAccess = true;
        }
      }
    }
  } else {
    // Navigated via Master Course ID
    hasAccess = activeAssignments.some(a => 
      a.assigned_entity_type === 'master_course' && a.assigned_entity_id === courseId
    );
    
    if (!hasAccess) {
      const bundleAssignments = activeAssignments.filter((a) => a.assigned_entity_type === 'bundle');
      if (bundleAssignments.length > 0) {
        const bundleIds = bundleAssignments.map(a => a.assigned_entity_id);
        const { data: bundleItems } = await sb
          .from('bundle_items')
          .select('item_type, reference_id')
          .in('bundle_id', bundleIds)
          .eq('item_type', 'master_course')
          .eq('reference_id', courseId);
        if (bundleItems && bundleItems.length > 0) {
          hasAccess = true;
        }
      }
    }

    // If still no full access, check for partial access via variants or bundles
    if (!hasAccess) {
      const itemIds = new Set<string>();
      
      const variantAssignments = activeAssignments.filter((a) => a.assigned_entity_type === 'variant');
      if (variantAssignments.length > 0) {
        const variantIds = variantAssignments.map((a) => a.assigned_entity_id);
        const { data: variants } = await sb
          .from('course_variants')
          .select('id, master_course_id')
          .in('id', variantIds);

        const relevantVariantIds = (variants ?? []).reduce((acc, v) => {
          if (v.master_course_id === masterCourseId) acc.push(v.id as string);
          return acc;
        }, [] as string[]);

        if (relevantVariantIds.length > 0) {
          const { data: allVariantItems } = await sb
            .from('course_variant_items')
            .select('master_course_item_id')
            .in('course_variant_id', relevantVariantIds);
          for (const row of allVariantItems ?? []) {
            itemIds.add(row.master_course_item_id as string);
          }
        }
      }

      const bundleAssignments = activeAssignments.filter((a) => a.assigned_entity_type === 'bundle');
      if (bundleAssignments.length > 0) {
        const bundleIds = bundleAssignments.map(a => a.assigned_entity_id);
        
        const { data: bundleVariantItems } = await sb
          .from('bundle_items')
          .select('reference_id')
          .in('bundle_id', bundleIds)
          .eq('item_type', 'variant');
          
        const variantIdsInBundle = (bundleVariantItems ?? []).map(b => b.reference_id as string);
        if (variantIdsInBundle.length > 0) {
          const { data: variantItems } = await sb
            .from('course_variant_items')
            .select('course_variant_id, master_course_item_id, master_course_items!inner(id)')
            .in('course_variant_id', variantIdsInBundle)
            .eq('master_course_items.master_course_id', masterCourseId)
            .eq('master_course_items.publish_status', 'published');

          for (const vi of variantItems ?? []) {
            itemIds.add(vi.master_course_item_id as string);
          }
        }

        const { data: bundleDirectItems } = await sb
          .from('bundle_items')
          .select('reference_id')
          .in('bundle_id', bundleIds)
          .eq('item_type', 'master_course_item');
          
        const directItemIds = (bundleDirectItems ?? []).map(b => b.reference_id as string);
        if (directItemIds.length > 0) {
          const { data: courseItems } = await sb
            .from('master_course_items')
            .select('id')
            .eq('master_course_id', masterCourseId)
            .in('id', directItemIds);
          (courseItems ?? []).forEach(ci => itemIds.add(ci.id as string));
        }
      }

      if (itemIds.size > 0) {
        hasAccess = true;
        variantInfo = {
          variantId: 'partial-assignment',
          displayTitle: effectiveCourseRow.title + ' (Assigned Modules)',
          displayDescription: effectiveCourseRow.description ?? null,
          displayCode: effectiveCourseRow.code,
          variantItemIds: Array.from(itemIds),
          sourceMasterCourseTitle: effectiveCourseRow.title,
        };
      }
    }
  }

  if (!hasAccess && !effectiveCourseRow.visible_to_college_admins) {
    return null;
  }

  // 4. Pillar
  const { data: pillar, error: pillarError } = await sb
    .from('master_course_pillars')
    .select('*')
    .eq('id', effectiveCourseRow.pillar_id)
    .eq('publish_status', 'published')
    .maybeSingle();

  if (pillarError || !pillar) {
    return null;
  }

  // 5. Modules & Items (using master course id)
  const [modulesRes, itemsRes] = await Promise.all([
    sb
      .from('master_course_modules')
      .select('*')
      .eq('master_course_id', masterCourseId)
      .eq('publish_status', 'published')
      .order('sort_order', { ascending: true }),
    sb
      .from('master_course_items')
      .select('*')
      .eq('master_course_id', masterCourseId)
      .eq('publish_status', 'published')
      .order('sort_order', { ascending: true }),
  ]);

  if (modulesRes.error || itemsRes.error) {
    return null;
  }

  const modules = modulesRes.data ?? [];
  const items = itemsRes.data ?? [];
  const moduleIds = new Set(modules.map((module) => module.id));

  const videoIds: string[] = [];
  for (const item of items) {
    if (item.video_asset_id) {
      videoIds.push(item.video_asset_id);
    }
  }

  const videos: Record<string, VideoAssetsRow> = {};

  if (videoIds.length > 0) {
    const { data: videoData, error: videoError } = await sb
      .from('video_assets')
      .select('*')
      .eq('master_course_id', masterCourseId)
      .in('id', videoIds);

    if (!videoError && videoData) {
      for (const video of videoData) {
        if (
          video.master_course_module_id &&
          !moduleIds.has(video.master_course_module_id)
        ) {
          continue;
        }

        videos[video.id] = video;
      }
    }
  }

  return {
    course: effectiveCourseRow,
    pillar,
    modules,
    items,
    videos,
    variantInfo,
  };
}

/**
 * Assigned bundle detail for college admin (assignment-gated).
 */
export async function getAssignedBundleDetailForCollegeAdmin(
  collegeId: string,
  bundleId: string,
): Promise<AssignedBundleDetailData | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('assigned-bundle-detail');
  const sb = createAdminClient();

  const { data: assignments } = await sb
    .from('content_assignments')
    .select('id, status, start_date, end_date, assigned_entity_id, assigned_entity_type')
    .eq('assignment_type', 'college')
    .eq('target_id', collegeId)
    .eq('assigned_entity_type', 'bundle')
    .eq('assigned_entity_id', bundleId)
    .eq('status', 'active');

  const activeAssignment = (assignments ?? []).find((a) =>
    isActiveAssignmentNow(a as ContentAssignmentsRow),
  );

  if (!activeAssignment) {
    return null;
  }

  const detail = await getAssignedBundleDetail(bundleId);
  if (!detail) {
    return null;
  }

  return {
    ...detail,
    assignment: {
      id: activeAssignment.id as string,
      status: activeAssignment.status as string,
      start_date: activeAssignment.start_date as string | null,
      end_date: activeAssignment.end_date as string | null,
    },
  };
}
