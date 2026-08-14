import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

import { cache } from 'react';

const VIDEO_COMPLETION_PERCENTAGE_THRESHOLD = 66;

export type CourseProgressSummary = {
  total: number;
  completed: number;
  percentage: number;
  videoTotal: number;
  videoCompleted: number;
};

/**
 * Batch fetch progress for multiple courses in 2 queries (one for items, one for progress).
 * Returns a Map<courseId, { total, completed, percentage }>.
 *
 * Reads from `student_video_progress` (the rich analytics source of truth) for video items,
 * and falls back to `student_progress` for non-video items (assignments/quizzes).
 */
export const batchCourseProgress = cache(async function batchCourseProgress(
  studentId: string,
  courseIds: string[],
): Promise<Map<string, CourseProgressSummary>> {
  if (courseIds.length === 0) return new Map();
  const sb = createAdminClient();

  const { data: items } = await sb
    .from('master_course_items')
    .select('id, master_course_id, item_type, quiz_id')
    .in('master_course_id', courseIds)
    .eq('publish_status', 'published');

  const allItems = (items ?? []).filter((item) => item.item_type !== 'quiz_placeholder' || item.quiz_id);
  if (allItems.length === 0) {
    const result = new Map<string, CourseProgressSummary>();
    for (const courseId of courseIds) {
      result.set(courseId, { total: 0, completed: 0, percentage: 0, videoTotal: 0, videoCompleted: 0 });
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

  const completedItemIds = new Set<string>();

  const promises: Promise<void>[] = [];

  if (videoItemIds.length > 0) {
    promises.push(
      (async () => {
        const { data } = await sb
          .from('student_video_progress')
          .select('lesson_id, completed, completion_percentage')
          .eq('student_id', studentId)
          .in('lesson_id', videoItemIds);
        for (const row of data ?? []) {
          if (!row.lesson_id || !((row.completed ?? false) || Number(row.completion_percentage ?? 0) >= VIDEO_COMPLETION_PERCENTAGE_THRESHOLD)) continue;
          completedItemIds.add(row.lesson_id);
        }
      })()
    );
  }

  if (otherItemIds.length > 0) {
    promises.push(
      (async () => {
        const { data } = await sb
          .from('student_progress')
          .select('item_id')
          .eq('student_id', studentId)
          .eq('completed', true)
          .in('item_id', otherItemIds);
        for (const row of data ?? []) {
          completedItemIds.add(row.item_id);
        }
      })()
    );
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }

  const itemsPerCourse = new Map<string, { total: number; completed: number; videoTotal: number; videoCompleted: number }>();
  for (const item of allItems) {
    const entry = itemsPerCourse.get(item.master_course_id) ?? { total: 0, completed: 0, videoTotal: 0, videoCompleted: 0 };
    const isCompleted = completedItemIds.has(item.id);
    entry.total++;
    if (isCompleted) entry.completed++;
    if (item.item_type === 'video') {
      entry.videoTotal++;
      if (isCompleted) entry.videoCompleted++;
    }
    itemsPerCourse.set(item.master_course_id, entry);
  }

  const result = new Map<string, CourseProgressSummary>();
  for (const courseId of courseIds) {
    const entry = itemsPerCourse.get(courseId);
    const total = entry?.total ?? 0;
    const completed = entry?.completed ?? 0;
    result.set(courseId, {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      videoTotal: entry?.videoTotal ?? 0,
      videoCompleted: entry?.videoCompleted ?? 0,
    });
  }
  return result;
});
