import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { applyYouTubePlaylistThumbnailIfMissing } from '@/lib/free-courses/free-course-service';
import { createModule, deleteItem } from '@/lib/services/master-course-structure';
import type { MasterCourseItemsRow } from '@/types/database';
import type { ImportYouTubeVideosInput, UpdateFreeCourseLessonInput } from '@/lib/validation/free-course';

export interface ImportYouTubeVideosResult {
  imported: number;
  updated: number;
  skipped: number;
  totalSelected: number;
}

async function assertFreeCourse(courseId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('master_courses')
    .select('id')
    .eq('id', courseId)
    .eq('course_kind', 'free_course')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify free course: ${error.message}`);
  }
  if (!data) {
    throw new Error('Free course not found');
  }
}

async function resolveTargetModuleId(
  courseId: string,
  moduleId?: string,
): Promise<string> {
  const admin = createAdminClient();

  if (moduleId) {
    const { data, error } = await admin
      .from('master_course_modules')
      .select('id')
      .eq('id', moduleId)
      .eq('master_course_id', courseId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to verify module: ${error.message}`);
    }
    if (!data) {
      throw new Error('Module not found for this course');
    }
    return data.id;
  }

  const { data: modules, error } = await admin
    .from('master_course_modules')
    .select('id')
    .eq('master_course_id', courseId)
    .order('sort_order', { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(`Failed to load modules: ${error.message}`);
  }

  if (modules?.[0]?.id) {
    return modules[0].id;
  }

  const created = await createModule({
    master_course_id: courseId,
    title: 'Lessons',
    sort_order: 1,
    publish_status: 'draft',
  });
  return created.id;
}

