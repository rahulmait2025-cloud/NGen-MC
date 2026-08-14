'use server';

/**
 * Notes Library Server Actions
 *
 * SuperAdmin actions for managing note collections, modules, pages,
 * course links, and course resource sections/items.
 */

import { requireAuth } from '@/lib/auth/require-superadmin-action';
import {
  listNoteCollections,
  getNoteCollectionById,
  createNoteCollection,
  updateNoteCollection,
  archiveNoteCollection,
  unarchiveNoteCollection,
  deleteNoteCollection,
  listNoteModules,
  createNoteModule,
  updateNoteModule,
  deleteNoteModule,
  reorderNoteModules,
  listNotePages,
  createNotePage,
  reorderNotePages,
  getNotePageSignedUrl,
  uploadNotePageImage,
  listNoteCourseLinks,
  listNoteCourseLinksByCourseId,
  upsertNoteCourseLink,
  deleteNoteCourseLink,
  deleteNoteResourceItemForScope,
  listCourseResourceSections,
  getCourseResourceSectionById,
  getCourseResourceItemById,
  createCourseResourceSection,
  updateCourseResourceSection,
  deleteCourseResourceSection,
  reorderCourseResourceSections,
  listCourseResourceItems,
  createCourseResourceItem,
  updateCourseResourceItem,
  deleteCourseResourceItem,
  reorderCourseResourceItems,
  listMasterCoursesForSelector,
  findOrCreateResourceSectionForNote,
  createNoteResourceItem,
  validateCourseScopeIds,
  listExcalidrawResourcesByCourseId,
  createExcalidrawResourceItem,
  updateExcalidrawResourceItem,
  deleteExcalidrawResourceItem,
  publishCourseLinkedResources,
  unpublishCourseLinkedResources,
  getNoteDeletePreview,
  deleteNoteCollectionDeep,
} from '@/lib/services/notes';
import { getCourseCurriculum } from '@/lib/services/master-course-structure';
import {
  createNoteCollectionSchema,
  createNoteModuleSchema,
  createCourseResourceSectionSchema,
  createCourseResourceItemSchema,
} from '@/lib/validation/notes';
import { revalidatePath } from 'next/cache';

interface ActionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  id?: string;
  defaultModuleId?: string | null;
}

// ─── Note Collections ───────────────────────────────────────────────

export async function listNoteCollectionsAction(): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const data = await listNoteCollections();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to list note collections' };
  }
}

export async function getNoteCollectionAction(id: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const data = await getNoteCollectionById(id);
    if (!data) return { ok: false, error: 'Note collection not found' };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to get note collection' };
  }
}

export async function createNoteCollectionAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const title = formData.get('title') as string;
  const slug = formData.get('slug') as string;
  const short_description = formData.get('short_description') as string | null;
  const description_md = formData.get('description_md') as string | null;
  const cover_image_path = formData.get('cover_image_path') as string | null;
  const publish_status = formData.get('publish_status') as string | null;
  const pricing_model = formData.get('pricing_model') as string | null;
  const price_minor = formData.get('price_minor') as string | null;
  const currency = formData.get('currency') as string | null;
  const validity_days = formData.get('validity_days') as string | null;
  const source_master_course_id = formData.get('source_master_course_id') as string | null;
  const source_type = formData.get('source_type') as string | null;
  const catalog_visibility = formData.get('catalog_visibility') as string | null;
  const visibility_scope = formData.get('visibility_scope') as string | null;

  // Course-link fields (submitted when source_type = 'course_linked')
  const courseId = formData.get('course_id') as string | null;
  const moduleId = formData.get('module_id') as string | null;
  const itemId = formData.get('item_id') as string | null;

  const parsed = createNoteCollectionSchema.safeParse({
    title,
    slug,
    short_description: short_description || undefined,
    description_md: description_md || undefined,
    cover_image_path: cover_image_path || undefined,
    publish_status: publish_status || undefined,
    pricing_model: pricing_model || undefined,
    price_minor: price_minor ? Number(price_minor) : undefined,
    currency: currency || undefined,
    validity_days: validity_days ? Number(validity_days) : undefined,
    source_master_course_id: source_master_course_id || undefined,
    source_type: source_type || undefined,
    catalog_visibility: catalog_visibility || undefined,
    visibility_scope: visibility_scope || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  try {
    const data = await createNoteCollection({
      ...parsed.data,
      created_by: authCheck.user.id,
    });

    // If course-linked, validate relationships and create course link + resource integration
    if (parsed.data.source_type === 'course_linked' && courseId) {
      // Server-side validation: verify module belongs to course, item belongs to course/module
      const validationError = await validateCourseScopeIds(courseId, moduleId, itemId);
      if (validationError) {
        return { ok: false, error: validationError };
      }

      // Create the course link
      await upsertNoteCourseLink({
        note_collection_id: data.id,
        course_id: courseId,
        module_id: moduleId || null,
        item_id: itemId || null,
        auto_unlock_with_course: true,
      });

      // Create or reuse course resource section + item for the note
      try {
        const section = await findOrCreateResourceSectionForNote(courseId, moduleId, itemId);
        await createNoteResourceItem(section.id, data.id, data.title);
      } catch {
        // Resource integration is best-effort; don't fail the whole creation
      }
    }

    revalidatePath('/notes');
    return { ok: true, data, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create note collection' };
  }
}

export async function updateNoteCollectionAction(
  id: string,
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const updates: Record<string, unknown> = {};

  const title = formData.get('title');
  if (title !== null) updates.title = title;

  const slug = formData.get('slug');
  if (slug !== null) updates.slug = slug;

  const short_description = formData.get('short_description');
  if (short_description !== null) updates.short_description = short_description;

  const description_md = formData.get('description_md');
  if (description_md !== null) updates.description_md = description_md;

  const cover_image_path = formData.get('cover_image_path');
  if (cover_image_path !== null) updates.cover_image_path = cover_image_path;

  const publish_status = formData.get('publish_status');
  if (publish_status !== null) updates.publish_status = publish_status;

  const pricing_model = formData.get('pricing_model');
  if (pricing_model !== null) updates.pricing_model = pricing_model;

  const price_minor = formData.get('price_minor');
  if (price_minor !== null) updates.price_minor = price_minor === '' ? null : Number(price_minor);

  const currency = formData.get('currency');
  if (currency !== null) updates.currency = currency;

  const validity_days = formData.get('validity_days');
  if (validity_days !== null)
    updates.validity_days = validity_days === '' ? null : Number(validity_days);

  const source_master_course_id = formData.get('source_master_course_id');
  if (source_master_course_id !== null) updates.source_master_course_id = source_master_course_id;

  const visibility_scope = formData.get('visibility_scope');
  if (visibility_scope !== null) updates.visibility_scope = visibility_scope;

  const source_type = formData.get('source_type');
  if (source_type !== null) updates.source_type = source_type;

  const catalog_visibility = formData.get('catalog_visibility');
  if (catalog_visibility !== null) updates.catalog_visibility = catalog_visibility;

  try {
    const data = await updateNoteCollection(id, updates);
    revalidatePath('/notes');
    revalidatePath(`/notes/${id}/edit`);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to update note collection' };
  }
}

export async function archiveNoteCollectionAction(id: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    await archiveNoteCollection(id);
    revalidatePath('/notes');
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to archive note collection' };
  }
}

export async function unarchiveNoteCollectionAction(id: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    await unarchiveNoteCollection(id);
    revalidatePath('/notes');
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to unarchive note collection',
    };
  }
}

