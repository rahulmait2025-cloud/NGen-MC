import 'server-only';

/**
 * Student Resources Service (Phase 7).
 *
 * Handles fetching resources for courses and specific lessons.
 * Enforces entitlement and publishing status checks.
 */

import { cacheTag, cacheLife } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveAccessibleLesson } from '@/lib/services/course-access-manager';
import type { LessonResourcesRow } from '@/types/database';

/**
 * List resources for a specific lesson (item).
 * Cached with 5min TTL — resources don't change during a study session.
 */
export async function listLessonResources(
  studentId: string,
  courseId: string,
  itemId: string,
  isGlobal: boolean,
  collegeId: string | null,
): Promise<LessonResourcesRow[]> {
  return _getCachedLessonResources(studentId, courseId, itemId, isGlobal, collegeId ?? null);
}

async function _getCachedLessonResources(studentId: string, courseId: string, itemId: string, isGlobal: boolean, collegeId: string | null): Promise<LessonResourcesRow[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('lesson-resources');
  const access = await resolveAccessibleLesson(studentId, courseId, itemId, {
    isGlobal,
    collegeId,
  });
  if (!access) return [];

  const sb = createAdminClient();
  const { data, error } = await sb
    .from('lesson_resources')
    .select('id, master_course_id, item_id, title, resource_type, url, file_path, metadata, sort_order, created_at, updated_at')
    .eq('master_course_id', access.course.id)
    .eq('item_id', access.item.id)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[ResourcesService] Error fetching lesson resources:', error);
    return [];
  }

  return data || [];
}


