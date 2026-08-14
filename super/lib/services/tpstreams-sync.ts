import 'server-only';

/**
 * TPStreams Sync / Reconciliation Service (Phase X Part 2).
 *
 * Provides bidirectional sync between TPStreams dashboard and SuperAdmin.
 * 
 * Key features:
 *   - Lists all TPStreams folders and assets (full pagination)
 *   - Reconciles TPStreams state with local database
 *   - Handles root-level (orphan) videos with synthetic bucket
 *   - Idempotent - safe to run multiple times
 *   - Does NOT create TPStreams folders (only Master Course creation does that)
 *
 * Architecture:
 *   TPStreams API → Sync Service → Local Supabase DB → UI Reflection
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateCourseStructure } from '@/lib/cache/invalidate-course';
import { listFolders } from '../tpstreams/folders';
import { getAsset, listAssets } from '../tpstreams/assets';
import type {
  TpFolder,
  TpAsset,
  TpAssetDetail,
  TpPaginatedResponse,
} from '../tpstreams/types';
import type {
  VideoAssetsRow,
  VideoAssetProcessingStatus,
} from '@/types/database';

// --- Types --------------------------------------------------------------------

export interface TpSyncStats {
  totalFolders: number;
  totalAssets: number;
  rootLevelAssets: number;
  matchedFolders: number;
  unmatchedFolders: number;
  matchedAssets: number;
  unmatchedAssets: number;
  newLocalRows: number;
  updatedLocalRows: number;
  removedLocalRows: number;
  /** Rows skipped while parsing TPStreams GET /assets/ pages (sparse/invalid items). */
  skippedTpAssetListRows: number;
  errors: string[];

  unmatchedFolderList?: ReflectedFolder[];
}

export interface TpSyncResult {
  ok: boolean;
  stats: TpSyncStats;
  message?: string;
}

export interface ReflectedFolder {
  tp_folder_uuid: string;
  title: string;
  matched_course_id: string | null;
  matched_course_title: string | null;
  is_synthetic: false;

  // Phase 11D Classification
  classification: 'pillar' | 'course' | 'module' | 'video_container' | 'orphan';
  linked_entity_type?: 'Pillar' | 'Course' | 'Module' | 'Video';
  linked_entity_title?: string;
  owning_course_id?: string;
  owning_module_id?: string;
  owning_pillar_id?: string;
  is_misplaced?: boolean;
  suggested_parent_uuid?: string;
  current_parent_uuid?: string | null;
}

export interface ReflectedAsset {
  tp_asset_id: string;
  title: string;
  type: 'video' | 'folder' | 'livestream';
  parent_id: string | null;
  matched_local_id: string | null;
  matched_local_title: string | null;
  is_root_level: boolean;
}

export interface SyntheticRootBucket {
  id: string;
  title: string;
  is_synthetic: true;
  asset_count: number;
}

// --- Constants ----------------------------------------------------------------

/** Synthetic bucket name for root-level videos (UI-only, not created in TPStreams). */
const SYNTHETIC_ROOT_BUCKET_ID = '__tp_root_unorganized__';
const SYNTHETIC_ROOT_BUCKET_TITLE = 'TP Root Videos';

/** Max items to fetch per page from TPStreams API. */
const PAGE_SIZE = 100;

// --- Configuration Check ------------------------------------------------------

/**
 * Check if TPStreams API is configured (env vars set).
 * Returns false if credentials are missing, preventing auth errors.
 */
function _isTpStreamsConfigured(): boolean {
  return !!((process.env.TP_STREAMS_API_TOKEN ?? process.env.TP_STREAMS_URL) && process.env.ORGANISATION_ID);
}

// --- Full Pagination Helpers --------------------------------------------------

/**
 * Fetch ALL folders from TPStreams.
 * 
 * Note: The folders API doesn't support limit/offset pagination.
 * It returns all folders in a single response (typically small count).
 * If the response has a 'next' link, we follow it for safety.
 * 
 * @param orgId  Optional org ID override.
 * @returns      Complete array of all folders.
 */
