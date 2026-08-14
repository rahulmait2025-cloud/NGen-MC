import 'server-only';

import { getTpStreamsOrgId, getTpStreamsToken, tpLog } from './client';

export interface TpUploaderAuthTokenResult {
  token: string;
  organizationId: string;
}

/**
 * Returns the existing TPStreams auth token from server env for the uploader SDK.
 *
 * Important:
 * - This intentionally does not generate a fresh token.
 * - This intentionally does not perform TPStreams login.
 * - TP_STREAMS_URL is still supported as a legacy env fallback via getTpStreamsToken().
 */
export async function getTpUploaderAuthToken(
  orgId?: string,
): Promise<TpUploaderAuthTokenResult> {
  const token = getTpStreamsToken();
  const organizationId = orgId ?? getTpStreamsOrgId();

  tpLog({
    level: 'debug',
    endpoint: '/uploader-token',
    method: 'ENV',
    context: 'tp-uploader-auth-token',
    message: `token_present=${token.length > 0} token_length=${token.length} org_present=${organizationId.length > 0}`,
  });

  return {
    token,
    organizationId,
  };
}

 
const _createTpUploaderAuthToken = getTpUploaderAuthToken;
