import 'server-only';

import { z } from 'zod';

/**
 * TPStreams Organisation & Asset services.
 *
 * Covers:
 *   GET  /api/v1/organizations/
 *   GET  /api/v1/<org>/assets/
 *   GET  /api/v1/<org>/assets/<asset_id>/
 *   DELETE /api/v1/<org>/assets/<asset_id>/
 *   POST /api/v1/<org>/assets/<asset_id>/move/
 */

import {
  tpGet,
  tpPost,
  tpDelete,
  tpPatch,
  getTpStreamsOrgId,
  orgPath,
} from './client';
import type {
  TpPaginatedResponse,
  TpOrganisation,
  TpAsset,
  TpAssetDetail,
  TpMoveAssetRequest,
  TpMoveAssetResponse,
  TpListAssetsParams,
  TpGetAssetDetailParams,
} from './types';

const tpVideoListSchema = z
  .object({
    progress: z.number().nullable().optional(),
    thumbnails: z.array(z.string()).nullable().optional(),
    status: z.string().nullable().optional(),
    playback_url: z.string().nullable().optional(),
    dash_url: z.string().nullable().optional(),
    preview_thumbnail_url: z.string().nullable().optional(),
    cover_thumbnail_url: z.string().nullable().optional(),
    format: z.string().nullable().optional(),
    resolutions: z.array(z.string()).nullable().optional(),
    video_codec: z.string().nullable().optional(),
    audio_codec: z.string().nullable().optional(),
    enable_drm: z.boolean().nullable().optional(),
    tracks: z.array(z.unknown()).nullable().optional(),
    inputs: z.array(z.unknown()).nullable().optional(),
    transmux_only: z.boolean().nullable().optional(),
    duration: z.number().nullable().optional(),
    content_protection_type: z.enum(['drm', 'aes', 'disable']).nullable().optional(),
    generate_subtitle: z.boolean().nullable().optional(),
    video_codecs: z.array(z.string()).nullable().optional(),
    output_urls: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough();

const tpVideoDetailSchema = tpVideoListSchema;

/** Minimal tolerant shape for GET .../assets/ list rows - API may omit fields per row. */
const tpAssetListItemMinimalSchema = z
  .object({
    id: z.preprocess((v) => {
      if (v === null || v === undefined) return v;
      const s = String(v).trim();
      return s.length ? s : v;
    }, z.string().min(1)),
    type: z.preprocess((v) => {
      if (typeof v !== 'string') return v;
      const t = v.trim().toLowerCase();
      if (t === 'video' || t === 'livestream' || t === 'folder') return t;
      return undefined;
    }, z.enum(['video', 'livestream', 'folder']).optional()),
    parent_id: z.preprocess((v) => {
      if (v === null || v === undefined) return v;
      return String(v);
    }, z.union([z.string(), z.null()]).optional()),
    title: z.union([z.string(), z.null()]).optional(),
    video: z.unknown().optional().nullable(),
    live_stream: z.unknown().optional().nullable(),
    bytes: z.number().nullable().optional(),
    parent: z.unknown().optional().nullable(),
  })
  .passthrough();

const tpAssetListSchema = z
  .object({
    id: z.string().min(1),
    title: z.string(),
    bytes: z.number().nullable().optional(),
    type: z.enum(['video', 'livestream', 'folder']),
    video: tpVideoListSchema.nullable().optional(),
    live_stream: z.unknown().nullable().optional(),
    parent: z
      .object({
        title: z.string(),
        uuid: z.string(),
      })
      .nullable()
      .optional(),
    parent_id: z.string().nullable().optional(),
  })
  .passthrough();

const tpAssetSchema = tpAssetListSchema.extend({
  bytes: z.number().nullable(),
  video: tpVideoDetailSchema.nullable(),
  live_stream: z.unknown().nullable(),
  // parent and parent_id inherited from tpAssetListSchema (optional + nullable)
});

const tpAssetDetailSchema = tpAssetSchema.extend({
  views_count: z.number().optional(),
  average_watched_time: z.number().optional(),
  total_watch_time: z.number().optional(),
  unique_viewers_count: z.number().optional(),
  download_url: z.string().optional(),
});

const tpPaginatedAssetsSchema = z.object({
  count: z.number(),
  next: z.string().nullable().optional().default(null),
  previous: z.string().nullable().optional().default(null),
  results: z.array(z.unknown()),
});

function validateTpResponse<T>(
  schema: z.ZodSchema<T>,
  payload: unknown,
  context: string,
): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const debug = process.env.TPSTREAMS_DEBUG === '1';
    if (debug) {
      console.debug('[TPStreams] Validation failed', {
        context,
        payload,
        errors: parsed.error.flatten(),
      });
    }
    throw new Error(`Invalid TPStreams response for ${context}: ${parsed.error.message}`);
  }

  return parsed.data;
}

