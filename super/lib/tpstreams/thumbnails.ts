import 'server-only';
import { getTpStreamsOrgId, orgPath, tpPostForm } from './client';
import type { TpUploadThumbnailResponse } from './types';

/**
 * Upload custom thumbnail for an asset.
 * Endpoint: POST /api/v1/<org>/assets/<asset_id>/upload_thumbnail/
 * 
 * Validation:
 * - Accept image/png, image/jpeg, image/jpg
 * - Reject > 2MB
 */
export async function uploadThumbnail(
  assetId: string,
  file: File,
  orgId?: string,
): Promise<TpUploadThumbnailResponse> {
  if (!file) throw new Error('Thumbnail file is required');
  
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid image type. Accepted: .png, .jpeg, .jpg');
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Thumbnail file size must be less than 2MB');
  }

  const id = orgId ?? getTpStreamsOrgId();
  const formData = new FormData();
  formData.append('thumbnail', file);

  return tpPostForm<TpUploadThumbnailResponse>(
    `${orgPath(id)}/assets/${assetId}/upload_thumbnail/`,
    formData,
  );
}
