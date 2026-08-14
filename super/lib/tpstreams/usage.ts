import 'server-only';
import { getTpStreamsOrgId, orgPath, tpGet } from './client';
import type { TpUsageParams, TpUsageRecord, TpPaginatedResponse } from './types';

/**
 * Get TPStreams usage data.
 * Endpoint: GET /api/v1/<org>/assets_usage/
 */
export async function getUsage(
  params: TpUsageParams = {},
  orgId?: string,
): Promise<TpPaginatedResponse<TpUsageRecord>> {
  const id = orgId ?? getTpStreamsOrgId();
  return tpGet<TpPaginatedResponse<TpUsageRecord>>(
    `${orgPath(id)}/assets_usage/`,
    params as Record<string, string | number | boolean | undefined>,
  );
}