export async function deleteNoteCollectionAction(id: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    await deleteNoteCollection(id);
    revalidatePath('/notes');
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to delete note collection',
    };
  }
}

// ─── Note Modules ───────────────────────────────────────────────────

export async function listNoteModulesAction(collectionId: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const data = await listNoteModules(collectionId);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to list note modules' };
  }
}

export async function createNoteModuleAction(
  collectionId: string,
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const title = formData.get('title') as string;
  const slug = formData.get('slug') as string;
  const description_md = formData.get('description_md') as string | null;
  const sort_order = formData.get('sort_order') as string | null;
  const is_published = formData.get('is_published') as string | null;

  const parsed = createNoteModuleSchema.safeParse({
    note_collection_id: collectionId,
    title,
    slug,
    description_md: description_md || undefined,
    sort_order: sort_order ? Number(sort_order) : undefined,
    is_published: is_published !== null ? is_published !== 'false' : undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  try {
    const data = await createNoteModule(parsed.data);
    return { ok: true, data, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create note module' };
  }
}

export async function updateNoteModuleAction(
  id: string,
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const updates: Record<string, unknown> = {};

  const title = formData.get('title');
  if (title !== null) updates.title = title;

  const slug = formData.get('slug');
  if (slug !== null) updates.slug = slug;

  const description_md = formData.get('description_md');
  if (description_md !== null) updates.description_md = description_md;

  const sort_order = formData.get('sort_order');
  if (sort_order !== null) updates.sort_order = Number(sort_order);

  const is_published = formData.get('is_published');
  if (is_published !== null) updates.is_published = is_published !== 'false';

  try {
    const data = await updateNoteModule(id, updates);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to update note module' };
  }
}

export async function deleteNoteModuleAction(id: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    await deleteNoteModule(id);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to delete note module' };
  }
}

export async function reorderNoteModulesAction(
  collectionId: string,
  moduleIds: string[],
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    await reorderNoteModules(moduleIds);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to reorder note modules' };
  }
}

// ─── Note Pages ─────────────────────────────────────────────────────

export async function listNotePagesAction(moduleId: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const data = await listNotePages(moduleId);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to list note pages' };
  }
}

export async function createNotePageAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const noteModuleId = formData.get('note_module_id') as string;
  const collectionId = formData.get('collection_id') as string;
  const file = formData.get('file') as File;
  const title = formData.get('title') as string | null;
  const altText = formData.get('alt_text') as string | null;
  const sortOrder = formData.get('sort_order') as string | null;

  if (!noteModuleId || !collectionId || !file) {
    return { ok: false, error: 'note_module_id, collection_id, and file are required' };
  }

  try {
    const uploadResult = await uploadNotePageImage(collectionId, noteModuleId, file);
    const data = await createNotePage({
      note_module_id: noteModuleId,
      title: title || file.name || null,
      image_path: uploadResult.storagePath,
      image_mime: uploadResult.mimeType,
      file_size_bytes: uploadResult.sizeBytes,
      alt_text: altText || null,
      sort_order: sortOrder ? Number(sortOrder) : 0,
    });
    return { ok: true, data, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create note page' };
  }
}