async function assertFreeCourseItem(
  courseId: string,
  itemId: string,
): Promise<MasterCourseItemsRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('master_course_items')
    .select('*')
    .eq('id', itemId)
    .eq('master_course_id', courseId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load lesson: ${error.message}`);
  }
  if (!data) {
    throw new Error('Lesson not found for this free course');
  }

  await assertFreeCourse(courseId);
  return data;
}

export async function importYouTubeVideosToFreeCourse(
  input: ImportYouTubeVideosInput,
  playlistMeta: { playlistTitle: string; channelTitle: string | null },
): Promise<ImportYouTubeVideosResult> {
  await assertFreeCourse(input.courseId);
  const admin = createAdminClient();
  const moduleId = await resolveTargetModuleId(input.courseId, input.moduleId);

  const selected = input.videos.filter((v) => v.selected);
  const totalSelected = selected.length;

  if (totalSelected === 0) {
    throw new Error('Select at least one video to import');
  }

  const { data: existingItems, error: existingError } = await admin
    .from('master_course_items')
    .select('id, youtube_video_id, sort_order, module_id')
    .eq('master_course_id', input.courseId);

  if (existingError) {
    throw new Error(`Failed to load existing lessons: ${existingError.message}`);
  }

  const existingByVideoId = new Map<string, { id: string; sort_order: number; module_id: string }>();
  for (const row of existingItems ?? []) {
    if (row.youtube_video_id) {
      existingByVideoId.set(row.youtube_video_id, {
        id: row.id,
        sort_order: row.sort_order,
        module_id: row.module_id,
      });
    }
  }

  const { data: moduleItems, error: moduleItemsError } = await admin
    .from('master_course_items')
    .select('sort_order')
    .eq('module_id', moduleId)
    .order('sort_order', { ascending: false })
    .limit(1);

  if (moduleItemsError) {
    throw new Error(`Failed to load module lessons: ${moduleItemsError.message}`);
  }

  let nextSortOrder = moduleItems?.[0]?.sort_order != null ? moduleItems[0].sort_order + 10 : 10;

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const importedAt = new Date().toISOString();

  for (const video of selected) {
    if (!video.youtubeVideoId) {
      skipped += 1;
      continue;
    }

    const external_metadata = {
      playlistTitle: playlistMeta.playlistTitle,
      channelTitle: playlistMeta.channelTitle,
      importedAt,
      source: 'youtube_playlist_import',
    };

    const lessonPublishStatus = input.publishOnImport ? ('published' as const) : ('draft' as const);

    const payload = {
      master_course_id: input.courseId,
      module_id: moduleId,
      title: video.title.trim(),
      description: video.description?.trim() || null,
      item_type: 'video' as const,
      publish_status: lessonPublishStatus,
      video_source: 'youtube' as const,
      video_asset_id: null,
      youtube_video_id: video.youtubeVideoId,
      youtube_playlist_id: input.playlistId,
      youtube_original_title: video.originalTitle?.trim() || video.title.trim(),
      youtube_thumbnail_url: video.thumbnailUrl?.trim() || null,
      youtube_position: video.position,
      youtube_channel_id: video.channelId ?? null,
      youtube_published_at: video.publishedAt ?? null,
      duration_seconds: video.durationSeconds ?? null,
      external_metadata,
      is_preview: false,
      is_required: true,
    };

    const existing = existingByVideoId.get(video.youtubeVideoId);
    if (existing) {
      const { error: updateError } = await admin
        .from('master_course_items')
        .update({
          title: payload.title,
          description: payload.description,
          youtube_playlist_id: payload.youtube_playlist_id,
          youtube_original_title: payload.youtube_original_title,
          youtube_thumbnail_url: payload.youtube_thumbnail_url,
          youtube_position: payload.youtube_position,
          youtube_channel_id: payload.youtube_channel_id,
          youtube_published_at: payload.youtube_published_at,
          duration_seconds: payload.duration_seconds,
          external_metadata: payload.external_metadata,
          video_source: 'youtube',
          ...(input.publishOnImport ? { publish_status: 'published' as const } : {}),
        })
        .eq('id', existing.id);

      if (updateError) {
        throw new Error(`Failed to update lesson: ${updateError.message}`);
      }
      updated += 1;
    } else {
      const { data: inserted, error: insertError } = await admin
        .from('master_course_items')
        .insert({
          ...payload,
          sort_order: nextSortOrder,
        })
        .select('id, youtube_video_id')
        .single();

      if (insertError || !inserted) {
        throw new Error(`Failed to import lesson: ${insertError?.message ?? 'No data'}`);
      }

      existingByVideoId.set(video.youtubeVideoId, {
        id: inserted.id,
        sort_order: nextSortOrder,
        module_id: moduleId,
      });
      nextSortOrder += 10;
      imported += 1;
    }
  }

  await admin
    .from('master_courses')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.courseId);

  if (input.publishOnImport) {
    await admin
      .from('master_course_modules')
      .update({ publish_status: 'published' })
      .eq('id', moduleId)
      .neq('publish_status', 'published');
  }

  await applyYouTubePlaylistThumbnailIfMissing(
    input.courseId,
    input.playlistThumbnailUrl,
  );

  return { imported, updated, skipped, totalSelected };
}

export async function updateFreeCourseLesson(
  courseId: string,
  itemId: string,
  input: UpdateFreeCourseLessonInput,
): Promise<MasterCourseItemsRow> {
  const item = await assertFreeCourseItem(courseId, itemId);
  const admin = createAdminClient();

  const updatePayload: Record<string, unknown> = {};

  if (input.title !== undefined) {
    updatePayload.title = input.title.trim();
  }
  if (input.publish_status !== undefined) {
    updatePayload.publish_status = input.publish_status;
  }
  if (input.description !== undefined) {
    updatePayload.description = input.description?.trim() || null;
  }
  if (input.sort_order !== undefined) {
    updatePayload.sort_order = input.sort_order;
  }

  if (input.thumbnail_url !== undefined) {
    if (item.video_source === 'youtube') {
      updatePayload.youtube_thumbnail_url = input.thumbnail_url?.trim() || null;
    } else if (item.video_source === 'tpstreams' && item.video_asset_id) {
      await admin
        .from('video_assets')
        .update({ thumbnail_url: input.thumbnail_url?.trim() || null })
        .eq('id', item.video_asset_id);
    } else if (input.thumbnail_url) {
      throw new Error('Thumbnail URL editing is only supported for YouTube or TPStreams lessons');
    }
  }

  const { data, error } = await admin
    .from('master_course_items')
    .update(updatePayload)
    .eq('id', itemId)
    .eq('master_course_id', courseId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update lesson: ${error?.message ?? 'No data returned'}`);
  }

  return data;
}

export async function removeFreeCourseLesson(
  courseId: string,
  itemId: string,
): Promise<void> {
  await assertFreeCourseItem(courseId, itemId);
  await deleteItem(itemId);
}
