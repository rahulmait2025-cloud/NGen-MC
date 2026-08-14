import 'server-only';

/**
 * Video Assets Service (Phase 2B).
 *
 * Manages TPStreams video assets registered against Master Courses.
 * Videos are uploaded to TPStreams and their metadata is stored locally.
 *
 * HARD RULES:
 * - Videos are always uploaded into the Master Course's dedicated TPStreams folder.
 * - Bundles, Variants, Assignments, and Entitlements do NOT register video assets here.
 * - Supabase remains the storage layer for non-video resources.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateCourseStructure } from '@/lib/cache/invalidate-course';
import { getAsset, listAssets, syncAssetMetadata } from '../tpstreams/assets';
import {
  logTpStreamsInternalError,
} from '../tpstreams/client';
import type {
  TpAsset,
  TpAssetDetail,
} from '../tpstreams/types';
import type {
  Database,
  MasterCourseItemsRow,
  VideoAssetsRow,
  VideoAssetProcessingStatus,
  VideoAssetSyncStatus,
} from '@/types/database';
import { getMasterCourseById } from './master-courses';
import { upsertLessonItemForVideoAsset } from './master-course-structure';

// --- Types --------------------------------------------------------------------

export interface RegisterDirectTpUploadInput {
  pillar_id?: string;
  master_course_id: string;
  master_course_module_id?: string;
  tp_asset_id: string;
  title: string;
  description?: string;
  module_id?: string;
  sort_order?: number;
  content_protection_type?: 'drm' | 'aes' | 'disable';
  created_by?: string;
}

export interface VideoAssetWithCourse extends VideoAssetsRow {
  master_course_code: string | null;
  master_course_title: string | null;
}

export interface VideoAssetSyncResult {
  asset: VideoAssetsRow;
  changed?: boolean;
  metadata: {
    processing_status: VideoAssetProcessingStatus;
    duration_seconds: number | null;
    thumbnail_url: string | null;
  };
}

export interface TpFolderSyncResult {
  master_course_id: string;
  tp_folder_uuid: string;
  active_asset_count: number;
  inserted: number;
  updated: number;
  reactivated: number;
  removed: number;
  skipped: number;
}

// --- Resolution presets -------------------------------------------------------

const _RESOLUTION_PRESETS = {
  /** Best quality: all resolutions */
  all: ['240p', '360p', '480p', '540p', '720p', '1080p'],
  /** Standard: good balance of quality and storage */
  standard: ['360p', '480p', '720p'],
  /** Minimal: lowest storage, acceptable quality */
  minimal: ['360p', '480p'],
} as const;

const TP_ASSET_PAGE_SIZE = 100;
const inFlightFolderSyncs = new Map<string, Promise<TpFolderSyncResult>>();
const inFlightModuleFolderSyncs = new Map<string, Promise<TpFolderSyncResult>>();

// --- Register / Upload --------------------------------------------------------

/**
 * Register a TPStreams asset that was uploaded directly via browser uploader SDK.
 *
 * Flow:
 *   1. Validate Master Course exists and has a TPStreams folder.
 *   2. Fetch uploaded asset details from TPStreams by tp_asset_id.
 *   3. Store the asset metadata and app-edited fields in local video_assets table.
 */
