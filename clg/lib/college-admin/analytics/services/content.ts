import 'server-only';
import { cacheTag, cacheLife } from 'next/cache';

import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  getCollegeAssignedCourseIds,
  getCollegeStudentIds,
} from '@/lib/college-admin/analytics/college-scope';

export interface CollegeCourseCompletionRow {
  courseId: string;
  courseTitle: string;
  completion: number;
  enrolled: number;
}

export interface LectureCompletionByCourseRow {
  courseId: string;
  courseTitle: string;
  totalLectures: number;
  watchedLectures: number;
  completedLectures: number;
  completionRate: number;
}

const WATCHED_MIN_PCT = 90;

function isLectureWatched(
  watchedSeconds: number,
  totalSeconds: number,
  completed: boolean,
): boolean {
  if (completed) {
    return true;
  }
  if (totalSeconds <= 0) {
    return watchedSeconds > 0;
  }
  return Math.round((watchedSeconds / totalSeconds) * 100) >= WATCHED_MIN_PCT;
}

export class CollegeContentUsageService {
  static async getCourseCompletionRates(collegeId: string): Promise<CollegeCourseCompletionRow[]> {
    'use cache';
    cacheLife('analytics5m');
    cacheTag('college-performance');
    const supabase = createServiceRoleClient();
    const [studentIds, courseIds] = await Promise.all([
      getCollegeStudentIds(collegeId),
      getCollegeAssignedCourseIds(collegeId),
    ]);

    if (studentIds.length === 0 || courseIds.length === 0) {
      return [];
    }

    const [{ data: courses, error: coursesError }, { data: items, error: itemsError }, { data: progress, error: progressError }] =
      await Promise.all([
        supabase.from('master_courses').select('id, title').in('id', courseIds),
        supabase
          .from('master_course_items')
          .select('id, master_course_id')
          .in('master_course_id', courseIds)
          .eq('publish_status', 'published'),
        supabase
          .from('student_video_progress')
          .select('student_id, lesson_id, unique_watched_seconds, video_duration_seconds, completed')
          .in('student_id', studentIds),
      ]);

    if (coursesError) {
      throw new Error(`[college-analytics] master_courses: ${coursesError.message}`);
    }
    if (itemsError) {
      throw new Error(`[college-analytics] master_course_items: ${itemsError.message}`);
    }
    if (progressError) {
      throw new Error(`[college-analytics] student_video_progress: ${progressError.message}`);
    }

    const itemToCourse = new Map((items ?? []).map((item) => [item.id, item.master_course_id]));
    const publishedItemsByCourse = new Map<string, number>();
    for (const item of items ?? []) {
      const cid = item.master_course_id;
      publishedItemsByCourse.set(cid, (publishedItemsByCourse.get(cid) ?? 0) + 1);
    }

    const byCourse = new Map<
      string,
      { enrolled: Set<string>; completionSum: number; completionCount: number }
    >();

    for (const row of progress ?? []) {
      const courseId = itemToCourse.get(row.lesson_id);
      if (!courseId) {
        continue;
      }

      const watched = Number(row.unique_watched_seconds) || 0;
      const total = Number(row.video_duration_seconds) || 0;
      const pct = total > 0 ? Math.min(100, Math.round((watched / total) * 100)) : 0;
      const entry = byCourse.get(courseId) ?? {
        enrolled: new Set<string>(),
        completionSum: 0,
        completionCount: 0,
      };

      if (watched > 0 || row.completed) {
        entry.enrolled.add(row.student_id);
      }
      entry.completionSum += pct;
      entry.completionCount += 1;
      byCourse.set(courseId, entry);
    }

    const titleMap = new Map((courses ?? []).map((c) => [c.id, c.title]));

    return courseIds.reduce((acc, courseId) => {
      const stats = byCourse.get(courseId);
      const enrolled = stats?.enrolled.size ?? 0;
      const completion =
        stats && stats.completionCount > 0
          ? Math.round(stats.completionSum / stats.completionCount)
          : 0;

      if (enrolled > 0 || (publishedItemsByCourse.get(courseId) ?? 0) > 0) {
        acc.push({
          courseId,
          courseTitle: titleMap.get(courseId) ?? 'Untitled course',
          completion,
          enrolled,
        });
      }
      return acc;
    }, [] as Array<{ courseId: string; courseTitle: string; completion: number; enrolled: number }>).sort((a, b) => b.completion - a.completion);
  }

