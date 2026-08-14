import 'server-only';

import { cache } from 'react';
import { cacheTag, cacheLife } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseNetworkError, describeSupabaseError } from '@/lib/supabase/network-error';
import type {
  StudentEntitlementsRow,
} from '@/types/database';
import type { StudentContentEntitlementsRow } from '@/lib/services/course-access-manager';

/**
 * Entitlement Cache Service
 *
 * Request-scoped caching layer for entitlement validation.
 * Uses React cache() for per-request deduplication only.
 * Hard refresh always fetches fresh entitlement data.
 *
 * Cache invalidation:
 * - No long-lived cache — React cache() deduplicates within a single request
 * - pg_cron expiry updates propagate immediately on next request
 */

const ENTITLEMENT_CACHE_TAG = 'entitlement-check';

// ─── Cached Entitlement Queries ─────────────────────────────────────────────

/**
 * Query: Get all active, non-expired entitlements for a student.
 * Cross-request cached via Next.js 'use cache' and cacheTag().
 */
async function _getStudentEntitlements(studentId: string): Promise<StudentEntitlementsRow[]> {
  'use cache';
  cacheLife('halfMinute');
  cacheTag(`student-entitlements-${studentId}`);

  const sb = createAdminClient();
  const nowMs = Math.floor(Date.now() / 30000) * 30000;
  const nowIso = new Date(nowMs).toISOString();

  const { data, error } = await sb
    .from('student_entitlements')
    .select('id, student_id, master_course_id, source_type, college_id, status, valid_from, valid_until, granted_by, revoked_at, revoked_by, revoke_reason, metadata, created_at, updated_at')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .lte('valid_from', nowIso)
    .or('valid_until.is.null,valid_until.gt.' + nowIso);

  if (error) {
    if (isSupabaseNetworkError(error)) {
      console.error('[entitlement-cache] getStudentEntitlements network failure', {
        studentId,
        message: describeSupabaseError(error),
      });
      return [];
    }
    throw new Error(`Failed to resolve entitlements: ${describeSupabaseError(error)}`);
  }
  return (data ?? []) as StudentEntitlementsRow[];
}

/**
 * Query: Get all active content entitlements for a student.
 * Cross-request cached via Next.js 'use cache' and cacheTag().
 */
async function _getContentEntitlements(studentId: string): Promise<StudentContentEntitlementsRow[]> {
  'use cache';
  cacheLife('halfMinute');
  cacheTag(`student-content-entitlements-${studentId}`);

  const sb = createAdminClient();
  const nowMs = Math.floor(Date.now() / 30000) * 30000;
  const nowIso = new Date(nowMs).toISOString();

  const { data, error } = await sb
    .from('student_content_entitlements')
    .select('id, student_id, assigned_entity_type, assigned_entity_id, source_type, status, valid_from, valid_until, metadata, created_at, updated_at')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .lte('valid_from', nowIso)
    .or('valid_until.is.null,valid_until.gt.' + nowIso);

  if (error) {
    if (isSupabaseNetworkError(error)) {
      console.error('[entitlement-cache] getContentEntitlements network failure', {
        studentId,
        message: describeSupabaseError(error),
      });
      return [];
    }
    throw new Error(`Failed to list content entitlements: ${describeSupabaseError(error)}`);
  }
  return (data ?? []) as StudentContentEntitlementsRow[];
}

/**
 * Query: Check if a student has a traditional entitlement for a specific course.
 * Returns the entitlement row if valid, null otherwise.
 * Request-scoped dedup via React cache().
 */
async function _getEntitlementForCourse(studentId: string, courseId: string): Promise<StudentEntitlementsRow | null> {
  const sb = createAdminClient();
  const nowIso = new Date().toISOString();

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

  if (error) throw new Error(`Failed to validate course access: ${describeSupabaseError(error)}`);
  return data as StudentEntitlementsRow | null;
}