export async function registerDirectTpUpload(
  input: RegisterDirectTpUploadInput,
): Promise<VideoAssetsRow> {
  if (!input.tp_asset_id.trim()) {
    throw new Error('TPStreams asset ID is required for direct upload registration.');
  }

  const admin = createAdminClient();

  const course = await getMasterCourseById(input.master_course_id);
  if (!course) {
    throw new Error(`Master Course not found: ${input.master_course_id}`);
  }

  if (input.pillar_id && course.pillar_id !== input.pillar_id) {
    throw new Error(`Course ${input.master_course_id} does not belong to Pillar ${input.pillar_id}`);
  }

  let folderUuid: string | null = course.tp_folder_uuid;
  let validatedModuleId: string | null = null;

  if (input.master_course_module_id) {
    const { data: module, error: moduleError } = await admin
      .from('master_course_modules')
      .select('id, master_course_id, tp_folder_uuid, tp_folder_status')
      .eq('id', input.master_course_module_id)
      .maybeSingle();

    if (moduleError || !module) {
      throw new Error(`Module not found: ${input.master_course_module_id}`);
    }

    if (module.master_course_id !== input.master_course_id) {
      throw new Error(
        `Module ${input.master_course_module_id} does not belong to Course ${input.master_course_id}`,
      );
    }

    if (module.tp_folder_status !== 'created' || !module.tp_folder_uuid) {
      throw new Error(
        `Module ${input.master_course_module_id} does not have a TPStreams folder ready for registration.`,
      );
    }

    validatedModuleId = module.id;
    folderUuid = module.tp_folder_uuid;
  }

  if (!folderUuid) {
    throw new Error(
      `Master Course "${course.title}" does not have a TPStreams folder yet. ` +
        `Status: ${course.tp_folder_status}. Folder must be created before registering videos.`,
    );
  }

  const [tpAsset, existingAsset] = await Promise.all([
    getAsset(input.tp_asset_id),
    getVideoAssetByTpAssetId(input.tp_asset_id),
  ]);

  if (existingAsset) {
    const { data: updated, error: updateError } = await admin
      .from('video_assets')
      .update({
        master_course_id: input.master_course_id,
        master_course_module_id: validatedModuleId ?? existingAsset.master_course_module_id,
        tp_folder_uuid: folderUuid,
        title: input.title,
        description: input.description ?? existingAsset.description,
        processing_status: mapTpStatusToLocal(tpAsset.video?.status),
        sync_status: 'active' as VideoAssetSyncStatus,
        removed_at: null,
        duration_seconds: tpAsset.video?.duration ?? existingAsset.duration_seconds,
        thumbnail_url: tpAsset.video?.cover_thumbnail_url ?? existingAsset.thumbnail_url,
        playback_url: tpAsset.video?.playback_url ?? existingAsset.playback_url,
        dash_url: tpAsset.video?.dash_url ?? existingAsset.dash_url,
        content_protection_type:
          input.content_protection_type ??
          (tpAsset.video?.content_protection_type as VideoAssetsRow['content_protection_type']) ??
          existingAsset.content_protection_type,
        resolutions: tpAsset.video?.resolutions ?? existingAsset.resolutions,
        video_codec: tpAsset.video?.video_codec ?? existingAsset.video_codec,
        audio_codec: tpAsset.video?.audio_codec ?? existingAsset.audio_codec,
        module_id:
          validatedModuleId !== null
            ? null
            : input.module_id ?? existingAsset.module_id,
        sort_order: input.sort_order ?? existingAsset.sort_order,
      })
      .eq('id', existingAsset.id)
      .select('*')
      .single();

    if (updateError || !updated) {
      throw new Error(
        `Failed to update direct TP upload asset: ${updateError?.message ?? 'No data returned'}`,
      );
    }

    return updated;
  }

  const { data, error } = await admin
    .from('video_assets')
    .insert({
      master_course_id: input.master_course_id,
      master_course_module_id: validatedModuleId,
      tp_asset_id: input.tp_asset_id,
      tp_folder_uuid: folderUuid,
      title: input.title,
      description: input.description ?? null,
      processing_status: mapTpStatusToLocal(tpAsset.video?.status),
      sync_status: 'active' as VideoAssetSyncStatus,
      removed_at: null,
      duration_seconds: tpAsset.video?.duration ?? null,
      thumbnail_url: tpAsset.video?.cover_thumbnail_url ?? null,
      playback_url: tpAsset.video?.playback_url ?? null,
      dash_url: tpAsset.video?.dash_url ?? null,
      content_protection_type:
        input.content_protection_type ??
        (tpAsset.video?.content_protection_type as VideoAssetsRow['content_protection_type']) ??
        null,
      resolutions: tpAsset.video?.resolutions ?? null,
      video_codec: tpAsset.video?.video_codec ?? null,
      audio_codec: tpAsset.video?.audio_codec ?? null,
      module_id: validatedModuleId !== null ? null : input.module_id ?? null,
      sort_order: input.sort_order ?? 1,
      created_by: input.created_by ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to store direct TP upload asset: ${error?.message ?? 'No data returned'}`,
    );
  }

  return data;
}

// --- Query --------------------------------------------------------------------

/**
 * Get a video asset by ID.
 */
export async function getVideoAssetById(id: string): Promise<VideoAssetsRow | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('video_assets')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch video asset: ${error.message}`);
  }

  return data;
}

/**
 * Get a video asset by its TPStreams asset ID.
 */
async function getVideoAssetByTpAssetId(
  tpAssetId: string,
): Promise<VideoAssetsRow | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('video_assets')
    .select('*')
    .eq('tp_asset_id', tpAssetId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch video asset: ${error.message}`);
  }

  return data;
}

/**
 * List all video assets for a Master Course.
 */
export async function listVideoAssetsByCourse(
  masterCourseId: string,
  options?: {
    module_id?: string;
    processing_status?: VideoAssetProcessingStatus;
    include_removed?: boolean;
    limit?: number;
  },
): Promise<VideoAssetWithCourse[]> {
  const admin = createAdminClient();

  let query = admin
    .from('video_assets')
    .select(
      `
      *,
      master_courses!inner(code, title)
    `,
    )
    .eq('master_course_id', masterCourseId);

  if (!options?.include_removed) {
    query = query.eq('sync_status', 'active');
  }

  if (options?.module_id) {
    query = query.eq('module_id', options.module_id);
  }

  if (options?.processing_status) {
    query = query.eq('processing_status', options.processing_status);
  }

  query = query.order('sort_order', { ascending: true });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list video assets: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    ...row,
    master_course_code: (row.master_courses as { code: string; title: string } | null)?.code ?? null,
    master_course_title: (row.master_courses as { code: string; title: string } | null)?.title ?? null,
  }));
}

/**
 * List video assets for a specific module.
 */
export async function listVideosForModule(
  pillarId: string,
  courseId: string,
  moduleId: string,
): Promise<VideoAssetWithCourse[]> {
  const admin = createAdminClient();

  const { data: course, error: courseError } = await admin
    .from('master_courses')
    .select('pillar_id')
    .eq('id', courseId)
    .maybeSingle();

  if (courseError || !course) {
    throw new Error(`Course not found: ${courseId}`);
  }

  if (course.pillar_id !== pillarId) {
    throw new Error(`Course ${courseId} does not belong to Pillar ${pillarId}`);
  }

  const { data: module, error: moduleError } = await admin
    .from('master_course_modules')
    .select('master_course_id')
    .eq('id', moduleId)
    .maybeSingle();

  if (moduleError || !module) {
    throw new Error(`Module not found: ${moduleId}`);
  }

  if (module.master_course_id !== courseId) {
    throw new Error(`Module ${moduleId} does not belong to Course ${courseId}`);
  }

  const { data, error } = await admin
    .from('video_assets')
    .select(
      `
      *,
      master_courses!inner(code, title)
    `,
    )
    .eq('master_course_id', courseId)
    .eq('master_course_module_id', moduleId)
    .eq('sync_status', 'active')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to list module videos: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    ...row,
    master_course_code: (row.master_courses as { code: string; title: string } | null)?.code ?? null,
    master_course_title: (row.master_courses as { code: string; title: string } | null)?.title ?? null,
  }));
}

/**
 * List video assets that are still processing (for polling/status checks).
 */
async function listProcessingVideos(
  limit: number = 100,
): Promise<VideoAssetsRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('video_assets')
    .select('*')
    .eq('sync_status', 'active')
    .in('processing_status', ['pending', 'queued', 'processing'])
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list processing videos: ${error.message}`);
  }

  return data ?? [];
}

