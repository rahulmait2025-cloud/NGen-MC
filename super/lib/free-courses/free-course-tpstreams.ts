import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { ensureFreeCourse } from '@/lib/free-courses/free-course-service';
import {
  ensureFreeCourseFolder,
  ensureFreeCourseModuleFolder,
} from '@/lib/services/tpstreams-hierarchy';
import {
  registerDirectTpUpload,
  syncCourseVideoAssetsFromTpStreams,
  type TpFolderSyncResult,
} from '@/lib/services/video-assets';
import type { MasterCourseItemsRow, MasterCoursesRow, VideoAssetsRow } from '@/types/database';
import type { RegisterFreeCourseDirectTpUploadInput } from '@/lib/validation/free-course';

export interface RegisterFreeCourseTpUploadResult {
  videoAssetId: string;
  itemId: string;
  created: boolean;
  processingStatus: VideoAssetsRow['processing_status'];
}

export async function ensureFreeCourseTpFolders(courseId: string): Promise<MasterCoursesRow> {
  await ensureFreeCourse(courseId);
  const course = await ensureFreeCourseFolder(courseId);

  const admin = createAdminClient();
  const { data: modules, error } = await admin
    .from('master_course_modules')
    .select('id')
    .eq('master_course_id', courseId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to load modules: ${error.message}`);
  }

  await Promise.allSettled(
    (modules ?? []).map((mod) => ensureFreeCourseModuleFolder(mod.id)),
  );

  return course;
}

async function assertFreeCourseModule(
  courseId: string,
  moduleId: string,
): Promise<void> {
  const admin = createAdminClient();
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
    throw new Error('Module not found for this free course');
  }
}

export async function getFreeCourseModuleUploadConfig(
  courseId: string,
  moduleId: string,
): Promise<{ folderUuid: string; moduleId: string; courseId: string }> {
  const [, ] = await Promise.all([
    ensureFreeCourse(courseId),
    assertFreeCourseModule(courseId, moduleId),
  ]);
  const moduleRow = await ensureFreeCourseModuleFolder(moduleId);

  if (moduleRow.tp_folder_status !== 'created' || !moduleRow.tp_folder_uuid) {
    throw new Error(
      'Module TPStreams folder is not ready. Sync folders or retry upload preparation.',
    );
  }

  return {
    folderUuid: moduleRow.tp_folder_uuid,
    moduleId: moduleRow.id,
    courseId,
  };
}

async function upsertFreeCourseLessonForVideoAsset(
  videoAssetId: string,
  options?: {
    title?: string;
    description?: string;
    sort_order?: number;
    moduleId?: string;
  },
): Promise<{ item: MasterCourseItemsRow; created: boolean }> {
  const admin = createAdminClient();

  const { data: video, error: videoError } = await admin
    .from('video_assets')
    .select('*')
    .eq('id', videoAssetId)
    .maybeSingle();

  if (videoError || !video) {
    throw new Error('Video asset not found');
  }

  await ensureFreeCourse(video.master_course_id);

  const moduleId =
    options?.moduleId ??
    video.master_course_module_id ??
    video.module_id ??
    null;

  if (!moduleId) {
    throw new Error('Video asset is not linked to a module');
  }

  await assertFreeCourseModule(video.master_course_id, moduleId);

  const { data: existingByAsset } = await admin
    .from('master_course_items')
    .select('*')
    .eq('master_course_id', video.master_course_id)
    .eq('video_asset_id', videoAssetId)
    .maybeSingle();

  const title = options?.title?.trim() || video.title?.trim() || 'Video';
  const description =
    options?.description !== undefined
      ? options.description?.trim() || null
      : video.description;

  const itemPayload = {
    title,
    description,
    video_source: 'tpstreams' as const,
    video_asset_id: videoAssetId,
    duration_seconds: video.duration_seconds,
    module_id: moduleId,
    sort_order: options?.sort_order,
  };

  if (existingByAsset) {
    const { data: updated, error: updateError } = await admin
      .from('master_course_items')
      .update({
        title: itemPayload.title,
        description: itemPayload.description,
        video_source: 'tpstreams',
        duration_seconds: itemPayload.duration_seconds,
        sort_order: itemPayload.sort_order ?? existingByAsset.sort_order,
      })
      .eq('id', existingByAsset.id)
      .select('*')
      .single();

    if (updateError || !updated) {
      throw new Error(`Failed to update lesson: ${updateError?.message ?? 'No data'}`);
    }

    return { item: updated, created: false };
  }

  let sort_order = options?.sort_order;
  if (sort_order === undefined) {
    const { data: latestItem } = await admin
      .from('master_course_items')
      .select('sort_order')
      .eq('module_id', moduleId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    sort_order = latestItem ? latestItem.sort_order + 10 : video.sort_order ?? 10;
  }

  const { data: inserted, error: insertError } = await admin
    .from('master_course_items')
    .insert({
      master_course_id: video.master_course_id,
      module_id: moduleId,
      title: itemPayload.title,
      description: itemPayload.description,
      item_type: 'video',
      publish_status: 'draft',
      video_source: 'tpstreams',
      video_asset_id: videoAssetId,
      duration_seconds: itemPayload.duration_seconds,
      is_preview: false,
      is_required: true,
      sort_order,
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    throw new Error(`Failed to create lesson: ${insertError?.message ?? 'No data'}`);
  }

  return { item: inserted, created: true };
}

export async function registerFreeCourseDirectTpUpload(
  input: RegisterFreeCourseDirectTpUploadInput,
  createdBy?: string | null,
): Promise<RegisterFreeCourseTpUploadResult> {
  await ensureFreeCourse(input.courseId);
  await assertFreeCourseModule(input.courseId, input.moduleId);
  await ensureFreeCourseModuleFolder(input.moduleId);

  const asset = await registerDirectTpUpload({
    master_course_id: input.courseId,
    master_course_module_id: input.moduleId,
    tp_asset_id: input.tpAssetId,
    title: input.title,
    description: input.description,
    sort_order: input.sortOrder,
    content_protection_type: input.contentProtectionType,
    created_by: createdBy ?? undefined,
  });

  const { item, created } = await upsertFreeCourseLessonForVideoAsset(asset.id, {
    title: input.title,
    description: input.description,
    sort_order: input.sortOrder,
    moduleId: input.moduleId,
  });

  await createAdminClient()
    .from('master_courses')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.courseId);

  return {
    videoAssetId: asset.id,
    itemId: item.id,
    created,
    processingStatus: asset.processing_status,
  };
}

export async function syncFreeCourseTpAssets(courseId: string): Promise<TpFolderSyncResult> {
  await Promise.all([
    ensureFreeCourse(courseId),
    ensureFreeCourseTpFolders(courseId),
  ]);

  const syncResult = await syncCourseVideoAssetsFromTpStreams(courseId);

  const admin = createAdminClient();
  const { data: videos, error } = await admin
    .from('video_assets')
    .select('id')
    .eq('master_course_id', courseId)
    .eq('sync_status', 'active')
    .is('removed_at', null);

  if (error) {
    throw new Error(`Failed to load video assets: ${error.message}`);
  }

  await Promise.allSettled(
    (videos ?? []).map((row) => upsertFreeCourseLessonForVideoAsset(row.id)),
  );

  return syncResult;
}
