import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { ensureFreeCourse } from '@/lib/free-courses/free-course-service';
import { isFreeCourseEnrollment } from '@/lib/free-courses/free-course-entitlement';
import type { MasterCoursePublishStatus } from '@/types/database';

export interface FreeCourseOverviewAnalytics {
  totalFreeCourses: number;
  publishedFreeCourses: number;
  draftFreeCourses: number;
  totalEnrollments: number;
  totalActiveLearners: number;
  totalCompletedLearners: number;
  averageCompletionPercent: number;
  totalLessons: number;
  totalYoutubeLessons: number;
  totalTpstreamsLessons: number;
}

export interface FreeCourseListMetrics {
  enrollmentCount: number;
  averageProgressPercent: number;
  completionRate: number;
}

export interface FreeCourseLessonAnalyticsRow {
  itemId: string;
  lessonTitle: string;
  source: 'youtube' | 'tpstreams';
  completionCount: number;
  completionRate: number;
}

export interface FreeCourseRecentEnrollment {
  studentName: string | null;
  studentEmail: string | null;
  enrolledAt: string;
  progressPercent: number;
}

export interface FreeCourseRecentCompletion {
  studentName: string | null;
  studentEmail: string | null;
  lessonTitle: string;
  completedAt: string;
}

export interface FreeCourseAnalyticsDetail {
  courseId: string;
  title: string;
  publishStatus: MasterCoursePublishStatus;
  enrollmentCount: number;
  activeLearnerCount: number;
  completedLearnerCount: number;
  averageProgressPercent: number;
  totalLessons: number;
  completedLessonEvents: number;
  youtubeLessonCount: number;
  tpstreamsLessonCount: number;
  lessonAnalytics: FreeCourseLessonAnalyticsRow[];
  recentEnrollments: FreeCourseRecentEnrollment[];
  recentCompletions: FreeCourseRecentCompletion[];
}

type CourseRow = {
  id: string;
  title: string;
  publish_status: MasterCoursePublishStatus;
};

type ItemRow = {
  id: string;
  master_course_id: string;
  title: string;
  video_source: string | null;
  publish_status: string;
};

type EntitlementRow = {
  id: string;
  student_id: string;
  master_course_id: string;
  source_type: string;
  status: string;
  metadata: unknown;
  created_at: string;
};

type ProgressRow = {
  student_id: string;
  item_id: string;
  completed: boolean;
  completed_at: string | null;
};

type StudentProfile = {
  studentId: string;
  name: string | null;
  email: string | null;
};

interface AnalyticsContext {
  courses: CourseRow[];
  items: ItemRow[];
  entitlements: EntitlementRow[];
  progress: ProgressRow[];
  profilesByStudentId: Map<string, StudentProfile>;
  publishedItemsByCourse: Map<string, ItemRow[]>;
  allItemsByCourse: Map<string, ItemRow[]>;
  enrollmentsByCourse: Map<string, EntitlementRow[]>;
}

function isActiveEntitlement(row: EntitlementRow): boolean {
  return row.status === 'active';
}

function studentProgressPercent(
  studentId: string,
  publishedIds: string[],
  completedByStudentItem: Map<string, Set<string>>,
): number {
  if (publishedIds.length === 0) return 0;
  const done = completedByStudentItem.get(studentId);
  const count = done ? publishedIds.filter((id) => done.has(id)).length : 0;
  return Math.round((count / publishedIds.length) * 100);
}

function studentHasAnyProgress(
  studentId: string,
  itemIds: string[],
  progressByStudentItem: Map<string, Set<string>>,
): boolean {
  const set = progressByStudentItem.get(studentId);
  if (!set) return false;
  return itemIds.some((id) => set.has(id));
}

function studentCompletedAll(
  studentId: string,
  publishedIds: string[],
  completedByStudentItem: Map<string, Set<string>>,
): boolean {
  if (publishedIds.length === 0) return false;
  const done = completedByStudentItem.get(studentId);
  if (!done) return false;
  return publishedIds.every((id) => done.has(id));
}

