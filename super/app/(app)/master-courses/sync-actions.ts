'use server';

/**
 * TPStreams Sync Server Actions (Phase X Part 2).
 *
 * Server actions for triggering TPStreams reconciliation and sync.
 */

import {
  runFullTpSync,
  reconcileTpFolders,
  reconcileTpAssets,
  getSyntheticRootBucket,
  type TpSyncResult,
  type ReflectedFolder,
  type ReflectedAsset,
  type SyntheticRootBucket,
} from '@/lib/services/tpstreams-sync';
import {
  requireAuth,
} from '@/lib/auth/require-superadmin-action';

// --- Types --------------------------------------------------------------------
// NOTE: Interfaces are non-async values and cannot be exported from 'use server' files.

interface SyncActionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

// --- Server Actions -----------------------------------------------------------

/**
 * Run full TPStreams → SuperAdmin reconciliation.
 * 
 * This syncs all folders and assets from TPStreams dashboard into local DB.
 * Idempotent and production-safe.
 */
export async function syncTpStreamsAction(): Promise<SyncActionResponse<TpSyncResult>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const result = await runFullTpSync();
    return { ok: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Sync only folders from TPStreams.
 */
export async function syncTpFoldersAction(): Promise<SyncActionResponse<{
  folders: ReflectedFolder[];
  stats: { total: number; matched: number; unmatched: number; updated: number };
}>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const result = await reconcileTpFolders();
    return { ok: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Sync only assets from TPStreams.
 */
export async function syncTpAssetsAction(): Promise<SyncActionResponse<{
  assets: ReflectedAsset[];
  rootAssets: ReflectedAsset[];
  syntheticBucket: SyntheticRootBucket;
  stats: {
    total: number;
    matched: number;
    unmatched: number;
    rootLevel: number;
    created: number;
    updated: number;
    skipped_list_rows: number;
  };
}>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const result = await reconcileTpAssets();
    const syntheticBucket = getSyntheticRootBucket(result.rootAssets);
    
    return {
      ok: true,
      data: {
        ...result,
        syntheticBucket,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}