// --- Sync ---------------------------------------------------------------------

/**
 * Sync a video asset's local metadata with the latest from TPStreams.
 *
 * This should be called:
 *   - Periodically by a background job for assets still processing
 *   - When a webhook notification arrives
 *   - On-demand by an admin refresh action
 */
export async function syncVideoAssetMetadata(
  id: string,
): Promise<VideoAssetSyncResult> {
  const admin = createAdminClient();

  const asset = await getVideoAssetById(id);
  if (!asset) {
    throw new Error(`Video asset not found: ${id}`);
  }

  // Fetch latest from TPStreams
  const metadata = await syncAssetMetadata(asset.tp_asset_id);

  // Compare if anything has changed
  const hasChanged =
    asset.processing_status !== metadata.processing_status ||
    asset.duration_seconds !== metadata.duration_seconds ||
    asset.thumbnail_url !== metadata.thumbnail_url ||
    asset.playback_url !== metadata.playback_url ||
    asset.dash_url !== metadata.dash_url ||
    asset.content_protection_type !== metadata.content_protection_type ||
    JSON.stringify(asset.resolutions) !== JSON.stringify(metadata.resolutions) ||
    asset.video_codec !== metadata.video_codec ||
    asset.audio_codec !== metadata.audio_codec;

  let updated = asset;

  if (hasChanged) {
    // Update local record only if data changed to save DB writes
    const { data: updatedRow, error } = await admin
      .from('video_assets')
      .update({
        processing_status: metadata.processing_status,
        duration_seconds: metadata.duration_seconds,
        thumbnail_url: metadata.thumbnail_url,
        playback_url: metadata.playback_url,
        dash_url: metadata.dash_url,
        content_protection_type: metadata.content_protection_type,
        resolutions: metadata.resolutions,
        video_codec: metadata.video_codec,
        audio_codec: metadata.audio_codec,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !updatedRow) {
      throw new Error(
        `Failed to sync video asset metadata: ${error?.message ?? 'No data returned'}`,
      );
    }
    updated = updatedRow;
  }

  // Auto-create lesson item when a video transitions to 'completed'
  // This ensures the video appears in delivery stats and is visible to college/student
  if (
    metadata.processing_status === 'completed' &&
    asset.processing_status !== 'completed'
  ) {
    try {
      const { created } = await upsertLessonItemForVideoAsset(id);
      if (created) {
        console.log(`[video-assets] Auto-created lesson item for completed video ${id}`);
      }
    } catch (lessonErr) {
      console.error(`[video-assets] Failed to auto-create lesson for video ${id}:`, lessonErr);
    }
  }

  return {
    asset: updated,
    changed: hasChanged,
    metadata: {
      processing_status: metadata.processing_status,
      duration_seconds: metadata.duration_seconds,
      thumbnail_url: metadata.thumbnail_url,
    },
  };
}

/**
 * Batch sync all assets that are still processing.
 *
 * Useful for background jobs or admin "refresh all" actions.
 */
async function _syncAllProcessingAssets(): Promise<VideoAssetSyncResult[]> {
  const processing = await listProcessingVideos();
  const results: VideoAssetSyncResult[] = [];

  const settled = await Promise.allSettled(
    processing.map((asset) => syncVideoAssetMetadata(asset.id)),
  );
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      results.push(r.value);
    } else {
      console.error(
        `[video-assets] Failed to sync asset: ${r.reason instanceof Error ? r.reason.message : r.reason}`,
      );
    }
  }

  return results;
}

/**
 * Sync one course folder from TPStreams into local video_assets.
 *
 * TPStreams folder contents are the source of truth for which assets belong to
 * the course. Local organization fields such as description/module/sort order
 * are preserved unless a local row is being created for the first time.
 */
export async function syncCourseVideoAssetsFromTpStreams(
  masterCourseId: string,
): Promise<TpFolderSyncResult> {
  const existingSync = inFlightFolderSyncs.get(masterCourseId);
  if (existingSync) {
    return existingSync;
  }

  const syncPromise = runCourseVideoAssetsFromTpStreamsSync(masterCourseId);
  inFlightFolderSyncs.set(masterCourseId, syncPromise);

  try {
    return await syncPromise;
  } finally {
    inFlightFolderSyncs.delete(masterCourseId);
  }
}

/**
 * Sync one module folder from TPStreams into local video_assets.
 *
 * This is used when module pages need to pull assets that were uploaded directly
 * in TPStreams and map them into the current module context.
 */
