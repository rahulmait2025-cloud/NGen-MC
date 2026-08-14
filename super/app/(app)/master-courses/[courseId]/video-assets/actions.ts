'use server';

/**
 * Video Assets Server Actions (Phase 2B).
 *
 * Server actions for registering, syncing, and managing
 * TPStreams video assets against Master Courses.
 */

import { z } from 'zod';
import {
  registerDirectTpUpload,
  syncCourseVideoAssetsFromTpStreams,
  syncModuleVideoAssetsFromTpStreams,
  syncVideoAssetMetadata,
  updateVideoAssetTitle,
  updateVideoAssetMetadata,
  type TpFolderSyncResult,
  type VideoAssetSyncResult,
} from '@/lib/services/video-assets';
import { deleteVideoAssetSafely } from '@/lib/services/master-course-delete';
import { retryFolderCreation } from '@/lib/services/master-courses';
import { syncModuleVideosToCourseLessons, upsertLessonItemForVideoAsset } from '@/lib/services/master-course-structure';
import {
  requireAuth,
} from '@/lib/auth/require-superadmin-action';
import { revalidatePath } from 'next/cache';
import { getTpUploaderAuthToken } from '@/lib/tpstreams/uploader';
import { getTpStreamsOrgId, logTpStreamsInternalError } from '@/lib/tpstreams/client';

// --- Validation schemas -------------------------------------------------------
// NOTE: Zod schemas are non-async values and cannot be exported from 'use server' files.
// They are defined here for internal use only.

const registerDirectTpUploadSchema = z.object({
  pillar_id: z.uuid().optional(),
  bootcamp_id: z.uuid().optional(),
  master_course_id: z.uuid(),
  master_course_module_id: z.uuid().optional(),
  tp_asset_id: z.string().trim().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  module_id: z.uuid().optional(),
  sort_order: z.number().int().min(1).optional(),
  content_protection_type: z.enum(['drm', 'aes', 'disable']).optional(),
});

const syncCourseFolderSchema = z.object({
  master_course_id: z.uuid(),
});

const syncModuleFolderSchema = z.object({
  module_id: z.uuid(),
});

// --- Types --------------------------------------------------------------------
// NOTE: Interfaces are non-async values and cannot be exported from 'use server' files.
// They are defined here for internal use only.

interface ActionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  id?: string;
}

/**
 * Sync one course folder from TPStreams into local video_assets.
 */
