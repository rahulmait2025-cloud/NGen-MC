import 'server-only';
import { cache } from 'react';
import { revalidateTag } from 'next/cache';

/**
 * Student Progress Tracking Service (Phase 4).
 *
 * Handles video watch progress, session logging, resume playback,
 * and course-level completion aggregation.
 *
 * Completion threshold: 90% watched → auto-mark complete.
 * Progress sync: called every 15 seconds + on pause/ended/transition.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { resolveAccessibleLesson, resolveAccessibleVideoAsset, type StudentAccessContext, type ResolvedLessonAccess } from '@/lib/services/course-access-manager';

const COMPLETION_THRESHOLD = 0.66;
const VIDEO_COMPLETION_PERCENTAGE_THRESHOLD = 66;

// ─── Video Sessions ───────────────────────────────────────────────────────────

/**
 * @deprecated This function writes to the legacy `student_video_sessions` table
 * which is no longer the source of truth. The TPStreams player now uses
 * `useTpStreamsAnalytics` → `/api/video-analytics/session/start` →
 * `VideoAnalyticsBackendService.startSession`, which writes to
 * `video_watch_sessions` (rich schema). This export is retained only for
 * backward compatibility with any external consumer that may still call it.
 * It will be removed in a future release.
 */
export async function startSession(
  studentId: string,
  videoAssetId: string,
  context: StudentAccessContext,
  itemId?: string,
): Promise<string> {
  const sb = createAdminClient();
  const access = await resolveAccessibleVideoAsset(studentId, videoAssetId, context);
  if (!access) {
    throw new Error('Unauthorized: Lesson access denied.');
  }

  if (itemId && access.item.id !== itemId) {
    throw new Error('Unauthorized: Video does not belong to the requested lesson.');
  }

  const { data, error } = await sb
    .from('student_video_sessions')
    .insert({
      student_id: studentId,
      video_asset_id: access.asset?.id ?? videoAssetId,
      item_id: access.item.id,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to start session: ${error.message}`);
  return data.id;
}

/**
 * @deprecated This function writes to the legacy `student_video_sessions` table
 * which is no longer the source of truth. The TPStreams player now uses
 * `useTpStreamsAnalytics` → `/api/video-analytics/session/end` →
 * `VideoAnalyticsBackendService.endSession`, which updates
 * `video_watch_sessions.ended_at` (rich schema). This export is retained only
 * for backward compatibility with any external consumer that may still call
 * it. It will be removed in a future release.
 */
export async function endSession(
  studentId: string,
  sessionId: string,
  watchedDurationSeconds: number,
): Promise<void> {
  // Guard against invalid UUIDs (like "null" string) that might leak from client/serialization
  if (!sessionId || sessionId === 'null' || sessionId.length < 32) {
    return;
  }

  const sb = createAdminClient();

  const { error } = await sb
    .from('student_video_sessions')
    .update({
      ended_at: new Date().toISOString(),
      watched_duration_seconds: watchedDurationSeconds,
    })
    .eq('id', sessionId)
    .eq('student_id', studentId);

  if (error) throw new Error(`Failed to end session: ${error.message}`);
}

// ─── Progress Upsert ──────────────────────────────────────────────────────────

/**
 * Update watch progress for a curriculum item.
 * Uses upsert on the unique (student_id, item_id) constraint.
 */
async function updateWatchProgress(input: {
  studentId: string;
  itemId: string;
  watchedSeconds: number;
  totalSeconds: number;
  lastPositionSeconds: number;
  entitlementId?: string;
}): Promise<void> {
  const sb = createAdminClient();

  const { error } = await sb
    .from('student_progress')
    .upsert(
      {
        student_id: input.studentId,
        item_id: input.itemId,
        watched_seconds: input.watchedSeconds,
        total_seconds: input.totalSeconds,
        last_position_seconds: input.lastPositionSeconds,
        entitlement_id: input.entitlementId ?? null,
      },
      { onConflict: 'student_id,item_id' },
    );

  if (error) throw new Error(`Failed to update progress: ${error.message}`);
}

// ─── Completion ───────────────────────────────────────────────────────────────

/**
 * Mark a curriculum item as completed.
 * Idempotent: does nothing if already completed.
 * Only marks complete if watchedSeconds / totalSeconds >= COMPLETION_THRESHOLD.
 */
async function markCompleted(
  studentId: string,
  itemId: string,
): Promise<boolean> {
  const sb = createAdminClient();

  // Check current progress
  const { data: existing } = await sb
    .from('student_progress')
    .select('completed, watched_seconds, total_seconds')
    .eq('student_id', studentId)
    .eq('item_id', itemId)
    .maybeSingle();

  // Already completed — idempotent
  if (existing?.completed) return true;

  // Verify threshold
  if (!existing || existing.total_seconds === 0) return false;
  const ratio = existing.watched_seconds / existing.total_seconds;
  if (ratio < COMPLETION_THRESHOLD) return false;

  const { error } = await sb
    .from('student_progress')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('student_id', studentId)
    .eq('item_id', itemId);

  if (error) throw new Error(`Failed to mark completed: ${error.message}`);
  return true;
}

// ─── Combined Sync ────────────────────────────────────────────────────────────

/**
 * Combined progress sync — called every 15 seconds and on pause/ended/transition.
 * Updates progress and auto-marks complete if threshold met.
 */
export async function syncPlaybackProgress(input: {
  studentId: string;
  itemId: string;
  courseId: string;
  context: StudentAccessContext;
  lastPositionSeconds: number;
  watchedSeconds: number;
  totalSeconds: number;
  entitlementId?: string;
}): Promise<{ completed: boolean }> {
  const access = await resolveAccessibleLesson(
    input.studentId,
    input.courseId,
    input.itemId,
    input.context,
  );
  if (!access) {
    throw new Error('Unauthorized: Lesson access denied.');
  }

  // 1. Update raw progress
  await updateWatchProgress({
    studentId: input.studentId,
    itemId: access.item.id,
    watchedSeconds: input.watchedSeconds,
    totalSeconds: input.totalSeconds,
    lastPositionSeconds: input.lastPositionSeconds,
    entitlementId: input.entitlementId,
  });

  // 2. Check and mark completion
  const completed = await markCompleted(input.studentId, access.item.id);

  return { completed };
}

// ─── Resume ───────────────────────────────────────────────────────────────────

/**
 * Get the last playback position for resume.
 */
export async function getResumeTimestamp(
  studentId: string,
  courseId: string,
  itemId: string,
  context: StudentAccessContext,
): Promise<number> {
  const access = await resolveAccessibleLesson(studentId, courseId, itemId, context);
  if (!access) return 0;

  const sb = createAdminClient();

  if (access.item.item_type === 'video') {
    const { data } = await sb
      .from('student_video_progress')
      .select('last_position_seconds')
      .eq('student_id', studentId)
      .eq('lesson_id', access.item.id)
      .maybeSingle();
    return data?.last_position_seconds ?? 0;
  } else {
    const { data } = await sb
      .from('student_progress')
      .select('last_position_seconds')
      .eq('student_id', studentId)
      .eq('item_id', access.item.id)
      .maybeSingle();
    return data?.last_position_seconds ?? 0;
  }
}

// ─── Course-level Aggregation ─────────────────────────────────────────────────

/**
 * Get overall course progress: completed items / total items.
 */
async function _getCourseProgress(
  studentId: string,
  courseId: string,
): Promise<{ total: number; completed: number; percentage: number }> {
  const sb = createAdminClient();

  // Get all published items for this course
  const { data: items, error: itemsErr } = await sb
    .from('master_course_items')
    .select('id')
    .eq('master_course_id', courseId)
    .eq('publish_status', 'published');

  if (itemsErr) throw new Error(`Failed to get items: ${itemsErr.message}`);
  const total = items?.length ?? 0;
  if (total === 0) return { total: 0, completed: 0, percentage: 0 };

  const itemIds = items!.map((i) => i.id);

  // Get completed items for this student
  const { data: progress, error: progressErr } = await sb
    .from('student_progress')
    .select('item_id')
    .eq('student_id', studentId)
    .eq('completed', true)
    .in('item_id', itemIds);

  if (progressErr) throw new Error(`Failed to get progress: ${progressErr.message}`);
  const completed = progress?.length ?? 0;

  return {
    total,
    completed,
    percentage: Math.round((completed / total) * 100),
  };
}

export const getItemProgressMap = cache(
  async function getItemProgressMap(
    studentId: string,
    courseId: string,
  ): Promise<Map<string, { watchedSeconds: number; totalSeconds: number; lastPositionSeconds: number; completed: boolean; total_seconds?: number; last_position_seconds?: number }>> {
    const sb = createAdminClient();

    // 1. Get all items in the course to know their type
    const { data: items, error: itemsErr } = await sb
      .from('master_course_items')
      .select('id, item_type')
      .eq('master_course_id', courseId)
      .eq('publish_status', 'published');

    if (itemsErr) throw new Error(`Failed to get items: ${itemsErr.message}`);

    const allItems = items ?? [];
    const videoItemIds = allItems.reduce((acc, i) => {
      if (i.item_type === 'video') acc.push(i.id);
      return acc;
    }, [] as string[]);
    const otherItemIds = allItems.reduce((acc, i) => {
      if (i.item_type !== 'video') acc.push(i.id);
      return acc;
    }, [] as string[]);

    const map = new Map<string, { watchedSeconds: number; totalSeconds: number; lastPositionSeconds: number; completed: boolean; total_seconds?: number; last_position_seconds?: number }>();
    if (videoItemIds.length > 0) {
      const { data, error } = await sb
        .from('student_video_progress')
        .select('lesson_id, unique_watched_seconds, video_duration_seconds, last_position_seconds, completed, completion_percentage')
        .eq('student_id', studentId)
        .in('lesson_id', videoItemIds);
      if (error) throw error;
      for (const row of data ?? []) {
        if (!row.lesson_id) continue;
        map.set(row.lesson_id, {
          watchedSeconds: row.unique_watched_seconds ?? 0,
          totalSeconds: row.video_duration_seconds ?? 0,
          lastPositionSeconds: row.last_position_seconds ?? 0,
          completed: (row.completed ?? false) || Number(row.completion_percentage ?? 0) >= VIDEO_COMPLETION_PERCENTAGE_THRESHOLD,
          total_seconds: row.video_duration_seconds ?? 0,
          last_position_seconds: row.last_position_seconds ?? 0,
        });
      }
    }

    if (otherItemIds.length > 0) {
      const { data, error } = await sb
        .from('student_progress')
        .select('item_id, watched_seconds, total_seconds, last_position_seconds, completed')
        .eq('student_id', studentId)
        .in('item_id', otherItemIds);
      if (error) throw error;
      for (const row of data ?? []) {
        map.set(row.item_id, {
          watchedSeconds: row.watched_seconds ?? 0,
          totalSeconds: row.total_seconds ?? 0,
          lastPositionSeconds: row.last_position_seconds ?? 0,
          completed: row.completed ?? false,
          total_seconds: row.total_seconds ?? 0,
          last_position_seconds: row.last_position_seconds ?? 0,
        });
      }
    }
    return map;
  },
);

/**
 * Batch version: Get progress for multiple courses in a single query.
 * Returns a map of courseId → { total, completed, percentage }
 * 
 * This eliminates the N+1 pattern where we queried progress for each course separately.
 */
async function _getCoursesProgressBatch(
  studentId: string,
  courseIds: string[],
): Promise<Map<string, { total: number; completed: number; percentage: number }>> {
  if (courseIds.length === 0) {
    return new Map();
  }

  const sb = createAdminClient();

  // Get all items for all courses in one query
  const { data: items, error: itemsErr } = await sb
    .from('master_course_items')
    .select('id, master_course_id, item_type')
    .in('master_course_id', courseIds)
    .eq('publish_status', 'published');

  if (itemsErr) throw new Error(`Failed to get items: ${itemsErr.message}`);

  // Group items by course
  const itemsByCourse = new Map<string, string[]>();
  const itemCountByCourse = new Map<string, number>();
  for (const item of items ?? []) {
    if (!itemsByCourse.has(item.master_course_id)) {
      itemsByCourse.set(item.master_course_id, []);
      itemCountByCourse.set(item.master_course_id, 0);
    }
    itemsByCourse.get(item.master_course_id)!.push(item.id);
    itemCountByCourse.set(item.master_course_id, (itemCountByCourse.get(item.master_course_id) ?? 0) + 1);
  }

  const allItems = items ?? [];
  if (allItems.length === 0) {
    const result = new Map<string, { total: number; completed: number; percentage: number }>();
    for (const courseId of courseIds) {
      result.set(courseId, { total: 0, completed: 0, percentage: 0 });
    }
    return result;
  }

  const videoItemIds = allItems.reduce((acc, i) => {
    if (i.item_type === 'video') acc.push(i.id);
    return acc;
  }, [] as string[]);
  const otherItemIds = allItems.reduce((acc, i) => {
    if (i.item_type !== 'video') acc.push(i.id);
    return acc;
  }, [] as string[]);

  const completedCountByCourse = new Map<string, number>();
  const itemsById = new Map(allItems.map((i) => [i.id, i]));

  if (videoItemIds.length > 0) {
    const { data } = await sb
      .from('student_video_progress')
      .select('lesson_id, completed, completion_percentage')
      .eq('student_id', studentId)
      .in('lesson_id', videoItemIds);
    for (const row of data ?? []) {
      if (!row.lesson_id || !((row.completed ?? false) || Number(row.completion_percentage ?? 0) >= VIDEO_COMPLETION_PERCENTAGE_THRESHOLD)) continue;
      const item = itemsById.get(row.lesson_id);
      if (item) {
        const courseId = item.master_course_id;
        completedCountByCourse.set(courseId, (completedCountByCourse.get(courseId) ?? 0) + 1);
      }
    }
  }

  if (otherItemIds.length > 0) {
    const { data } = await sb
      .from('student_progress')
      .select('item_id')
      .eq('student_id', studentId)
      .eq('completed', true)
      .in('item_id', otherItemIds);
    for (const row of data ?? []) {
      const item = itemsById.get(row.item_id);
      if (item) {
        const courseId = item.master_course_id;
        completedCountByCourse.set(courseId, (completedCountByCourse.get(courseId) ?? 0) + 1);
      }
    }
  }

  // Build result map
  const result = new Map<string, { total: number; completed: number; percentage: number }>();
  for (const courseId of courseIds) {
    const total = itemCountByCourse.get(courseId) ?? 0;
    const completed = completedCountByCourse.get(courseId) ?? 0;
    result.set(courseId, {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  }

  return result;
}

/**
 * Get progress for an entire pillar: how many courses are complete.
 * OPTIMIZED: Uses batch query instead of N+1 loop
 */
async function _getPillarProgress(
  studentId: string,
  pillarId: string,
): Promise<{ totalCourses: number; completedCourses: number; isComplete: boolean }> {
  const sb = createAdminClient();

  // 1. Get all published courses in this pillar
  const { data: courses } = await sb
    .from('master_courses')
    .select('id')
    .eq('pillar_id', pillarId)
    .eq('publish_status', 'published');

  if (!courses || courses.length === 0) {
    return { totalCourses: 0, completedCourses: 0, isComplete: false };
  }

  const courseIds = courses.map((c) => c.id);

  // 2. Batch fetch all course progress in a SINGLE query (was N+1, now O(1))
  const progressMap = await _getCoursesProgressBatch(studentId, courseIds);

  // 3. Count completed courses
  let completedCount = 0;
  for (const courseId of courseIds) {
    const progress = progressMap.get(courseId);
    if (progress && progress.percentage === 100) {
      completedCount++;
    }
  }

  return {
    totalCourses: courses.length,
    completedCourses: completedCount,
    isComplete: completedCount === courses.length && courses.length > 0,
  };
}

/**
 * Batch version: Get progress for all pillars and their courses in minimal queries.
 * Returns a map of pillarId → { totalCourses, completedCourses, isComplete }
 * 
 * This eliminates the compound N+1 pattern in getProgramProgress.
 */
async function getAllPillarsProgressBatch(
  studentId: string,
): Promise<Map<string, { totalCourses: number; completedCourses: number; isComplete: boolean }>> {
  const { getCachedPublishedPillars } = await import('@/lib/services/course-cache');
  const sb = createAdminClient();

  // 1. Get all published pillars (cached)
  const pillars = await getCachedPublishedPillars();
  if (!pillars || pillars.length === 0) {
    return new Map();
  }

  // 2. Get all courses for all pillars
  const { data: courses, error: coursesErr } = await sb
    .from('master_courses')
    .select('id, pillar_id')
    .in('pillar_id', pillars.map((p) => p.id))
    .eq('publish_status', 'published');

  if (coursesErr) throw new Error(`Failed to get courses: ${coursesErr.message}`);

  // 3. Get all items for all courses
  const courseIds = courses?.map((c) => c.id) ?? [];
  if (courseIds.length === 0) {
    const result = new Map<string, { totalCourses: number; completedCourses: number; isComplete: boolean }>();
    for (const pillar of pillars) {
      result.set(pillar.id, { totalCourses: 0, completedCourses: 0, isComplete: false });
    }
    return result;
  }

  const { data: items, error: itemsErr } = await sb
    .from('master_course_items')
    .select('id, master_course_id, item_type')
    .in('master_course_id', courseIds)
    .eq('publish_status', 'published');

  if (itemsErr) throw new Error(`Failed to get items: ${itemsErr.message}`);

  const allItems = items ?? [];
  const videoItemIds = allItems.reduce((acc, i) => {
    if (i.item_type === 'video') acc.push(i.id);
    return acc;
  }, [] as string[]);
  const otherItemIds = allItems.reduce((acc, i) => {
    if (i.item_type !== 'video') acc.push(i.id);
    return acc;
  }, [] as string[]);

  const completedItemIds = new Set<string>();

  if (videoItemIds.length > 0) {
    const { data } = await sb
      .from('student_video_progress')
      .select('lesson_id, completed, completion_percentage')
      .eq('student_id', studentId)
      .in('lesson_id', videoItemIds);
    for (const row of data ?? []) {
      if (!row.lesson_id || !((row.completed ?? false) || Number(row.completion_percentage ?? 0) >= VIDEO_COMPLETION_PERCENTAGE_THRESHOLD)) continue;
      completedItemIds.add(row.lesson_id);
    }
  }

  if (otherItemIds.length > 0) {
    const { data } = await sb
      .from('student_progress')
      .select('item_id')
      .eq('student_id', studentId)
      .eq('completed', true)
      .in('item_id', otherItemIds);
    for (const row of data ?? []) {
      completedItemIds.add(row.item_id);
    }
  }

  const progress = Array.from(completedItemIds).map((id) => ({
    item_id: id,
    completed: true,
  }));

  // Build maps: item → course, course → pillar
  const itemToCourse = new Map<string, string>();
  const courseItemCount = new Map<string, number>();
  const courseCompletedCount = new Map<string, number>();
  const pillarCourseCount = new Map<string, number>();
  const pillarCompletedCount = new Map<string, number>();

  // Initialize maps
  for (const course of courses ?? []) {
    courseItemCount.set(course.id, 0);
    courseCompletedCount.set(course.id, 0);
    pillarCourseCount.set(course.pillar_id, (pillarCourseCount.get(course.pillar_id) ?? 0) + 1);
  }

  // Count items per course
  for (const item of items ?? []) {
    itemToCourse.set(item.id, item.master_course_id);
    courseItemCount.set(item.master_course_id, (courseItemCount.get(item.master_course_id) ?? 0) + 1);
  }

  // Count completed per course
  for (const p of progress) {
    const itemId = p.item_id;
    if (!itemId) continue;
    const courseId = itemToCourse.get(itemId);
    if (courseId) {
      courseCompletedCount.set(courseId, (courseCompletedCount.get(courseId) ?? 0) + 1);
    }
  }

  // Aggregate to pillars
  for (const course of courses ?? []) {
    const pillarId = course.pillar_id;
    const isComplete = (courseItemCount.get(course.id) ?? 0) > 0 &&
      (courseCompletedCount.get(course.id) ?? 0) === (courseItemCount.get(course.id) ?? 0);
    if (isComplete) {
      pillarCompletedCount.set(pillarId, (pillarCompletedCount.get(pillarId) ?? 0) + 1);
    }
  }

  // Build result
  const result = new Map<string, { totalCourses: number; completedCourses: number; isComplete: boolean }>();
  for (const pillar of pillars) {
    const totalCourses = pillarCourseCount.get(pillar.id) ?? 0;
    const completedCourses = pillarCompletedCount.get(pillar.id) ?? 0;
    result.set(pillar.id, {
      totalCourses,
      completedCourses,
      isComplete: totalCourses > 0 && completedCourses === totalCourses,
    });
  }

  return result;
}

/**
 * Get overall program progress: how many assigned pillars are complete.
 * OPTIMIZED: Uses batch queries instead of compound N+1
 */
async function _getProgramProgress(
  studentId: string,
): Promise<{ totalPillars: number; completedPillars: number; isComplete: boolean }> {
  const { getCachedPublishedPillars } = await import('@/lib/services/course-cache');

  // 1. Get all published pillars (cached)
  const pillars = await getCachedPublishedPillars();

  if (!pillars || pillars.length === 0) {
    return { totalPillars: 0, completedPillars: 0, isComplete: false };
  }

  // 2. Batch fetch all pillar progress in just a few queries (was N*N queries, now O(1))
  const allProgress = await getAllPillarsProgressBatch(studentId);

  let completedCount = 0;
  for (const pillar of pillars) {
    const pillarProg = allProgress.get(pillar.id);
    if (pillarProg?.isComplete) {
      completedCount++;
    }
  }

  return {
    totalPillars: pillars.length,
    completedPillars: completedCount,
    isComplete: completedCount === pillars.length && pillars.length > 0,
  };
}

export async function markLessonCompletedManually(input: {
  studentId: string;
  itemId: string;
  courseId: string;
  context: StudentAccessContext;
  preResolvedAccess?: ResolvedLessonAccess | null;
}): Promise<{ completed: boolean }> {
  const sb = createAdminClient();
  const access = input.preResolvedAccess ?? await resolveAccessibleLesson(
    input.studentId,
    input.courseId,
    input.itemId,
    input.context,
  );
  if (!access) {
    throw new Error('Unauthorized: Lesson access denied.');
  }

  const itemId = access.item.id;
  const now = new Date().toISOString();

  // 1. Update/Upsert student_progress (for general course player compatibility)
  const { data: existingProgress } = await sb
    .from('student_progress')
    .select('watched_seconds, total_seconds')
    .eq('student_id', input.studentId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (existingProgress) {
    const { error: progressUpdateErr } = await sb
      .from('student_progress')
      .update({
        completed: true,
        completed_at: now,
        updated_at: now,
      })
      .eq('student_id', input.studentId)
      .eq('item_id', itemId);
    if (progressUpdateErr) {
      throw new Error(`Failed to update student progress: ${progressUpdateErr.message}`);
    }
  } else {
    // Retrieve video duration if it's a video item to populate total_seconds, otherwise 0
    let duration = 0;
    if (access.item.item_type === 'video') {
      duration = Number(access.item.duration_seconds || 0);
    }

    const { error: progressUpsertErr } = await sb
      .from('student_progress')
      .upsert({
        student_id: input.studentId,
        item_id: itemId,
        watched_seconds: 0,
        total_seconds: duration,
        completed: true,
        completed_at: now,
        updated_at: now,
      }, { onConflict: 'student_id,item_id' });
    if (progressUpsertErr) {
      throw new Error(`Failed to upsert student progress: ${progressUpsertErr.message}`);
    }
  }

  // 2. If it's a video item, also update/upsert student_video_progress
  //    (source of truth for video completion on reload — do not write updated_at;
  //    that column does not exist on this table)
  if (access.item.item_type === 'video') {
    const { data: existingVideoProgress } = await sb
      .from('student_video_progress')
      .select('unique_watched_seconds, video_duration_seconds, completed')
      .eq('student_id', input.studentId)
      .eq('lesson_id', itemId)
      .maybeSingle();

    if (existingVideoProgress) {
      const { error: videoUpdateErr } = await sb
        .from('student_video_progress')
        .update({
          completed: true,
          completed_at: now,
        })
      .eq('student_id', input.studentId)
      .eq('lesson_id', itemId);
      if (videoUpdateErr) {
        throw new Error(`Failed to update video progress: ${videoUpdateErr.message}`);
      }
    } else {
      const duration = Number(access.item.duration_seconds || 0);

      const { error: videoUpsertErr } = await sb
        .from('student_video_progress')
        .upsert({
          student_id: input.studentId,
          pillar_id: access.course?.pillar_id ?? null,
          course_id: input.courseId,
          module_id: access.item?.module_id ?? null,
          lesson_id: itemId,
          tpstreams_asset_id: access.item?.video_asset_id ?? '',
          video_duration_seconds: duration,
          total_video_seconds_watched: 0,
          unique_watched_seconds: 0,
          repeat_watched_seconds: 0,
          wall_clock_seconds: 0,
          completion_percentage: 0,
          completed: true,
          completed_at: now,
          last_watched_at: now,
          play_count: 0,
          pause_count: 0,
          seek_count: 0,
          rate_change_count: 0,
          session_count: 0,
        }, { onConflict: 'student_id,lesson_id' });
      if (videoUpsertErr) {
        throw new Error(`Failed to upsert video progress: ${videoUpsertErr.message}`);
      }
    }
  }

  revalidateTag('progress', 'max');
  revalidateTag(`student-my-courses-${input.studentId}`, 'max');

  return { completed: true };
}