export async function syncModuleVideoAssetsFromTpStreams(
  moduleId: string,
): Promise<TpFolderSyncResult> {
  const existingSync = inFlightModuleFolderSyncs.get(moduleId);
  if (existingSync) {
    return existingSync;
  }

  const syncPromise = runModuleVideoAssetsFromTpStreamsSync(moduleId);
  inFlightModuleFolderSyncs.set(moduleId, syncPromise);

  try {
    return await syncPromise;
  } finally {
    inFlightModuleFolderSyncs.delete(moduleId);
  }
}

async function runCourseVideoAssetsFromTpStreamsSync(
  masterCourseId: string,
): Promise<TpFolderSyncResult> {
  const admin = createAdminClient();
  const course = await getMasterCourseById(masterCourseId);

  if (!course) {
    throw new Error(`Master Course not found: ${masterCourseId}`);
  }

  if (course.tp_folder_status !== 'created' || !course.tp_folder_uuid) {
    throw new Error(
      `Master Course "${course.title}" does not have a TPStreams folder ready for sync.`,
    );
  }

  const folderUuid = course.tp_folder_uuid;

  const { assets: folderAssets, skipped: listSkipped } = await listAllTpVideoAssetsForFolder(
    folderUuid,
  );
  const remoteAssets: Array<TpAsset | TpAssetDetail> = [];
  let skipped = listSkipped;

  const hydrated = await Promise.allSettled(
    folderAssets.map((folderAsset) => hydrateTpAssetForSync(folderAsset)),
  );
  for (let i = 0; i < hydrated.length; i++) {
    const r = hydrated[i];
    if (r.status === 'fulfilled') {
      remoteAssets.push(r.value);
    } else {
      skipped += 1;
      logTpStreamsInternalError('course-folder-sync-hydrate', r.reason, {
        endpoint: `/assets/${folderAssets[i].id}`,
        method: 'GET',
      });
    }
  }

  const [localAssetsResult, { startTpSyncLog, completeTpSyncLog }] = await Promise.all([
    admin
      .from('video_assets')
      .select('*')
      .eq('master_course_id', masterCourseId),
    import('./tpstreams-analytics'),
  ]);

  const { data: localAssets, error: localAssetsError } = localAssetsResult;

  if (localAssetsError) {
    throw new Error(`Failed to fetch local video assets: ${localAssetsError.message}`);
  }

  const localByTpAssetId = new Map(
    (localAssets ?? []).map((asset) => [asset.tp_asset_id, asset as VideoAssetsRow]),
  );
  const remoteTpAssetIds = new Set(remoteAssets.map((asset) => asset.id));

  let inserted = 0;
  let updated = 0;
  let reactivated = 0;
  let removed = 0;
  const syncErrors: string[] = [];

  const syncLogId = await startTpSyncLog({
    course_id: course.id,
    sync_type: 'manual_folder',
  });

  const syncSettled = await Promise.allSettled(
    remoteAssets.map(async (remoteAsset) => {
      const existingAsset =
        localByTpAssetId.get(remoteAsset.id) ??
        (await getVideoAssetByTpAssetId(remoteAsset.id));
      const updatePayload = buildVideoAssetSyncPayload(
        course.id,
        folderUuid,
        remoteAsset,
        existingAsset,
      );

      if (existingAsset) {
        const { error } = await admin
          .from('video_assets')
          .update(updatePayload)
          .eq('id', existingAsset.id);

        if (error) {
          throw new Error(`Failed to update synced asset ${remoteAsset.id}: ${error.message}`);
        }

        if (existingAsset.sync_status === 'removed') {
          return 'reactivated' as const;
        } else {
          return 'updated' as const;
        }
      }

      const { error } = await admin
        .from('video_assets')
        .insert({
          ...updatePayload,
          description: null,
          module_id: null,
          sort_order: 0,
          created_by: null,
        });

      if (error) {
        throw new Error(`Failed to insert synced asset ${remoteAsset.id}: ${error.message}`);
      }

      return 'inserted' as const;
    }),
  );

  for (let i = 0; i < syncSettled.length; i++) {
    const r = syncSettled[i];
    if (r.status === 'fulfilled') {
      switch (r.value) {
        case 'inserted': inserted += 1; break;
        case 'updated': updated += 1; break;
        case 'reactivated': reactivated += 1; break;
      }
    } else {
      syncErrors.push(
        r.reason instanceof Error ? r.reason.message : `Failed to sync TP asset ${remoteAssets[i].id}`,
      );
      logTpStreamsInternalError('course-folder-sync-asset', r.reason, {
        endpoint: `/assets/${remoteAssets[i].id}`,
        method: 'SYNC',
      });
    }
  }

  const toRemove = (localAssets ?? []).filter(
    (localAsset) => !remoteTpAssetIds.has(localAsset.tp_asset_id) && localAsset.sync_status !== 'removed',
  );

  const removeSettled = await Promise.allSettled(
    toRemove.map((localAsset) =>
      admin
        .from('video_assets')
        .update({
          sync_status: 'removed' as VideoAssetSyncStatus,
          removed_at: new Date().toISOString(),
        })
        .eq('id', localAsset.id)
        .then(({ error }) => {
          if (error) throw new Error(`Failed to mark removed asset ${localAsset.tp_asset_id}: ${error.message}`);
        }),
    ),
  );

  for (let i = 0; i < removeSettled.length; i++) {
    const r = removeSettled[i];
    if (r.status === 'fulfilled') {
      removed += 1;
    } else {
      syncErrors.push(
        r.reason instanceof Error ? r.reason.message : `Failed to mark removed asset ${toRemove[i].tp_asset_id}`,
      );
      logTpStreamsInternalError('course-folder-sync-remove', r.reason, {
        endpoint: `/assets/${toRemove[i].tp_asset_id}`,
        method: 'SYNC',
      });
    }
  }

  const { error: courseUpdateError } = await admin
    .from('master_courses')
    .update({
      tp_last_synced_at: new Date().toISOString(),
      tp_last_error: syncErrors.length > 0 ? syncErrors.slice(0, 5).join(' | ') : null,
    })
    .eq('id', course.id);

  if (courseUpdateError) {
    throw new Error(`Failed to update course sync timestamp: ${courseUpdateError.message}`);
  }

  await completeTpSyncLog(syncLogId, {
    inserted_count: inserted,
    updated_count: updated + reactivated,
    missing_count: removed,
    failed_count: syncErrors.length
  });

  return {
    master_course_id: course.id,
    tp_folder_uuid: course.tp_folder_uuid,
    active_asset_count: remoteAssets.length,
    inserted,
    updated,
    reactivated,
    removed,
    skipped,
  };
}

