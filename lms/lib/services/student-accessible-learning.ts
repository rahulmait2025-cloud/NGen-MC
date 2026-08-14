import 'server-only';

import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { isEntitlementActive, isAssignmentActive } from '@/lib/services/access-helpers';
import { listStudentContentEntitlements } from '@/lib/services/course-access-manager';
import { resolveBundleCourseEntriesBatch } from '@/lib/services/bundle-resolver';
import type { StudentLearningContext } from '@/lib/services/student-courses';

export type CourseSourceLabel =
  | 'Purchased Course'
  | 'Included in Bundle'
  | 'College Assigned'
  | 'Variant Access'
  | 'Free Enrollment';

export interface CourseAccessDisplay {
  courseId: string;
  sourceLabels: CourseSourceLabel[];
  bundleTitles: string[];
  accessLevel: 'full' | 'partial';
}

function addLabel(map: Map<string, Set<CourseSourceLabel>>, courseId: string, label: CourseSourceLabel) {
  if (!map.has(courseId)) map.set(courseId, new Set());
  map.get(courseId)!.add(label);
}

function addBundleTitle(map: Map<string, Set<string>>, courseId: string, title: string) {
  if (!map.has(courseId)) map.set(courseId, new Set());
  map.get(courseId)!.add(title);
}

/**
 * Build per-course source labels for My Courses / My Learning display.
 * One course card can have multiple source labels without duplicating cards.
 */