export async function deleteNotePageAction(
  id: string,
  storagePath: string,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const { deleteNotePage: deleteNotePageFn, deleteNotePageImage: deleteNotePageImageFn } =
      await import('@/lib/services/notes');
    await deleteNotePageFn(id);
    if (storagePath) {
      await deleteNotePageImageFn(storagePath);
    }
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to delete note page' };
  }
}

export async function reorderNotePagesAction(
  moduleId: string,
  pageIds: string[],
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    await reorderNotePages(pageIds);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to reorder note pages' };
  }
}

export async function getNotePageSignedUrlAction(
  storagePath: string,
): Promise<ActionResponse<{ signedUrl: string }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const signedUrl = await getNotePageSignedUrl(storagePath);
    if (!signedUrl) {
      return { ok: false, error: 'Failed to generate signed URL' };
    }
    return { ok: true, data: { signedUrl } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to get signed URL',
    };
  }
}

// ─── Note Course Links ──────────────────────────────────────────────

export async function listNoteCourseLinksAction(
  noteCollectionId: string,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const data = await listNoteCourseLinks(noteCollectionId);
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to list note course links',
    };
  }
}

export async function upsertNoteCourseLinkAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const note_collection_id = formData.get('note_collection_id') as string;
  const course_id = formData.get('course_id') as string;
  const module_id = formData.get('module_id') as string | null;
  const item_id = formData.get('item_id') as string | null;
  const sort_order = formData.get('sort_order') as string | null;
  const auto_unlock = formData.get('auto_unlock_with_course') as string | null;

  if (!note_collection_id || !course_id) {
    return { ok: false, error: 'note_collection_id and course_id are required' };
  }

  // Server-side validation of course/module/item relationships
  const validationError = await validateCourseScopeIds(
    course_id,
    module_id || undefined,
    item_id || undefined,
  );
  if (validationError) {
    return { ok: false, error: validationError };
  }

  try {
    const data = await upsertNoteCourseLink({
      note_collection_id,
      course_id,
      module_id: module_id || null,
      item_id: item_id || null,
      auto_unlock_with_course: auto_unlock !== null ? auto_unlock !== 'false' : true,
      sort_order: sort_order ? Number(sort_order) : 0,
    });

    // Create course resource section + item for the note
    try {
      const section = await findOrCreateResourceSectionForNote(
        course_id,
        module_id || null,
        item_id || null,
      );
      // Fetch note title for the resource item
      const note = await getNoteCollectionById(note_collection_id);
      await createNoteResourceItem(section.id, note_collection_id, note?.title ?? 'Note');
    } catch {
      // Resource integration is best-effort
    }

    revalidatePath('/notes');
    revalidatePath('/master-courses');
    return { ok: true, data, id: data.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to upsert note course link',
    };
  }
}

export async function deleteNoteCourseLinkAction(id: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    await deleteNoteCourseLink(id);
    revalidatePath('/notes');
    revalidatePath('/master-courses');
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to delete note course link',
    };
  }
}

// ─── Course Resource Sections ───────────────────────────────────────

export async function listCourseResourceSectionsAction(
  courseId: string,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    // Convert global sentinel to null for the query
    const effectiveCourseId = courseId === '00000000-0000-0000-0000-000000000000' ? null : courseId;
    const data = await listCourseResourceSections(effectiveCourseId);
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to list course resource sections',
    };
  }
}

export async function createCourseResourceSectionAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const course_id = formData.get('course_id') as string | null;
  const title = formData.get('title') as string;
  const icon = formData.get('icon') as string | null;
  const sort_order = formData.get('sort_order') as string | null;
  const is_visible = formData.get('is_visible') as string | null;
  const visibility = formData.get('visibility') as string | null;

  const effectiveVisibility = visibility || 'per_course';
  const effectiveCourseId = effectiveVisibility === 'global'
    ? null
    : (course_id && course_id !== '00000000-0000-0000-0000-000000000000' && course_id !== '' ? course_id : null);

  const parsed = createCourseResourceSectionSchema.safeParse({
    course_id: effectiveCourseId || undefined,
    title,
    icon: icon || undefined,
    sort_order: sort_order ? Number(sort_order) : undefined,
    is_visible: is_visible !== null ? is_visible !== 'false' : undefined,
    visibility: effectiveVisibility,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  try {
    const data = await createCourseResourceSection({
      ...parsed.data,
      course_id: parsed.data.course_id ?? null,
    });
    revalidatePath('/master-courses');
    return { ok: true, data, id: data.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to create course resource section',
    };
  }
}

export async function updateCourseResourceSectionAction(
  id: string,
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const updates: Record<string, unknown> = {};

  const title = formData.get('title');
  if (title !== null) updates.title = title;

  const icon = formData.get('icon');
  if (icon !== null) updates.icon = icon;

  const sort_order = formData.get('sort_order');
  if (sort_order !== null) updates.sort_order = Number(sort_order);

  const is_visible = formData.get('is_visible');
  if (is_visible !== null) updates.is_visible = is_visible !== 'false';

  try {
    const data = await updateCourseResourceSection(id, updates);
    revalidatePath('/master-courses');
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to update course resource section',
    };
  }
}

export async function deleteCourseResourceSectionAction(id: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    await deleteCourseResourceSection(id);
    revalidatePath('/master-courses');
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to delete course resource section',
    };
  }
}

export async function reorderCourseResourceSectionsAction(
  courseId: string,
  sectionIds: string[],
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    await reorderCourseResourceSections(sectionIds);
    revalidatePath('/master-courses');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to reorder course resource sections',
    };
  }
}

