import 'server-only';
import { getTpStreamsOrgId, orgPath, tpGet, tpPost, tpDelete } from './client';
import type { TpPaginatedResponse, TpChapter, TpCreateChaptersRequest } from './types';

/**
 * List all chapters on an asset.
 * Endpoint: GET /api/v1/<org>/assets/<asset_id>/chapters/
 */
export async function listChapters(assetId: string, orgId?: string): Promise<TpPaginatedResponse<TpChapter>> {
  const id = orgId ?? getTpStreamsOrgId();
  return tpGet<TpPaginatedResponse<TpChapter>>(`${orgPath(id)}/assets/${assetId}/chapters/`);
}

/**
 * Create chapters for an asset. Overwrites existing chapters.
 * Endpoint: POST /api/v1/<org>/assets/<asset_id>/chapters/
 * 
 * Validation:
 * - title required
 * - start_time required
 * - start_time format HH:MM:SS
 */
export async function createChapters(
  assetId: string,
  request: TpCreateChaptersRequest,
  orgId?: string,
): Promise<void> {
  if (!request.chapters || !Array.isArray(request.chapters)) {
    throw new Error('Chapters array is required');
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;

  for (const chapter of request.chapters) {
    if (!chapter.title?.trim()) throw new Error('Chapter title is required');
    if (!chapter.start_time?.trim()) throw new Error('Chapter start_time is required');
    if (!timeRegex.test(chapter.start_time)) {
      throw new Error(`Invalid start_time format for chapter "${chapter.title}". Use HH:MM:SS`);
    }
  }

  const id = orgId ?? getTpStreamsOrgId();
  return tpPost<void>(`${orgPath(id)}/assets/${assetId}/chapters/`, request);
}

/**
 * Delete a specific chapter.
 * Endpoint: DELETE /api/v1/<org>/assets/<asset_id>/chapters/<chapter_id>/
 */
export async function deleteChapter(
  assetId: string,
  chapterId: number,
  orgId?: string,
): Promise<void> {
  const id = orgId ?? getTpStreamsOrgId();
  return tpDelete(`${orgPath(id)}/assets/${assetId}/chapters/${chapterId}/`);
}