async function listAllTpFolders(
  orgId?: string,
): Promise<TpFolder[]> {
  const allFolders: TpFolder[] = [];
  
  try {
    const page: TpPaginatedResponse<TpFolder> = await listFolders({}, orgId);
    allFolders.push(...page.results);
    
    // Folders API typically returns all results in one go.
    // But if there's pagination, we follow 'next' links for safety.
    // Note: The folders API doesn't support offset/limit params,
    // so we can't paginate programmatically. We just return what we get.
  } catch (err) {
    // Re-throw to let caller handle auth/config errors
    throw err;
  }

  return allFolders;
}

/**
 * Fetch ALL assets from TPStreams, following pagination 'next' links.
 * 
 * @param orgId  Optional org ID override.
 * @returns      Complete array of all assets.
 */
async function listAllTpAssets(
  orgId?: string,
): Promise<{ assets: TpAsset[]; skipped_count: number }> {
  const allAssets: TpAsset[] = [];
  let skippedCount = 0;
  let offset = 0;

  while (true) {
    const response = await listAssets(
      { offset, limit: PAGE_SIZE },
      orgId,
    );

    skippedCount += response.skipped_count;
    allAssets.push(...response.results);

    // Check if there's a next page
    if (!response.next || response.results.length < PAGE_SIZE) {
      break;
    }

    offset += response.results.length;

    // Safety: prevent infinite loops
    if (offset > 10000) {
      console.warn('[tpstreams-sync] Reached safety limit of 10000 assets');
      break;
    }
  }

  return { assets: allAssets, skipped_count: skippedCount };
}

// --- Reconciliation: Folders -------------------------------------------------

/**
 * Reconcile TPStreams folders with local master_courses.
 * 
 * This does NOT create new TPStreams folders - it only:
 *   1. Lists all folders from TPStreams
 *   2. Finds matching local courses by tp_folder_uuid
 *   3. Updates local sync state if needed
 *   4. Returns reflected folder list for UI display
 *
 * @returns  Array of reflected folders with match info.
 */
