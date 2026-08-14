import 'server-only';

import { cache } from 'react';
import { cacheTag, cacheLife } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  EntitlementSourceType,
  EntitlementStatus,
  StudentEntitlementsRow,
  MasterCoursesRow,
  MasterCourseItemsRow,
  MasterCourseModulesRow,
  VideoAssetsRow,
} from '@/types/database';
import { normUuid } from '@/lib/utils';
import { resolveBundleCourseEntries } from '@/lib/services/bundle-resolver';
import { isEntitlementActive, isAssignmentActive } from '@/lib/services/access-helpers';
import { describeSupabaseError, isSupabaseNetworkError } from '@/lib/supabase/network-error';
import {
  resolvePaidCourseSourceType,
  LEGACY_BOOTCAMP_PILLAR_SLUG,
  type PaidCourseSourceType,
} from '@/lib/services/paid-course-catalog';

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface GrantEntitlementInput {
  student_id: string;
  master_course_id: string;
  source_type: EntitlementSourceType;
  college_id?: string;
  valid_from?: string;
  valid_until?: string | null;
  granted_by?: string;
  metadata?: Record<string, unknown>;
}

export interface EntitlementWithCourse extends StudentEntitlementsRow {
  master_courses?: {
    id: string;
    title: string;
    code: string;
    description: string | null;
    short_description: string | null;
    pillar: string | null;
    publish_status: string;
  };
}

export type AccessSourceType =
  | EntitlementSourceType
  | 'global_publish'
  | 'content_entitlement'
  | 'college_assignment';

export interface ResolvedCourseAccess {
  master_course_id: string;
  master_course: MasterCoursesRow;
  source_entitlement_id: string;
  source_type: AccessSourceType;
  status: string;
  valid_until?: string | null;
}

export interface StudentAccessContext {
  isGlobal: boolean;
  collegeId: string | null;
}

export interface ResolvedLessonAccess {
  entitlement: ResolvedCourseAccess | null;
  course: MasterCoursesRow;
  module: MasterCourseModulesRow;
  item: MasterCourseItemsRow;
  asset: VideoAssetsRow | null;
}

export type ContentEntityType = 'master_course' | 'variant' | 'bundle';

export interface StudentContentEntitlementsRow {
  id: string;
  student_id: string;
  assigned_entity_type: ContentEntityType;
  assigned_entity_id: string;
  source_type: string;
  status: string;
  valid_from: string;
  valid_until: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ContentEntitledItemResolution {
  allow_all: boolean;
  item_ids: Set<string>;
}

export interface PlayerCourseSourceIdentity {
  sourceType: PaidCourseSourceType;
  sourceId: string;
  masterCourseId: string;
  courseSlug: string | null;
  pillarSlug: string | null;
}

export interface PlayerAccessValidation {
  allowed: boolean;
  accessLevel: 'full' | 'partial' | 'none';
  source: PlayerCourseSourceIdentity;
  entitlementId: string | null;
  allowedItemIds: Set<string> | null;
  redirectHref: string | null;
  denyReason: string | null;
}

export type FreeCourseAvailabilityInput = {
  is_free?: boolean | null;
  pricing_model?: string | null;
  publish_status?: string | null;
};

export interface ExpiredCourse {
  master_course_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  thumbnail_url: string | null;
  valid_until: string;
  total_watch_seconds: number;
  completion_percentage: number;
  last_watched_at: string | null;
}

// ─── Free Catalog Visibility checks ──────────────────────────────────────────

/** Published course that is free to enroll (catalog visibility — not enrollment). */
export function isPubliclyAvailableFreeCourse(course: FreeCourseAvailabilityInput): boolean {
  return (
    course.publish_status === 'published' &&
    !!(course.is_free || course.pricing_model === 'free')
  );
}

/** Durable enrollment: active, non-expired `student_entitlements` row. */
export const hasActiveCourseEntitlement = cache(async function hasActiveCourseEntitlement(
  studentId: string,
  courseId: string,
  isGlobal: boolean,
): Promise<boolean> {
  const row = await validateStudentCourseAccessRowOnly(studentId, courseId, isGlobal);
  return row !== null;
});

// ─── traditional student_entitlements Mutations ───────────────────────────────

/** Grant student access to a master course (B2B, B2C). */
export async function grantEntitlement(
  input: GrantEntitlementInput,
): Promise<StudentEntitlementsRow> {
  const sb = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: existing } = await sb
    .from('student_entitlements')
    .select(
      'id, student_id, master_course_id, source_type, college_id, status, valid_from, valid_until, granted_by, revoked_at, revoked_by, revoke_reason, metadata, created_at, updated_at',
    )
    .eq('student_id', input.student_id)
    .eq('master_course_id', input.master_course_id)
    .eq('status', 'active')
    .lte('valid_from', nowIso)
    .or('valid_until.is.null,valid_until.gt.' + nowIso)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing as StudentEntitlementsRow;
  }

  const { data, error } = await sb
    .from('student_entitlements')
    .insert({
      student_id: input.student_id,
      master_course_id: input.master_course_id,
      source_type: input.source_type,
      college_id: input.college_id ?? null,
      status: 'active' as EntitlementStatus,
      valid_from: input.valid_from ?? new Date().toISOString(),
      valid_until: input.valid_until ?? null,
      granted_by: input.granted_by ?? null,
      metadata: input.metadata ?? {},
    })
    .select(
      'id, student_id, master_course_id, source_type, college_id, status, valid_from, valid_until, granted_by, metadata, created_at, updated_at',
    )
    .single();

  if (error) throw new Error(`Failed to grant entitlement: ${error.message}`);
  return data as StudentEntitlementsRow;
}

// ─── Hierarchy visibility cache ───────────────────────────────────────────────