// ─── Course Resource Items ──────────────────────────────────────────

export async function listCourseResourceItemsAction(
  sectionId: string,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const data = await listCourseResourceItems(sectionId);
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to list course resource items',
    };
  }
}

export async function createCourseResourceItemAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const section_id = formData.get('section_id') as string;
  const kind = formData.get('kind') as string;
  const title = formData.get('title') as string;
  const subtitle = formData.get('subtitle') as string | null;
  const icon = formData.get('icon') as string | null;
  const external_url = formData.get('external_url') as string | null;
  const note_collection_id = formData.get('note_collection_id') as string | null;
  const file_path = formData.get('file_path') as string | null;
  const markdown_body = formData.get('markdown_body') as string | null;
  const excalidraw_url = formData.get('excalidraw_url') as string | null;
  const open_in_new_tab = formData.get('open_in_new_tab') as string | null;
  const sort_order = formData.get('sort_order') as string | null;
  const is_visible = formData.get('is_visible') as string | null;

  const parsed = createCourseResourceItemSchema.safeParse({
    section_id,
    kind,
    title,
    subtitle: subtitle || undefined,
    icon: icon || undefined,
    external_url: external_url || undefined,
    note_collection_id: note_collection_id || undefined,
    file_path: file_path || undefined,
    markdown_body: markdown_body || undefined,
    excalidraw_url: excalidraw_url || undefined,
    open_in_new_tab: open_in_new_tab !== null ? open_in_new_tab !== 'false' : undefined,
    sort_order: sort_order ? Number(sort_order) : undefined,
    is_visible: is_visible !== null ? is_visible !== 'false' : undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  try {
    // For note_collection kind, ensure note_course_links exists before creating the item
    if (parsed.data.kind === 'note_collection') {
      if (!parsed.data.note_collection_id) {
        return { ok: false, error: 'note_collection_id is required for note collection resources' };
      }

      const section = await getCourseResourceSectionById(section_id);
      // Only create course link for per_course sections (global sections have no course_id)
      if (section?.course_id && section.visibility !== 'global') {
        try {
          await upsertNoteCourseLink({
            note_collection_id: parsed.data.note_collection_id,
            course_id: section.course_id,
            auto_unlock_with_course: true,
          });
        } catch (linkErr) {
          return {
            ok: false,
            error: `Failed to link note collection to course: ${linkErr instanceof Error ? linkErr.message : String(linkErr)}`,
          };
        }
      }
    }

    const data = await createCourseResourceItem(parsed.data);
    revalidatePath('/master-courses');
    return { ok: true, data, id: data.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to create course resource item',
    };
  }
}

export async function updateCourseResourceItemAction(
  id: string,
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const updates: Record<string, unknown> = {};

  const kind = formData.get('kind');
  if (kind !== null) updates.kind = kind;

  const title = formData.get('title');
  if (title !== null) updates.title = title;

  const subtitle = formData.get('subtitle');
  if (subtitle !== null) updates.subtitle = subtitle;

  const icon = formData.get('icon');
  if (icon !== null) updates.icon = icon;

  const external_url = formData.get('external_url');
  if (external_url !== null) updates.external_url = external_url;

  const note_collection_id = formData.get('note_collection_id');
  if (note_collection_id !== null) updates.note_collection_id = note_collection_id;

  const file_path = formData.get('file_path');
  if (file_path !== null) updates.file_path = file_path;

  const markdown_body = formData.get('markdown_body');
  if (markdown_body !== null) updates.markdown_body = markdown_body;

  const excalidraw_url = formData.get('excalidraw_url');
  if (excalidraw_url !== null) updates.excalidraw_url = excalidraw_url;

  const open_in_new_tab = formData.get('open_in_new_tab');
  if (open_in_new_tab !== null) updates.open_in_new_tab = open_in_new_tab !== 'false';

  const sort_order = formData.get('sort_order');
  if (sort_order !== null) updates.sort_order = Number(sort_order);

  const is_visible = formData.get('is_visible');
  if (is_visible !== null) updates.is_visible = is_visible !== 'false';

  try {
    // For note_collection kind, ensure note_course_links exists before updating
    const effectiveKind = updates.kind as string | undefined;
    const effectiveNoteCollectionId = updates.note_collection_id as string | undefined;

    if (effectiveKind === 'note_collection' || effectiveNoteCollectionId) {
      // Look up the current item to determine effective kind and note_collection_id
      const existingItem = await getCourseResourceItemById(id);
      if (!existingItem) {
        return { ok: false, error: 'Resource item not found' };
      }

      const finalKind = effectiveKind ?? existingItem.kind;
      const finalNoteCollectionId = effectiveNoteCollectionId ?? existingItem.note_collection_id;

      if (finalKind === 'note_collection') {
        if (!finalNoteCollectionId) {
          return { ok: false, error: 'note_collection_id is required for note collection resources' };
        }

        // Look up the section to get the course_id
        const section = await getCourseResourceSectionById(existingItem.section_id);
        // Only create course link for per_course sections (global sections have no course_id)
        if (section?.course_id && section.visibility !== 'global') {
          try {
            await upsertNoteCourseLink({
              note_collection_id: finalNoteCollectionId,
              course_id: section.course_id,
              auto_unlock_with_course: true,
            });
          } catch (linkErr) {
            return {
              ok: false,
              error: `Failed to link note collection to course: ${linkErr instanceof Error ? linkErr.message : String(linkErr)}`,
            };
          }
        }
      }
    }

    const data = await updateCourseResourceItem(id, updates);
    revalidatePath('/master-courses');
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to update course resource item',
    };
  }
}