async function loadAnalyticsContext(): Promise<AnalyticsContext> {
  const admin = createAdminClient();

  const { data: courses, error: coursesError } = await admin
    .from('master_courses')
    .select('id, title, publish_status')
    .eq('course_kind', 'free_course');

  if (coursesError) {
    throw new Error(`Failed to load free courses: ${coursesError.message}`);
  }

  const courseList = (courses ?? []) as CourseRow[];
  const courseIds = courseList.map((c) => c.id);

  if (courseIds.length === 0) {
    return {
      courses: [],
      items: [],
      entitlements: [],
      progress: [],
      profilesByStudentId: new Map(),
      publishedItemsByCourse: new Map(),
      allItemsByCourse: new Map(),
      enrollmentsByCourse: new Map(),
    };
  }

  const [itemsResult, entitlementsResult] = await Promise.all([
    admin
      .from('master_course_items')
      .select('id, master_course_id, title, video_source, publish_status')
      .in('master_course_id', courseIds),
    admin
      .from('student_entitlements')
      .select('id, student_id, master_course_id, source_type, status, metadata, created_at')
      .in('master_course_id', courseIds)
      .eq('status', 'active'),
  ]);

  if (itemsResult.error) {
    throw new Error(`Failed to load lessons: ${itemsResult.error.message}`);
  }
  if (entitlementsResult.error) {
    throw new Error(`Failed to load enrollments: ${entitlementsResult.error.message}`);
  }

  const items = (itemsResult.data ?? []) as ItemRow[];
  const entitlements = (entitlementsResult.data ?? []).filter(isFreeCourseEnrollment) as EntitlementRow[];

  const itemIds = items.map((i) => i.id);
  let progress: ProgressRow[] = [];

  if (itemIds.length > 0) {
    const { data: progressRows, error: progressError } = await admin
      .from('student_progress')
      .select('student_id, item_id, completed, completed_at')
      .in('item_id', itemIds);

    if (progressError) {
      throw new Error(`Failed to load progress: ${progressError.message}`);
    }
    progress = (progressRows ?? []) as ProgressRow[];
  }

  const studentIds = [...new Set(entitlements.map((e) => e.student_id))];
  const profilesByStudentId = await batchStudentProfiles(admin, studentIds);

  const publishedItemsByCourse = new Map<string, ItemRow[]>();
  const allItemsByCourse = new Map<string, ItemRow[]>();
  for (const item of items) {
    const all = allItemsByCourse.get(item.master_course_id) ?? [];
    all.push(item);
    allItemsByCourse.set(item.master_course_id, all);
    if (item.publish_status === 'published') {
      const pub = publishedItemsByCourse.get(item.master_course_id) ?? [];
      pub.push(item);
      publishedItemsByCourse.set(item.master_course_id, pub);
    }
  }

  const enrollmentsByCourse = new Map<string, EntitlementRow[]>();
  for (const ent of entitlements) {
    if (!isActiveEntitlement(ent)) continue;
    const list = enrollmentsByCourse.get(ent.master_course_id) ?? [];
    list.push(ent);
    enrollmentsByCourse.set(ent.master_course_id, list);
  }

  return {
    courses: courseList,
    items,
    entitlements,
    progress,
    profilesByStudentId,
    publishedItemsByCourse,
    allItemsByCourse,
    enrollmentsByCourse,
  };
}

async function batchStudentProfiles(
  admin: ReturnType<typeof createAdminClient>,
  studentIds: string[],
): Promise<Map<string, StudentProfile>> {
  const map = new Map<string, StudentProfile>();
  if (studentIds.length === 0) return map;

  const { data: students, error: studentsError } = await admin
    .from('students')
    .select('id, user_id')
    .in('id', studentIds);

  if (studentsError) {
    return map;
  }

  const userIds = [...new Set((students ?? []).map((s) => s.user_id as string))];
  const studentToUser = new Map(
    (students ?? []).map((s) => [s.id as string, s.user_id as string]),
  );

  if (userIds.length === 0) return map;

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds);

  const profileByUserId = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      { name: (p.full_name as string | null) ?? null, email: (p.email as string | null) ?? null },
    ]),
  );

  for (const studentId of studentIds) {
    const userId = studentToUser.get(studentId);
    const profile = userId ? profileByUserId.get(userId) : undefined;
    map.set(studentId, {
      studentId,
      name: profile?.name ?? null,
      email: profile?.email ?? null,
    });
  }

  return map;
}