/**
 * Query: Check if a student has ANY entitlement (any type) for a specific course.
 * Returns true if any entitlement exists, false otherwise.
 * Request-scoped dedup via React cache().
 */
async function _hasAnyEntitlement(studentId: string, courseId: string): Promise<boolean> {
  const sb = createAdminClient();
  const nowIso = new Date().toISOString();

  // Check traditional entitlements
  const { count: traditionalCount } = await sb
    .from('student_entitlements')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('master_course_id', courseId)
    .eq('status', 'active')
    .lte('valid_from', nowIso)
    .or('valid_until.is.null,valid_until.gt.' + nowIso);

  if (traditionalCount && traditionalCount > 0) return true;

  // Check content entitlements
  const { count: contentCount } = await sb
    .from('student_content_entitlements')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('assigned_entity_type', 'master_course')
    .eq('assigned_entity_id', courseId)
    .eq('status', 'active')
    .lte('valid_from', nowIso)
    .or('valid_until.is.null,valid_until.gt.' + nowIso);

  if (contentCount && contentCount > 0) return true;

  return false;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get entitlements for a student.
 * Request-scoped dedup via React cache().
 */
export const getCachedStudentEntitlements = cache(async (
  studentId: string,
): Promise<StudentEntitlementsRow[]> => {
  return _getStudentEntitlements(studentId);
});

/**
 * Get content entitlements for a student.
 * Request-scoped dedup via React cache().
 */
export const getCachedContentEntitlements = cache(async (
  studentId: string,
): Promise<StudentContentEntitlementsRow[]> => {
  return _getContentEntitlements(studentId);
});

/**
 * Get entitlement for a specific course.
 * Request-scoped dedup via React cache().
 */
export const getCachedEntitlementForCourse = cache(async (
  studentId: string,
  courseId: string,
): Promise<StudentEntitlementsRow | null> => {
  return _getEntitlementForCourse(studentId, courseId);
});

/**
 * Check if student has any entitlement for a course.
 * Request-scoped dedup via React cache().
 */
export const hasCachedEntitlementForCourse = cache(async (
  studentId: string,
  courseId: string,
): Promise<boolean> => {
  return _hasAnyEntitlement(studentId, courseId);
});

/**
 * Check if a course is free (no entitlement check needed).
 * This is a pure metadata check — course properties don't change frequently.
 * Cached with 1 hour TTL.
 */
export async function isFreeCourse(courseId: string): Promise<boolean> {
  'use cache';
  cacheLife('hours');
  cacheTag('free-course-check');
  const sb = createAdminClient();
  const { data: course } = await sb
    .from('master_courses')
    .select('is_free, pricing_model, course_kind')
    .eq('id', courseId)
    .maybeSingle();

  if (!course) return false;
  return (
    course.is_free === true ||
    course.pricing_model === 'free' ||
    course.course_kind === 'free_course'
  );
}

/**
 * Batch check which courses are free (no entitlement check needed).
 * Single DB query for multiple courses - much more efficient than N individual calls.
 * Returns a Set of free course IDs.
 */
export async function areCoursesFree(courseIds: string[]): Promise<Set<string>> {
  if (courseIds.length === 0) return new Set();

  const sb = createAdminClient();
  const { data: courses } = await sb
    .from('master_courses')
    .select('id, is_free, pricing_model, course_kind')
    .in('id', courseIds);

  const freeIds = new Set<string>();
  for (const course of courses ?? []) {
    if (
      course.is_free === true ||
      course.pricing_model === 'free' ||
      course.course_kind === 'free_course'
    ) {
      freeIds.add(course.id);
    }
  }
  return freeIds;
}

/**
 * Invalidate all entitlement caches.
 * Call this when an entitlement is revoked, expired, or granted.
 * Uses tag-based revalidation.
 */
export async function invalidateEntitlementCache(): Promise<void> {
  const { revalidateTag } = await import('next/cache');
  revalidateTag(ENTITLEMENT_CACHE_TAG, 'default');
}