export async function deleteCourseResourceItemAction(id: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    await deleteCourseResourceItem(id);
    revalidatePath('/master-courses');
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to delete course resource item',
    };
  }
}

export async function reorderCourseResourceItemsAction(
  sectionId: string,
  itemIds: string[],
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    await reorderCourseResourceItems(itemIds);
    revalidatePath('/master-courses');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to reorder course resource items',
    };
  }
}

// ─── Utility ────────────────────────────────────────────────────────

export async function listMasterCoursesForSelectorAction(): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const data = await listMasterCoursesForSelector();
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to list master courses',
    };
  }
}

export async function getCourseCurriculumAction(
  courseId: string,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const data = await getCourseCurriculum(courseId);
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to fetch course curriculum',
    };
  }
}

// ─── Course-Linked Notes Manager ──────────────────────────────────────────

/**
 * Fetch all note course links for a given course, returning a map of
 * item_id -> linked note info for use in the Course Curriculum Notes Manager.
 */
export async function getCourseLinkedNotesMapAction(
  courseId: string,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const data = await listNoteCourseLinksByCourseId(courseId);
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to fetch linked notes map',
    };
  }
}

/**
 * Create a new note collection and link it to a specific course item (video).
 * Also creates the corresponding course_resource_sections/items for LMS integration.
 */
export async function createAndLinkVideoNoteAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const title = formData.get('title') as string;
  const slug = formData.get('slug') as string;
  const shortDescription = formData.get('short_description') as string | null;
  const courseId = formData.get('course_id') as string;
  const moduleId = formData.get('module_id') as string;
  const itemId = formData.get('item_id') as string;

  if (!title || !slug || !courseId || !moduleId || !itemId) {
    return { ok: false, error: 'title, slug, course_id, module_id, and item_id are required' };
  }

  // Server-side validation: verify relationships
  const validationError = await validateCourseScopeIds(courseId, moduleId, itemId);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  try {
    // 1. Create note_collection
    const noteCollection = await createNoteCollection({
      title,
      slug,
      short_description: shortDescription || undefined,
      source_type: 'course_linked',
      catalog_visibility: 'hidden_course_attached',
      publish_status: 'draft',
      created_by: authCheck.user.id,
    });

    // 2. Create note_course_links
    await upsertNoteCourseLink({
      note_collection_id: noteCollection.id,
      course_id: courseId,
      module_id: moduleId,
      item_id: itemId,
      auto_unlock_with_course: true,
    });

    // 3. Create/reuse course_resource_sections + course_resource_items
    try {
      const section = await findOrCreateResourceSectionForNote(courseId, moduleId, itemId);
      await createNoteResourceItem(section.id, noteCollection.id, title);
    } catch {
      // Resource integration is best-effort; don't fail the whole creation
    }

    // 4. Create default note module for page organization (if none exists yet)
    let defaultModuleId: string | null = null;
    try {
      const existingModules = await listNoteModules(noteCollection.id);
      if (!existingModules || existingModules.length === 0) {
        const moduleSlug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        const defaultModule = await createNoteModule({
          note_collection_id: noteCollection.id,
          title: `${title} - Notes`,
          slug: moduleSlug,
          sort_order: 0,
          is_published: true,
        });
        defaultModuleId = defaultModule.id;
      } else {
        defaultModuleId = existingModules[0].id;
      }
    } catch {
      // Module creation is best-effort; don't fail the whole creation
    }

    revalidatePath('/notes');
    revalidatePath('/master-courses');
    return { ok: true, data: noteCollection, id: noteCollection.id, defaultModuleId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to create and link note',
    };
  }
}

/**
 * Unlink a note from a course item.
 * Removes the note_course_links row and the matching course_resource_items entry.
 * Does NOT delete the note_collection itself.
 */
export async function unlinkVideoNoteAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const linkId = formData.get('link_id') as string;
  const noteCollectionId = formData.get('note_collection_id') as string;
  const courseId = formData.get('course_id') as string;

  if (!linkId || !noteCollectionId || !courseId) {
    return { ok: false, error: 'link_id, note_collection_id, and course_id are required' };
  }

  try {
    // 1. Delete the course_resource_items entry for this note
    await deleteNoteResourceItemForScope(noteCollectionId, courseId);

    // 2. Delete the note_course_link
    await deleteNoteCourseLink(linkId);

    revalidatePath('/notes');
    revalidatePath('/master-courses');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to unlink note',
    };
  }
}

// ─── Excalidraw Resources ──────────────────────────────────────────────────

/**
 * Fetch all Excalidraw resources for a course, grouped by item_id.
 * Returns a map of item_id -> Excalidraw resource info for use in the CourseLinkedNotesManager.
 */
export async function getCourseLinkedResourcesMapAction(
  courseId: string,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const excalidrawMap = await listExcalidrawResourcesByCourseId(courseId);
    // Convert Map to plain object for serialization
    const data = Object.fromEntries(excalidrawMap);
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to fetch Excalidraw resources map',
    };
  }
}

/**
 * Create an Excalidraw resource for a specific video/item.
 * Validates course/module/item relationships server-side.
 */
export async function createVideoExcalidrawResourceAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const courseId = formData.get('course_id') as string;
  const moduleId = formData.get('module_id') as string;
  const itemId = formData.get('item_id') as string;
  const title = formData.get('title') as string;
  const subtitle = formData.get('subtitle') as string | null;
  const excalidrawUrl = formData.get('excalidraw_url') as string;

  if (!courseId || !moduleId || !itemId || !title || !excalidrawUrl) {
    return { ok: false, error: 'course_id, module_id, item_id, title, and excalidraw_url are required' };
  }

  // Server-side validation
  const validationError = await validateCourseScopeIds(courseId, moduleId, itemId);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  try {
    const resourceItem = await createExcalidrawResourceItem(
      courseId,
      moduleId,
      itemId,
      title,
      subtitle || null,
      excalidrawUrl,
      null, // excalidraw_scene_json is no longer stored in Supabase
    );

    revalidatePath('/notes');
    revalidatePath('/master-courses');
    return { ok: true, data: resourceItem, id: resourceItem.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to create Excalidraw resource',
    };
  }
}

/**
 * Update an Excalidraw resource.
 */
export async function updateVideoExcalidrawResourceAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const resourceId = formData.get('resource_id') as string;
  const title = formData.get('title') as string;
  const subtitle = formData.get('subtitle') as string | null;
  const excalidrawUrl = formData.get('excalidraw_url') as string;

  if (!resourceId || !title || !excalidrawUrl) {
    return { ok: false, error: 'resource_id, title, and excalidraw_url are required' };
  }

  try {
    const resourceItem = await updateExcalidrawResourceItem(resourceId, {
      title,
      subtitle: subtitle || null,
      excalidraw_url: excalidrawUrl,
      // excalidraw_scene_json is intentionally omitted here to prevent writing new data
    });

    revalidatePath('/notes');
    revalidatePath('/master-courses');
    return { ok: true, data: resourceItem };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to update Excalidraw resource',
    };
  }
}

/**
 * Delete an Excalidraw resource.
 * Only removes the course_resource_items row, not the section.
 */
export async function deleteVideoExcalidrawResourceAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const resourceId = formData.get('resource_id') as string;

  if (!resourceId) {
    return { ok: false, error: 'resource_id is required' };
  }

  try {
    await deleteExcalidrawResourceItem(resourceId);

    revalidatePath('/notes');
    revalidatePath('/master-courses');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to delete Excalidraw resource',
    };
  }
}

// ─── Publish / Unpublish Notes ──────────────────────────────────────

/**
 * Publish a note collection (set publish_status='published').
 * For course-linked notes, this makes the note available to students with active course access.
 */
export async function publishNoteCollectionAction(noteId: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const data = await updateNoteCollection(noteId, {
      publish_status: 'published',
    });
    revalidatePath('/notes');
    revalidatePath(`/notes/${noteId}/edit`);
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to publish note collection',
    };
  }
}

/**
 * Unpublish a note collection (set publish_status='draft').
 * For course-linked notes, this hides the note from students.
 */
export async function unpublishNoteCollectionAction(noteId: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const data = await updateNoteCollection(noteId, {
      publish_status: 'draft',
    });
    revalidatePath('/notes');
    revalidatePath(`/notes/${noteId}/edit`);
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to unpublish note collection',
    };
  }
}

// ─── Excalidraw Visibility ──────────────────────────────────────────

/**
 * Set the visibility of an Excalidraw resource item (course_resource_items.is_visible).
 * Validates that the item exists and is of kind='excalidraw_link'.
 */
export async function setExcalidrawResourceVisibilityAction(
  resourceItemId: string,
  isVisible: boolean,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  if (!resourceItemId) {
    return { ok: false, error: 'resource_item_id is required' };
  }

  try {
    const item = await getCourseResourceItemById(resourceItemId);
    if (!item) {
      return { ok: false, error: 'Resource item not found' };
    }
    if (item.kind !== 'excalidraw_link') {
      return { ok: false, error: 'Resource item is not an Excalidraw link' };
    }

    const data = await updateCourseResourceItem(resourceItemId, {
      is_visible: isVisible,
    });

    revalidatePath('/notes');
    revalidatePath('/master-courses');
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to update Excalidraw visibility',
    };
  }
}

// ─── Course-level Publish / Unpublish ──────────────────────────────────────

/**
 * Publish all course-linked notes and Excalidraw resources for a course.
 * Bulk operation: sets all linked notes to published and all resource items to visible.
 */
export async function publishCourseLinkedResourcesAction(courseId: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  if (!courseId) {
    return { ok: false, error: 'course_id is required' };
  }

  try {
    // Validate course exists
    const courses = await listMasterCoursesForSelector();
    const course = courses.find((c) => c.id === courseId);
    if (!course) {
      return { ok: false, error: 'Course not found' };
    }

    await publishCourseLinkedResources(courseId);

    revalidatePath('/notes');
    revalidatePath('/master-courses');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to publish course-linked resources',
    };
  }
}

/**
 * Unpublish all course-linked notes and Excalidraw resources for a course.
 * Bulk operation: sets all linked notes to draft and all resource items to hidden.
 * Does NOT delete any rows.
 */
export async function unpublishCourseLinkedResourcesAction(courseId: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  if (!courseId) {
    return { ok: false, error: 'course_id is required' };
  }

  try {
    // Validate course exists
    const courses = await listMasterCoursesForSelector();
    const course = courses.find((c) => c.id === courseId);
    if (!course) {
      return { ok: false, error: 'Course not found' };
    }

    await unpublishCourseLinkedResources(courseId);

    revalidatePath('/notes');
    revalidatePath('/master-courses');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to unpublish course-linked resources',
    };
  }
}