function buildProgressMaps(progress: ProgressRow[]) {
  const progressByStudentItem = new Map<string, Set<string>>();
  const completedByStudentItem = new Map<string, Set<string>>();

  for (const row of progress) {
    const sid = row.student_id;
    if (!progressByStudentItem.has(sid)) progressByStudentItem.set(sid, new Set());
    progressByStudentItem.get(sid)!.add(row.item_id);

    if (row.completed) {
      if (!completedByStudentItem.has(sid)) completedByStudentItem.set(sid, new Set());
      completedByStudentItem.get(sid)!.add(row.item_id);
    }
  }

  return { progressByStudentItem, completedByStudentItem };
}

function computeCourseLearnerStats(
  enrollments: EntitlementRow[],
  publishedItems: ItemRow[],
  allItemIds: string[],
  progressByStudentItem: Map<string, Set<string>>,
  completedByStudentItem: Map<string, Set<string>>,
) {
  const publishedIds = publishedItems.map((i) => i.id);
  const enrolledStudentIds = [...new Set(enrollments.map((e) => e.student_id))];

  let activeLearnerCount = 0;
  let completedLearnerCount = 0;
  let progressSum = 0;

  for (const studentId of enrolledStudentIds) {
    if (studentHasAnyProgress(studentId, allItemIds, progressByStudentItem)) {
      activeLearnerCount += 1;
    }
    if (studentCompletedAll(studentId, publishedIds, completedByStudentItem)) {
      completedLearnerCount += 1;
    }
    progressSum += studentProgressPercent(studentId, publishedIds, completedByStudentItem);
  }

  const enrollmentCount = enrolledStudentIds.length;
  const averageProgressPercent =
    enrollmentCount > 0 ? Math.round(progressSum / enrollmentCount) : 0;
  const completionRate =
    enrollmentCount > 0 ? Math.round((completedLearnerCount / enrollmentCount) * 100) : 0;

  return {
    enrollmentCount,
    activeLearnerCount,
    completedLearnerCount,
    averageProgressPercent,
    completionRate,
  };
}

export async function getFreeCoursesOverviewAnalytics(): Promise<FreeCourseOverviewAnalytics> {
  const ctx = await loadAnalyticsContext();
  const { progressByStudentItem, completedByStudentItem } = buildProgressMaps(ctx.progress);

  let publishedFreeCourses = 0;
  let draftFreeCourses = 0;
  let totalLessons = 0;
  let totalYoutubeLessons = 0;
  let totalTpstreamsLessons = 0;
  let totalEnrollments = 0;
  let totalActiveLearners = 0;
  let totalCompletedLearners = 0;
  let progressSum = 0;
  let progressCount = 0;

  for (const course of ctx.courses) {
    if (course.publish_status === 'published') publishedFreeCourses += 1;
    else draftFreeCourses += 1;

    const allItems = ctx.allItemsByCourse.get(course.id) ?? [];
    const published = ctx.publishedItemsByCourse.get(course.id) ?? [];
    totalLessons += published.length;
    for (const item of published) {
      if (item.video_source === 'youtube') totalYoutubeLessons += 1;
      else totalTpstreamsLessons += 1;
    }

    const enrollments = ctx.enrollmentsByCourse.get(course.id) ?? [];
    const stats = computeCourseLearnerStats(
      enrollments,
      published,
      allItems.map((i) => i.id),
      progressByStudentItem,
      completedByStudentItem,
    );

    totalEnrollments += stats.enrollmentCount;
    totalActiveLearners += stats.activeLearnerCount;
    totalCompletedLearners += stats.completedLearnerCount;

    const enrolledIds = [...new Set(enrollments.map((e) => e.student_id))];
    for (const studentId of enrolledIds) {
      progressSum += studentProgressPercent(
        studentId,
        published.map((i) => i.id),
        completedByStudentItem,
      );
      progressCount += 1;
    }
  }

  return {
    totalFreeCourses: ctx.courses.length,
    publishedFreeCourses,
    draftFreeCourses,
    totalEnrollments,
    totalActiveLearners,
    totalCompletedLearners,
    averageCompletionPercent: progressCount > 0 ? Math.round(progressSum / progressCount) : 0,
    totalLessons,
    totalYoutubeLessons,
    totalTpstreamsLessons,
  };
}