export const buildCourseAccessDisplayMap = cache(async function buildCourseAccessDisplayMap(
  studentId: string,
  collegeId: string | null,
): Promise<Map<string, CourseAccessDisplay>> {
  const sb = createAdminClient();
  const labelMap = new Map<string, Set<CourseSourceLabel>>();
  const bundleTitleMap = new Map<string, Set<string>>();
  const accessLevelMap = new Map<string, 'full' | 'partial'>();

  const { data: traditionalEntitlements } = await sb
    .from('student_entitlements')
    .select('master_course_id, source_type, status, valid_from, valid_until')
    .eq('student_id', studentId)
    .eq('status', 'active');

  for (const row of traditionalEntitlements ?? []) {
    if (!isEntitlementActive(row)) continue;
    const courseId = row.master_course_id as string;
    if (!courseId) continue;

    const sourceType = row.source_type as string;
    if (sourceType === 'b2c_direct') {
      addLabel(labelMap, courseId, 'Purchased Course');
    } else if (sourceType === 'college_assignment' || sourceType === 'b2b_college') {
      addLabel(labelMap, courseId, 'College Assigned');
    } else {
      addLabel(labelMap, courseId, 'Free Enrollment');
    }
    accessLevelMap.set(courseId, 'full');
  }

  const contentEntitlements = await listStudentContentEntitlements(studentId);

  const variantEntitlements = contentEntitlements.filter((e) => e.assigned_entity_type === 'variant');
  if (variantEntitlements.length > 0) {
    const variantIds = variantEntitlements.map((e) => e.assigned_entity_id);
    const { data: variants } = await sb
      .from('course_variants')
      .select('id, master_course_id')
      .in('id', variantIds);

    for (const variant of variants ?? []) {
      const courseId = variant.master_course_id as string;
      addLabel(labelMap, courseId, 'Variant Access');
      if (!accessLevelMap.has(courseId)) {
        accessLevelMap.set(courseId, 'partial');
      }
    }
  }

  const bundleEntitlements = contentEntitlements.filter((e) => e.assigned_entity_type === 'bundle');
  if (bundleEntitlements.length > 0) {
    const bundleIds = [...new Set(bundleEntitlements.map((e) => e.assigned_entity_id))];
    const { data: bundles } = await sb
      .from('course_bundles')
      .select('id, title, landing_card_title')
      .in('id', bundleIds);

    const bundleTitleById = new Map(
      (bundles ?? []).map((b) => [
        b.id as string,
        ((b.landing_card_title as string) || (b.title as string)) ?? 'Bundle',
      ]),
    );

    const uniqueBundleIds = [...new Set(bundleEntitlements.map((e) => e.assigned_entity_id))];
    const bundleEntriesMap = await resolveBundleCourseEntriesBatch(uniqueBundleIds);

    for (const e of bundleEntitlements) {
      const bundleId = e.assigned_entity_id;
      const courses = bundleEntriesMap.get(bundleId) ?? [];
      const bundleTitle = bundleTitleById.get(bundleId) ?? 'Bundle';
      for (const entry of courses) {
        addLabel(labelMap, entry.courseId, 'Included in Bundle');
        addBundleTitle(bundleTitleMap, entry.courseId, bundleTitle);
        if (entry.accessScope === 'full') {
          accessLevelMap.set(entry.courseId, 'full');
        } else if (!accessLevelMap.has(entry.courseId)) {
          accessLevelMap.set(entry.courseId, 'partial');
        }
      }
    }
  }

  if (collegeId) {
    const { data: assignments } = await sb
      .from('content_assignments')
      .select('assigned_entity_type, assigned_entity_id, status, start_date, end_date')
      .eq('assignment_type', 'college')
      .eq('target_id', collegeId)
      .eq('status', 'active');

    const activeAssignments = (assignments ?? []).filter(
      (a) =>
        a.status === 'active'
        && (!a.start_date || new Date(a.start_date as string) <= new Date())
        && (!a.end_date || new Date(a.end_date as string) > new Date()),
    );

    const masterAssignments = activeAssignments.filter((a) => a.assigned_entity_type === 'master_course');
    for (const a of masterAssignments) {
      const courseId = a.assigned_entity_id as string;
      addLabel(labelMap, courseId, 'College Assigned');
      accessLevelMap.set(courseId, 'full');
    }

    const bundleAssignments = activeAssignments.filter((a) => a.assigned_entity_type === 'bundle');
    if (bundleAssignments.length > 0) {
      const bundleIds = bundleAssignments.map((a) => a.assigned_entity_id as string);
      const { data: bundles } = await sb
        .from('course_bundles')
        .select('id, title, landing_card_title')
        .in('id', bundleIds);

      const bundleTitleById = new Map(
        (bundles ?? []).map((b) => [
          b.id as string,
          ((b.landing_card_title as string) || (b.title as string)) ?? 'Bundle',
        ]),
      );

      const uniqueAssignmentBundleIds = [...new Set(bundleAssignments.map((a) => a.assigned_entity_id as string))];
      const assignmentBundleEntriesMap = await resolveBundleCourseEntriesBatch(uniqueAssignmentBundleIds);

      for (const assignment of bundleAssignments) {
          const bundleId = assignment.assigned_entity_id as string;
          const bundleTitle = bundleTitleById.get(bundleId) ?? 'Bundle';
          const entries = assignmentBundleEntriesMap.get(bundleId) ?? [];
        for (const entry of entries) {
          if (!labelMap.get(entry.courseId)?.has('Purchased Course')) {
            addLabel(labelMap, entry.courseId, 'Included in Bundle');
            addBundleTitle(bundleTitleMap, entry.courseId, bundleTitle);
          }
          if (entry.accessScope === 'full') {
            accessLevelMap.set(entry.courseId, 'full');
          } else if (!accessLevelMap.has(entry.courseId)) {
            accessLevelMap.set(entry.courseId, 'partial');
          }
        }
      }
    }
  }

  const displayMap = new Map<string, CourseAccessDisplay>();
  for (const [courseId, labels] of labelMap) {
    const ordered: CourseSourceLabel[] = [];
    const priority: CourseSourceLabel[] = [
      'Purchased Course',
      'College Assigned',
      'Included in Bundle',
      'Variant Access',
      'Free Enrollment',
    ];
    for (const p of priority) {
      if (labels.has(p)) ordered.push(p);
    }

    displayMap.set(courseId, {
      courseId,
      sourceLabels: ordered,
      bundleTitles: Array.from(bundleTitleMap.get(courseId) ?? []),
      accessLevel: accessLevelMap.get(courseId) ?? 'partial',
    });
  }

  return displayMap;
});