export async function reconcileTpFolders(): Promise<{
  folders: ReflectedFolder[];
  stats: {
    total: number;
    matched: number;
    unmatched: number;
    updated: number;
  };
}> {
  const admin = createAdminClient();
  
  // Step 1: Fetch ALL folders from TPStreams using the dedicated folders endpoint.
  // CRITICAL: GET /assets/ may only return root-level items, missing nested folders.
  // GET /assets/folders/ always returns ALL folders regardless of depth.
  const [allTpFoldersList, allTpAssets] = await Promise.all([
    listAllTpFolders(),
    listAllTpAssets(),
  ]);
  const assetMap = new Map(allTpAssets.assets.map(a => [a.id, a]));
  
  // Build enriched TpAsset-compatible folder list by merging both sources
  const tpFolders: TpAsset[] = [];
  const foldersNeedingDetail: string[] = [];
  
  for (const folder of allTpFoldersList) {
    const fromAssets = assetMap.get(folder.uuid);
    if (fromAssets && fromAssets.type === 'folder') {
      // Found in assets response - use it directly (has parent_id)
      tpFolders.push(fromAssets);
    } else {
      // Not in assets response - this is likely a nested folder that GET /assets/ skipped
      foldersNeedingDetail.push(folder.uuid);
    }
  }
  
  // Fetch detail for any folders that were in /assets/folders/ but NOT in /assets/
  // These are the "invisible" folders the user is reporting
  if (foldersNeedingDetail.length > 0) {
    console.log(`[tpstreams-sync] ${foldersNeedingDetail.length} folder(s) found in /assets/folders/ but missing from /assets/ - fetching details individually`);
    const detailResults = await Promise.allSettled(
      foldersNeedingDetail.map(uuid => getAsset(uuid))
    );
    for (let i = 0; i < detailResults.length; i++) {
      const result = detailResults[i];
      if (result.status === 'fulfilled') {
        const detail = result.value;
        tpFolders.push({
          id: detail.id,
          title: detail.title,
          bytes: detail.bytes,
          type: detail.type,
          video: detail.video,
          live_stream: detail.live_stream,
          parent: detail.parent,
          parent_id: detail.parent_id,
        });
      } else {
        console.warn(`[tpstreams-sync] Failed to fetch detail for folder ${foldersNeedingDetail[i]}:`, result.reason);
      }
    }
  }
  
  // Step 2: Fetch all local entities with folder UUIDs
  const [
    { data: localPillars },
    { data: localCourses },
    { data: localModules },
    { data: localVideos }
  ] = await Promise.all([
    admin.from('master_course_pillars').select('id, title, tp_folder_uuid, tp_folder_status, tp_last_synced_at'),
    admin.from('master_courses').select('id, title, pillar_id, tp_folder_uuid, tp_folder_status, tp_last_synced_at'),
    admin.from('master_course_modules').select('id, title, master_course_id, tp_folder_uuid, tp_folder_status, tp_last_synced_at'),
    admin.from('video_assets').select('id, title, master_course_id, master_course_module_id, tp_folder_uuid, tp_asset_id').not('tp_folder_uuid', 'is', null)
  ]);
  
  // Build lookup maps
  type PillarRow = NonNullable<typeof localPillars>[number];
  type CourseRow = NonNullable<typeof localCourses>[number];
  type ModuleRow = NonNullable<typeof localModules>[number];
  type VideoRow = NonNullable<typeof localVideos>[number];

  const pillarMap = new Map<string, PillarRow>();
  localPillars?.forEach(p => { if (p.tp_folder_uuid) pillarMap.set(p.tp_folder_uuid, p); });

  const courseMap = new Map<string, CourseRow>();
  localCourses?.forEach(c => { if (c.tp_folder_uuid) courseMap.set(c.tp_folder_uuid, c); });

  const moduleMap = new Map<string, ModuleRow>();
  localModules?.forEach(m => { if (m.tp_folder_uuid) moduleMap.set(m.tp_folder_uuid, m); });

  const videoFolderMap = new Map<string, VideoRow>();
  localVideos?.forEach(v => { 
    if (v.tp_folder_uuid) videoFolderMap.set(v.tp_folder_uuid, v);
  });
  
  // Also need maps for parents to check placement
  const pillarById = new Map<string, PillarRow>(localPillars?.map(p => [p.id, p]));
  const courseById = new Map<string, CourseRow>(localCourses?.map(c => [c.id, c]));

  // Step 3: Reconcile each folder from TPStreams
  const reflectedFolders: ReflectedFolder[] = [];
  let matchedCount = 0;
  let unmatchedCount = 0;
  let updatedCount = 0;
  
  for (const folder of tpFolders) {
    let matchedId: string | null = null;
    let matchedTitle: string | null = null;
    let classification: ReflectedFolder['classification'] = 'orphan';
    let entityType: ReflectedFolder['linked_entity_type'] | undefined;
    let entityTitle: string | undefined;
    let owningCourseId: string | undefined;
    let owningModuleId: string | undefined;
    let owningPillarId: string | undefined;
    let isMisplaced = false;
    let suggestedParentUuid: string | undefined;

    // A. Check Pillar
    const pMatch = pillarMap.get(folder.id);
    if (pMatch) {
      classification = 'pillar';
      entityType = 'Pillar';
      matchedId = pMatch.id;
      matchedTitle = pMatch.title;
      entityTitle = pMatch.title;
      // Pillars should be at root in TPStreams (parent_id: null)
      if (folder.parent_id !== null) {
        isMisplaced = true;
        suggestedParentUuid = undefined; // Root
      }
    } 
    // B. Check Course
    else if (courseMap.has(folder.id)) {
      const cMatch = courseMap.get(folder.id)!;
      classification = 'course';
      entityType = 'Course';
      matchedId = cMatch.id;
      matchedTitle = cMatch.title;
      entityTitle = cMatch.title;
      owningCourseId = cMatch.id;
      owningPillarId = cMatch.pillar_id;

      // Check placement: parent should be Pillar's folder
      const parentPillar = pillarById.get(cMatch.pillar_id);
      if (parentPillar?.tp_folder_uuid) {
        suggestedParentUuid = parentPillar.tp_folder_uuid;
        if (folder.parent_id !== parentPillar.tp_folder_uuid) {
          isMisplaced = true;
        }
      } else {
        // If pillar has no folder, we can't repair yet, but it might still be at root (misplaced)
        if (folder.parent_id !== null) isMisplaced = true;
      }
    }
    // C. Check Module
    else if (moduleMap.has(folder.id)) {
      const mMatch = moduleMap.get(folder.id)!;
      classification = 'module';
      entityType = 'Module';
      matchedId = mMatch.id;
      matchedTitle = mMatch.title;
      entityTitle = mMatch.title;
      owningModuleId = mMatch.id;
      owningCourseId = mMatch.master_course_id;

      // Check placement: parent should be Course's folder
      const parentCourse = courseById.get(mMatch.master_course_id);
      if (parentCourse?.tp_folder_uuid) {
        suggestedParentUuid = parentCourse.tp_folder_uuid;
        if (folder.parent_id !== parentCourse.tp_folder_uuid) {
          isMisplaced = true;
        }
      } else {
        if (folder.parent_id !== null) isMisplaced = true;
      }
    }
    // D. Check Video Container
    else if (videoFolderMap.has(folder.id)) {
      const vMatch = videoFolderMap.get(folder.id)!;
      classification = 'video_container';
      entityType = 'Video';
      matchedId = vMatch.id;
      matchedTitle = vMatch.title;
      entityTitle = vMatch.title;
      owningCourseId = vMatch.master_course_id;
      owningModuleId = vMatch.master_course_module_id;
    }

    if (classification !== 'orphan') matchedCount++;
    else unmatchedCount++;

    reflectedFolders.push({
      tp_folder_uuid: folder.id,
      title: folder.title,
      matched_course_id: matchedId,
      matched_course_title: matchedTitle,
      is_synthetic: false,
      classification,
      linked_entity_type: entityType,
      linked_entity_title: entityTitle,
      owning_course_id: owningCourseId,
      owning_module_id: owningModuleId,
      owning_pillar_id: owningPillarId,
      is_misplaced: isMisplaced,
      suggested_parent_uuid: suggestedParentUuid,
      current_parent_uuid: folder.parent_id
    });
  }

  // Step 4: Identify and cleanup orphaned local records (missing from TPStreams)
  const remoteFolderUuuids = new Set(tpFolders.map(f => f.id));
  
  const pillarOrphans = (localPillars ?? []).filter(
    (p) => !remoteFolderUuuids.has(p.tp_folder_uuid!),
  );

  await Promise.allSettled(
    pillarOrphans.map((pillar) =>
      admin
        .from('master_course_pillars')
        .update({
          tp_folder_uuid: null,
          tp_folder_status: 'pending',
          tp_last_error: 'Folder missing from TPStreams (detected during sync)',
        })
        .eq('id', pillar.id),
    ),
  );
  updatedCount += pillarOrphans.length;

  const courseOrphans = (localCourses ?? []).filter(
    (c) => !remoteFolderUuuids.has(c.tp_folder_uuid!),
  );

  await Promise.allSettled(
    courseOrphans.map((course) =>
      admin
        .from('master_courses')
        .update({
          tp_folder_uuid: null,
          tp_folder_status: 'pending',
          tp_last_error: 'Folder missing from TPStreams (detected during sync)',
        })
        .eq('id', course.id),
    ),
  );
  updatedCount += courseOrphans.length;
  
  return {
    folders: reflectedFolders,
    stats: {
      total: tpFolders.length,
      matched: matchedCount,
      unmatched: unmatchedCount,
      updated: updatedCount,
    },
  };
}

