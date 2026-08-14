'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { revalidateCourseStructure } from '@/lib/cache/invalidate-course';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import {
  createFreeCourseSchema,
  updateFreeCourseBasicsSchema,
  updateFreeCourseStatusSchema,
  previewYouTubePlaylistSchema,
  importYouTubeVideosSchema,
  updateFreeCourseLessonSchema,
} from '@/lib/validation/free-course';
import {
  createFreeCourse,
  updateFreeCourseBasics,
  updateFreeCourseStatus,
  publishAllFreeCourseLessons,
  deleteFreeCourse,
  ensureFreeCourse,
} from '@/lib/free-courses/free-course-service';
import { fetchYouTubePlaylistPreview } from '@/lib/free-courses/youtube-playlist-import';
import type { PlaylistPreview } from '@/lib/free-courses/youtube-playlist-import';
import {
  importYouTubeVideosToFreeCourse,
  updateFreeCourseLesson,
  removeFreeCourseLesson,
} from '@/lib/free-courses/free-course-youtube-lessons';
import type { ImportYouTubeVideosResult } from '@/lib/free-courses/free-course-youtube-lessons';
import type { MasterCoursesRow, MasterCourseItemsRow, MasterCoursePublishStatus } from '@/types/database';

type ActionResponse<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function revalidateFreeCoursePaths(courseId?: string) {
  revalidatePath('/free-courses');
  revalidateTag('lms-courses', 'max');
  if (courseId) {
    revalidatePath(`/free-courses/${courseId}`);
    revalidatePath(`/free-courses/${courseId}/youtube-import`);
    revalidatePath(`/free-courses/${courseId}/tpstreams-upload`);
  }
}

export async function createFreeCourseAction(
  formData: FormData,
): Promise<ActionResponse<{ courseId: string }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const raw = {
    title: String(formData.get('title') ?? ''),
    short_description: String(formData.get('short_description') ?? '') || undefined,
    description: String(formData.get('description') ?? '') || undefined,
    thumbnail_url: String(formData.get('thumbnail_url') ?? '') || undefined,
    visible_to_college_admins: formData.get('visible_to_college_admins') === 'on',
    visible_to_college_students: formData.get('visible_to_college_students') === 'on',
    visible_to_global_students: formData.get('visible_to_global_students') !== 'off',
  };

  const parsed = createFreeCourseSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const course = await createFreeCourse(parsed.data, authCheck.user.id);
    revalidateFreeCoursePaths(course.id);
    await revalidateCourseStructure(course.id);
    return { ok: true, data: { courseId: course.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create free course' };
  }
}

export async function updateFreeCourseBasicsAction(
  courseId: string,
  formData: FormData,
): Promise<ActionResponse<MasterCoursesRow>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const raw = {
    title: formData.has('title') ? String(formData.get('title') ?? '') : undefined,
    short_description: formData.has('short_description')
      ? String(formData.get('short_description') ?? '')
      : undefined,
    description: formData.has('description')
      ? String(formData.get('description') ?? '')
      : undefined,
    thumbnail_url: formData.has('thumbnail_url')
      ? String(formData.get('thumbnail_url') ?? '')
      : undefined,
    visible_to_college_admins: formData.has('visible_to_college_admins')
      ? formData.get('visible_to_college_admins') === 'on'
      : undefined,
    visible_to_college_students: formData.has('visible_to_college_students')
      ? formData.get('visible_to_college_students') === 'on'
      : undefined,
    visible_to_global_students: formData.has('visible_to_global_students')
      ? formData.get('visible_to_global_students') === 'on'
      : undefined,
  };

  const parsed = updateFreeCourseBasicsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const course = await updateFreeCourseBasics(courseId, parsed.data);
    revalidateFreeCoursePaths(courseId);
    await revalidateCourseStructure(courseId);
    return { ok: true, data: course };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to update free course' };
  }
}

export async function updateFreeCourseStatusAction(
  courseId: string,
  publishStatus: MasterCoursePublishStatus,
): Promise<ActionResponse<MasterCoursesRow>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const parsed = updateFreeCourseStatusSchema.safeParse({ publish_status: publishStatus });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid status' };
  }

  try {
    const course = await updateFreeCourseStatus(courseId, parsed.data.publish_status);
    revalidateFreeCoursePaths(courseId);
    await revalidateCourseStructure(courseId);
    return { ok: true, data: course };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to update status' };
  }
}

export async function publishAllFreeCourseLessonsAction(
  courseId: string,
): Promise<ActionResponse<{ modulesUpdated: number; lessonsUpdated: number }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    await ensureFreeCourse(courseId);
    const result = await publishAllFreeCourseLessons(courseId);
    revalidateFreeCoursePaths(courseId);
    await revalidateCourseStructure(courseId);
    return { ok: true, data: result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to publish lessons',
    };
  }
}

export async function previewYouTubePlaylistAction(
  courseId: string,
  playlistUrl: string,
): Promise<ActionResponse<PlaylistPreview>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const parsed = previewYouTubePlaylistSchema.safeParse({ courseId, playlistUrl });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    await ensureFreeCourse(parsed.data.courseId);
    const preview = await fetchYouTubePlaylistPreview(parsed.data.playlistUrl);
    return { ok: true, data: preview };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to fetch YouTube playlist',
    };
  }
}

export async function importYouTubeVideosAction(
  input: unknown,
): Promise<ActionResponse<ImportYouTubeVideosResult>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const parsed = importYouTubeVideosSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const result = await importYouTubeVideosToFreeCourse(parsed.data, {
      playlistTitle: parsed.data.playlistTitle ?? 'YouTube playlist',
      channelTitle: parsed.data.channelTitle ?? null,
    });
    revalidateFreeCoursePaths(parsed.data.courseId);
    await revalidateCourseStructure(parsed.data.courseId);
    return { ok: true, data: result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to import YouTube videos',
    };
  }
}

export async function updateFreeCourseLessonAction(
  courseId: string,
  itemId: string,
  input: unknown,
): Promise<ActionResponse<MasterCourseItemsRow>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const parsed = updateFreeCourseLessonSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const item = await updateFreeCourseLesson(courseId, itemId, parsed.data);
    revalidateFreeCoursePaths(courseId);
    await revalidateCourseStructure(courseId);
    return { ok: true, data: item };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to update lesson',
    };
  }
}

export async function removeFreeCourseLessonAction(
  courseId: string,
  itemId: string,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    await removeFreeCourseLesson(courseId, itemId);
    revalidateFreeCoursePaths(courseId);
    await revalidateCourseStructure(courseId);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to remove lesson',
    };
  }
}

export async function deleteFreeCourseAction(
  courseId: string,
  confirmation: string,
  courseTitle: string,
): Promise<ActionResponse<{ mode: 'archived' | 'deleted'; message: string }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const trimmed = confirmation.trim();
  if (!['DELETE', courseTitle.trim()].includes(trimmed)) {
    return { ok: false, error: 'Delete confirmation did not match. Type DELETE or the course title.' };
  }

  try {
    await ensureFreeCourse(courseId);
    const result = await deleteFreeCourse(courseId, authCheck.user.id);
    revalidateFreeCoursePaths(courseId);
    await revalidateCourseStructure(courseId);
    return { ok: true, data: result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to delete free course',
    };
  }
}