export async function syncCourseFolderAssetsAction(
  formData: FormData,
): Promise<ActionResponse<TpFolderSyncResult>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const parsed = syncCourseFolderSchema.safeParse({
      master_course_id: formData.get('master_course_id'),
    });
    if (!parsed.success) {
      return { ok: false, error: 'A valid Master Course ID is required.' };
    }

    const result = await syncCourseVideoAssetsFromTpStreams(parsed.data.master_course_id);
    await syncModuleVideosToCourseLessons(parsed.data.master_course_id);
    return { ok: true, data: result };
  } catch (error) {
    logTpStreamsInternalError('sync-course-folder-action', error, {
      endpoint: '/video-assets/actions/sync',
      method: 'ACTION',
    });
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Sync one module folder from TPStreams into local video_assets.
 */
export async function syncModuleFolderAssetsAction(
  formData: FormData,
): Promise<ActionResponse<TpFolderSyncResult>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const parsed = syncModuleFolderSchema.safeParse({
      module_id: formData.get('module_id'),
    });
    if (!parsed.success) {
      return { ok: false, error: 'A valid Module ID is required.' };
    }

    const result = await syncModuleVideoAssetsFromTpStreams(parsed.data.module_id);
    if (result.master_course_id) {
      await syncModuleVideosToCourseLessons(result.master_course_id);
    }
    return { ok: true, data: result };
  } catch (error) {
    logTpStreamsInternalError('sync-module-folder-action', error, {
      endpoint: '/video-assets/actions/sync-module',
      method: 'ACTION',
    });
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Delete a video asset.
 */
export async function deleteVideoAssetAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const assetId = formData.get('asset_id') as string;
    if (!assetId) {
      return { ok: false, error: 'Asset ID is required' };
    }

    const result = await deleteVideoAssetSafely(assetId);

    return { ok: true, id: assetId, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Sync a single video asset's metadata from TPStreams.
 */
export async function syncVideoAssetAction(
  formData: FormData,
): Promise<ActionResponse<VideoAssetSyncResult>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const assetId = formData.get('asset_id') as string;
    if (!assetId) {
      return { ok: false, error: 'Asset ID is required' };
    }

    const result = await syncVideoAssetMetadata(assetId);

    // syncVideoAssetMetadata now auto-creates lesson items when
    // a video transitions to 'completed' status, so the video
    // immediately appears in college/student delivery stats.

    return { ok: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Sync all processing video assets.
 */
/**
 * Get a TPStreams uploader auth token for local uploads.
 */
export async function getTpUploaderTokenAction(): Promise<{
  ok: boolean;
  authToken?: string;
  orgId?: string;
  assetsCreateUrl?: string;
  error?: string;
}> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const orgId = getTpStreamsOrgId();
    const result = await getTpUploaderAuthToken(orgId);
    return { ok: true, authToken: result.token, orgId: result.organizationId };
  } catch (error) {
    logTpStreamsInternalError('get-uploader-token-action', error, {
      endpoint: '/video-assets/actions/uploader-token',
      method: 'ACTION',
    });
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Register a direct TPStreams upload into local video_assets.
 */
export async function registerDirectTpUploadAction(payload: {
  pillar_id?: string;
  bootcamp_id?: string;
  master_course_id: string;
  master_course_module_id?: string;
  tp_asset_id: string;
  title: string;
  description?: string;
  module_id?: string;
  sort_order?: number;
  content_protection_type?: 'drm' | 'aes' | 'disable';
}): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const input = registerDirectTpUploadSchema.parse(payload);
    const asset = await registerDirectTpUpload({
      ...input,
      created_by: authCheck.user.id,
    });

    // Create lesson item immediately + full scan in parallel
    await Promise.all([
      upsertLessonItemForVideoAsset(asset.id),
      syncModuleVideosToCourseLessons(input.master_course_id),
    ]);

    // Revalidate affected pages so UI reflects new content immediately.
    // Pillar courses revalidate the Pillar tree; bootcamp courses revalidate the
    // bootcamp course page (upload happens inline on that page, no separate
    // /tpstreams-upload or /modules/[id]/videos route).
    if (input.bootcamp_id) {
      revalidatePath(`/bootcamps/${input.bootcamp_id}/courses/${input.master_course_id}`);
    } else {
      revalidatePath(`/master-courses/${input.master_course_id}`);
      revalidatePath(`/master-courses/${input.master_course_id}/video-assets`);
      if (input.master_course_module_id) {
        revalidatePath(`/master-courses/${input.master_course_id}/modules/${input.master_course_module_id}/videos`);
      }
    }

    return { ok: true, id: asset.id };
  } catch (error) {
    logTpStreamsInternalError('register-direct-tp-upload-action', error, {
      endpoint: '/video-assets/actions/register-direct-upload',
      method: 'ACTION',
    });
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Retry TPStreams folder creation for a Master Course.
 */
export async function retryFolderCreationAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const courseId = formData.get('master_course_id') as string;
    if (!courseId) {
      return { ok: false, error: 'Master Course ID is required' };
    }

    const course = await retryFolderCreation(courseId);

    return { ok: true, data: course };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Update a video asset's title.
 */
export async function updateVideoAssetTitleAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const assetId = formData.get('asset_id') as string;
    const title = formData.get('title') as string;
    if (!assetId || !title) {
      return { ok: false, error: 'Asset ID and Title are required' };
    }

    const updated = await updateVideoAssetTitle(assetId, title);

    revalidatePath(`/master-courses/${updated.master_course_id}/video-assets`);
    if (updated.master_course_module_id) {
      revalidatePath(`/master-courses/${updated.master_course_id}/modules/${updated.master_course_module_id}/videos`);
    }

    return { ok: true, data: updated };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Update a video asset's title and description.
 */
export async function updateVideoAssetMetadataAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const assetId = formData.get('asset_id') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const sortOrderRaw = formData.get('sort_order');
    const sortOrder = sortOrderRaw !== null && sortOrderRaw !== '' ? Number(sortOrderRaw) : undefined;

    if (!assetId || !title) {
      return { ok: false, error: 'Asset ID and Title are required' };
    }
    if (sortOrder !== undefined) {
      if (Number.isNaN(sortOrder)) {
        return { ok: false, error: 'Sort order must be a valid number' };
      }
      if (!Number.isInteger(sortOrder) || sortOrder < 1) {
        return { ok: false, error: 'Sort order must be an integer greater than or equal to 1' };
      }
    }

    const updated = await updateVideoAssetMetadata(
      assetId,
      title,
      description,
      sortOrder,
    );

    revalidatePath(`/master-courses/${updated.master_course_id}/video-assets`);
    if (updated.master_course_module_id) {
      revalidatePath(`/master-courses/${updated.master_course_id}/modules/${updated.master_course_module_id}/videos`);
    }

    return { ok: true, data: updated };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}
