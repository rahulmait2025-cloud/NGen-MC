import 'server-only';
import { cacheTag, cacheLife } from 'next/cache';

/**
 * Student Entitlements Service (Phase 4).
 *
 * Centralized access-control layer that determines which Master Courses
 * a student can access. Supports B2B college, B2C direct, bundle,
 * subscription, and manual grants.
 *
 * All methods use the service-role client (bypasses RLS).
 * Callers must validate admin identity before invoking mutations.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  EntitlementSourceType,
  EntitlementStatus,
  StudentEntitlementsRow,
} from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Grant / Revoke ───────────────────────────────────────────────────────────

/**
 * Grant a student access to a Master Course.
 */
export async function grantEntitlement(
  input: GrantEntitlementInput,
): Promise<StudentEntitlementsRow> {
  const sb = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: existing } = await sb
    .from('student_entitlements')
    .select('id, student_id, master_course_id, source_type, college_id, status, valid_from, valid_until, granted_by, revoked_at, revoked_by, revoke_reason, metadata, created_at, updated_at')
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
    .select('id, student_id, master_course_id, source_type, college_id, status, valid_from, valid_until, granted_by, metadata, created_at, updated_at')
    .single();

  if (error) throw new Error(`Failed to grant entitlement: ${error.message}`);
  return data as StudentEntitlementsRow;
}



// ─── Resolution / Validation ──────────────────────────────────────────────────

/**
 * Inner function that checks course hierarchy visibility.
 * Exported separately for use in unstable_cache.
 */
async function _checkHierarchyVisibility(
  courseId: string,
  isGlobal: boolean,
): Promise<boolean> {
  const sb = createAdminClient();

  const { data: course } = await sb
    .from('master_courses')
    .select('publish_status, visible_to_global_students, visible_to_college_students, pillar_id, bootcamp_id, catalog_type, course_kind, is_free, pricing_model, show_as_paid_course')
    .eq('id', courseId)
    .maybeSingle();

  if (!course || course.publish_status !== 'published') return false;

  const isFreeByAnyIndicator =
    course.course_kind === 'free_course'
    || course.is_free === true
    || course.pricing_model === 'free';

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

    if (!bootcamp || bootcamp.publish_status !== 'published' || bootcamp.lifecycle_status !== 'active') {
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
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[checkHierarchyVisibility] Standalone course with no parent hierarchy — allowing published course', {
        courseId,
        isGlobal,
        course_kind: course.course_kind,
        is_free: course.is_free,
        pillar_id: course.pillar_id,
        bootcamp_id: course.bootcamp_id,
      });
    }
    return true;
  }

  return true;
}

/**
 * Validates that a course and its parent pillar are published and visible
 * to the given student type.
 *
 * PERFORMANCE: Uses unstable_cache for cross-request caching (5 min TTL).
 * Course and pillar visibility rarely change, so caching reduces DB load significantly.
 */
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

/**
 * Get all active, non-expired entitlements for a student.
 */
export async function resolveStudentEntitlements(
  studentId: string,
): Promise<EntitlementWithCourse[]> {
  const { getCachedStudentEntitlements } = await import('@/lib/services/entitlement-cache');
  const entitlements = await getCachedStudentEntitlements(studentId);
  return entitlements as EntitlementWithCourse[];
}

/**
 * Check if a student has an active entitlement for a specific course.
 * Returns the entitlement row if valid, null otherwise.
 */
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
    .select('id, student_id, master_course_id, source_type, college_id, status, valid_from, valid_until, granted_by, revoked_at, revoked_by, revoke_reason, metadata, created_at, updated_at')
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

export async function validateStudentCourseAccess(
  studentId: string,
  courseId: string,
  isGlobal: boolean,
): Promise<StudentEntitlementsRow | null> {
  const nowMs = Math.floor(Date.now() / 30000) * 30000;
  const nowIso = new Date(nowMs).toISOString();

  // Parallelize independent cached checks
  const [isVisible, entitlement] = await Promise.all([
    checkHierarchyVisibility(courseId, isGlobal),
    _validateStudentCourseAccessCached(studentId, courseId, nowIso),
  ]);

  if (!isVisible) return null;
  return entitlement;
}