// --- Reconciliation: Assets --------------------------------------------------

/**
 * Reconcile TPStreams assets with local video_assets.
 * 
 * This:
 *   1. Lists all assets from TPStreams
 *   2. Finds matching local assets by tp_asset_id
 *   3. Creates/updates local representations
 *   4. Identifies root-level (orphan) assets
 *
 * @returns  Array of reflected assets with match info and root-level flag.
 */
export async function reconcileTpAssets(): Promise<{
  assets: ReflectedAsset[];
  rootAssets: ReflectedAsset[];
  stats: {
    total: number;
    matched: number;
    unmatched: number;
    rootLevel: number;
    created: number;
    updated: number;
    removed: number;
    skipped_list_rows: number;
  };
}> {

  const admin = createAdminClient();

  // Step 1: Fetch all assets from TPStreams
  // Step 2: Fetch all local video assets
  const [
    { assets: tpAssets, skipped_count: skippedListRows },
    { data: localAssets, error: fetchError },
  ] = await Promise.all([
    listAllTpAssets(),
    admin
      .from('video_assets')
      .select('id, title, tp_asset_id, master_course_id')
      .limit(10000),
  ]);
  
  if (fetchError) {
    console.error('[tpstreams-sync] Failed to fetch local assets:', fetchError);
    throw new Error(`Failed to fetch local assets: ${fetchError.message}`);
  }
  
  // Build lookup map: tp_asset_id → local asset
  const localAssetByTpId = new Map<string, VideoAssetsRow>();
  for (const asset of localAssets ?? []) {
    localAssetByTpId.set(asset.tp_asset_id, asset as VideoAssetsRow);
  }
  
  // Build lookup map: tp_folder_uuid → local course
  const { data: localCourses } = await admin
    .from('master_courses')
    .select('id, tp_folder_uuid')
    .not('tp_folder_uuid', 'is', null);
  
  const courseByTpUuid = new Map<string, string>();
  for (const course of localCourses ?? []) {
    if (course.tp_folder_uuid) {
      courseByTpUuid.set(course.tp_folder_uuid, course.id);
    }
  }
  
  // Step 3: Reconcile each asset
  const reflectedAssets: ReflectedAsset[] = [];
  const rootAssets: ReflectedAsset[] = [];
  let matchedCount = 0;
  let unmatchedCount = 0;
  let rootLevelCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  
  for (let asset of tpAssets) {
    // Skip folders and livestreams - we only reconcile videos here
    if (asset.type !== 'video') {
      continue;
    }

    const matchedLocal = localAssetByTpId.get(asset.id);

    const videoSparse =
      !asset.video || typeof asset.video.status !== 'string';
    const parentUuidBefore = asset.parent_id;
    const matchedCourseBefore = parentUuidBefore
      ? (courseByTpUuid.get(parentUuidBefore) ?? null)
      : null;
    const shouldHydrateVideo =
      videoSparse && (!!matchedLocal || !!matchedCourseBefore);
    if (shouldHydrateVideo) {
      try {
        const detail = await getAsset(asset.id);
        asset = mergeTpAssetListWithDetail(asset, detail);
      } catch (hydrateErr) {
        console.warn(
          '[tpstreams-sync] Failed to hydrate TPStreams video asset from detail endpoint:',
          asset.id,
          hydrateErr,
        );
      }
    }

    const parentUuid = asset.parent_id;
    const matchedCourseId = parentUuid
      ? (courseByTpUuid.get(parentUuid) ?? null)
      : null;

    const isRootLevel = !asset.parent_id;
    
    if (matchedLocal) {
      matchedCount++;
      
      // Update local asset metadata if needed (processing status, duration, etc.)
      const tpVideoStatus = asset.video?.status;
      const localStatus = matchedLocal.processing_status;
      const mappedStatus = mapTpStatusToLocal(tpVideoStatus);
      
      if (localStatus !== mappedStatus || !matchedLocal.duration_seconds) {
        await admin
          .from('video_assets')
          .update({
            processing_status: mappedStatus,
            duration_seconds: asset.video?.duration ?? matchedLocal.duration_seconds,
            thumbnail_url: asset.video?.cover_thumbnail_url ?? matchedLocal.thumbnail_url,
            playback_url: asset.video?.playback_url ?? matchedLocal.playback_url,
            dash_url: asset.video?.dash_url ?? matchedLocal.dash_url,
            content_protection_type: asset.video?.content_protection_type ?? matchedLocal.content_protection_type,
            resolutions: asset.video?.resolutions as string[] ?? matchedLocal.resolutions,
            video_codec: asset.video?.video_codec ?? matchedLocal.video_codec,
            audio_codec: asset.video?.audio_codec ?? matchedLocal.audio_codec,
          })
          .eq('id', matchedLocal.id);
        
        updatedCount++;

        if (matchedLocal.master_course_id) {
          await revalidateCourseStructure(matchedLocal.master_course_id);
        }
      }
      
      const reflected: ReflectedAsset = {
        tp_asset_id: asset.id,
        title: asset.title,
        type: 'video',
        parent_id: asset.parent_id,
        matched_local_id: matchedLocal.id,
        matched_local_title: matchedLocal.title,
        is_root_level: isRootLevel,
      };
      
      reflectedAssets.push(reflected);
      
      if (isRootLevel) {
        rootAssets.push(reflected);
        rootLevelCount++;
      }
    } else {
      // Asset exists in TPStreams but not locally
      unmatchedCount++;

      // Create local representation for unmatched assets
      // Only create if we have enough metadata
      if (asset.video && matchedCourseId) {
        try {
          const { data: newAsset, error: insertError } = await admin
            .from('video_assets')
            .insert({
              master_course_id: matchedCourseId,
              tp_asset_id: asset.id,
              tp_folder_uuid: parentUuid,
              title: asset.title,
              description: null,
              processing_status: mapTpStatusToLocal(asset.video.status),
              duration_seconds: asset.video.duration ?? null,
              thumbnail_url: asset.video.cover_thumbnail_url ?? null,
              playback_url: asset.video.playback_url ?? null,
              dash_url: asset.video.dash_url ?? null,
              content_protection_type: asset.video.content_protection_type,
              resolutions: asset.video.resolutions as string[] ?? null,
              video_codec: asset.video.video_codec ?? null,
              audio_codec: asset.video.audio_codec ?? null,
              module_id: null,
              sort_order: 0,
            })
            .select('*')
            .single();
          
          if (!insertError && newAsset) {
            createdCount++;
            
            const reflected: ReflectedAsset = {
              tp_asset_id: asset.id,
              title: asset.title,
              type: 'video',
              parent_id: asset.parent_id,
              matched_local_id: newAsset.id,
              matched_local_title: newAsset.title,
              is_root_level: isRootLevel,
            };
            
            reflectedAssets.push(reflected);
            
            if (isRootLevel) {
              rootAssets.push(reflected);
              rootLevelCount++;
            }

            await revalidateCourseStructure(matchedCourseId);
          }
        } catch (err) {
          console.error(
            `[tpstreams-sync] Failed to create local asset ${asset.id}:`,
            err,
          );
        }
      } else if (!matchedCourseId) {
        // Asset has no matching course - add to root assets if it's a video
        if (asset.type === 'video') {
          const reflected: ReflectedAsset = {
            tp_asset_id: asset.id,
            title: asset.title,
            type: 'video',
            parent_id: asset.parent_id,
            matched_local_id: null,
            matched_local_title: null,
            is_root_level: true,
          };
          
          rootAssets.push(reflected);
          rootLevelCount++;
        }
      }
      
      // Still reflect the asset for UI visibility
      if (!matchedCourseId || !asset.video) {
        reflectedAssets.push({
          tp_asset_id: asset.id,
          title: asset.title,
          type: 'video',
          parent_id: asset.parent_id,
          matched_local_id: null,
          matched_local_title: null,
          is_root_level: isRootLevel,
        });
      }
    }
  }
  
  // Step 4: Mark local assets as 'removed' if they are no longer in TPStreams
  const remoteTpAssetIds = new Set(tpAssets.map(a => a.id));
  let removedCount = 0;
  
  const assetsToRemove = (localAssets ?? []).filter(
    (a) => !remoteTpAssetIds.has(a.tp_asset_id) && (a as { sync_status?: string }).sync_status !== 'removed',
  );

  const removeSettled = await Promise.allSettled(
    assetsToRemove.map((localAsset) =>
      admin
        .from('video_assets')
        .update({
          sync_status: 'removed',
          removed_at: new Date().toISOString(),
        })
        .eq('id', localAsset.id),
    ),
  );

  for (const r of removeSettled) {
    if (r.status === 'fulfilled') removedCount++;
  }

  // Invalidate cache for all courses that had assets marked as removed
  if (removedCount > 0) {
    const courseIds = new Set(
      assetsToRemove
        .filter((a) => a.master_course_id)
        .map((a) => a.master_course_id as string)
    );
    await Promise.allSettled(
      [...courseIds].map((courseId) => revalidateCourseStructure(courseId))
    );
  }
  
  return {
    assets: reflectedAssets,
    rootAssets,
    stats: {
      total: tpAssets.filter((a) => a.type === 'video').length,
      matched: matchedCount,
      unmatched: unmatchedCount,
      rootLevel: rootLevelCount,
      created: createdCount,
      updated: updatedCount,
      removed: removedCount,
      skipped_list_rows: skippedListRows,
    },
  };
}


