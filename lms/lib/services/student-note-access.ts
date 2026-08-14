import 'server-only';

/**
 * Student Note Access Resolver (Phase 3).
 *
 * Resolves whether a student has access to a specific note collection.
 *
 * Resolution order:
 * 1. Free note collection → always accessible
 * 2. Active student_note_entitlement → accessible if not expired
 * 3. Course-linked unlock → if note_course_links.auto_unlock_with_course = true
 *    and the student has an active entitlement for the linked course
 *
 * Do NOT duplicate existing course entitlement logic.
 * Reuses validateStudentCourseAccess from student-entitlements.ts.
 */

import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  StudentNoteEntitlementsRow,
  NoteCourseLinksRow,
  NoteCollectionSourceType,
  NoteCollectionCatalogVisibility,
} from '@/types/database';

export interface StudentNoteAccessResult {
  hasAccess: boolean;
  source: 'free' | 'entitlement' | 'course_unlock' | null;
  entitlement: StudentNoteEntitlementsRow | null;
  linkedCourseId: string | null;
  validUntil: string | null;
  sourceType: NoteCollectionSourceType | null;
  catalogVisibility: NoteCollectionCatalogVisibility | null;
}

/**
 * Fetch course links for a note collection, including module/item scope.
 * Used by the course player to resolve which notes to show in Resources tab.
 */
export async function getNoteCourseLinksDetail(
  noteCollectionId: string,
): Promise<Pick<NoteCourseLinksRow, 'id' | 'course_id' | 'module_id' | 'item_id' | 'auto_unlock_with_course'>[]> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('note_course_links')
    .select('id, course_id, module_id, item_id, auto_unlock_with_course')
    .eq('note_collection_id', noteCollectionId)
    .eq('auto_unlock_with_course', true);

  if (error) return [];
  return (data ?? []) as Pick<NoteCourseLinksRow, 'id' | 'course_id' | 'module_id' | 'item_id' | 'auto_unlock_with_course'>[];
}

/**
 * Resolve whether a student can access a note collection.
 *
 * Resolution order:
 * 1. Free note collection → always accessible
 * 2. Active student_note_entitlement → accessible if not expired
 * 3. Course-linked unlock → dynamic check via note_course_links
 *
 * @param studentId          The student's ID (from students table)
 * @param noteCollectionId   The note collection to check access for
 * @param isGlobal           Whether the student is a global (B2C) student
 * @returns StudentNoteAccessResult with access status and source
 */
