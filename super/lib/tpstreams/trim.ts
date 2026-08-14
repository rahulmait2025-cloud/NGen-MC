import 'server-only';
import { getTpStreamsOrgId, orgPath, tpGet, tpPost } from './client';
import type { TpTrimRequest, TpTrimResponse, TpTrimStatusResponse, TpTrimRevertResponse } from './types';

/**
 * Trim a video asset.
 * Endpoint: POST /api/v1/<org>/assets/<asset_id>/trim/
 * 
 * Rules:
 * - at least one of start_time or end_time required
 * - values are seconds
 * - start_time must be >= 0
 * - end_time must be greater than start_time if both are provided
 */
export async function trimVideo(
  assetId: string,
  request: TpTrimRequest,
  orgId?: string,
): Promise<TpTrimResponse> {
  const { start_time, end_time } = request;

  if (start_time === undefined && end_time === undefined) {
    throw new Error('At least one of start_time or end_time is required');
  }

  if (start_time !== undefined && start_time < 0) {
    throw new Error('start_time must be >= 0');
  }

  if (start_time !== undefined && end_time !== undefined && end_time <= start_time) {
    throw new Error('end_time must be greater than start_time');
  }

  const id = orgId ?? getTpStreamsOrgId();
  return tpPost<TpTrimResponse>(`${orgPath(id)}/assets/${assetId}/trim/`, request);
}

/**
 * Check the status of an ongoing trim job.
 * Endpoint: GET /api/v1/<org>/assets/<asset_id>/trim/status/
 */
export async function getTrimStatus(
  assetId: string,
  orgId?: string,
): Promise<TpTrimStatusResponse> {
  const id = orgId ?? getTpStreamsOrgId();
  return tpGet<TpTrimStatusResponse>(`${orgPath(id)}/assets/${assetId}/trim/status/`);
}

/**
 * Revert a previously trimmed video to its original state.
 * Endpoint: POST /api/v1/<org>/assets/<asset_id>/trim/revert/
 */
export async function revertTrim(
  assetId: string,
  orgId?: string,
): Promise<TpTrimRevertResponse> {
  const id = orgId ?? getTpStreamsOrgId();
  return tpPost<TpTrimRevertResponse>(`${orgPath(id)}/assets/${assetId}/trim/revert/`, {});
}
