'use server';

/**
 * Video Enhancements Server Actions (Phase 3).
 *
 * Server actions to trigger TPStreams specific administrative actions
 * like generating subtitles, trimming, and uploading custom thumbnails.
 */

import { revalidatePath } from 'next/cache';
import {
  generateAssetSubtitle,
  uploadAssetSubtitle,
  uploadAssetThumbnail,
  trimVideoAsset,
  revertVideoAssetTrim,
  getVideoAssetTrimStatus,
  listAssetChapters,
  addAssetChapters,
  deleteAssetChapter,
  getVideoAssetById,
} from '@/lib/services/video-assets';
import { requireAuth } from '@/lib/auth/require-superadmin-action';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function generateSubtitleAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const assetId = formData.get('asset_id') as string;
    if (!assetId) return { ok: false, error: 'Asset ID is required' };

    const result = await generateAssetSubtitle(assetId);
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function uploadSubtitleAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const assetId = formData.get('asset_id') as string;
    const file = formData.get('file') as File;
    const name = formData.get('name') as string | undefined;
    const language = formData.get('language') as string | undefined;
    
    if (!assetId || !file) {
      return { ok: false, error: 'Asset ID and File are required' };
    }

    await uploadAssetSubtitle(assetId, file, { name, language });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function uploadThumbnailAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const assetId = formData.get('asset_id') as string;
    const file = formData.get('file') as File;
    
    if (!assetId || !file) {
      return { ok: false, error: 'Asset ID and File are required' };
    }

    if (file.size > 2 * 1024 * 1024) {
      return { ok: false, error: 'Thumbnail must be less than 2MB' };
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return { ok: false, error: 'Thumbnail must be PNG, JPEG, or WebP' };
    }

    const result = await uploadAssetThumbnail(assetId, file);

    const asset = await getVideoAssetById(assetId);
    if (asset?.master_course_id) {
      revalidatePath(`/master-courses/${asset.master_course_id}`);
      revalidatePath('/bootcamps');
    }

    return {
      ok: true,
      data: {
        id: result.asset.id,
        thumbnail_url: result.metadata.thumbnail_url,
        processing_status: result.metadata.processing_status,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function trimVideoAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const assetId = formData.get('asset_id') as string;
    const startTimeRaw = formData.get('start_time');
    const endTimeRaw = formData.get('end_time');

    if (!assetId) return { ok: false, error: 'Asset ID is required' };
    
    const start_time = startTimeRaw ? parseFloat(startTimeRaw as string) : undefined;
    const end_time = endTimeRaw ? parseFloat(endTimeRaw as string) : undefined;

    await trimVideoAsset(assetId, { start_time, end_time });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getTrimStatusAction(assetId: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    if (!assetId) return { ok: false, error: 'Asset ID is required' };

    const status = await getVideoAssetTrimStatus(assetId);
    return { ok: true, data: status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function revertTrimAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const assetId = formData.get('asset_id') as string;
    if (!assetId) return { ok: false, error: 'Asset ID is required' };

    await revertVideoAssetTrim(assetId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function listChaptersAction(assetId: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    if (!assetId) return { ok: false, error: 'Asset ID is required' };
    const result = await listAssetChapters(assetId);
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function addChaptersAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const assetId = formData.get('asset_id') as string;
    const chaptersStr = formData.get('chapters') as string;

    if (!assetId || !chaptersStr) {
      return { ok: false, error: 'Asset ID and chapters array are required' };
    }

    const chapters = JSON.parse(chaptersStr);
    await addAssetChapters(assetId, chapters);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteChapterAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const assetId = formData.get('asset_id') as string;
    const chapterId = formData.get('chapter_id') as string;

    if (!assetId || !chapterId) {
      return { ok: false, error: 'Asset ID and Chapter ID are required' };
    }

    await deleteAssetChapter(assetId, parseInt(chapterId, 10));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