// ─── Course Curriculum Workspace Summary ───────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin';
import type { ExcalidrawResourceInfo } from '@/lib/services/notes';

type NoteCollectionPublishEmbed =
  | { publish_status: string }
  | Array<{ publish_status: string }>
  | null;

type NoteCollectionDetailEmbed =
  | { title: string; slug: string; publish_status: string }
  | Array<{ title: string; slug: string; publish_status: string }>
  | null;

function noteCollectionPublishStatus(embed: NoteCollectionPublishEmbed): string | undefined {
  if (!embed) return undefined;
  if (Array.isArray(embed)) return embed[0]?.publish_status;
  return embed.publish_status;
}

function firstNoteCollectionDetail(embed: NoteCollectionDetailEmbed) {
  if (!embed) return null;
  return Array.isArray(embed) ? embed[0] ?? null : embed;
}

type WorkspaceModuleRow = {
  id: string;
  title: string;
  sort_order: number;
};

type WorkspaceVideoItemRow = {
  id: string;
  module_id: string | null;
};

type WorkspaceNoteLinkRow = {
  module_id: string | null;
  item_id: string | null;
  note_collections: NoteCollectionPublishEmbed;
};

type WorkspaceExcalSectionRow = {
  module_id: string | null;
  item_id: string | null;
  course_resource_items: Array<{ is_visible: boolean }>;
};

type CourseLinkedNoteLinkRow = {
  id: string;
  note_collection_id: string;
  course_id: string;
  module_id: string | null;
  item_id: string | null;
  auto_unlock_with_course: boolean;
  note_collections: NoteCollectionDetailEmbed;
};

export async function getCourseLinkedWorkspaceSummaryAction(courseId: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const sb = createAdminClient();

    // 1. Fetch course details
    const { data: course, error: courseErr } = await sb
      .from('master_courses')
      .select('title, code')
      .eq('id', courseId)
      .maybeSingle();

    if (courseErr) throw courseErr;
    if (!course) return { ok: false, error: 'Course not found' };

    // 2. Fetch all modules for this course
    const { data: modules, error: modulesErr } = await sb
      .from('master_course_modules')
      .select('id, title, sort_order')
      .eq('master_course_id', courseId)
      .order('sort_order', { ascending: true });
    if (modulesErr) throw modulesErr;

    // 3. Fetch all video items for this course to aggregate counts
    const { data: videoItems, error: itemsErr } = await sb
      .from('master_course_items')
      .select('id, module_id')
      .eq('master_course_id', courseId)
      .eq('item_type', 'video');
    if (itemsErr) throw itemsErr;

    // 4. Fetch all note links for this course
    const { data: noteLinks, error: noteLinksErr } = await sb
      .from('note_course_links')
      .select(`
        id,
        module_id,
        item_id,
        note_collections!inner(publish_status)
      `)
      .eq('course_id', courseId);
    if (noteLinksErr) throw noteLinksErr;

    // 5. Fetch all Excalidraw resource items for this course
    const { data: excalidrawSections, error: excalErr } = await sb
      .from('course_resource_sections')
      .select(`
        id,
        module_id,
        item_id,
        course_resource_items!inner(id, is_visible)
      `)
      .eq('course_id', courseId)
      .eq('scope_type', 'item');
    if (excalErr) throw excalErr;

    // 6. Aggregate counts
    const moduleList = (modules ?? []).map((m: WorkspaceModuleRow) => {
      const mId = m.id;

      // Video items count for this module
      const videosInModule = (videoItems ?? []).filter((v: WorkspaceVideoItemRow) => v.module_id === mId);
      const videoCount = videosInModule.length;

      // Note links for this module (could be module-scoped or item-scoped within this module)
      const moduleVideoIds = new Set(videosInModule.map((v) => v.id));
      const notesInModule = (noteLinks ?? []).filter((n: WorkspaceNoteLinkRow) =>
        n.module_id === mId || (n.item_id !== null && moduleVideoIds.has(n.item_id))
      );
      const notesPublished = notesInModule.filter(
        (n) => noteCollectionPublishStatus(n.note_collections) === 'published',
      ).length;
      const notesDraft = notesInModule.filter(
        (n) => noteCollectionPublishStatus(n.note_collections) !== 'published',
      ).length;

      // Excalidraw items for this module's scope
      const excalSectionsInModule = (excalidrawSections ?? []).filter((s: WorkspaceExcalSectionRow) =>
        s.module_id === mId || (s.item_id !== null && moduleVideoIds.has(s.item_id))
      );
      const excalItems = excalSectionsInModule.flatMap((s) => s.course_resource_items);
      const excalVisible = excalItems.filter((item) => item.is_visible).length;
      const excalHidden = excalItems.filter((item) => !item.is_visible).length;

      return {
        id: m.id,
        title: m.title,
        sort_order: m.sort_order,
        videoCount,
        notesCount: {
          total: notesInModule.length,
          published: notesPublished,
          draft: notesDraft
        },
        excalidrawCount: {
          total: excalItems.length,
          published: excalVisible,
          hidden: excalHidden
        }
      };
    });

    // Total counters course-wide
    const totalVideos = videoItems?.length ?? 0;
    const totalNotes = noteLinks?.length ?? 0;
    const totalNotesPublished = (noteLinks ?? []).filter(
      (n: WorkspaceNoteLinkRow) => noteCollectionPublishStatus(n.note_collections) === 'published',
    ).length;
    const totalNotesDraft = totalNotes - totalNotesPublished;

    const allExcalItems = (excalidrawSections ?? []).flatMap((s: WorkspaceExcalSectionRow) => s.course_resource_items);
    const totalExcal = allExcalItems.length;
    const totalExcalPublished = allExcalItems.filter((item) => item.is_visible).length;
    const totalExcalHidden = totalExcal - totalExcalPublished;

    return {
      ok: true,
      data: {
        course: {
          title: course.title,
          code: course.code
        },
        modules: moduleList,
        totals: {
          videos: totalVideos,
          notes: {
            total: totalNotes,
            published: totalNotesPublished,
            draft: totalNotesDraft
          },
          excalidraw: {
            total: totalExcal,
            published: totalExcalPublished,
            hidden: totalExcalHidden
          }
        }
      }
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load workspace summary' };
  }
}