async function runModuleVideoAssetsFromTpStreamsSync(
  moduleId: string,
): Promise<TpFolderSyncResult> {
  const admin = createAdminClient();
  const { data: module, error: moduleError } = await admin
    .from('master_course_modules')
    .select('id, master_course_id, title, tp_folder_uuid, tp_folder_status')
    .eq('id', moduleId)
    .maybeSingle();

  if (moduleError || !module) {
    throw new Error(`Module not found: ${moduleId}`);
  }

  if (module.tp_folder_status !== 'created' || !module.tp_folder_uuid) {
    throw new Error(`Module "${module.title}" does not have a TPStreams folder ready for sync.`);
  }

  const { assets: folderAssets, skipped: listSkipped } = await listAllTpVideoAssetsForFolder(
    module.tp_folder_uuid,
  );
  const remoteAssets: Array<TpAsset | TpAssetDetail> = [];
  let skipped = listSkipped;

  const moduleHydrated = await Promise.allSettled(
    folderAssets.map((folderAsset) => hydrateTpAssetForSync(folderAsset)),
  );
  for (let i = 0; i < moduleHydrated.length; i++) {
    const r = moduleHydrated[i];
    if (r.status === 'fulfilled') {
      remoteAssets.push(r.value);
    } else {
      skipped += 1;
      logTpStreamsInternalError('module-folder-sync-hydrate', r.reason, {
        endpoint: `/assets/${folderAssets[i].id}`,
        method: 'GET',
      });
    }
  }

  const [localAssetsResult, { startTpSyncLog, completeTpSyncLog }] = await Promise.all([
    admin
      .from('video_assets')
      .select('*')
      .eq('master_course_id', module.master_course_id)
      .eq('master_course_module_id', moduleId),
    import('./tpstreams-analytics'),
  ]);

  const { data: localAssets, error: localAssetsError } = localAssetsResult;

  if (localAssetsError) {
    throw new Error(`Failed to fetch local module video assets: ${localAssetsError.message}`);
  }

  const localByTpAssetId = new Map(
    (localAssets ?? []).map((asset) => [asset.tp_asset_id, asset as VideoAssetsRow]),
  );
  const remoteTpAssetIds = new Set(remoteAssets.map((asset) => asset.id));

  let inserted = 0;
  let updated = 0;
  let reactivated = 0;
  let removed = 0;

  const syncLogId = await startTpSyncLog({
    course_id: module.master_course_id,
    sync_type: 'manual_folder',
  });

  const moduleSyncSettled = await Promise.allSettled(
    remoteAssets.map(async (remoteAsset) => {
      const existingAsset =
        localByTpAssetId.get(remoteAsset.id) ??
        (await getVideoAssetByTpAssetId(remoteAsset.id));

      const basePayload = buildVideoAssetSyncPayload(
        module.master_course_id,
        module.tp_folder_uuid,
        remoteAsset,
        existingAsset,
      );
      const updatePayload = {
        ...basePayload,
        module_id: moduleId,
        master_course_module_id: moduleId,
      };

      if (existingAsset) {
        const { error } = await admin
          .from('video_assets')
          .update(updatePayload)
          .eq('id', existingAsset.id);

        if (error) {
          throw new Error(`Failed to update synced module asset ${remoteAsset.id}: ${error.message}`);
        }

        if (existingAsset.sync_status === 'removed') {
          return 'reactivated' as const;
        } else {
          return 'updated' as const;
        }
      }

      const { error } = await admin
        .from('video_assets')
        .insert({
          ...updatePayload,
          description: null,
          sort_order: 0,
          created_by: null,
        });

      if (error) {
        throw new Error(`Failed to insert synced module asset ${remoteAsset.id}: ${error.message}`);
      }

      return 'inserted' as const;
    }),
  );

  for (let i = 0; i < moduleSyncSettled.length; i++) {
    const r = moduleSyncSettled[i];
    if (r.status === 'fulfilled') {
      switch (r.value) {
        case 'inserted': inserted += 1; break;
        case 'updated': updated += 1; break;
        case 'reactivated': reactivated += 1; break;
      }
    } else {
      logTpStreamsInternalError('module-folder-sync-asset', r.reason, {
        endpoint: `/assets/${remoteAssets[i].id}`,
        method: 'SYNC',
      });
    }
  }

  const moduleToRemove = (localAssets ?? []).filter(
    (localAsset) => !remoteTpAssetIds.has(localAsset.tp_asset_id) && localAsset.sync_status !== 'removed',
  );

  const moduleRemoveSettled = await Promise.allSettled(
    moduleToRemove.map((localAsset) =>
      admin
        .from('video_assets')
        .update({ sync_status: 'removed', removed_at: new Date().toISOString() })
        .eq('id', localAsset.id),
    ),
  );

  for (const r of moduleRemoveSettled) {
    if (r.status === 'fulfilled' && !r.value.error) {
      removed += 1;
    }
  }

  await completeTpSyncLog(syncLogId, {
    inserted_count: inserted,
    updated_count: updated + reactivated,
    missing_count: removed,
    failed_count: skipped,
  });

  return {
    master_course_id: module.master_course_id,
    tp_folder_uuid: module.tp_folder_uuid,
    active_asset_count: remoteAssets.length,
    inserted,
    updated,
    reactivated,
    removed,
    skipped,
  };
}

