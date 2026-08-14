'use server';

/**
 * Course Resources Server Actions
 *
 * SuperAdmin actions for managing course resources (Markdown notes, PDFs, external links).
 * All mutations are server-side with auth guards.
 */

import { requireAuth } from '@/lib/auth/require-superadmin-action';
import {
  createResource,
  updateResource,
  deleteResource,
  getCourseResourcesForAdmin,
  uploadPdfResource,
  uploadMarkdownFileResource,
  attachResourceToLesson,
  linkExistingResourceToLesson,
  createStandaloneModuleResource,
  promoteResourceToCurriculum,
  relocateCurriculumResource,
  reorderModuleResources,
  getResourceSignedUrl,
  listLessonAttachedResources,
  type ResourcePlacement,
} from '@/lib/services/course-resources';
import type { CourseResourceFileType } from '@/types/database';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  id?: string;
}

// ─── Read Actions ────────────────────────────────────────────────────────────

export async function getCourseResourcesAction(
  masterCourseId: string,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const resources = await getCourseResourcesForAdmin(masterCourseId);
    return { ok: true, data: resources };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function _listLessonResourcesAction(
  courseId: string,
  parentItemId: string,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const resources = await listLessonAttachedResources(courseId, parentItemId);
    return { ok: true, data: resources };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getResourceSignedUrlAction(
  storagePath: string,
): Promise<ActionResponse<{ signedUrl: string }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const signedUrl = await getResourceSignedUrl(storagePath);
    if (!signedUrl) return { ok: false, error: 'Failed to generate signed URL' };
    return { ok: true, data: { signedUrl } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Create Actions ──────────────────────────────────────────────────────────

export async function createMarkdownResourceAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const master_course_id = formData.get('master_course_id') as string;
    const module_id = formData.get('module_id') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const content_markdown = formData.get('content_markdown') as string;
    const parent_item_id = formData.get('parent_item_id') as string | null;

    if (!master_course_id || !module_id || !title) {
      return { ok: false, error: 'Course ID, Module ID, and Title are required' };
    }

    const resource = await createResource({
      master_course_id,
      module_id,
      parent_item_id: parent_item_id || null,
      resource_scope: parent_item_id ? 'lesson_attachment' : 'module_item',
      resource_type: 'markdown',
      title,
      description,
      content_markdown,
      created_by: authCheck.user.id,
    });

    return { ok: true, data: resource, id: resource.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function uploadPdfResourceAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const master_course_id = formData.get('master_course_id') as string;
    const module_id = formData.get('module_id') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const parent_item_id = formData.get('parent_item_id') as string | null;
    const file = formData.get('file') as File;

    if (!master_course_id || !module_id || !title || !file) {
      return { ok: false, error: 'Course ID, Module ID, Title, and File are required' };
    }

    const upload = await uploadPdfResource(master_course_id, module_id, file);

    const resource = await createResource({
      master_course_id,
      module_id,
      parent_item_id: parent_item_id || null,
      resource_scope: parent_item_id ? 'lesson_attachment' : 'module_item',
      resource_type: 'pdf',
      title,
      description,
      storage_bucket: 'course_resources',
      storage_path: upload.storagePath,
      original_filename: file.name,
      mime_type: upload.mimeType,
      size_bytes: upload.sizeBytes,
      created_by: authCheck.user.id,
    });

    return { ok: true, data: resource, id: resource.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function uploadMarkdownFileAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const master_course_id = formData.get('master_course_id') as string;
    const module_id = formData.get('module_id') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const parent_item_id = formData.get('parent_item_id') as string | null;
    const file = formData.get('file') as File;

    if (!master_course_id || !module_id || !title || !file) {
      return { ok: false, error: 'Course ID, Module ID, Title, and File are required' };
    }

    const upload = await uploadMarkdownFileResource(master_course_id, module_id, file);

    const resource = await createResource({
      master_course_id,
      module_id,
      parent_item_id: parent_item_id || null,
      resource_scope: parent_item_id ? 'lesson_attachment' : 'module_item',
      resource_type: 'markdown',
      title,
      description,
      content_markdown: upload.contentMarkdown,
      storage_bucket: 'course_resources',
      storage_path: upload.storagePath,
      original_filename: file.name,
      mime_type: upload.mimeType,
      size_bytes: upload.sizeBytes,
      created_by: authCheck.user.id,
    });

    return { ok: true, data: resource, id: resource.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Attach to Lesson ────────────────────────────────────────────────────────

async function _attachResourceToLessonAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const master_course_id = formData.get('master_course_id') as string;
    const module_id = formData.get('module_id') as string;
    const parent_item_id = formData.get('parent_item_id') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const content_markdown = formData.get('content_markdown') as string | null;
    const resource_type = formData.get('resource_type') as CourseResourceFileType;

    if (!master_course_id || !module_id || !parent_item_id || !title || !resource_type) {
      return { ok: false, error: 'Missing required fields' };
    }

    const resource = await attachResourceToLesson({
      master_course_id,
      module_id,
      parent_item_id,
      resource_type,
      title,
      description,
      content_markdown,
      resource_scope: 'lesson_attachment',
      created_by: authCheck.user.id,
    });

    return { ok: true, data: resource, id: resource.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function linkExistingResourceToLessonAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const resource_id = formData.get('resource_id') as string;
    const item_id = formData.get('item_id') as string;

    if (!resource_id || !item_id) {
      return { ok: false, error: 'resource_id and item_id are required' };
    }

    const resource = await linkExistingResourceToLesson(resource_id, item_id);
    return { ok: true, data: resource };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function unattachResourceAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const resource_id = formData.get('resource_id') as string;
    if (!resource_id) {
      return { ok: false, error: 'resource_id is required' };
    }

    const { unattachResource } = await import('@/lib/services/course-resources');
    await unattachResource(resource_id);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Standalone Module Resource ──────────────────────────────────────────────

export async function createStandaloneResourceAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const master_course_id = formData.get('master_course_id') as string;
    const module_id = formData.get('module_id') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const resource_type = formData.get('resource_type') as CourseResourceFileType;
    const content_markdown = formData.get('content_markdown') as string | null;
    const external_url = formData.get('external_url') as string | null;
    const placementRaw = formData.get('placement') as string;

    if (!master_course_id || !module_id || !title || !resource_type) {
      return { ok: false, error: 'Missing required fields' };
    }

    let placement: ResourcePlacement;
    if (placementRaw === 'end') {
      placement = { position: 'end' };
    } else {
      const reference_item_id = formData.get('reference_item_id') as string;
      if (!reference_item_id) {
        return { ok: false, error: 'Reference item ID is required for before/after placement' };
      }
      placement = {
        position: placementRaw as 'before' | 'after',
        reference_item_id,
      };
    }

    const result = await createStandaloneModuleResource(
      {
        master_course_id,
        module_id,
        resource_type,
        title,
        description,
        content_markdown,
        external_url,
        resource_scope: 'module_item',
        created_by: authCheck.user.id,
      },
      placement,
    );

    return { ok: true, data: result, id: result.resource.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Promote Resource to Curriculum Item ────────────────────────────────────

export async function promoteResourceToCurriculumAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const resource_id = formData.get('resource_id') as string;
    const placementRaw = formData.get('placement') as string;

    if (!resource_id || !placementRaw) {
      return { ok: false, error: 'resource_id and placement are required' };
    }

    let placement: ResourcePlacement;
    if (placementRaw === 'end') {
      placement = { position: 'end' };
    } else {
      const reference_item_id = formData.get('reference_item_id') as string;
      if (!reference_item_id) {
        return { ok: false, error: 'Reference item ID is required for before/after placement' };
      }
      placement = {
        position: placementRaw as 'before' | 'after',
        reference_item_id,
      };
    }

    const result = await promoteResourceToCurriculum(resource_id, placement);
    return { ok: true, data: result, id: result.resource.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function relocateCurriculumResourceAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const resource_id = formData.get('resource_id') as string;
    const placementRaw = formData.get('placement') as string;

    if (!resource_id || !placementRaw) {
      return { ok: false, error: 'resource_id and placement are required' };
    }

    let placement: ResourcePlacement;
    if (placementRaw === 'end') {
      placement = { position: 'end' };
    } else {
      const reference_item_id = formData.get('reference_item_id') as string;
      if (!reference_item_id) {
        return { ok: false, error: 'Reference item ID is required for before/after placement' };
      }
      placement = {
        position: placementRaw as 'before' | 'after',
        reference_item_id,
      };
    }

    const result = await relocateCurriculumResource(resource_id, placement);
    return { ok: true, data: result, id: result.itemId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Update / Delete ─────────────────────────────────────────────────────────

export async function updateResourceAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const resource_id = formData.get('resource_id') as string;
    if (!resource_id) return { ok: false, error: 'Resource ID is required' };

    const updates: Record<string, unknown> = {};
    if (formData.has('title')) updates.title = formData.get('title');
    if (formData.has('description')) updates.description = formData.get('description');
    if (formData.has('content_markdown')) updates.content_markdown = formData.get('content_markdown');
    if (formData.has('external_url')) updates.external_url = formData.get('external_url');
    if (formData.has('publish_status')) updates.publish_status = formData.get('publish_status');
    if (formData.has('visible_to_students')) updates.visible_to_students = formData.get('visible_to_students') === 'true';
    if (formData.has('is_downloadable')) updates.is_downloadable = formData.get('is_downloadable') === 'true';

    const resource = await updateResource(resource_id, updates as Parameters<typeof updateResource>[1]);
    return { ok: true, data: resource };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteResourceAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const resource_id = formData.get('resource_id') as string;
    if (!resource_id) return { ok: false, error: 'Resource ID is required' };

    await deleteResource(resource_id);
    return { ok: true, id: resource_id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Reorder ─────────────────────────────────────────────────────────────────

async function _reorderModuleResourcesAction(
  moduleId: string,
  resourceIds: string[],
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    if (!moduleId || !resourceIds || !Array.isArray(resourceIds)) {
      return { ok: false, error: 'Module ID and resource IDs are required' };
    }

    await reorderModuleResources(moduleId, resourceIds);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