export async function getCourseLinkedModuleResourcesAction(courseId: string, moduleId: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const sb = createAdminClient();

    // 1. Fetch only this module's video items
    const { data: videos, error: videosErr } = await sb
      .from('master_course_items')
      .select('id, title, slug, item_type, sort_order, publish_status')
      .eq('master_course_id', courseId)
      .eq('module_id', moduleId)
      .eq('item_type', 'video')
      .order('sort_order', { ascending: true });
    if (videosErr) throw videosErr;

    const videoIds = (videos ?? []).map((v) => v.id);

    // 2. Fetch note links for this module or items in it
    let noteQuery = sb
      .from('note_course_links')
      .select(`
        id,
        note_collection_id,
        course_id,
        module_id,
        item_id,
        auto_unlock_with_course,
        note_collections!inner(title, slug, publish_status)
      `)
      .eq('course_id', courseId);

    if (videoIds.length > 0) {
      noteQuery = noteQuery.or(`module_id.eq.${moduleId},item_id.in.(${videoIds.join(',')})`);
    } else {
      noteQuery = noteQuery.eq('module_id', moduleId).is('item_id', null);
    }

    const { data: notes, error: notesErr } = await noteQuery;
    if (notesErr) throw notesErr;

    const notesList = (notes ?? []).map((row: CourseLinkedNoteLinkRow) => {
      const noteCollection = firstNoteCollectionDetail(row.note_collections);
      return {
        link_id: row.id,
        note_collection_id: row.note_collection_id,
        course_id: row.course_id,
        module_id: row.module_id,
        item_id: row.item_id,
        auto_unlock_with_course: row.auto_unlock_with_course,
        note_title: noteCollection?.title ?? '',
        note_slug: noteCollection?.slug ?? '',
        note_publish_status: noteCollection?.publish_status ?? 'draft',
      };
    });

    // 3. Fetch Excalidraw resource items for the items in this module scope
    let sectionQuery = sb
      .from('course_resource_sections')
      .select(`
        id,
        item_id,
        module_id,
        course_resource_items!inner (
          id,
          kind,
          title,
          subtitle,
          excalidraw_url,
          excalidraw_scene_json,
          is_visible
        )
      `)
      .eq('course_id', courseId)
      .eq('scope_type', 'item');

    if (videoIds.length > 0) {
      sectionQuery = sectionQuery.or(`module_id.eq.${moduleId},item_id.in.(${videoIds.join(',')})`);
    } else {
      sectionQuery = sectionQuery.eq('module_id', moduleId).is('item_id', null);
    }

    const { data: sections, error: sectionsError } = await sectionQuery;
    if (sectionsError) throw sectionsError;

    // Convert section items to a map of item_id -> ExcalidrawResourceInfo[]
    const excalidrawMap: Record<string, ExcalidrawResourceInfo[]> = {};
    for (const section of sections ?? []) {
      const items = section.course_resource_items as unknown as Array<{
        id: string;
        kind: string;
        title: string;
        subtitle: string | null;
        excalidraw_url: string | null;
        excalidraw_scene_json: Record<string, unknown> | null;
        is_visible: boolean;
      }>;

      const excalidrawItems = items.filter((item) => item.kind === 'excalidraw_link');
      if (excalidrawItems.length > 0 && section.item_id) {
        if (!excalidrawMap[section.item_id]) {
          excalidrawMap[section.item_id] = [];
        }
        excalidrawMap[section.item_id].push(...excalidrawItems.map((item) => ({
          resource_item_id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          excalidraw_url: item.excalidraw_url,
          excalidraw_scene_json: item.excalidraw_scene_json,
          section_id: section.id,
          is_visible: item.is_visible,
        })));
      }
    }

    return {
      ok: true,
      data: {
        videos: videos ?? [],
        notes: notesList,
        excalidrawMap,
      }
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load module resources' };
  }
}

export async function getNoteDeletePreviewAction(noteCollectionId: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const data = await getNoteDeletePreview(noteCollectionId);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to fetch note delete preview' };
  }
}

export async function deleteNoteCollectionDeepAction(noteCollectionId: string, confirmationText: string): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  if (confirmationText !== 'DELETE') {
    return { ok: false, error: 'Confirmation text must be DELETE' };
  }

  try {
    await deleteNoteCollectionDeep(noteCollectionId, confirmationText);
    revalidatePath('/notes');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to delete note collection permanently' };
  }
}