// --- Delete -------------------------------------------------------------------

// NOTE: deleteVideoAsset was removed in Phase 9A. 
// Use deleteVideoAssetSafely from master-course-delete.ts for safe archive-only behavior.

/**
 * Handle incoming TPStreams webhook events (Phase 5A).
 * 
 * Supported events:
 * - video.processing_started
 * - video.processing_completed
 * - video.processing_failed
 * - video.deleted
 * 
 * This function is idempotent.
 */
export async function handleTpStreamsWebhook(
  event: string,
  data: {
    asset_id: string;
    status?: string;
    duration?: number;
    cover_thumbnail_url?: string;
    playback_url?: string;
    dash_url?: string;
    [key: string]: unknown;
  }
): Promise<void> {
  const admin = createAdminClient();
  const tpAssetId = data.asset_id;

  // 1. Find the local asset(s) by TP Asset ID
  const { data: assets, error: fetchError } = await admin
    .from('video_assets')
    .select('*')
    .eq('tp_asset_id', tpAssetId);

  if (fetchError || !assets || assets.length === 0) {
    // 1b. If not found locally, check if it's a new upload to a tracked folder
    const parentId = (data.parent_id as string) || (data.folder as string);
    if (parentId && (event === 'asset.uploaded' || event === 'video.uploaded' || event === 'video.processing_started')) {
      // Find course or module by folder UUID
      const { data: course } = await admin
        .from('master_courses')
        .select('id')
        .eq('tp_folder_uuid', parentId)
        .maybeSingle();

      if (course) {
        console.log(`[TPStreams Webhook] Auto-registering new asset ${tpAssetId} for course ${course.id}`);
        // Trigger a background sync for the course
        await syncCourseVideoAssetsFromTpStreams(course.id);
        return;
      }

      const { data: module } = await admin
        .from('master_course_modules')
        .select('id, master_course_id')
        .eq('tp_folder_uuid', parentId)
        .maybeSingle();

      if (module) {
        console.log(`[TPStreams Webhook] Auto-registering new asset ${tpAssetId} for module ${module.id}`);
        await syncCourseVideoAssetsFromTpStreams(module.master_course_id);
        return;
      }
    }

    console.warn(`[TPStreams Webhook] Asset ${tpAssetId} not found in local DB and no folder mapping found. Skipping.`);
    return;
  }


  // 2. Map event to update payload
  const updatePayload: Partial<VideoAssetsRow> = {};

  switch (event) {
    case 'video.processing_started':
      updatePayload.processing_status = 'processing';
      break;

    case 'video.processing_completed':
      updatePayload.processing_status = 'completed';
      if (data.duration !== undefined) updatePayload.duration_seconds = data.duration;
      if (data.cover_thumbnail_url) updatePayload.thumbnail_url = data.cover_thumbnail_url;
      if (data.playback_url) updatePayload.playback_url = data.playback_url;
      if (data.dash_url) updatePayload.dash_url = data.dash_url;
      break;

    case 'video.processing_failed':
      updatePayload.processing_status = 'error';
      break;

    case 'video.deleted':
      updatePayload.sync_status = 'removed';
      updatePayload.removed_at = new Date().toISOString();
      break;

    default:
      console.log(`[TPStreams Webhook] Unhandled event type: ${event}`);
      return;
  }

  if (Object.keys(updatePayload).length === 0) return;

  // 3. Update all instances (though usually there's only one)
  const { error: updateError } = await admin
    .from('video_assets')
    .update(updatePayload)
    .eq('tp_asset_id', tpAssetId);

  if (updateError) {
    throw new Error(`Failed to update asset ${tpAssetId} from webhook: ${updateError.message}`);
  }

  // Invalidate cache for affected courses
  const courseIds = new Set(
    assets
      .filter((a) => a.master_course_id)
      .map((a) => a.master_course_id as string)
  );
  await Promise.allSettled(
    [...courseIds].map((courseId) => revalidateCourseStructure(courseId))
  );

  // 4. Auto-create lesson items when processing completes
  // This bridges the gap between video_assets (upload storage) and
  // master_course_items (lesson delivery) so videos appear on college/student side
  if (event === 'video.processing_completed') {
    const lessonSettled = await Promise.allSettled(
      assets.map((asset) => upsertLessonItemForVideoAsset(asset.id)),
    );
    for (let i = 0; i < lessonSettled.length; i++) {
      const r = lessonSettled[i];
      if (r.status === 'fulfilled' && r.value.created) {
        console.log(`[TPStreams Webhook] Auto-created lesson item for completed video ${assets[i].id} (tp: ${tpAssetId})`);
      } else if (r.status === 'rejected') {
        console.error(`[TPStreams Webhook] Failed to auto-create lesson for video ${assets[i].id}:`, r.reason);
      }
    }
  }
}