async function _checkHierarchyVisibility(
  courseId: string,
  isGlobal: boolean,
): Promise<boolean> {
  const sb = createAdminClient();

  const { data: course } = await sb
    .from('master_courses')
    .select(
      'publish_status, visible_to_global_students, visible_to_college_students, pillar_id, bootcamp_id, catalog_type, course_kind, is_free, pricing_model, show_as_paid_course',
    )
    .eq('id', courseId)
    .maybeSingle();

  if (!course || course.publish_status !== 'published') return false;

  const isFreeByAnyIndicator =
    course.course_kind === 'free_course' ||
    course.is_free === true ||
    course.pricing_model === 'free';

  if (isFreeByAnyIndicator) {
    return true;
  }

  if (course.pillar_id) {
    const { data: pillar } = await sb
      .from('master_course_pillars')
      .select('publish_status, visible_to_global_students, visible_to_college_students')
      .eq('id', course.pillar_id)
      .maybeSingle();

    if (!pillar || pillar.publish_status !== 'published') return false;

    if (isGlobal) {
      if (!course.visible_to_global_students || !pillar.visible_to_global_students) {
        return false;
      }
    } else {
      if (!course.visible_to_college_students || !pillar.visible_to_college_students) {
        return false;
      }
    }
  } else if (course.bootcamp_id) {
    const { data: bootcamp } = await sb
      .from('bootcamps')
      .select('publish_status, lifecycle_status')
      .eq('id', course.bootcamp_id)
      .maybeSingle();

    if (
      !bootcamp ||
      bootcamp.publish_status !== 'published' ||
      bootcamp.lifecycle_status !== 'active'
    ) {
      return false;
    }
  } else if (course.catalog_type === 'bootcamp') {
    if (isGlobal) {
      if (course.visible_to_global_students === false) return false;
    } else if (course.visible_to_college_students === false) {
      return false;
    }
  } else if (course.show_as_paid_course) {
    return true;
  } else {
    return true;
  }

  return true;
}

async function _checkHierarchyVisibilityCached(
  courseId: string,
  isGlobal: boolean,
): Promise<boolean> {
  'use cache';
  cacheLife('minutes');
  cacheTag('course-structure', 'hierarchy-visibility');
  return _checkHierarchyVisibility(courseId, isGlobal);
}

export function checkHierarchyVisibility(
  courseId: string,
  isGlobal: boolean,
): Promise<boolean> {
  return _checkHierarchyVisibilityCached(courseId, isGlobal);
}

// ─── Traditional Entitlement Lookup ──────────────────────────────────────────

export async function resolveStudentEntitlements(
  studentId: string,
): Promise<EntitlementWithCourse[]> {
  const { getCachedStudentEntitlements } = await import('@/lib/services/entitlement-cache');
  const entitlements = await getCachedStudentEntitlements(studentId);
  return entitlements as EntitlementWithCourse[];
}