  /** Per-course lecture counts from published items + student_video_progress. */
  static async getLectureCompletionByCourse(
    collegeId: string,
  ): Promise<LectureCompletionByCourseRow[]> {
    'use cache';
    cacheLife('analytics5m');
    cacheTag('college-performance');
    const supabase = createServiceRoleClient();
    const [studentIds, courseIds] = await Promise.all([
      getCollegeStudentIds(collegeId),
      getCollegeAssignedCourseIds(collegeId),
    ]);

    if (studentIds.length === 0 || courseIds.length === 0) {
      return [];
    }

    const [{ data: courses, error: coursesError }, { data: items, error: itemsError }, { data: progress, error: progressError }] =
      await Promise.all([
        supabase.from('master_courses').select('id, title').in('id', courseIds),
        supabase
          .from('master_course_items')
          .select('id, master_course_id')
          .in('master_course_id', courseIds)
          .eq('publish_status', 'published'),
        supabase
          .from('student_video_progress')
          .select('student_id, lesson_id, unique_watched_seconds, video_duration_seconds, completed')
          .in('student_id', studentIds),
      ]);

    if (coursesError) {
      throw new Error(`[college-analytics] master_courses: ${coursesError.message}`);
    }
    if (itemsError) {
      throw new Error(`[college-analytics] master_course_items: ${itemsError.message}`);
    }
    if (progressError) {
      throw new Error(`[college-analytics] student_video_progress: ${progressError.message}`);
    }

    const itemToCourse = new Map((items ?? []).map((item) => [item.id, item.master_course_id]));
    const totalLecturesByCourse = new Map<string, number>();
    for (const item of items ?? []) {
      const cid = item.master_course_id;
      totalLecturesByCourse.set(cid, (totalLecturesByCourse.get(cid) ?? 0) + 1);
    }

    const watchedLessonsByCourse = new Map<string, Set<string>>();
    const completedLessonsByCourse = new Map<string, Set<string>>();

    for (const row of progress ?? []) {
      const courseId = itemToCourse.get(row.lesson_id);
      if (!courseId) {
        continue;
      }

      const watched = Number(row.unique_watched_seconds) || 0;
      const total = Number(row.video_duration_seconds) || 0;

      if (isLectureWatched(watched, total, row.completed)) {
        const set = watchedLessonsByCourse.get(courseId) ?? new Set<string>();
        set.add(row.lesson_id);
        watchedLessonsByCourse.set(courseId, set);
      }
      if (row.completed) {
        const set = completedLessonsByCourse.get(courseId) ?? new Set<string>();
        set.add(row.lesson_id);
        completedLessonsByCourse.set(courseId, set);
      }
    }

    const titleMap = new Map((courses ?? []).map((c) => [c.id, c.title]));

    return courseIds.reduce((acc, courseId) => {
      const totalLectures = totalLecturesByCourse.get(courseId) ?? 0;
      const watchedLectures = watchedLessonsByCourse.get(courseId)?.size ?? 0;
      const completedLectures = completedLessonsByCourse.get(courseId)?.size ?? 0;
      const completionRate =
        totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;

      if (totalLectures > 0) {
        acc.push({
          courseId,
          courseTitle: titleMap.get(courseId) ?? 'Untitled course',
          totalLectures,
          watchedLectures,
          completedLectures,
          completionRate,
        });
      }
      return acc;
    }, [] as Array<{ courseId: string; courseTitle: string; totalLectures: number; watchedLectures: number; completedLectures: number; completionRate: number }>).sort((a, b) => b.watchedLectures - a.watchedLectures);
  }

  /** @deprecated Use getCourseCompletionRates — kept for callers migrating gradually. */
  static async getContentUsage(collegeId: string) {
    const rows = await this.getCourseCompletionRates(collegeId);
    return rows.map((row) => ({
      itemId: row.courseId,
      watches: row.enrolled,
      completions: row.completion,
    }));
  }
}