// --- Move ---------------------------------------------------------------------

/**
 * Move a video asset to a different module within the same Master Course.
 *
 * This does NOT move the asset in TPStreams - it only updates the local
 * module_id mapping. The asset stays in the Master Course's TPStreams folder.
 */
async function _moveVideoToModule(
  id: string,
  moduleId: string,
): Promise<VideoAssetsRow> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('video_assets')
    .update({ module_id: moduleId })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to move video to module: ${error?.message ?? 'No data returned'}`,
    );
  }

  return data;
}

// --- Enhancements & Admin Controls (Phase 5B) ----------------------------------

/**
 * Trigger auto-subtitle generation.
 */
export async function generateAssetSubtitle(id: string): Promise<VideoAssetSyncResult> {
  const [asset, { generateSubtitle }] = await Promise.all([
    getVideoAssetById(id),
    import('../tpstreams/subtitles'),
  ]);
  if (!asset) throw new Error(`Video asset not found: ${id}`);
  
  await generateSubtitle(asset.tp_asset_id);
  
  return syncVideoAssetMetadata(id);
}

/**
 * Upload manual subtitle file (.vtt).
 */
export async function uploadAssetSubtitle(
  id: string, 
  file: File, 
  options: { name?: string; language?: string } = {}
): Promise<void> {
  const [asset, { uploadSubtitle }] = await Promise.all([
    getVideoAssetById(id),
    import('../tpstreams/subtitles'),
  ]);
  if (!asset) throw new Error(`Video asset not found: ${id}`);
  
  await uploadSubtitle(asset.tp_asset_id, file, options);
}

/**
 * Upload manual thumbnail file to TPStreams, then sync thumbnail_url from TPStreams.
 */
export async function uploadAssetThumbnail(id: string, file: File): Promise<VideoAssetSyncResult> {
  const [asset, { uploadThumbnail }] = await Promise.all([
    getVideoAssetById(id),
    import('../tpstreams/thumbnails'),
  ]);
  if (!asset) throw new Error(`Video asset not found: ${id}`);

  await uploadThumbnail(asset.tp_asset_id, file);

  return syncVideoAssetMetadata(id);
}

/**
 * Trim a video asset.
 */
export async function trimVideoAsset(
  id: string, 
  payload: { start_time?: number; end_time?: number }
): Promise<VideoAssetSyncResult> {
  const [asset, { trimVideo }] = await Promise.all([
    getVideoAssetById(id),
    import('../tpstreams/trim'),
  ]);
  if (!asset) throw new Error(`Video asset not found: ${id}`);
  
  await trimVideo(asset.tp_asset_id, payload);
  
  return syncVideoAssetMetadata(id);
}

/**
 * Check the status of an ongoing trim job.
 */
export async function getVideoAssetTrimStatus(id: string) {
  const [asset, { getTrimStatus }] = await Promise.all([
    getVideoAssetById(id),
    import('../tpstreams/trim'),
  ]);
  if (!asset) throw new Error(`Video asset not found: ${id}`);
  
  return getTrimStatus(asset.tp_asset_id);
}

/**
 * Revert a previously trimmed video.
 */
export async function revertVideoAssetTrim(id: string): Promise<void> {
  const [asset, { revertTrim }] = await Promise.all([
    getVideoAssetById(id),
    import('../tpstreams/trim'),
  ]);
  if (!asset) throw new Error(`Video asset not found: ${id}`);
  
  await revertTrim(asset.tp_asset_id);
  
  await syncVideoAssetMetadata(id);
}

/**
 * List chapters for a video asset.
 */
export async function listAssetChapters(id: string) {
  const [asset, { listChapters }] = await Promise.all([
    getVideoAssetById(id),
    import('../tpstreams/chapters'),
  ]);
  if (!asset) throw new Error(`Video asset not found: ${id}`);
  
  return listChapters(asset.tp_asset_id);
}

/**
 * Add chapters (overwrites existing).
 */
export async function addAssetChapters(
  id: string, 
  chapters: { title: string; start_time: string }[]
): Promise<void> {
  const [asset, { createChapters }] = await Promise.all([
    getVideoAssetById(id),
    import('../tpstreams/chapters'),
  ]);
  if (!asset) throw new Error(`Video asset not found: ${id}`);
  
  await createChapters(asset.tp_asset_id, { chapters });
}

/**
 * Delete a specific chapter.
 */
export async function deleteAssetChapter(id: string, chapterId: number): Promise<void> {
  const [asset, { deleteChapter }] = await Promise.all([
    getVideoAssetById(id),
    import('../tpstreams/chapters'),
  ]);
  if (!asset) throw new Error(`Video asset not found: ${id}`);
  
  await deleteChapter(asset.tp_asset_id, chapterId);
}

// --- Helpers ------------------------------------------------------------------

/**
 * Map TPStreams video status to our local processing_status enum.
 */
function mapTpStatusToLocal(
  tpStatus: string | null | undefined,
): VideoAssetProcessingStatus {
  switch (tpStatus) {
    case 'Not Started':
    case 'Queued':
      return 'queued';
    case 'Processing':
      return 'processing';
    case 'Completed':
      return 'completed';
    case 'Error':
      return 'error';
    default:
      return 'pending';
  }
}

/**
 * Format duration from seconds to human-readable string.
 */
export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '-';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`;
}
async function listAllTpVideoAssetsForFolder(
  folderUuid: string,
): Promise<{ assets: TpAsset[]; skipped: number }> {
  const assets: TpAsset[] = [];
  let offset = 0;
  let skipped = 0;

  while (true) {
    const page = await listAssets({ offset, limit: TP_ASSET_PAGE_SIZE });
    skipped += page.skipped_count;
    const pageResults = page.results.filter(
      (asset): asset is TpAsset => asset.type === 'video' && asset.parent_id === folderUuid,
    );

    assets.push(...pageResults);

    if (!page.next || page.results.length < TP_ASSET_PAGE_SIZE) {
      break;
    }

    offset += page.results.length;

    if (offset > 10000) {
      console.warn(
        '[video-assets] Reached TPStreams asset pagination safety limit while syncing folder',
        folderUuid,
      );
      break;
    }
  }

  return { assets, skipped };
}