export async function getFreeCoursesListMetrics(): Promise<Record<string, FreeCourseListMetrics>> {
  const ctx = await loadAnalyticsContext();
  const { progressByStudentItem, completedByStudentItem } = buildProgressMaps(ctx.progress);
  const result: Record<string, FreeCourseListMetrics> = {};

  for (const course of ctx.courses) {
    const published = ctx.publishedItemsByCourse.get(course.id) ?? [];
    const allItems = ctx.allItemsByCourse.get(course.id) ?? [];
    const enrollments = ctx.enrollmentsByCourse.get(course.id) ?? [];
    const stats = computeCourseLearnerStats(
      enrollments,
      published,
      allItems.map((i) => i.id),
      progressByStudentItem,
      completedByStudentItem,
    );
    result[course.id] = {
      enrollmentCount: stats.enrollmentCount,
      averageProgressPercent: stats.averageProgressPercent,
      completionRate: stats.completionRate,
    };
  }

  return result;
}

export async function getFreeCourseAnalytics(courseId: string): Promise<FreeCourseAnalyticsDetail> {
  const [course, ctx] = await Promise.all([
    ensureFreeCourse(courseId),
    loadAnalyticsContext(),
  ]);
  const { progressByStudentItem, completedByStudentItem } = buildProgressMaps(ctx.progress);

  const published = ctx.publishedItemsByCourse.get(courseId) ?? [];
  const allItems = ctx.allItemsByCourse.get(courseId) ?? [];
  const publishedIds = published.map((i) => i.id);
  const enrollments = (ctx.enrollmentsByCourse.get(courseId) ?? []).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const stats = computeCourseLearnerStats(
    enrollments,
    published,
    allItems.map((i) => i.id),
    progressByStudentItem,
    completedByStudentItem,
  );

  const enrolledStudentIds = new Set(enrollments.map((e) => e.student_id));
  let completedLessonEvents = 0;
  for (const row of ctx.progress) {
    if (!row.completed) continue;
    const item = published.find((i) => i.id === row.item_id);
    if (item && enrolledStudentIds.has(row.student_id)) {
      completedLessonEvents += 1;
    }
  }

  const lessonAnalytics: FreeCourseLessonAnalyticsRow[] = published.map((item) => {
    let completionCount = 0;
    for (const row of ctx.progress) {
      if (row.item_id === item.id && row.completed && enrolledStudentIds.has(row.student_id)) {
        completionCount += 1;
      }
    }
    const completionRate =
      stats.enrollmentCount > 0
        ? Math.round((completionCount / stats.enrollmentCount) * 100)
        : 0;
    const source: 'youtube' | 'tpstreams' =
      item.video_source === 'youtube' ? 'youtube' : 'tpstreams';
    return {
      itemId: item.id,
      lessonTitle: item.title,
      source,
      completionCount,
      completionRate,
    };
  });

  const recentEnrollments: FreeCourseRecentEnrollment[] = enrollments.slice(0, 10).map((ent) => {
    const profile = ctx.profilesByStudentId.get(ent.student_id);
    return {
      studentName: profile?.name ?? null,
      studentEmail: profile?.email ?? null,
      enrolledAt: ent.created_at,
      progressPercent: studentProgressPercent(
        ent.student_id,
        publishedIds,
        completedByStudentItem,
      ),
    };
  });

  const itemTitleById = new Map(published.map((i) => [i.id, i.title]));
  const recentCompletions: FreeCourseRecentCompletion[] = ctx.progress
    .filter(
      (row) =>
        row.completed &&
        row.completed_at &&
        publishedIds.includes(row.item_id) &&
        enrolledStudentIds.has(row.student_id),
    )
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
    .slice(0, 10)
    .map((row) => {
      const profile = ctx.profilesByStudentId.get(row.student_id);
      return {
        studentName: profile?.name ?? null,
        studentEmail: profile?.email ?? null,
        lessonTitle: itemTitleById.get(row.item_id) ?? 'Lesson',
        completedAt: row.completed_at as string,
      };
    });

  let youtubeLessonCount = 0;
  let tpstreamsLessonCount = 0;
  for (const item of published) {
    if (item.video_source === 'youtube') youtubeLessonCount += 1;
    else tpstreamsLessonCount += 1;
  }

  return {
    courseId: course.id,
    title: course.title,
    publishStatus: course.publish_status,
    enrollmentCount: stats.enrollmentCount,
    activeLearnerCount: stats.activeLearnerCount,
    completedLearnerCount: stats.completedLearnerCount,
    averageProgressPercent: stats.averageProgressPercent,
    totalLessons: published.length,
    completedLessonEvents,
    youtubeLessonCount,
    tpstreamsLessonCount,
    lessonAnalytics,
    recentEnrollments,
    recentCompletions,
  };
}
