import 'server-only';

/**
 * Student Engagement Service (Phase 7B).
 *
 * Handles student-authored notes and bookmarks for course lessons.
 * Enforces entitlement and ownership checks.
 *
 * PERFORMANCE: Read functions (getLessonNote, listLessonBookmarks) use
 * unstable_cache with 2min TTL to avoid redundant DB queries when
 * navigating between lessons. Write functions bypass cache.
 */

import { cacheTag, cacheLife, revalidateTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveAccessibleLesson } from '@/lib/services/course-access-manager';
import type { StudentLessonNotesRow, StudentLessonBookmarksRow } from '@/types/database';

// ─── Lesson Notes ────────────────────────────────────────────────────────────

/**
 * Get a student's note for a specific lesson.
 * Cached with 2min TTL — notes don't change during navigation.
 */
export async function getLessonNote(
  studentId: string,
  courseId: string,
  itemId: string,
  isGlobal: boolean,
  collegeId: string | null,
): Promise<StudentLessonNotesRow | null> {
  return _getCachedLessonNote(studentId, courseId, itemId, isGlobal, collegeId ?? null);
}

async function _getCachedLessonNote(studentId: string, courseId: string, itemId: string, isGlobal: boolean, collegeId: string | null): Promise<StudentLessonNotesRow | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag('lesson-notes');
  const access = await resolveAccessibleLesson(studentId, courseId, itemId, { isGlobal, collegeId });
  if (!access) return null;

  const sb = createAdminClient();
  const { data, error } = await sb
    .from('student_lesson_notes')
    .select('id, student_id, master_course_id, item_id, body, created_at, updated_at')
    .eq('student_id', studentId)
    .eq('item_id', access.item.id)
    .maybeSingle();

  if (error) {
    console.error('[EngagementService] getLessonNote error:', error);
    return null;
  }
  return data;
}

/**
 * Upsert (create or update) a student's note for a lesson.
 */
export async function upsertLessonNote(
  studentId: string,
  courseId: string,
  itemId: string,
  body: string,
  isGlobal: boolean,
  collegeId: string | null,
): Promise<{ success: boolean; data?: StudentLessonNotesRow; error?: string }> {
  const access = await resolveAccessibleLesson(studentId, courseId, itemId, { isGlobal, collegeId });
  if (!access) {
    return { success: false, error: 'Unauthorized: No active entitlement found.' };
  }

  const sb = createAdminClient();

  // 2. Upsert Note for the validated lesson
  const { data, error } = await sb
    .from('student_lesson_notes')
    .upsert(
      {
        student_id: studentId,
        master_course_id: access.course.id,
        item_id: access.item.id,
        body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,item_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('[EngagementService] upsertLessonNote error:', error);
    return { success: false, error: 'Failed to save note.' };
  }

  revalidateTag('lesson-notes', 'max');

  return { success: true, data };
}

/**
 * Delete a student's note for a lesson.
 */
async function _deleteLessonNote(
  studentId: string,
  courseId: string,
  itemId: string,
  isGlobal: boolean,
  collegeId: string | null,
): Promise<{ success: boolean; error?: string }> {
  const access = await resolveAccessibleLesson(studentId, courseId, itemId, { isGlobal, collegeId });
  if (!access) {
    return { success: false, error: 'Unauthorized: Lesson access denied.' };
  }

  const sb = createAdminClient();
  const { error } = await sb
    .from('student_lesson_notes')
    .delete()
    .eq('student_id', studentId)
    .eq('item_id', access.item.id)
    .eq('master_course_id', access.course.id);

  if (error) {
    console.error('[EngagementService] deleteLessonNote error:', error);
    return { success: false, error: 'Failed to delete note.' };
  }

  revalidateTag('lesson-notes', 'max');

  return { success: true };
}

// ─── Lesson Bookmarks ────────────────────────────────────────────────────────

/**
 * List all bookmarks for a specific lesson and student.
 * Cached with 2min TTL — bookmarks don't change during navigation.
 */
export async function listLessonBookmarks(
  studentId: string,
  courseId: string,
  itemId: string,
  isGlobal: boolean,
  collegeId: string | null,
): Promise<StudentLessonBookmarksRow[]> {
  return _getCachedLessonBookmarks(studentId, courseId, itemId, isGlobal, collegeId ?? null);
}

async function _getCachedLessonBookmarks(studentId: string, courseId: string, itemId: string, isGlobal: boolean, collegeId: string | null): Promise<StudentLessonBookmarksRow[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('lesson-bookmarks');
  const access = await resolveAccessibleLesson(studentId, courseId, itemId, { isGlobal, collegeId });
  if (!access) return [];

  const sb = createAdminClient();
  const { data, error } = await sb
    .from('student_lesson_bookmarks')
    .select('id, student_id, master_course_id, item_id, timestamp_seconds, label, created_at')
    .eq('student_id', studentId)
    .eq('item_id', access.item.id)
    .order('timestamp_seconds', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[EngagementService] listLessonBookmarks error:', error);
    return [];
  }
  return data || [];
}

/**
 * Create a new bookmark for a lesson.
 */
export async function createLessonBookmark(
  studentId: string,
  courseId: string,
  itemId: string,
  timestampSeconds: number | null,
  label: string,
  isGlobal: boolean,
  collegeId: string | null,
): Promise<{ success: boolean; data?: StudentLessonBookmarksRow; error?: string }> {
  const access = await resolveAccessibleLesson(studentId, courseId, itemId, { isGlobal, collegeId });
  if (!access) {
    return { success: false, error: 'Unauthorized: No active entitlement found.' };
  }

  const sb = createAdminClient();

  // 2. Insert Bookmark for the validated lesson
  const { data, error } = await sb
    .from('student_lesson_bookmarks')
    .insert({
      student_id: studentId,
      master_course_id: access.course.id,
      item_id: access.item.id,
      timestamp_seconds: timestampSeconds,
      label,
    })
    .select()
    .single();

  if (error) {
    console.error('[EngagementService] createLessonBookmark error:', error);
    return { success: false, error: 'Failed to create bookmark.' };
  }

  revalidateTag('lesson-bookmarks', 'max');

  return { success: true, data };
}

/**
 * Delete a specific bookmark.
 */
export async function deleteLessonBookmark(
  studentId: string,
  bookmarkId: string,
  isGlobal: boolean,
  collegeId: string | null,
): Promise<{ success: boolean; error?: string }> {
  const sb = createAdminClient();

  const { data: bookmark } = await sb
    .from('student_lesson_bookmarks')
    .select('id, master_course_id, item_id')
    .eq('id', bookmarkId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (!bookmark) {
    return { success: false, error: 'Bookmark not found.' };
  }

  const access = await resolveAccessibleLesson(studentId, bookmark.master_course_id, bookmark.item_id, { isGlobal, collegeId });
  if (!access) {
    return { success: false, error: 'Unauthorized: Lesson access denied.' };
  }

  const { error } = await sb
    .from('student_lesson_bookmarks')
    .delete()
    .eq('id', bookmarkId)
    .eq('student_id', studentId)
    .eq('item_id', access.item.id)
    .eq('master_course_id', access.course.id);

  if (error) {
    console.error('[EngagementService] deleteLessonBookmark error:', error);
    return { success: false, error: 'Failed to delete bookmark.' };
  }

  revalidateTag('lesson-bookmarks', 'max');

  return { success: true };
}