// --- Full Sync Orchestration -------------------------------------------------

/**
 * Run full TPStreams → SuperAdmin reconciliation.
 * 
 * This is idempotent and safe to run multiple times.
 * It does NOT create TPStreams folders or assets - only reflects existing ones.
 *
 * @returns  Sync result with stats.
 */
export async function runFullTpSync(): Promise<TpSyncResult> {
  const errors: string[] = [];
  let newLocalRows = 0;
  let updatedLocalRows = 0;
  let removedLocalRows = 0;
  
  try {
    // Step 1: Reconcile folders
    const folderResult = await reconcileTpFolders();
    
    updatedLocalRows += folderResult.stats.updated;
    
    // Step 2: Reconcile assets
    const assetResult = await reconcileTpAssets();
    
    newLocalRows += assetResult.stats.created;
    updatedLocalRows += assetResult.stats.updated;
    removedLocalRows += assetResult.stats.removed;
    
    const stats: TpSyncStats = {
      totalFolders: folderResult.stats.total,
      totalAssets: assetResult.stats.total,
      rootLevelAssets: assetResult.stats.rootLevel,
      matchedFolders: folderResult.stats.matched,
      unmatchedFolders: folderResult.stats.unmatched,
      matchedAssets: assetResult.stats.matched,
      unmatchedAssets: assetResult.stats.unmatched,
      newLocalRows,
      updatedLocalRows,
      removedLocalRows,
      skippedTpAssetListRows: assetResult.stats.skipped_list_rows,
      errors,
      unmatchedFolderList: folderResult.folders.filter(f => !f.matched_course_id),
    };
    
    const skippedNote =
      stats.skippedTpAssetListRows > 0
        ? ` ${stats.skippedTpAssetListRows} TPStreams asset list row(s) were skipped as invalid/sparse.`
        : '';

    const removedNote = 
      stats.removedLocalRows > 0
        ? ` Marked ${stats.removedLocalRows} orphaned assets as removed.`
        : '';

    return {
      ok: true,
      stats,
      message: `Synced ${stats.totalFolders} folders and ${stats.totalAssets} assets. Created ${stats.newLocalRows} new, updated ${stats.updatedLocalRows}.${removedNote}${skippedNote}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(message);
    
    console.error('[tpstreams-sync] Full sync failed:', error);
    
    return {
      ok: false,
      stats: {
        totalFolders: 0,
        totalAssets: 0,
        rootLevelAssets: 0,
        matchedFolders: 0,
        unmatchedFolders: 0,
        matchedAssets: 0,
        unmatchedAssets: 0,
        newLocalRows,
        updatedLocalRows,
        removedLocalRows: 0,
        skippedTpAssetListRows: 0,
        errors,
      },
      message: `Sync failed: ${message}`,
    };
  }

}

// --- Synthetic Root Bucket ---------------------------------------------------

/**
 * Get the synthetic root bucket metadata (UI-only, not a real TPStreams folder).
 * 
 * @param rootAssets  Array of root-level assets from reconciliation.
 * @returns           Synthetic bucket info with asset count.
 */
export function getSyntheticRootBucket(
  rootAssets: ReflectedAsset[],
): SyntheticRootBucket {
  return {
    id: SYNTHETIC_ROOT_BUCKET_ID,
    title: SYNTHETIC_ROOT_BUCKET_TITLE,
    is_synthetic: true,
    asset_count: rootAssets.length,
  };
}

// --- Helpers -----------------------------------------------------------------

function mergeTpAssetListWithDetail(list: TpAsset, detail: TpAssetDetail): TpAsset {
  return {
    ...list,
    title: list.title || detail.title,
    bytes: list.bytes ?? detail.bytes ?? null,
    type: detail.type,
    video: detail.video ?? list.video,
    live_stream: detail.live_stream ?? list.live_stream,
    parent: list.parent ?? detail.parent,
    parent_id: list.parent_id ?? detail.parent_id,
  };
}

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