function normalizeTpAssetListItem(payload: unknown): TpAsset | null {
  const parsed = tpAssetListItemMinimalSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }

  const d = parsed.data;

  let parentId: string | null = null;
  if (d.parent_id !== undefined && d.parent_id !== null) {
    parentId = d.parent_id;
  } else if (
    d.parent &&
    typeof d.parent === 'object' &&
    d.parent !== null &&
    'uuid' in d.parent
  ) {
    const u = (d.parent as { uuid?: unknown }).uuid;
    if (u !== null && u !== undefined) {
      parentId = String(u);
    }
  }

  const title = d.title ?? '';

  let video: TpAsset['video'] = null;
  if (d.video !== null && d.video !== undefined) {
    const vp = tpVideoListSchema.safeParse(d.video);
    video = vp.success ? (vp.data as TpAsset['video']) : null;
  }

  const liveStream = d.live_stream ?? null;

  let type: TpAsset['type'] = d.type ?? 'folder';
  if (!d.type) {
    if (video != null) type = 'video';
    else if (liveStream != null) type = 'livestream';
    else type = 'folder';
  }

  let parent: TpAsset['parent'] = null;
  if (d.parent && typeof d.parent === 'object' && d.parent !== null) {
    const pp = z
      .object({ title: z.string(), uuid: z.string() })
      .safeParse(d.parent);
    parent = pp.success ? pp.data : null;
  }

  return {
    id: d.id,
    title,
    bytes: d.bytes ?? null,
    type,
    video,
    live_stream: liveStream as TpAsset['live_stream'],
    parent,
    parent_id: parentId,
  };
}

// --- Organisations ------------------------------------------------------------

/**
 * List all organisations belonging to the authenticated user.
 * Endpoint: GET /api/v1/organizations/
 */
 
async function _listOrganisations(): Promise<TpPaginatedResponse<TpOrganisation>> {
  return tpGet<TpPaginatedResponse<TpOrganisation>>('/organizations/');
}

// --- Assets - list ------------------------------------------------------------

/**
 * List all assets (videos, livestreams, folders) for the organisation.
 * Endpoint: GET /api/v1/<org>/assets/
 *
 * @param params  Optional pagination/filter params.
 * @param orgId   Override the default org ID from env.
 */
export async function listAssets(
  params?: TpListAssetsParams,
  orgId?: string,
): Promise<TpPaginatedResponse<TpAsset> & { skipped_count: number }> {
  const id = orgId ?? getTpStreamsOrgId();
  const payload = await tpGet<unknown>(
    `${orgPath(id)}/assets/`,
    params as Record<string, string | number | boolean | undefined>,
  );
  const parsed = validateTpResponse(
    tpPaginatedAssetsSchema,
    payload,
    'asset list',
  );

  const results: TpAsset[] = [];
  let skippedCount = 0;

  parsed.results.forEach((item, index) => {
    const normalized = normalizeTpAssetListItem(item);
    if (!normalized) {
      skippedCount += 1;
      console.warn('[TPStreams] Skipped invalid or sparse asset list row', {
        index,
        endpoint: `${orgPath(id)}/assets/`,
      });
      if (process.env.TPSTREAMS_DEBUG === '1') {
        console.debug(
          `[TPStreams] skipped row sample index=${index} type=${typeof item}`,
          item,
        );
      }
      return;
    }
    results.push(normalized);
  });

  return {
    count: parsed.count,
    next: parsed.next,
    previous: parsed.previous,
    results,
    skipped_count: skippedCount,
  };
}

// --- Assets - get detail ------------------------------------------------------

/**
 * Get full details for a single asset, including analytics and download URL.
 * Endpoint: GET /api/v1/<org>/assets/<asset_id>/
 *
 * @param assetId  TPStreams asset ID.
 * @param params   Optional expiry param (seconds).
 * @param orgId    Override org ID.
 */
export async function getAsset(
  assetId: string,
  params?: TpGetAssetDetailParams,
  orgId?: string,
): Promise<TpAssetDetail> {
  if (!assetId.trim()) {
    throw new Error('TPStreams asset ID is required');
  }

  const id = orgId ?? getTpStreamsOrgId();
  const payload = await tpGet<unknown>(
    `${orgPath(id)}/assets/${assetId}/`,
    params as Record<string, string | number | boolean | undefined>,
  );
  return validateTpResponse(
    tpAssetDetailSchema,
    payload,
    `asset detail ${assetId}`,
  ) as unknown as TpAssetDetail;
}