async function hydrateTpAssetForSync(asset: TpAsset): Promise<TpAsset | TpAssetDetail> {
  if (
    asset.video?.playback_url &&
    asset.video?.dash_url &&
    asset.video?.content_protection_type
  ) {
    return asset;
  }

  return getAsset(asset.id);
}

function buildVideoAssetSyncPayload(
  masterCourseId: string,
  folderUuid: string,
  remoteAsset: TpAsset | TpAssetDetail,
  existingAsset: VideoAssetsRow | null,
): Database['public']['Tables']['video_assets']['Insert'] {
  const remoteThumbnailUrl =
    remoteAsset.video?.cover_thumbnail_url ??
    (Array.isArray(remoteAsset.video?.thumbnails) && remoteAsset.video.thumbnails.length > 0
      ? remoteAsset.video.thumbnails[0]
      : null) ??
    remoteAsset.video?.preview_thumbnail_url ??
    null;

  return {
    master_course_id: masterCourseId,
    tp_asset_id: remoteAsset.id,
    tp_folder_uuid: folderUuid,
    title: existingAsset?.title ?? remoteAsset.title,
    description: existingAsset?.description ?? null,
    processing_status: mapTpStatusToLocal(remoteAsset.video?.status),
    sync_status: 'active',
    removed_at: null,
    duration_seconds: remoteAsset.video?.duration ?? existingAsset?.duration_seconds ?? null,
    thumbnail_url: remoteThumbnailUrl ?? existingAsset?.thumbnail_url ?? null,
    playback_url: remoteAsset.video?.playback_url ?? existingAsset?.playback_url ?? null,
    dash_url: remoteAsset.video?.dash_url ?? existingAsset?.dash_url ?? null,
    content_protection_type:
      (remoteAsset.video?.content_protection_type as VideoAssetsRow['content_protection_type']) ??
      existingAsset?.content_protection_type ??
      null,
    resolutions: remoteAsset.video?.resolutions
      ? [...remoteAsset.video.resolutions]
      : existingAsset?.resolutions ?? null,
    video_codec: remoteAsset.video?.video_codec ?? existingAsset?.video_codec ?? null,
    audio_codec: remoteAsset.video?.audio_codec ?? existingAsset?.audio_codec ?? null,
    module_id: existingAsset?.module_id ?? null,
    sort_order: existingAsset?.sort_order ?? 0,
    created_by: existingAsset?.created_by ?? null,
  };
}

export async function updateVideoAssetTitle(id: string, title: string): Promise<VideoAssetsRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('video_assets')
    .update({ title: title.trim() })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update video asset title: ${error?.message ?? 'No data returned'}`);
  }
  return data;
}

export async function updateVideoAssetMetadata(
  id: string,
  title: string,
  description: string | null,
  sortOrder?: number | null,
): Promise<VideoAssetsRow> {
  const admin = createAdminClient();
  const updatePayload: Partial<VideoAssetsRow> = {
    title: title.trim(),
    description: description ? description.trim() : null,
  };
  if (sortOrder !== undefined && sortOrder !== null) {
    updatePayload.sort_order = sortOrder;
  }

  const { data, error } = await admin
    .from('video_assets')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update video asset metadata: ${error?.message ?? 'No data returned'}`);
  }

  if (data.master_course_id) {
    revalidateCourseStructure(data.master_course_id);
  }

  // Also update master_course_items if this asset is linked to any items
  const itemUpdatePayload: Partial<MasterCourseItemsRow> = {
    title: title.trim(),
    description: description ? description.trim() : null,
  };
  if (sortOrder !== undefined && sortOrder !== null) {
    itemUpdatePayload.sort_order = sortOrder;
  }

  const { error: itemUpdateError } = await admin
    .from('master_course_items')
    .update(itemUpdatePayload)
    .eq('video_asset_id', id);

  if (itemUpdateError) {
    console.error(`[updateVideoAssetMetadata] Failed to update linked course items:`, itemUpdateError);
  }

  // Sync rename to TPStreams if asset exists
  if (data.tp_asset_id) {
    try {
      const { updateAsset } = await import('../tpstreams/assets');
      await updateAsset(data.tp_asset_id, { title: title.trim() });
    } catch (tpError) {
      console.error(`[updateVideoAssetMetadata] Failed to rename TPStreams asset:`, tpError);
    }
  }

  return data;
}