export function formatCourseAccessLabel(display: CourseAccessDisplay | undefined): string | null {
  if (!display || display.sourceLabels.length === 0) return null;
  if (display.sourceLabels.length === 1 && display.sourceLabels[0] === 'Included in Bundle') {
    const bundle = display.bundleTitles[0];
    return bundle ? `Included in ${bundle}` : 'Included in Bundle';
  }
  return display.sourceLabels.join(' · ');
}

const DIRECT_SOURCE_LABELS: CourseSourceLabel[] = [
  'Purchased Course',
  'College Assigned',
  'Free Enrollment',
  'Variant Access',
];

function _hasDirectCourseAccess(display: CourseAccessDisplay | undefined): boolean {
  if (!display || display.sourceLabels.length === 0) return true;
  return display.sourceLabels.some((label) => DIRECT_SOURCE_LABELS.includes(label));
}

/** Course IDs the student owns outside any bundle container. */
export const getDirectCourseAccessIds = cache(async function getDirectCourseAccessIds(
  studentId: string,
  collegeId: string | null,
): Promise<Set<string>> {
  const sb = createAdminClient();
  const directIds = new Set<string>();

  const { data: entitlements } = await sb
    .from('student_entitlements')
    .select('master_course_id, status, valid_from, valid_until')
    .eq('student_id', studentId)
    .eq('status', 'active');

  for (const row of entitlements ?? []) {
    if (!isEntitlementActive(row)) continue;
    if (row.master_course_id) directIds.add(row.master_course_id as string);
  }

  const contentEntitlements = await listStudentContentEntitlements(studentId);
  for (const row of contentEntitlements) {
    if (row.assigned_entity_type === 'master_course') {
      directIds.add(row.assigned_entity_id);
    }
  }

  const variantIds = contentEntitlements.reduce((acc, e) => {
    if (e.assigned_entity_type === 'variant') acc.push(e.assigned_entity_id);
    return acc;
  }, [] as string[]);
  if (variantIds.length > 0) {
    const { data: variants } = await sb
      .from('course_variants')
      .select('master_course_id')
      .in('id', variantIds);
    for (const variant of variants ?? []) {
      if (variant.master_course_id) directIds.add(variant.master_course_id as string);
    }
  }

  if (collegeId) {
    const { data: assignments } = await sb
      .from('content_assignments')
      .select('assigned_entity_id, assigned_entity_type, status, start_date, end_date')
      .eq('assignment_type', 'college')
      .eq('target_id', collegeId)
      .eq('assigned_entity_type', 'master_course')
      .eq('status', 'active');

    for (const row of assignments ?? []) {
      if (!isAssignmentActive(row)) continue;
      directIds.add(row.assigned_entity_id as string);
    }
  }

  return directIds;
});

/** All course IDs reachable through active bundle entitlements or assignments. */
export const getBundleContainedCourseIds = cache(async function getBundleContainedCourseIds(
  studentId: string,
  collegeId: string | null,
): Promise<Set<string>> {
  const sb = createAdminClient();
  const bundleCourseIds = new Set<string>();

  const contentEntitlements = await listStudentContentEntitlements(studentId);
  const bundleEntitlementIds = contentEntitlements.reduce((acc, e) => {
    if (e.assigned_entity_type === 'bundle') acc.push(e.assigned_entity_id);
    return acc;
  }, [] as string[]);

  const bundleEntriesMap = await resolveBundleCourseEntriesBatch(bundleEntitlementIds);
  for (const bundleId of bundleEntitlementIds) {
    for (const entry of bundleEntriesMap.get(bundleId) ?? []) bundleCourseIds.add(entry.courseId);
  }

  if (collegeId) {
    const { data: assignments } = await sb
      .from('content_assignments')
      .select('assigned_entity_id, status, start_date, end_date')
      .eq('assignment_type', 'college')
      .eq('target_id', collegeId)
      .eq('assigned_entity_type', 'bundle')
      .eq('status', 'active');

    const activeAssignments = (assignments ?? []).filter(isAssignmentActive);
    const assignmentBundleIds = activeAssignments.map((row) => row.assigned_entity_id as string);
    const assignmentEntriesMap = await resolveBundleCourseEntriesBatch(assignmentBundleIds);

    for (const row of activeAssignments) {
      const entries = assignmentEntriesMap.get(row.assigned_entity_id as string) ?? [];
      for (const entry of entries) bundleCourseIds.add(entry.courseId);
    }
  }

  return bundleCourseIds;
});