async function _validateStudentCourseAccessCached(
  studentId: string,
  courseId: string,
  nowIso: string,
): Promise<StudentEntitlementsRow | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('student-course-access');

  const sb = createAdminClient();
  const { data, error } = await sb
    .from('student_entitlements')
    .select(
      'id, student_id, master_course_id, source_type, college_id, status, valid_from, valid_until, granted_by, revoked_at, revoked_by, revoke_reason, metadata, created_at, updated_at',
    )
    .eq('student_id', studentId)
    .eq('master_course_id', courseId)
    .eq('status', 'active')
    .lte('valid_from', nowIso)
    .or('valid_until.is.null,valid_until.gt.' + nowIso)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to validate course access: ${error.message}`);
  return data as StudentEntitlementsRow | null;
}

export async function validateStudentCourseAccessRowOnly(
  studentId: string,
  courseId: string,
  isGlobal: boolean,
): Promise<StudentEntitlementsRow | null> {
  const isVisible = await checkHierarchyVisibility(courseId, isGlobal);
  if (!isVisible) return null;

  const nowMs = Math.floor(Date.now() / 30000) * 30000;
  const nowIso = new Date(nowMs).toISOString();

  return _validateStudentCourseAccessCached(studentId, courseId, nowIso);
}

// ─── Consolidated Student course access (All vectors) ───────────────────────

export async function validateStudentCourseAccess(
  studentId: string,
  courseId: string,
  context: StudentAccessContext,
): Promise<ResolvedCourseAccess | null> {
  const isVisible = await checkHierarchyVisibility(courseId, context.isGlobal);
  if (!isVisible) return null;

  const nowMs = Math.floor(Date.now() / 30000) * 30000;
  const nowIso = new Date(nowMs).toISOString();
  const entitlementRow = await _validateStudentCourseAccessCached(studentId, courseId, nowIso);
  if (!entitlementRow) return null;

  const { getCachedMasterCourse } = await import('@/lib/services/course-cache');
  const course = await getCachedMasterCourse(courseId);
  if (!course) return null;

  return {
    master_course_id: course.id,
    master_course: course as MasterCoursesRow,
    source_entitlement_id: entitlementRow.id,
    source_type: entitlementRow.source_type,
    status: entitlementRow.status,
    valid_until: entitlementRow.valid_until,
  };
}

// ─── Get Student Accessible Courses ──────────────────────────────────────────

const getStudentAccessibleCoursesInternal = cache(async function getStudentAccessibleCoursesInternal(
  studentId: string,
  isGlobal: boolean,
  collegeId: string | null,
): Promise<ResolvedCourseAccess[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('accessible-courses');
  const sb = createAdminClient();

  const [entitlementsRaw, contentEntitlements] = await Promise.all([
    resolveStudentEntitlements(studentId),
    listStudentContentEntitlements(studentId),
  ]);
  const entitlements = entitlementsRaw.filter(isEntitlementActive);
  const contentMasterCourseIds = new Set(
    contentEntitlements.reduce((acc, e) => {
      if (e.assigned_entity_type === 'master_course') acc.push(e.assigned_entity_id);
      return acc;
    }, [] as string[]),
  );

  const contentVariantIds = contentEntitlements.reduce((acc, e) => {
    if (e.assigned_entity_type === 'variant') acc.push(e.assigned_entity_id);
    return acc;
  }, [] as string[]);

  if (contentVariantIds.length > 0) {
    const { data: variants } = await sb
      .from('course_variants')
      .select('master_course_id')
      .in('id', contentVariantIds);
    if (variants) {
      for (const v of variants) {
        if (v.master_course_id) {
          contentMasterCourseIds.add(v.master_course_id);
        }
      }
    }
  }

  const contentBundleIds = contentEntitlements.reduce((acc, e) => {
    if (e.assigned_entity_type === 'bundle') acc.push(e.assigned_entity_id);
    return acc;
  }, [] as string[]);

  if (contentBundleIds.length > 0) {
    const bundleResults = await Promise.all(
      contentBundleIds.map((bundleId) => resolveBundleCourseEntries(bundleId)),
    );
    for (const entries of bundleResults) {
      for (const entry of entries) {
        if (entry.courseId) {
          contentMasterCourseIds.add(entry.courseId);
        }
      }
    }
  }

  let assignmentCourseIds: string[] = [];
  if (collegeId) {
    assignmentCourseIds = await resolveCollegeAssignedCourseIds(collegeId);
  }

  const allCourseIds = new Set([
    ...entitlements.flatMap((e) => (e.master_course_id ? [e.master_course_id] : [])),
    ...contentMasterCourseIds,
    ...assignmentCourseIds,
  ]);

  if (allCourseIds.size === 0) return [];

  const courseIdArray = Array.from(allCourseIds);
  const { getCachedMasterCourse } = await import('@/lib/services/course-cache');
  const coursesRaw = await Promise.all(
    courseIdArray.map((id) => getCachedMasterCourse(id)),
  );
  const courses = coursesRaw.filter((c): c is typeof coursesRaw[number] & object => c !== null);

  if (!courses || courses.length === 0) return [];

  const pillarIds = Array.from(new Set(courses.flatMap((c) => (c.pillar_id ? [c.pillar_id] : []))));
  const bootcampIds = Array.from(
    new Set(courses.flatMap((c) => (c.bootcamp_id ? [c.bootcamp_id] : []))),
  );

  const [pillarsRes, bootcampsRes] = await Promise.all([
    pillarIds.length > 0
      ? sb.from('master_course_pillars').select('id, publish_status').in('id', pillarIds)
      : Promise.resolve({ data: [] }),
    bootcampIds.length > 0
      ? sb.from('bootcamps').select('id, publish_status').in('id', bootcampIds)
      : Promise.resolve({ data: [] }),
  ]);

  const publishedPillars = new Set(
    (pillarsRes.data ?? []).reduce((acc, p) => {
      if (p.publish_status === 'published') acc.push(p.id as string);
      return acc;
    }, [] as string[]),
  );

  const publishedBootcamps = new Set(
    (bootcampsRes.data ?? []).reduce((acc, b) => {
      if (b.publish_status === 'published') acc.push(b.id as string);
      return acc;
    }, [] as string[]),
  );

  const results: ResolvedCourseAccess[] = [];

  const courseById = new Map<string, typeof courses[number]>();
  for (const c of courses) {
    courseById.set(c.id as string, c);
  }
  const entitlementByCourseId = new Map<string, typeof entitlements[number]>();
  for (const e of entitlements) {
    entitlementByCourseId.set(e.master_course_id, e);
  }

  for (const courseId of courseIdArray) {
    const course = courseById.get(courseId);
    if (!course) continue;

    const matchedEntitlement = entitlementByCourseId.get(courseId);
    const ownedViaEntitlementRow = !!matchedEntitlement;

    if (!ownedViaEntitlementRow) {
      if (isGlobal) {
        if (course.visible_to_global_students === false) continue;
      } else {
        if (course.visible_to_college_students === false) continue;
      }

      if (course.pillar_id && !publishedPillars.has(course.pillar_id)) continue;
      if (course.bootcamp_id && !publishedBootcamps.has(course.bootcamp_id)) continue;
    }

    if (matchedEntitlement) {
      results.push({
        master_course_id: courseId,
        master_course: course as unknown as MasterCoursesRow,
        source_entitlement_id: matchedEntitlement.id,
        source_type: matchedEntitlement.source_type,
        status: matchedEntitlement.status,
        valid_until: matchedEntitlement.valid_until,
      });
    } else if (collegeId && assignmentCourseIds.some((id) => normUuid(id) === normUuid(courseId))) {
      results.push({
        master_course_id: courseId,
        master_course: course as unknown as MasterCoursesRow,
        source_entitlement_id: '',
        source_type: 'college_assignment',
        status: 'active',
        valid_until: null,
      });
    } else {
      results.push({
        master_course_id: courseId,
        master_course: course as unknown as MasterCoursesRow,
        source_entitlement_id: '',
        source_type: 'content_entitlement',
        status: 'active',
        valid_until: null,
      });
    }
  }

  return results;
});

export function getStudentAccessibleCourses(
  studentId: string,
  context?: StudentAccessContext,
): Promise<ResolvedCourseAccess[]> {
  return getStudentAccessibleCoursesInternal(
    studentId,
    context?.isGlobal ?? true,
    context?.collegeId ?? null,
  );
}

// ─── Resolve Lesson & Video Asset ─────────────────────────────────────────────

export async function resolveAccessibleLesson(
  studentId: string,
  courseId: string,
  itemId: string,
  context: StudentAccessContext,
): Promise<ResolvedLessonAccess | null> {
  const sb = createAdminClient();

  const { getCachedMasterCourse } = await import('@/lib/services/course-cache');

  const [access, course, itemRes] = await Promise.all([
    validateStudentCourseAccess(studentId, courseId, context),
    getCachedMasterCourse(courseId),
    sb
      .from('master_course_items')
      .select(
        'id, module_id, master_course_id, title, description, item_type, sort_order, video_asset_id, publish_status, metadata, duration_seconds, created_at, updated_at',
      )
      .eq('id', itemId)
      .eq('master_course_id', courseId)
      .eq('publish_status', 'published')
      .maybeSingle(),
  ]);

  const item = itemRes.data;
  if (!course || !item) return null;

  let finalAccess = access;

  if (!finalAccess) {
    const itemAccess = await checkContentEntitlementForItem(studentId, itemId, courseId);
    if (!itemAccess) return null;

    const isVisible = await checkHierarchyVisibility(courseId, context.isGlobal);
    if (!isVisible) return null;

    finalAccess = {
      master_course_id: courseId,
      master_course: {} as MasterCoursesRow,
      source_entitlement_id: itemAccess.id,
      source_type: 'content_entitlement',
      status: itemAccess.status,
      valid_until: itemAccess.valid_until,
    };
  }

  let courseModule: MasterCourseModulesRow | null = null;
  let asset: VideoAssetsRow | null = null;

  const moduleQuery = sb
    .from('master_course_modules')
    .select(
      'id, master_course_id, title, description, slug, sort_order, publish_status, metadata, visible_to_students, created_at, updated_at',
    )
    .eq('id', item.module_id)
    .eq('master_course_id', courseId)
    .eq('publish_status', 'published')
    .maybeSingle();

  const contentQuery =
    finalAccess.source_type === 'content_entitlement'
      ? checkContentEntitlementForItem(studentId, itemId, courseId)
      : Promise.resolve(null);

  if (item.video_asset_id) {
    const assetQuery = sb
      .from('video_assets')
      .select(
        'id, master_course_id, master_course_module_id, module_id, title, description, duration_seconds, thumbnail_url, created_at, updated_at, tp_asset_id, processing_status, sync_status, playback_url, dash_url, content_protection_type',
      )
      .eq('id', item.video_asset_id)
      .eq('master_course_id', courseId)
      .maybeSingle();

    const [modRes, assetRes, itemAccess] = await Promise.all([
      moduleQuery,
      assetQuery,
      contentQuery,
    ]);

    const mod = modRes.data;
    const assetRow = assetRes.data;

    if (!mod || !assetRow) return null;
    if (mod.visible_to_students === false) return null;

    const assetModuleId = assetRow.master_course_module_id ?? assetRow.module_id;
    if (assetModuleId && assetModuleId !== mod.id) return null;
    asset = assetRow as unknown as VideoAssetsRow;
    courseModule = mod as unknown as MasterCourseModulesRow;

    if (finalAccess.source_type === 'content_entitlement' && !itemAccess) return null;
  } else {
    const [modRes, itemAccess] = await Promise.all([moduleQuery, contentQuery]);
    const mod = modRes.data;
    if (!mod) return null;
    if (mod.visible_to_students === false) return null;
    courseModule = mod as unknown as MasterCourseModulesRow;

    if (finalAccess.source_type === 'content_entitlement' && !itemAccess) return null;
  }

  return {
    entitlement: {
      ...finalAccess,
      master_course: course as unknown as MasterCoursesRow,
    },
    course: course as unknown as MasterCoursesRow,
    module: courseModule,
    item: item as unknown as MasterCourseItemsRow,
    asset,
  };
}

export async function resolveAccessibleVideoAsset(
  studentId: string,
  assetId: string,
  context: StudentAccessContext,
  itemId?: string,
): Promise<ResolvedLessonAccess | null> {
  const sb = createAdminClient();

  const { data: asset } = await sb
    .from('video_assets')
    .select(
      'id, master_course_id, master_course_module_id, module_id, title, description, duration_seconds, thumbnail_url, created_at, updated_at, tp_asset_id, processing_status, sync_status, playback_url, dash_url, content_protection_type',
    )
    .eq('id', assetId)
    .maybeSingle();

  if (!asset) return null;
  if (asset.sync_status !== 'active') return null;
  if (asset.processing_status !== 'completed') return null;
  if (!asset.tp_asset_id) return null;

  const assetModuleId = asset.master_course_module_id ?? asset.module_id;

  let itemQuery = sb
    .from('master_course_items')
    .select(
      'id, module_id, master_course_id, title, description, item_type, sort_order, video_asset_id, publish_status, metadata, duration_seconds, created_at, updated_at',
    )
    .eq('master_course_id', asset.master_course_id)
    .eq('video_asset_id', asset.id)
    .eq('publish_status', 'published');

  if (itemId) {
    itemQuery = itemQuery.eq('id', itemId);
  }

  const { data: item } = await itemQuery.maybeSingle();

  if (!item) return null;
  if (assetModuleId && item.module_id !== assetModuleId) return null;

  return resolveAccessibleLesson(
    studentId,
    asset.master_course_id,
    item.id,
    context,
  );
}

async function _resolveAccessibleVideoAssetCached(
  studentId: string,
  assetId: string,
  isGlobal: boolean,
  collegeId: string | null,
  itemId: string | null,
): Promise<ResolvedLessonAccess | null> {
  'use cache';
  cacheLife('hours');
  cacheTag('video-asset-access');
  return resolveAccessibleVideoAsset(studentId, assetId, { isGlobal, collegeId }, itemId ?? undefined);
}

export async function resolveAccessibleVideoAssetCached(
  studentId: string,
  assetId: string,
  context: StudentAccessContext,
  itemId?: string,
): Promise<ResolvedLessonAccess | null> {
  return _resolveAccessibleVideoAssetCached(
    studentId,
    assetId,
    context.isGlobal,
    context.collegeId ?? null,
    itemId ?? null,
  );
}

// ─── College Assigned Course IDs ──────────────────────────────────────────────

async function resolveCollegeAssignedCourseIdsCached(collegeId: string): Promise<string[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('college-assigned-courses');
  const sb = createAdminClient();
  const { data: assignments, error } = await sb
    .from('content_assignments')
    .select('assigned_entity_id, assigned_entity_type, status, start_date, end_date')
    .eq('assignment_type', 'college')
    .eq('target_id', collegeId)
    .eq('status', 'active');

  if (error) {
    return [];
  }

  if (!assignments?.length) return [];

  const activeAssignments = assignments.filter(isAssignmentActive);
  if (!activeAssignments.length) return [];

  const directCourseIds = activeAssignments.reduce((acc, a) => {
    if (a.assigned_entity_type === 'master_course') acc.push(a.assigned_entity_id as string);
    return acc;
  }, [] as string[]);

  const bundleIds = activeAssignments.reduce((acc, a) => {
    if (a.assigned_entity_type === 'bundle') acc.push(a.assigned_entity_id as string);
    return acc;
  }, [] as string[]);

  const bundleCourseIds: string[] = [];
  if (bundleIds.length > 0) {
    const { data: bundleItems } = await sb
      .from('bundle_items')
      .select('reference_id, item_type')
      .in('bundle_id', bundleIds);

    const directCourseIdsFromBundles = (bundleItems ?? []).reduce((acc, item) => {
      if (item.item_type === 'master_course') acc.push(item.reference_id as string);
      return acc;
    }, [] as string[]);
    bundleCourseIds.push(...directCourseIdsFromBundles);
  }

  return Array.from(new Set([...directCourseIds, ...bundleCourseIds]));
}

export async function resolveCollegeAssignedCourseIds(collegeId: string): Promise<string[]> {
  return resolveCollegeAssignedCourseIdsCached(collegeId);
}

// ─── Expired/History Courses ──────────────────────────────────────────────────

export async function getExpiredStudentCourses(studentId: string): Promise<ExpiredCourse[]> {
  const sb = createAdminClient();
  const now = new Date().toISOString();

  const [expiredEntitlements, expiredContentEntitlements] = await Promise.all([
    sb
      .from('student_entitlements')
      .select('master_course_id, valid_until')
      .eq('student_id', studentId)
      .not('valid_until', 'is', null)
      .or(`status.eq.expired,and(status.eq.active,valid_until.lt.${now})`),
    sb
      .from('student_content_entitlements')
      .select('assigned_entity_id, valid_until')
      .eq('student_id', studentId)
      .eq('assigned_entity_type', 'master_course')
      .not('valid_until', 'is', null)
      .or(`status.eq.expired,and(status.eq.active,valid_until.lt.${now})`),
  ]);

  const expiredMap = new Map<string, string>();
  for (const e of expiredEntitlements.data ?? []) {
    if (e.master_course_id && e.valid_until) {
      expiredMap.set(e.master_course_id, e.valid_until);
    }
  }
  for (const e of expiredContentEntitlements.data ?? []) {
    if (e.assigned_entity_id && e.valid_until) {
      const existing = expiredMap.get(e.assigned_entity_id);
      if (!existing || new Date(e.valid_until) > new Date(existing)) {
        expiredMap.set(e.assigned_entity_id, e.valid_until);
      }
    }
  }

  if (expiredMap.size === 0) return [];

  const courseIds = Array.from(expiredMap.keys());
  const { getCachedMasterCourse } = await import('@/lib/services/course-cache');

  const [coursesRaw, progressRes] = await Promise.all([
    Promise.all(courseIds.map((id) => getCachedMasterCourse(id))),
    sb
      .from('student_video_progress')
      .select('course_id, unique_watched_seconds, completion_percentage, last_watched_at')
      .eq('student_id', studentId)
      .in('course_id', courseIds),
  ]);
  const courses = coursesRaw.filter((c): c is typeof coursesRaw[number] & object => c !== null);

  const analyticsMap = new Map<
    string,
    { totalWatchSeconds: number; maxCompletion: number; lastWatchedAt: string | null }
  >();
  for (const p of progressRes.data ?? []) {
    const existing = analyticsMap.get(p.course_id) ?? {
      totalWatchSeconds: 0,
      maxCompletion: 0,
      lastWatchedAt: null,
    };
    existing.totalWatchSeconds += Number(p.unique_watched_seconds ?? 0);
    existing.maxCompletion = Math.max(
      existing.maxCompletion,
      Number(p.completion_percentage ?? 0),
    );
    if (
      p.last_watched_at &&
      (!existing.lastWatchedAt || p.last_watched_at > existing.lastWatchedAt)
    ) {
      existing.lastWatchedAt = p.last_watched_at;
    }
    analyticsMap.set(p.course_id, existing);
  }

  return courses.reduce<ExpiredCourse[]>((acc, course) => {
    if (
      course.is_free ||
      course.pricing_model === 'free' ||
      course.course_kind === 'free_course'
    ) {
      return acc;
    }
    const analytics = analyticsMap.get(course.id);
    const meta = (course.metadata as Record<string, unknown>) ?? {};

    acc.push({
      master_course_id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      thumbnail_url: (meta.thumbnail_url as string) ?? null,
      valid_until: expiredMap.get(course.id)!,
      total_watch_seconds: analytics?.totalWatchSeconds ?? 0,
      completion_percentage: analytics?.maxCompletion ?? 0,
      last_watched_at: analytics?.lastWatchedAt ?? null,
    });
    return acc;
  }, []);
}

/**
 * Fetch active paid courses expiring within the given number of days.
 * Used to render the "Expires in X days" badge on course cards.
 */
export async function getExpiringCoursesWithinDays(
  studentId: string,
  days: number,
): Promise<Map<string, number>> {
  const sb = createAdminClient();
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const nowIso = now.toISOString();
  const futureIso = futureDate.toISOString();

  // Fetch active entitlements expiring within the window
  const [entitlements, contentEntitlements] = await Promise.all([
    sb
      .from('student_entitlements')
      .select('master_course_id, valid_until')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .not('valid_until', 'is', null)
      .gt('valid_until', nowIso)
      .lte('valid_until', futureIso),
    sb
      .from('student_content_entitlements')
      .select('assigned_entity_id, valid_until')
      .eq('student_id', studentId)
      .eq('assigned_entity_type', 'master_course')
      .eq('status', 'active')
      .not('valid_until', 'is', null)
      .gt('valid_until', nowIso)
      .lte('valid_until', futureIso),
  ]);

  const result = new Map<string, number>();

  for (const e of entitlements.data ?? []) {
    if (e.master_course_id && e.valid_until) {
      const daysRemaining = Math.ceil(
        (new Date(e.valid_until).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      result.set(e.master_course_id, daysRemaining);
    }
  }

  for (const e of contentEntitlements.data ?? []) {
    if (e.assigned_entity_id && e.valid_until) {
      const daysRemaining = Math.ceil(
        (new Date(e.valid_until).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const existing = result.get(e.assigned_entity_id);
      if (!existing || daysRemaining < existing) {
        result.set(e.assigned_entity_id, daysRemaining);
      }
    }
  }

  // Filter out free courses — they never show expiry badges
  if (result.size > 0) {
    const courseIds = Array.from(result.keys());
    const { getCachedMasterCourse } = await import('@/lib/services/course-cache');
    const coursesRaw = await Promise.all(
      courseIds.map(id => getCachedMasterCourse(id))
    );
    const courses = coursesRaw.filter((c): c is typeof coursesRaw[number] & object => c !== null);

    const freeCourseIds = new Set(
      courses.reduce<string[]>((acc, c) => {
        if (c.is_free || c.pricing_model === 'free' || c.course_kind === 'free_course') {
          acc.push(c.id);
        }
        return acc;
      }, []),
    );

    for (const freeId of freeCourseIds) {
      result.delete(freeId);
    }
  }

  return result;
}

// ─── Student Content Entitlements ─────────────────────────────────────────────

async function listStudentContentEntitlementsCached(
  studentId: string,
): Promise<StudentContentEntitlementsRow[]> {
  'use cache';
  cacheLife('halfMinute');
  cacheTag(`student-content-entitlements-${studentId}`);

  const sb = createAdminClient();
  const nowMs = Math.floor(Date.now() / 30000) * 30000;
  const nowIso = new Date(nowMs).toISOString();

  const { data, error } = await sb
    .from('student_content_entitlements')
    .select(
      'id, student_id, assigned_entity_type, assigned_entity_id, source_type, status, valid_from, valid_until, metadata, created_at, updated_at',
    )
    .eq('student_id', studentId)
    .eq('status', 'active')
    .lte('valid_from', nowIso)
    .or('valid_until.is.null,valid_until.gt.' + nowIso);

  if (error) {
    if (isSupabaseNetworkError(error)) {
      console.error(
        '[student-content-entitlements] listStudentContentEntitlements network failure',
        {
          studentId,
          message: describeSupabaseError(error),
        },
      );
      return [];
    }

    throw new Error(
      `Failed to list student content entitlements: ${describeSupabaseError(error)}`,
    );
  }
  return (data ?? []) as StudentContentEntitlementsRow[];
}

export const listStudentContentEntitlements = cache(async (
  studentId: string,
): Promise<StudentContentEntitlementsRow[]> => {
  return listStudentContentEntitlementsCached(studentId);
});

export async function checkContentEntitlementForItem(
  studentId: string,
  itemId: string,
  masterCourseId: string,
): Promise<StudentContentEntitlementsRow | null> {
  const entitlements = await listStudentContentEntitlements(studentId);
  if (entitlements.length === 0) return null;

  const sb = createAdminClient();

  for (const entitlement of entitlements) {
    const e = entitlement as StudentContentEntitlementsRow;
    if (e.assigned_entity_type === 'master_course') {
      if (normUuid(e.assigned_entity_id) === normUuid(masterCourseId)) {
        return e;
      }
    }
  }

  const variantEntitlements = entitlements.filter((e) => e.assigned_entity_type === 'variant');
  if (variantEntitlements.length > 0) {
    const variantIds = variantEntitlements.map((e) => e.assigned_entity_id);
    const { data: allVariantItems } = await sb
      .from('course_variant_items')
      .select('course_variant_id, master_course_item_id')
      .in('course_variant_id', variantIds);

    const variantItemMap = new Map<string, Set<string>>();
    for (const row of allVariantItems ?? []) {
      const vid = row.course_variant_id as string;
      if (!variantItemMap.has(vid)) variantItemMap.set(vid, new Set());
      variantItemMap.get(vid)!.add(row.master_course_item_id as string);
    }

    for (const e of variantEntitlements) {
      const ids = variantItemMap.get(e.assigned_entity_id);
      if (ids?.has(itemId)) return e;
    }
  }

  const bundleEntitlements = entitlements.filter((e) => e.assigned_entity_type === 'bundle');
  if (bundleEntitlements.length > 0) {
    const bundleResults = await Promise.all(
      bundleEntitlements.map(async (e) => {
        const bundleItemIds = await resolveBundleItemIds(e.assigned_entity_id, masterCourseId);
        return { entitlement: e, hasItem: bundleItemIds.has(itemId) };
      }),
    );
    for (const r of bundleResults) {
      if (r.hasItem) return r.entitlement;
    }
  }

  return null;
}

export async function resolveContentEntitledItemIdsForCourse(
  studentId: string,
  masterCourseId: string,
): Promise<ContentEntitledItemResolution> {
  const sb = createAdminClient();
  const entitlements = await listStudentContentEntitlements(studentId);
  if (entitlements.length === 0) {
    return { allow_all: false, item_ids: new Set() };
  }

  const itemIds = new Set<string>();
  const wantCourse = normUuid(masterCourseId);

  const allowAll = entitlements.some(
    (e) =>
      e.assigned_entity_type === 'master_course' &&
      normUuid(e.assigned_entity_id) === wantCourse,
  );

  if (allowAll) {
    return { allow_all: true, item_ids: new Set() };
  }

  const variantEntitlements = entitlements.filter((e) => e.assigned_entity_type === 'variant');
  if (variantEntitlements.length > 0) {
    const variantIds = variantEntitlements.map((e) => e.assigned_entity_id);
    const { data: variants } = await sb
      .from('course_variants')
      .select('id, master_course_id')
      .in('id', variantIds);

    const relevantVariantIds = (variants ?? []).reduce((acc, variant) => {
      if (normUuid(variant.master_course_id as string) === wantCourse)
        acc.push(variant.id as string);
      return acc;
    }, [] as string[]);

    if (relevantVariantIds.length > 0) {
      const { data: allVariantItems } = await sb
        .from('course_variant_items')
        .select('course_variant_id, master_course_item_id')
        .in('course_variant_id', relevantVariantIds);
      for (const row of allVariantItems ?? []) {
        itemIds.add(row.master_course_item_id as string);
      }
    }
  }

  const bundleEntitlements = entitlements.filter((e) => e.assigned_entity_type === 'bundle');
  if (bundleEntitlements.length > 0) {
    const bundleResults = await Promise.all(
      bundleEntitlements.map((e) =>
        resolveBundleItemIds(e.assigned_entity_id, masterCourseId),
      ),
    );
    for (const ids of bundleResults) {
      for (const id of ids) itemIds.add(id);
    }
  }

  return { allow_all: false, item_ids: itemIds };
}

export async function checkAnyEntitlementForCourse(
  studentId: string,
  masterCourseId: string,
): Promise<boolean> {
  const { getCachedStudentEntitlements, getCachedContentEntitlements } = await import(
    '@/lib/services/entitlement-cache'
  );

  const [seData, sceData] = await Promise.all([
    getCachedStudentEntitlements(studentId),
    getCachedContentEntitlements(studentId),
  ]);

  const hasSe = seData.some((e) => e.master_course_id === masterCourseId);
  if (hasSe) return true;

  const hasSce = sceData.some(
    (e) =>
      e.assigned_entity_type === 'master_course' &&
      normUuid(e.assigned_entity_id) === normUuid(masterCourseId),
  );

  return hasSce;
}

export async function grantEntitlementsForNewStudentLms(
  studentId: string,
  collegeId: string,
): Promise<{ created: number; existed: number; createdIds: string[] }> {
  const sb = createAdminClient();
  let createdCount = 0;
  let existedCount = 0;
  const createdIds: string[] = [];

  const { data: assignments, error } = await sb
    .from('content_assignments')
    .select('id, assigned_entity_type, assigned_entity_id, start_date, end_date')
    .eq('assignment_type', 'college')
    .eq('target_id', collegeId)
    .eq('status', 'active');

  if (error || !assignments || assignments.length === 0) {
    return { created: 0, existed: 0, createdIds: [] };
  }

  const activeAssignments = assignments.filter(isAssignmentActive);
  const toInsert = activeAssignments.filter((a) => a.assigned_entity_type !== 'master_course');

  const insertSettled = await Promise.allSettled(
    toInsert.map((assignment) =>
      sb
        .from('student_content_entitlements')
        .insert({
          student_id: studentId,
          assigned_entity_type: assignment.assigned_entity_type,
          assigned_entity_id: assignment.assigned_entity_id,
          source_type: 'college_assignment',
          status: 'active',
          valid_from: assignment.start_date ?? new Date().toISOString(),
          valid_until: assignment.end_date ?? null,
          metadata: {
            assignment_id: assignment.id,
            college_id: collegeId,
          },
        })
        .select('id')
        .single(),
    ),
  );

  for (const r of insertSettled) {
    if (r.status === 'fulfilled') {
      createdCount++;
      if (r.value.data?.id) {
        createdIds.push(r.value.data.id as string);
      }
    } else {
      const error = r.reason;
      if (
        error instanceof Error &&
        (error.message.includes('already exists') ||
          (error as { code?: string }).code === '23505')
      ) {
        existedCount++;
      } else {
        console.error(
          `[Assignment] Failed to grant content entitlement for new student: ${error}`,
        );
      }
    }
  }

  return { created: createdCount, existed: existedCount, createdIds };
}

// ─── Bundle items lookup helper ──────────────────────────────────────────────

async function resolveBundleItemIds(
  bundleId: string,
  targetMasterCourseId?: string,
  visitedBundleIds?: Set<string>,
): Promise<Set<string>> {
  const sb = createAdminClient();
  const visited = visitedBundleIds ?? new Set<string>();

  if (visited.has(bundleId)) return new Set();
  visited.add(bundleId);

  let resolvedQuery = sb
    .from('bundle_resolved_items')
    .select('master_course_item_id, parent_master_course_id')
    .eq('bundle_id', bundleId);

  if (targetMasterCourseId) {
    resolvedQuery = resolvedQuery.eq('parent_master_course_id', targetMasterCourseId);
  }

  const { data: resolvedRows } = await resolvedQuery;

  if (resolvedRows && resolvedRows.length > 0) {
    const ids = new Set<string>();
    for (const row of resolvedRows) {
      ids.add(row.master_course_item_id as string);
    }
    return ids;
  }

  const { data: bundleItems } = await sb
    .from('bundle_items')
    .select('id, item_type, reference_id')
    .eq('bundle_id', bundleId);

  if (!bundleItems || bundleItems.length === 0) return new Set();

  const bundleItemIds = bundleItems.map((bi) => bi.id);
  const { data: overrideRows } = await sb
    .from('bundle_item_selected_items')
    .select('bundle_item_id, master_course_item_id')
    .in('bundle_item_id', bundleItemIds)
    .order('sort_order', { ascending: true });

  const overrideMap = new Map<string, string[]>();
  for (const row of overrideRows ?? []) {
    const bid = row.bundle_item_id as string;
    if (!overrideMap.has(bid)) overrideMap.set(bid, []);
    overrideMap.get(bid)!.push(row.master_course_item_id as string);
  }

  const masterCourseIds = bundleItems.reduce((acc, bi) => {
    if (bi.item_type === 'master_course') acc.push(bi.reference_id as string);
    return acc;
  }, [] as string[]);

  const masterCourseItemsMap = new Map<string, string[]>();
  if (masterCourseIds.length > 0) {
    let mcQuery = sb
      .from('master_course_items')
      .select('id, master_course_id')
      .in('master_course_id', masterCourseIds)
      .eq('publish_status', 'published');

    if (targetMasterCourseId) {
      mcQuery = mcQuery.eq('master_course_id', targetMasterCourseId);
    }

    const { data: mcItems } = await mcQuery;
    for (const item of mcItems ?? []) {
      const mcId = item.master_course_id as string;
      if (!masterCourseItemsMap.has(mcId)) masterCourseItemsMap.set(mcId, []);
      masterCourseItemsMap.get(mcId)!.push(item.id as string);
    }
  }

  const variantIds = bundleItems.reduce((acc, bi) => {
    if (bi.item_type === 'variant') acc.push(bi.reference_id as string);
    return acc;
  }, [] as string[]);

  const variantItemsMap = new Map<string, string[]>();
  if (variantIds.length > 0) {
    let viQuery = sb
      .from('course_variant_items')
      .select(
        'course_variant_id, master_course_item_id, master_course_items!inner(master_course_id, publish_status)',
      )
      .in('course_variant_id', variantIds)
      .eq('master_course_items.publish_status', 'published');

    if (targetMasterCourseId) {
      viQuery = viQuery.eq('master_course_items.master_course_id', targetMasterCourseId);
    }

    const { data: viRows } = await viQuery;
    for (const row of viRows ?? []) {
      const vid = row.course_variant_id as string;
      if (!variantItemsMap.has(vid)) variantItemsMap.set(vid, []);
      variantItemsMap.get(vid)!.push(row.master_course_item_id as string);
    }
  }

  const allItemIds = new Set<string>();

  const resolvedPerItem = await Promise.all(
    bundleItems.map(async (bi) => {
      const biId = bi.id as string;
      const itemType = bi.item_type as string;
      const refId = bi.reference_id as string;
      const overrides = overrideMap.get(biId);

      let sourceItems: string[] = [];

      if (itemType === 'master_course') {
        sourceItems = masterCourseItemsMap.get(refId) ?? [];
      } else if (itemType === 'variant') {
        sourceItems = variantItemsMap.get(refId) ?? [];
      } else if (itemType === 'master_course_item') {
        if (targetMasterCourseId) {
          const { data: item } = await sb
            .from('master_course_items')
            .select('id')
            .eq('id', refId)
            .eq('master_course_id', targetMasterCourseId)
            .eq('publish_status', 'published')
            .maybeSingle();
          if (item) sourceItems = [refId];
        } else {
          sourceItems = [refId];
        }
      } else if (itemType === 'bundle') {
        const nestedIds = await resolveBundleItemIds(
          refId,
          targetMasterCourseId,
          new Set(visited),
        );
        sourceItems = Array.from(nestedIds);
      }

      if (overrides && overrides.length > 0) {
        const overrideSet = new Set(overrides);
        return sourceItems.filter((id) => overrideSet.has(id));
      }
      return sourceItems;
    }),
  );

  for (const items of resolvedPerItem) {
    for (const id of items) allItemIds.add(id);
  }

  return allItemIds;
}

// ─── Player Course Access Validation (Source aware) ───────────────────────────

async function resolvePlayerCourseSource(
  masterCourseId: string,
  options?: { variantId?: string | null },
): Promise<PlayerCourseSourceIdentity | null> {
  const course = await loadCourseRow(masterCourseId);
  if (!course) return null;

  const variantId = options?.variantId?.trim() || null;
  let sourceType = resolvePaidCourseSourceType(course);
  let sourceId = course.id;

  if (variantId) {
    const sb = createAdminClient();
    const { data: variant } = await sb
      .from('course_variants')
      .select('id, master_course_id, show_as_paid_course')
      .eq('id', variantId)
      .eq('master_course_id', masterCourseId)
      .maybeSingle();

    if (variant) {
      sourceType = 'course_variant';
      sourceId = variant.id as string;
    }
  }

  const pillarSlug = course.bootcamp_id
    ? LEGACY_BOOTCAMP_PILLAR_SLUG
    : course.pillar_id
      ? await resolvePillarSlug(course.pillar_id)
      : null;

  return {
    sourceType,
    sourceId,
    masterCourseId: course.id,
    courseSlug: course.slug,
    pillarSlug,
  };
}

async function loadCourseRow(masterCourseId: string): Promise<CourseRow | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('courses');
  const sb = createAdminClient();
  const { data } = await sb
    .from('master_courses')
    .select('id, slug, pillar_id, bootcamp_id, catalog_type, is_free, pricing_model, course_kind')
    .eq('id', masterCourseId)
    .maybeSingle();
  return (data as CourseRow | null) ?? null;
}

type CourseRow = {
  id: string;
  slug: string | null;
  pillar_id: string | null;
  bootcamp_id: string | null;
  catalog_type: string | null;
  is_free: boolean | null;
  pricing_model: string | null;
  course_kind: string | null;
};

async function resolvePillarSlug(pillarId: string): Promise<string | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('pillars');
  const sb = createAdminClient();
  const { data } = await sb
    .from('master_course_pillars')
    .select('slug')
    .eq('id', pillarId)
    .maybeSingle();
  return (data?.slug as string | null) ?? null;
}

export const validatePlayerCourseAccess = cache(
  async function validatePlayerCourseAccess(
    studentId: string,
    masterCourseId: string,
    context: StudentAccessContext,
    options?: {
      collegeSlug?: string;
      variantId?: string | null;
      lessonId?: string | null;
    },
  ): Promise<PlayerAccessValidation> {
    const source = await resolvePlayerCourseSource(masterCourseId, {
      variantId: options?.variantId,
    });

  const defaultSource: PlayerCourseSourceIdentity = source ?? {
    sourceType: 'master_course',
    sourceId: masterCourseId,
    masterCourseId,
    courseSlug: null,
    pillarSlug: null,
  };

  // Run all access vector checks in parallel for maximum concurrency
  const [courseAccess, itemAccess, assignedIds] = await Promise.all([
    validateStudentCourseAccess(studentId, masterCourseId, context),
    checkContentEntitlementForItem(studentId, options?.lessonId ?? '', masterCourseId),
    context.collegeId ? resolveCollegeAssignedCourseIds(context.collegeId) : Promise.resolve([]),
  ]);

  if (courseAccess) {
    return {
      allowed: true,
      accessLevel: 'full',
      source: defaultSource,
      entitlementId: courseAccess.source_entitlement_id,
      allowedItemIds: null,
      redirectHref: null,
      denyReason: null,
    };
  }

  if (itemAccess) {
    return {
      allowed: true,
      accessLevel: 'full',
      source: defaultSource,
      entitlementId: itemAccess.id,
      allowedItemIds: null,
      redirectHref: null,
      denyReason: null,
    };
  }

  if (context.collegeId && assignedIds.length > 0) {
    const want = normUuid(masterCourseId);
    if (assignedIds.some((id) => normUuid(id) === want)) {
      return {
        allowed: true,
        accessLevel: 'full',
        source: defaultSource,
        entitlementId: null,
        allowedItemIds: null,
        redirectHref: null,
        denyReason: null,
      };
    }
  }

  // 4. Job Ready Bootcamp inheritance (bootcamp enrollment grants access to bootcamp pillar courses)
  const { canAccessBootcampCourse } = await import('@/lib/services/job-ready-bootcamp');
  if (await canAccessBootcampCourse(studentId, masterCourseId, context.collegeId)) {
    return {
      allowed: true,
      accessLevel: 'full',
      source: defaultSource,
      entitlementId: null,
      allowedItemIds: null,
      redirectHref: null,
      denyReason: null,
    };
  }

  return {
    allowed: false,
    accessLevel: 'none',
    source: defaultSource,
    entitlementId: null,
    allowedItemIds: null,
    redirectHref: null,
    denyReason: 'No active entitlement, content entitlement, college assignment, or bootcamp access found.',
  };
});