export async function resolveStudentNoteAccess(
  studentId: string,
  noteCollectionId: string,
  isGlobal: boolean = true,
): Promise<StudentNoteAccessResult> {
  const sb = createAdminClient();

  // 1. Check if the note collection exists, is published, and not deleted
  const { data: collection } = await sb
    .from('note_collections')
    .select('id, pricing_model, publish_status, deleted_at, source_type, catalog_visibility')
    .eq('id', noteCollectionId)
    .eq('publish_status', 'published')
    .is('deleted_at', null)
    .maybeSingle();

  if (!collection) {
    return {
      hasAccess: false,
      source: null,
      entitlement: null,
      linkedCourseId: null,
      validUntil: null,
      sourceType: null,
      catalogVisibility: null,
    };
  }

  const sourceType = collection.source_type as NoteCollectionSourceType;
  const catalogVisibility = collection.catalog_visibility as NoteCollectionCatalogVisibility;

  // 2. Free note collection → always accessible
  if (collection.pricing_model === 'free') {
    return {
      hasAccess: true,
      source: 'free',
      entitlement: null,
      linkedCourseId: null,
      validUntil: null,
      sourceType,
      catalogVisibility,
    };
  }

  // 3. Check for an active student note entitlement (direct purchase)
  const { data: entitlement } = await sb
    .from('student_note_entitlements')
    .select('id, student_id, note_collection_id, source_type, status, valid_from, valid_until, metadata, created_at, updated_at')
    .eq('student_id', studentId)
    .eq('note_collection_id', noteCollectionId)
    .eq('status', 'active')
    .or('valid_until.is.null,valid_until.gt.now()')
    .maybeSingle();

  if (entitlement) {
    return {
      hasAccess: true,
      source: 'entitlement',
      entitlement: entitlement as StudentNoteEntitlementsRow,
      linkedCourseId: null,
      validUntil: (entitlement as StudentNoteEntitlementsRow).valid_until,
      sourceType,
      catalogVisibility,
    };
  }

  // 4. Course-linked unlock — check note_course_links for auto_unlock_with_course
  const { data: courseLinks } = await sb
    .from('note_course_links')
    .select('id, course_id, auto_unlock_with_course')
    .eq('note_collection_id', noteCollectionId)
    .eq('auto_unlock_with_course', true);

  if (courseLinks && courseLinks.length > 0) {
    // Batch-resolve all linked courses in parallel (eliminates sequential N+1)
    const { validateStudentCourseAccess } = await import('@/lib/services/course-access-manager');

    const courseIds = courseLinks.map((link) => (link as NoteCourseLinksRow).course_id);
    const validationResults = await Promise.all(
      courseIds.map(async (courseId) => ({
        courseId,
        entRow: await validateStudentCourseAccess(studentId, courseId, { isGlobal, collegeId: null }),
      })),
    );

    const validMatch = validationResults.find((vr) => !!vr.entRow);
    if (validMatch && validMatch.entRow) {
      return {
        hasAccess: true,
        source: 'course_unlock',
        entitlement: null,
        linkedCourseId: validMatch.courseId,
        validUntil: validMatch.entRow.valid_until ?? null,
        sourceType,
        catalogVisibility,
      };
    }
  }

  // No access found
  return {
    hasAccess: false,
    source: null,
    entitlement: null,
    linkedCourseId: null,
    validUntil: null,
    sourceType,
    catalogVisibility,
  };
}

/**
 * Batch resolve note access for multiple collections.
 * Used by the catalog to avoid per-collection queries.
 */
