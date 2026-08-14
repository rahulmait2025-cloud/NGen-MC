import 'server-only';
import { getTpStreamsOrgId, orgPath, tpPost, tpPostForm } from './client';
import type { TpAsset, TpUploadSubtitleResponse } from './types';

/**
 * Generate auto-subtitles for an asset. (Cost applies).
 * Endpoint: POST /api/v1/<org>/assets/<asset_id>/generate_subtitle/
 */
export async function generateSubtitle(assetId: string, orgId?: string): Promise<TpAsset> {
  const id = orgId ?? getTpStreamsOrgId();
  return tpPost<TpAsset>(`${orgPath(id)}/assets/${assetId}/generate_subtitle/`, {});
}

/**
 * Upload manual subtitles for an asset (.vtt).
 * Endpoint: POST /api/v1/<org>/assets/<asset_id>/upload_subtitle/
 * 
 * Validation:
 * - Accept only .vtt
 * - File required
 */
export async function uploadSubtitle(
  assetId: string,
  file: File,
  options: { name?: string; language?: string } = {},
  orgId?: string,
): Promise<TpUploadSubtitleResponse> {
  if (!file) throw new Error('Subtitle file is required');
  if (!file.name.toLowerCase().endsWith('.vtt')) {
    throw new Error('Only .vtt subtitle files are accepted');
  }

  const id = orgId ?? getTpStreamsOrgId();
  const formData = new FormData();
  formData.append('subtitle', file);
  if (options.name) formData.append('name', options.name);
  if (options.language) formData.append('language', options.language);

  return tpPostForm<TpUploadSubtitleResponse>(
    `${orgPath(id)}/assets/${assetId}/upload_subtitle/`,
    formData,
  );
}
