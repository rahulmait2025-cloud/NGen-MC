import 'server-only';

/**
 * TPStreams Folder service.
 *
 * Covers:
 *   POST /api/v1/<org>/assets/folders/
 *   GET  /api/v1/<org>/assets/folders/
 *
 * HARD RULE: Folders are created ONLY for Master Courses.
 * Bundles, Variants, Assignments, and Entitlements must NEVER call createFolder
 * or createFolderIdempotent. This invariant is enforced at the service layer.
 */

import { tpGet, tpPost, getTpStreamsOrgId, orgPath } from './client';
import { listAssets } from './assets';
import type {
  TpPaginatedResponse,
  TpFolder,
  TpCreateFolderRequest,
  TpListFoldersParams,
} from './types';

// ─── Folders — create ─────────────────────────────────────────────────────────

/**
 * Create a new folder in the organisation.
 * Endpoint: POST /api/v1/<org>/assets/folders/
 *
 * ⚠️  USE createFolderIdempotent() FROM APPLICATION CODE INSTEAD.
 * This raw function exists only for internal use by createFolderIdempotent.
 *
 * @param request  { title: string, parent?: string }
 * @param orgId    Override default org ID from env.
 */
async function createFolder(
  request: TpCreateFolderRequest,
  orgId?: string,
): Promise<TpFolder> {
  const id = orgId ?? getTpStreamsOrgId();
  return tpPost<TpFolder>(`${orgPath(id)}/assets/folders/`, request);
}

/**
 * Idempotent folder creation for Master Courses, Pillars, and Modules.
 *
 * Searches for an existing folder with the exact title AND parent before creating a new one.
 * If a match is found, returns it without calling the API.
 * If no match exists, creates a new folder and returns it.
 *
 * This prevents duplicate folders if creation is retried.
 *
 * @param title      Exact folder title to match/create.
 * @param parent     Optional parent folder UUID.
 * @param orgId      Override default org ID from env.
 * @returns          The existing or newly created folder.
 */
export async function createFolderIdempotent(
  title: string,
  parent?: string,
  orgId?: string,
): Promise<TpFolder> {
  // Step 1: Search for existing folder with exact title in the target parent (or root)
  // We use listAssets instead of listFolders because listAssets supports parent filter
  // and returns parent_id for verification.
  const existing = await listAssets({ q: title, parent, limit: 20 }, orgId);

  const match = existing.results.find((a) => {
    // Must be a folder
    if (a.type !== 'folder') return false;
    
    // Exact title match (case-insensitive)
    if (a.title.toLowerCase() !== title.toLowerCase()) return false;

    // Parent match verification
    // Note: TPStreams API returns parent_id as null for root assets
    const targetParent = parent || null;
    return a.parent_id === targetParent;
  });

  if (match) {
    return {
      title: match.title,
      uuid: match.id,
    };
  }

  // Step 2: No match — create the folder
  return createFolder({ title, parent }, orgId);
}

// ─── Folders — list ───────────────────────────────────────────────────────────

/**
 * List all folders in the organisation.
 * Supports search via the `q` query param.
 * Endpoint: GET /api/v1/<org>/assets/folders/
 *
 * @param params  Optional search params.
 * @param orgId   Override default org ID from env.
 */
export async function listFolders(
  params?: TpListFoldersParams,
  orgId?: string,
): Promise<TpPaginatedResponse<TpFolder>> {
  const id = orgId ?? getTpStreamsOrgId();
  
  // Strictly allow only 'q' as supported by official docs for this endpoint
  const query: Record<string, string> = {};
  if (params?.q) query.q = params.q;

  return tpGet<TpPaginatedResponse<TpFolder>>(
    `${orgPath(id)}/assets/folders/`,
    query,
  );
}
