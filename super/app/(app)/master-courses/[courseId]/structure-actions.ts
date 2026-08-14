'use Phase 3';
'use server';

/**
 * Master Course Structure Actions
 *
 * Exposes server actions for SuperAdmin to manipulate modules and items.
 */

import {
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  createItem,
  updateItem,
  deleteItem,
  reorderItems,
} from '@/lib/services/master-course-structure';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import type { MasterCourseItemType, MasterCoursePublishStatus } from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────
// NOTE: Interfaces are non-async values and cannot be exported from 'use server' files.
// They are defined here for internal use only.

interface ActionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  id?: string;
}

// ─── Module Actions ───────────────────────────────────────────────────────────

export async function createModuleAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const master_course_id = formData.get('master_course_id') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const sort_order = formData.get('sort_order') ? parseInt(formData.get('sort_order') as string, 10) : undefined;
    const publish_status = (formData.get('publish_status') as MasterCoursePublishStatus) || 'draft';

    if (!master_course_id || !title) {
      return { ok: false, error: 'Course ID and Title are required' };
    }

    const newModule = await createModule({
      master_course_id,
      title,
      description: description || undefined,
      sort_order,
      publish_status,
    });

    return { ok: true, data: newModule, id: newModule.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateModuleAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const moduleId = formData.get('module_id') as string;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const publish_status = formData.get('publish_status') as MasterCoursePublishStatus | null;

    if (!moduleId) {
      return { ok: false, error: 'Module ID is required' };
    }

    const payload: Record<string, unknown> = {};
    if (title) payload.title = title;
    if (description !== null) payload.description = description;
    if (publish_status) payload.publish_status = publish_status;

    const updatedModule = await updateModule(moduleId, payload);

    return { ok: true, data: updatedModule };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteModuleAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const moduleId = formData.get('module_id') as string;
    if (!moduleId) return { ok: false, error: 'Module ID is required' };

    await deleteModule(moduleId);

    return { ok: true, id: moduleId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function reorderModulesAction(masterCourseId: string, moduleIds: string[]): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    if (!masterCourseId || !moduleIds || !Array.isArray(moduleIds)) {
      return { ok: false, error: 'Course ID and arrays of Module IDs are required' };
    }

    await reorderModules(masterCourseId, moduleIds);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Item Actions ─────────────────────────────────────────────────────────────

export async function createItemAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const master_course_id = formData.get('master_course_id') as string;
    const module_id = formData.get('module_id') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const item_type = formData.get('item_type') as MasterCourseItemType;
    const sort_order = formData.get('sort_order') ? parseInt(formData.get('sort_order') as string, 10) : undefined;
    const video_asset_id = formData.get('video_asset_id') as string | null;
    const metadataRaw = formData.get('metadata') as string | null;

    if (!master_course_id || !module_id || !title || !item_type) {
      return { ok: false, error: 'Course ID, Module ID, Title, and Type are required' };
    }

    const metadata = metadataRaw ? JSON.parse(metadataRaw) : undefined;

    const item = await createItem({
      master_course_id,
      module_id,
      title,
      description: description || undefined,
      item_type,
      sort_order,
      video_asset_id: video_asset_id || undefined,
      metadata,
    });

    return { ok: true, data: item, id: item.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateItemAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const itemId = formData.get('item_id') as string;
    if (!itemId) return { ok: false, error: 'Item ID is required' };

    const payload: Record<string, unknown> = {};
    if (formData.has('title')) payload.title = formData.get('title') as string;
    if (formData.has('description')) payload.description = formData.get('description') as string | null;
    if (formData.has('item_type')) payload.item_type = formData.get('item_type') as MasterCourseItemType;
    if (formData.has('video_asset_id')) payload.video_asset_id = (formData.get('video_asset_id') as string) || null;
    if (formData.has('quiz_id')) payload.quiz_id = (formData.get('quiz_id') as string) || null;
    if (formData.has('sort_order')) payload.sort_order = parseInt(formData.get('sort_order') as string, 10);
    if (formData.has('publish_status')) payload.publish_status = formData.get('publish_status') as MasterCoursePublishStatus;
    if (formData.has('metadata')) payload.metadata = JSON.parse(formData.get('metadata') as string);

    const item = await updateItem(itemId, payload);

    return { ok: true, data: item };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteItemAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const itemId = formData.get('item_id') as string;
    if (!itemId) return { ok: false, error: 'Item ID is required' };

    await deleteItem(itemId);

    return { ok: true, id: itemId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function reorderItemsAction(moduleId: string, itemIds: string[]): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    if (!moduleId || !itemIds || !Array.isArray(itemIds)) {
      return { ok: false, error: 'Module ID and array of Item IDs are required' };
    }

    await reorderItems(moduleId, itemIds);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Resource Uploads ─────────────────────────────────────────────────────────

export async function uploadCourseResourceAction(formData: FormData): Promise<ActionResponse<{ url: string; filepath: string }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const master_course_id = formData.get('master_course_id') as string;
    const file = formData.get('file') as File;

    if (!master_course_id || !file) {
      return { ok: false, error: 'Course ID and File are required' };
    }

    const { uploadCourseResource } = await import('@/lib/services/master-course-structure');
    const result = await uploadCourseResource(master_course_id, file);

    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