export function isBundleOnlyCourse(
  courseId: string,
  directIds: Set<string>,
  bundleIds: Set<string>,
): boolean {
  return bundleIds.has(courseId) && !directIds.has(courseId);
}

export type AccessibleLearningAccessLevel = 'full_course' | 'variant_partial' | 'item_partial';

export interface AccessibleLearningItem {
  courseId: string;
  slug: string;
  title: string;
  description: string | null;
  shortDescription: string | null;
  pillarId: string | null;
  pillarTitle: string | null;
  pillarSlug: string | null;
  thumbnailUrl: string | null;
  sourceLabels: CourseSourceLabel[];
  bundleTitles: string[];
  accessLevel: AccessibleLearningAccessLevel;
  allowedItemIds: string[] | null;
  validUntil: string | null;
  continueHref: string;
  progressPercentage: number;
  moduleCount: number;
  videoCount: number;
  variantId: string | null;
  variantTitle: string | null;
}

/**
 * Unified accessible learning list for dashboard, widgets, and access-aware UIs.
 * Dedupes by course (or variant) and preserves source labels from entitled courses.
 */
export const getAccessibleLearningItems = cache(async function getAccessibleLearningItems(params: {
  collegeSlug: string;
  excludeBundleOnlyCourses?: boolean;
  context?: StudentLearningContext;
}): Promise<AccessibleLearningItem[]> {
  const [{ listStudentEntitledCoursesGroupedByPillar }, { buildLearnHref }] = await Promise.all([
    import('@/lib/services/student-courses'),
    import('@/lib/utils/variant-learn-url'),
  ]);

  const groups = await listStudentEntitledCoursesGroupedByPillar(
    params.context ?? params.collegeSlug,
    { excludeBundleOnlyCourses: params.excludeBundleOnlyCourses ?? false },
  );
  const items: AccessibleLearningItem[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const course of group.courses) {
      const dedupeKey = course.variant_id ? `variant:${course.variant_id}` : course.id;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const meta = (course.metadata as Record<string, unknown>) ?? {};
      const accessLevel: AccessibleLearningAccessLevel =
        course.access_level === 'partial'
          ? (course.variant_id ? 'variant_partial' : 'item_partial')
          : 'full_course';

      items.push({
        courseId: course.id,
        slug: course.slug ?? course.id,
        title: course.variant_title ?? course.title,
        description: course.description ?? null,
        shortDescription: course.short_description ?? null,
        pillarId: group.pillar.id,
        pillarTitle: group.pillar.title,
        pillarSlug: group.pillar.slug,
        thumbnailUrl: course.thumbnail_url ?? (meta.thumbnail_url as string | undefined) ?? null,
        sourceLabels: (course.source_labels ?? []) as CourseSourceLabel[],
        bundleTitles: course.bundle_titles ?? [],
        accessLevel,
        allowedItemIds: null,
        validUntil: null,
        continueHref: buildLearnHref(params.collegeSlug, course.id, { variantId: course.variant_id }),
        progressPercentage: course.progress_percentage ?? 0,
        moduleCount: course.module_count,
        videoCount: course.video_count,
        variantId: course.variant_id ?? null,
        variantTitle: course.variant_title ?? null,
      });
    }
  }

  return items;
});