// --- Assets - delete ---------------------------------------------------------

/**
 * Delete an asset. If the asset is a folder, all child assets are also deleted.
 * Endpoint: DELETE /api/v1/<org>/assets/<asset_id>/
 *
 * @param assetId  TPStreams asset ID.
 * @param orgId    Override org ID.
 */
export async function deleteAsset(assetId: string, orgId?: string): Promise<void> {
  if (!assetId.trim()) {
    throw new Error('TPStreams asset ID is required');
  }

  const id = orgId ?? getTpStreamsOrgId();
  return tpDelete(`${orgPath(id)}/assets/${assetId}/`);
}

// --- Assets - move ------------------------------------------------------------

/**
 * Move an asset to a different folder or to root.
 * Endpoint: POST /api/v1/<org>/assets/<asset_id>/move/
 *
 * Pass an empty object (or omit body) to move to root directory.
 *
 * @param assetId  TPStreams asset ID.
 * @param request  Destination folder UUID. Omit to move to root.
 * @param orgId    Override org ID.
 */
export async function moveAsset(
  assetId: string,
  request?: TpMoveAssetRequest,
  orgId?: string,
): Promise<TpMoveAssetResponse> {
  const id = orgId ?? getTpStreamsOrgId();
  return tpPost<TpMoveAssetResponse>(
    `${orgPath(id)}/assets/${assetId}/move/`,
    request ?? {},
  );
}

// --- Subtitles & Thumbnails ---------------------------------------------------


// --- Trim ---------------------------------------------------------------------


// --- Chapters -----------------------------------------------------------------


// --- Asset metadata sync helper -----------------------------------------------

/**
 * Sync the local video_assets record with the latest TPStreams asset metadata.
 *
 * Fetches the current asset detail from TPStreams and returns a normalized
 * snapshot suitable for updating the local database row.
 *
 * @param assetId  TPStreams asset ID.
 * @param orgId    Override org ID.
 * @returns        Normalized metadata snapshot for local DB update.
 */
export async function syncAssetMetadata(
  assetId: string,
  orgId?: string,
): Promise<{
  processing_status: 'pending' | 'queued' | 'processing' | 'completed' | 'error';
  duration_seconds: number | null;
  thumbnail_url: string | null;
  playback_url: string | null;
  dash_url: string | null;
  content_protection_type: 'drm' | 'aes' | 'disable' | null;
  resolutions: string[] | null;
  video_codec: string | null;
  audio_codec: string | null;
}> {
  const detail = await getAsset(assetId, undefined, orgId);
  const video = detail.video;
  const resolvedThumbnailUrl =
    video?.cover_thumbnail_url ??
    (Array.isArray(video?.thumbnails) && video.thumbnails.length > 0 ? video.thumbnails[0] : null) ??
    video?.preview_thumbnail_url ??
    null;

  // Map TPStreams status to our local enum
  let processingStatus: 'pending' | 'queued' | 'processing' | 'completed' | 'error';
  switch (video?.status) {
    case 'Not Started':
    case 'Queued':
      processingStatus = 'queued';
      break;
    case 'Processing':
      processingStatus = 'processing';
      break;
    case 'Completed':
      processingStatus = 'completed';
      break;
    case 'Error':
      processingStatus = 'error';
      break;
    default:
      processingStatus = 'pending';
  }

  return {
    processing_status: processingStatus,
    duration_seconds: video?.duration ?? null,
    thumbnail_url: resolvedThumbnailUrl,
    playback_url: video?.playback_url ?? null,
    dash_url: video?.dash_url ?? null,
    content_protection_type: video?.content_protection_type ?? null,
    resolutions: video?.resolutions ? [...video.resolutions] : null,
    video_codec: video?.video_codec ?? null,
    audio_codec: video?.audio_codec ?? null,
  };
}

/**
 * Update an asset's properties (like title).
 * Endpoint: PATCH /api/v1/<org>/assets/<asset_id>/
 */
export async function updateAsset(
  assetId: string,
  update: { title: string },
  orgId?: string,
): Promise<TpAssetDetail> {
  const id = orgId ?? getTpStreamsOrgId();
  return tpPatch<TpAssetDetail>(
    `${orgPath(id)}/assets/${assetId}/`,
    update,
  );
}