export async function resolveStudentNoteAccessBatch(
  studentId: string,
  noteCollectionIds: string[],
  isGlobal: boolean = true,
): Promise<Map<string, StudentNoteAccessResult>> {
  const results = new Map<string, StudentNoteAccessResult>();

  if (noteCollectionIds.length === 0) return results;

  const sb = createAdminClient();

  // 1. Fetch all collections in one query
  const { data: collections } = await sb
    .from('note_collections')
    .select('id, pricing_model, publish_status, deleted_at, source_type, catalog_visibility')
    .in('id', noteCollectionIds)
    .eq('publish_status', 'published')
    .is('deleted_at', null);

  const collectionMap = new Map<string, { pricing_model: string; source_type: NoteCollectionSourceType; catalog_visibility: NoteCollectionCatalogVisibility }>();
  for (const c of collections ?? []) {
    collectionMap.set(c.id, {
      pricing_model: c.pricing_model,
      source_type: c.source_type as NoteCollectionSourceType,
      catalog_visibility: c.catalog_visibility as NoteCollectionCatalogVisibility,
    });
  }

  // Mark non-existent collections as locked
  for (const id of noteCollectionIds) {
    if (!collectionMap.has(id)) {
      results.set(id, {
        hasAccess: false,
        source: null,
        entitlement: null,
        linkedCourseId: null,
        validUntil: null,
        sourceType: null,
        catalogVisibility: null,
      });
    }
  }

  // 2. Free collections → accessible
  const paidIds: string[] = [];
  for (const [id, col] of collectionMap) {
    if (col.pricing_model === 'free') {
      results.set(id, {
        hasAccess: true,
        source: 'free',
        entitlement: null,
        linkedCourseId: null,
        validUntil: null,
        sourceType: col.source_type,
        catalogVisibility: col.catalog_visibility,
      });
    } else {
      paidIds.push(id);
    }
  }

  if (paidIds.length === 0) return results;

  // 3. Check entitlements for paid collections in one query
  const { data: entitlements } = await sb
    .from('student_note_entitlements')
    .select('id, student_id, note_collection_id, source_type, status, valid_from, valid_until, metadata, created_at, updated_at')
    .eq('student_id', studentId)
    .in('note_collection_id', paidIds)
    .eq('status', 'active')
    .or('valid_until.is.null,valid_until.gt.now()');

  const entitlementMap = new Map<string, StudentNoteEntitlementsRow>();
  for (const e of entitlements ?? []) {
    entitlementMap.set(e.note_collection_id, e as StudentNoteEntitlementsRow);
  }

  for (const id of paidIds) {
    const ent = entitlementMap.get(id);
    const col = collectionMap.get(id);
    if (ent) {
      results.set(id, {
        hasAccess: true,
        source: 'entitlement',
        entitlement: ent,
        linkedCourseId: null,
        validUntil: ent.valid_until,
        sourceType: col?.source_type ?? null,
        catalogVisibility: col?.catalog_visibility ?? null,
      });
    }
  }

  // 4. Remaining paid IDs → check course-linked unlock (batched to avoid N+1)
  const remainingIds = paidIds.filter((id) => !results.has(id));
  if (remainingIds.length === 0) return results;

  const { data: courseLinks } = await sb
    .from('note_course_links')
    .select('note_collection_id, course_id')
    .in('note_collection_id', remainingIds)
    .eq('auto_unlock_with_course', true);

  // Group course links by note_collection_id
  const linksByCollection = new Map<string, string[]>();
  const allUniqueCourseIds = new Set<string>();
  for (const link of courseLinks ?? []) {
    const ncId = link.note_collection_id;
    const cId = link.course_id;
    const existing = linksByCollection.get(ncId) ?? [];
    existing.push(cId);
    linksByCollection.set(ncId, existing);
    allUniqueCourseIds.add(cId);
  }

  // Batch-resolve course access for all unique course IDs (eliminates N×M queries)
  const { validateStudentCourseAccess } = await import('@/lib/services/course-access-manager');

  const uniqueCourseArray = [...allUniqueCourseIds];
  const courseAccessResults = await Promise.all(
    uniqueCourseArray.map(async (courseId) => ({
      courseId,
      entRow: await validateStudentCourseAccess(studentId, courseId, { isGlobal, collegeId: null }),
    })),
  );

  // Build a lookup map: courseId → entitlement row
  const courseAccessMap = new Map<string, NonNullable<Awaited<ReturnType<typeof validateStudentCourseAccess>>>>();
  for (const { courseId, entRow } of courseAccessResults) {
    if (entRow) courseAccessMap.set(courseId, entRow);
  }

  // Map results back to collections
  for (const ncId of remainingIds) {
    const courseIds = linksByCollection.get(ncId) ?? [];
    const validMatch = courseIds.find((cId) => courseAccessMap.has(cId));

    const col = collectionMap.get(ncId);
    if (validMatch) {
      const entRow = courseAccessMap.get(validMatch)!;
      results.set(ncId, {
        hasAccess: true,
        source: 'course_unlock',
        entitlement: null,
        linkedCourseId: validMatch,
        validUntil: entRow.valid_until ?? null,
        sourceType: col?.source_type ?? null,
        catalogVisibility: col?.catalog_visibility ?? null,
      });
    } else {
      results.set(ncId, {
        hasAccess: false,
        source: null,
        entitlement: null,
        linkedCourseId: null,
        validUntil: null,
        sourceType: col?.source_type ?? null,
        catalogVisibility: col?.catalog_visibility ?? null,
      });
    }
  }

  return results;
}

/**
 * Canonical cached note-access resolver.
 * Caches student + collection authorization results using unstable_cache.
 * Positive result TTL: 300s (5 minutes).
 * Revalidation tags: ['note-access', `note-access-${studentId}`, `note-access-${collectionId}`].
 */
export async function resolveStudentNoteAccessCached(params: {
  studentId: string;
  collegeId: string | null;
  isGlobal?: boolean;
  collectionId: string;
}): Promise<StudentNoteAccessResult> {
  const { studentId, collegeId, isGlobal = true, collectionId } = params;
  return unstable_cache(
    async () => {
      return resolveStudentNoteAccess(studentId, collectionId, isGlobal);
    },
    [`note-access-${studentId}-${collectionId}-${collegeId ?? 'global'}`],
    {
      revalidate: 300,
      tags: ['note-access', `note-access-${studentId}`, `note-access-${collectionId}`],
    }
  )();
}
