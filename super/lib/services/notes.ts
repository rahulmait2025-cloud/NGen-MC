import 'server-only';

/**
 * Notes Library Service
 *
 * Server-side CRUD for note collections, modules, pages, course links,
 * and course resource sections/items. Uses admin Supabase client (bypasses RLS).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  NoteCollectionsRow,
  NoteModulesRow,
  NotePagesRow,
  NoteCourseLinksRow,
  CourseResourceSectionsRow,
  CourseResourceItemsRow,
} from '@/types/database';

// ─── Note Collections ────────────────────────────────────────────────────────

export async function listNoteCollections(): Promise<NoteCollectionsRow[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('note_collections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as NoteCollectionsRow[];
}

export async function getNoteCollectionById(id: string): Promise<NoteCollectionsRow | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('note_collections')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as NoteCollectionsRow) ?? null;
}

export async function createNoteCollection(input: {
  title: string;
  slug: string;
  short_description?: string | null;
  description_md?: string | null;
  cover_image_path?: string | null;
  publish_status?: string;
  pricing_model?: string;
  price_minor?: number;
  currency?: string;
  validity_days?: number | null;
  source_master_course_id?: string | null;
  source_type?: 'standalone' | 'course_linked';
  catalog_visibility?: 'public_catalog' | 'hidden_course_attached';
  visibility_scope?: string;
  created_by?: string;
}): Promise<NoteCollectionsRow> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('note_collections')
    .insert({
      title: input.title,
      slug: input.slug,
      short_description: input.short_description ?? null,
      description_md: input.description_md ?? null,
      cover_image_path: input.cover_image_path ?? null,
      publish_status: input.publish_status ?? 'draft',
      pricing_model: input.pricing_model ?? 'free',
      price_minor: input.price_minor ?? 0,
      currency: input.currency ?? 'INR',
      validity_days: input.validity_days ?? null,
      source_master_course_id: input.source_master_course_id ?? null,
      source_type: input.source_type ?? 'standalone',
      catalog_visibility: input.catalog_visibility ?? 'public_catalog',
      visibility_scope: input.visibility_scope ?? 'global',
      created_by: input.created_by ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as NoteCollectionsRow;
}

export async function updateNoteCollection(id: string, input: Record<string, unknown>): Promise<NoteCollectionsRow> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('note_collections')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NoteCollectionsRow;
}

export async function archiveNoteCollection(id: string): Promise<void> {
  const sb = createAdminClient();
  const { error } = await sb
    .from('note_collections')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function unarchiveNoteCollection(id: string): Promise<void> {
  const sb = createAdminClient();
  const { error } = await sb
    .from('note_collections')
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Permanently delete a note collection and all related data:
 * 1. Storage images for all pages
 * 2. note_pages
 * 3. note_modules
 * 4. note_course_links
 * 5. course_resource_items (nullify note_collection_id)
 * 6. note_payment_orders (set note_collection_id to null)
 * 7. note_collections row
 */
export async function deleteNoteCollection(id: string): Promise<void> {
  const sb = createAdminClient();

  const { data: modules, error: modulesFetchErr } = await sb
    .from('note_modules')
    .select('id')
    .eq('note_collection_id', id);

  if (modulesFetchErr) throw modulesFetchErr;

  const moduleIds = (modules ?? []).map((m) => m.id);

  if (moduleIds.length > 0) {
    const { data: pages, error: pagesFetchErr } = await sb
      .from('note_pages')
      .select('id, image_path')
      .in('note_module_id', moduleIds);

    if (pagesFetchErr) throw pagesFetchErr;

    if (pages && pages.length > 0) {
      const storagePaths = pages
        .map((p) => p.image_path)
        .filter((p): p is string => !!p);
      if (storagePaths.length > 0) {
        await sb.storage.from('note-pages').remove(storagePaths);
      }

      const pageIds = pages.map((p) => p.id);
      const { error: pagesErr } = await sb.from('note_pages').delete().in('id', pageIds);
      if (pagesErr) throw pagesErr;
    }

    const { error: modulesErr } = await sb.from('note_modules').delete().in('id', moduleIds);
    if (modulesErr) throw modulesErr;
  }

  const { error: linksErr } = await sb.from('note_course_links').delete().eq('note_collection_id', id);
  if (linksErr) throw linksErr;

  const { error: resourceErr } = await sb
    .from('course_resource_items')
    .delete()
    .eq('note_collection_id', id);
  if (resourceErr) throw resourceErr;

  const { error: paymentErr } = await sb
    .from('note_payment_orders')
    .delete()
    .eq('note_collection_id', id);
  if (paymentErr) throw paymentErr;

  const { error: collectionErr } = await sb.from('note_collections').delete().eq('id', id);
  if (collectionErr) throw collectionErr;
}

// ─── Note Modules ────────────────────────────────────────────────────────────

export async function listNoteModules(collectionId: string): Promise<NoteModulesRow[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('note_modules')
    .select('*')
    .eq('note_collection_id', collectionId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as NoteModulesRow[];
}

export async function getNoteModuleById(id: string): Promise<NoteModulesRow | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('note_modules')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as NoteModulesRow) ?? null;
}

export async function createNoteModule(input: {
  note_collection_id: string;
  title: string;
  slug: string;
  description_md?: string | null;
  sort_order?: number;
  is_published?: boolean;
}): Promise<NoteModulesRow> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('note_modules')
    .insert({
      note_collection_id: input.note_collection_id,
      title: input.title,
      slug: input.slug,
      description_md: input.description_md ?? null,
      sort_order: input.sort_order ?? 0,
      is_published: input.is_published ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as NoteModulesRow;
}

export async function updateNoteModule(id: string, input: Record<string, unknown>): Promise<NoteModulesRow> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('note_modules')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NoteModulesRow;
}

export async function deleteNoteModule(id: string): Promise<void> {
  const sb = createAdminClient();
  const { error } = await sb.from('note_modules').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderNoteModules(moduleIds: string[]): Promise<void> {
  const sb = createAdminClient();
  const updates = moduleIds.map((id, index) =>
    sb.from('note_modules').update({ sort_order: index }).eq('id', id),
  );
  const results = await Promise.all(updates);
  for (const r of results) {
    if (r.error) throw r.error;
  }
}

// ─── Note Pages ──────────────────────────────────────────────────────────────

export async function listNotePages(moduleId: string): Promise<NotePagesRow[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('note_pages')
    .select('*')
    .eq('note_module_id', moduleId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as NotePagesRow[];
}

export async function createNotePage(input: {
  note_module_id: string;
  title?: string | null;
  image_path: string;
  image_mime: string;
  width?: number | null;
  height?: number | null;
  file_size_bytes?: number | null;
  alt_text?: string | null;
  sort_order?: number;
}): Promise<NotePagesRow> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('note_pages')
    .insert({
      note_module_id: input.note_module_id,
      title: input.title ?? null,
      image_path: input.image_path,
      image_mime: input.image_mime,
      width: input.width ?? null,
      height: input.height ?? null,
      file_size_bytes: input.file_size_bytes ?? null,
      alt_text: input.alt_text ?? null,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as NotePagesRow;
}

export async function deleteNotePage(id: string): Promise<void> {
  const sb = createAdminClient();
  const { error } = await sb.from('note_pages').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderNotePages(pageIds: string[]): Promise<void> {
  const sb = createAdminClient();
  const updates = pageIds.map((id, index) =>
    sb.from('note_pages').update({ sort_order: index }).eq('id', id),
  );
  const results = await Promise.all(updates);
  for (const r of results) {
    if (r.error) throw r.error;
  }
}

export async function getNotePageSignedUrl(storagePath: string): Promise<string | null> {
  const sb = createAdminClient();
  const { data, error } = await sb.storage
    .from('note-pages')
    .createSignedUrl(storagePath, 3600);

  if (error) {
    console.error('[NotesService] getNotePageSignedUrl error:', error.message, 'path:', storagePath);
    return null;
  }
  if (!data?.signedUrl) {
    console.error('[NotesService] getNotePageSignedUrl: no signedUrl returned for path:', storagePath);
    return null;
  }
  return data.signedUrl;
}

// ─── Note Course Links ───────────────────────────────────────────────────────

export type CourseLinkedNoteInfo = {
  link_id: string;
  note_collection_id: string;
  course_id: string;
  module_id: string | null;
  item_id: string | null;
  auto_unlock_with_course: boolean;
  note_title: string;
  note_slug: string;
  note_publish_status: string;
};

export async function listNoteCourseLinksByCourseId(courseId: string): Promise<CourseLinkedNoteInfo[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
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
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => ({
    link_id: row.id as string,
    note_collection_id: row.note_collection_id as string,
    course_id: row.course_id as string,
    module_id: row.module_id as string | null,
    item_id: row.item_id as string | null,
    auto_unlock_with_course: row.auto_unlock_with_course as boolean,
    note_title: (row.note_collections as Record<string, string>)?.title ?? '',
    note_slug: (row.note_collections as Record<string, string>)?.slug ?? '',
    note_publish_status: (row.note_collections as Record<string, string>)?.publish_status ?? 'draft',
  }));
}

export async function listNoteCourseLinks(noteCollectionId: string): Promise<NoteCourseLinksRow[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('note_course_links')
    .select('*')
    .eq('note_collection_id', noteCollectionId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as NoteCourseLinksRow[];
}

export async function upsertNoteCourseLink(input: {
  note_collection_id: string;
  course_id: string;
  module_id?: string | null;
  item_id?: string | null;
  auto_unlock_with_course?: boolean;
  sort_order?: number;
}): Promise<NoteCourseLinksRow> {
  const sb = createAdminClient();

  // Check if link already exists with the same full scope
  const { data: existing } = await sb
    .from('note_course_links')
    .select('id')
    .eq('note_collection_id', input.note_collection_id)
    .eq('course_id', input.course_id)
    .eq('module_id', input.module_id ?? null)
    .eq('item_id', input.item_id ?? null)
    .maybeSingle();

  if (existing) {
    const { data, error } = await sb
      .from('note_course_links')
      .update({
        module_id: input.module_id ?? null,
        item_id: input.item_id ?? null,
        auto_unlock_with_course: input.auto_unlock_with_course ?? true,
        sort_order: input.sort_order ?? 0,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data as NoteCourseLinksRow;
  }

  const { data, error } = await sb
    .from('note_course_links')
    .insert({
      note_collection_id: input.note_collection_id,
      course_id: input.course_id,
      module_id: input.module_id ?? null,
      item_id: input.item_id ?? null,
      auto_unlock_with_course: input.auto_unlock_with_course ?? true,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;

  // Auto-set source_type and catalog_visibility on the note collection
  // when the first course link is created
  const { count: linkCount } = await sb
    .from('note_course_links')
    .select('id', { count: 'exact', head: true })
    .eq('note_collection_id', input.note_collection_id);

  if (linkCount === 1) {
    // First link — mark as course_linked
    await sb
      .from('note_collections')
      .update({
        source_type: 'course_linked',
        catalog_visibility: 'hidden_course_attached',
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.note_collection_id);
  }

  return data as NoteCourseLinksRow;
}

export async function deleteNoteCourseLink(id: string): Promise<void> {
  const sb = createAdminClient();

  const { error } = await sb.from('note_course_links').delete().eq('id', id);
  if (error) throw error;

  // NOTE: We intentionally do NOT modify the note_collection's source_type or
  // catalog_visibility when the last link is removed. Course-linked notes must
  // remain source_type='course_linked' and catalog_visibility='hidden_course_attached'
  // even after unlinking, to prevent accidental exposure in the /notes catalog.
  // Only an explicit "Convert to Standalone" action should change these fields.
}

/**
 * Delete a course_resource_items row for a note_collection linked to a specific course scope.
 * Used during unlink to remove the LMS resource entry.
 */
export async function deleteNoteResourceItemForScope(
  noteCollectionId: string,
  courseId: string,
): Promise<void> {
  const sb = createAdminClient();

  // Find resource sections for this course
  const { data: sections } = await sb
    .from('course_resource_sections')
    .select('id')
    .eq('course_id', courseId);

  if (!sections || sections.length === 0) return;

  const sectionIds = sections.map((s) => s.id);

  // Delete resource items matching this note collection under those sections
  const { error } = await sb
    .from('course_resource_items')
    .delete()
    .in('section_id', sectionIds)
    .eq('kind', 'note_collection')
    .eq('note_collection_id', noteCollectionId);

  if (error) throw error;
}

// ─── Course Resource Sections ────────────────────────────────────────────────

export async function listCourseResourceSections(
  courseId: string | null,
  opts?: { includeGlobal?: boolean },
): Promise<CourseResourceSectionsRow[]> {
  const sb = createAdminClient();
  let query = sb
    .from('course_resource_sections')
    .select('*')
    .order('sort_order', { ascending: true });

  if (courseId === null) {
    // Global sections only
    query = query.eq('visibility', 'global');
  } else if (opts?.includeGlobal) {
    query = query.or(`course_id.eq.${courseId},visibility.eq.global`);
  } else {
    query = query.eq('course_id', courseId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CourseResourceSectionsRow[];
}

export async function listGlobalCourseResourceSections(): Promise<CourseResourceSectionsRow[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('course_resource_sections')
    .select('*')
    .eq('visibility', 'global')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as CourseResourceSectionsRow[];
}

export async function getCourseResourceSectionById(id: string): Promise<CourseResourceSectionsRow | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('course_resource_sections')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as CourseResourceSectionsRow) ?? null;
}

export async function createCourseResourceSection(input: {
  course_id: string | null;
  scope_type?: string;
  module_id?: string | null;
  item_id?: string | null;
  title: string;
  icon?: string | null;
  sort_order?: number;
  is_visible?: boolean;
  visibility?: string;
}): Promise<CourseResourceSectionsRow> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('course_resource_sections')
    .insert({
      course_id: input.course_id ?? null,
      scope_type: input.scope_type ?? 'course',
      module_id: input.module_id ?? null,
      item_id: input.item_id ?? null,
      title: input.title,
      icon: input.icon ?? null,
      sort_order: input.sort_order ?? 0,
      is_visible: input.is_visible ?? true,
      visibility: input.visibility ?? 'per_course',
    })
    .select()
    .single();

  if (error) throw error;
  return data as CourseResourceSectionsRow;
}

export async function updateCourseResourceSection(id: string, input: Record<string, unknown>): Promise<CourseResourceSectionsRow> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('course_resource_sections')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CourseResourceSectionsRow;
}

export async function deleteCourseResourceSection(id: string): Promise<void> {
  const sb = createAdminClient();
  const { error } = await sb.from('course_resource_sections').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderCourseResourceSections(sectionIds: string[]): Promise<void> {
  const sb = createAdminClient();
  const updates = sectionIds.map((id, index) =>
    sb.from('course_resource_sections').update({ sort_order: index }).eq('id', id),
  );
  const results = await Promise.all(updates);
  for (const r of results) {
    if (r.error) throw r.error;
  }
}

// ─── Course Resource Items ───────────────────────────────────────────────────

export async function listCourseResourceItems(sectionId: string): Promise<CourseResourceItemsRow[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('course_resource_items')
    .select('*')
    .eq('section_id', sectionId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as CourseResourceItemsRow[];
}

export async function getCourseResourceItemById(id: string): Promise<CourseResourceItemsRow | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('course_resource_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as CourseResourceItemsRow) ?? null;
}

export async function createCourseResourceItem(input: {
  section_id: string;
  kind: string;
  title: string;
  subtitle?: string | null;
  icon?: string | null;
  external_url?: string | null;
  note_collection_id?: string | null;
  file_path?: string | null;
  markdown_body?: string | null;
  excalidraw_url?: string | null;
  excalidraw_scene_json?: Record<string, unknown> | null;
  open_in_new_tab?: boolean;
  sort_order?: number;
  is_visible?: boolean;
}): Promise<CourseResourceItemsRow> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('course_resource_items')
    .insert({
      section_id: input.section_id,
      kind: input.kind,
      title: input.title,
      subtitle: input.subtitle ?? null,
      icon: input.icon ?? null,
      external_url: input.external_url ?? null,
      note_collection_id: input.note_collection_id ?? null,
      file_path: input.file_path ?? null,
      markdown_body: input.markdown_body ?? null,
      excalidraw_url: input.excalidraw_url ?? null,
      excalidraw_scene_json: input.excalidraw_scene_json ?? null,
      open_in_new_tab: input.open_in_new_tab ?? true,
      sort_order: input.sort_order ?? 0,
      is_visible: input.is_visible ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CourseResourceItemsRow;
}

export async function updateCourseResourceItem(id: string, input: Record<string, unknown>): Promise<CourseResourceItemsRow> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('course_resource_items')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CourseResourceItemsRow;
}

export async function deleteCourseResourceItem(id: string): Promise<void> {
  const sb = createAdminClient();
  const { error } = await sb.from('course_resource_items').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderCourseResourceItems(itemIds: string[]): Promise<void> {
  const sb = createAdminClient();
  const updates = itemIds.map((id, index) =>
    sb.from('course_resource_items').update({ sort_order: index }).eq('id', id),
  );
  const results = await Promise.all(updates);
  for (const r of results) {
    if (r.error) throw r.error;
  }
}

// ─── Storage ─────────────────────────────────────────────────────────────────

export async function uploadNotePageImage(
  collectionId: string,
  moduleId: string,
  file: File,
): Promise<{ storagePath: string; mimeType: string; sizeBytes: number }> {
  const sb = createAdminClient();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const storagePath = `notes/${collectionId}/${moduleId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await sb.storage
    .from('note-pages')
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (error) throw error;

  return {
    storagePath,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

export async function deleteNotePageImage(storagePath: string): Promise<void> {
  const sb = createAdminClient();
  const { error } = await sb.storage.from('note-pages').remove([storagePath]);
  if (error) throw error;
}

// ─── Master Courses (for selectors) ──────────────────────────────────────────

export async function listMasterCoursesForSelector(): Promise<{ id: string; title: string; code: string }[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('master_courses')
    .select('id, title, code')
    .eq('publish_status', 'published')
    .order('title', { ascending: true });

  if (error) throw error;
  return (data ?? []) as { id: string; title: string; code: string }[];
}

// ─── Course Resource Integration ──────────────────────────────────────────

/**
 * Find an existing course_resource_sections row for the given scope,
 * or create one with the given title/icon. Scope is determined by courseId + moduleId + itemId:
 * - item scope: module_id + item_id set
 * - module scope: module_id set, item_id null
 * - course scope: module_id null, item_id null
 *
 * Used for both Notes and Excalidraw resource sections.
 */
export async function findOrCreateCourseResourceSectionForScope(
  courseId: string,
  moduleId: string | null | undefined,
  itemId: string | null | undefined,
  title: string = 'Notes',
  icon: string = 'book-open',
): Promise<CourseResourceSectionsRow> {
  const sb = createAdminClient();

  const effectiveModuleId = moduleId || null;
  const effectiveItemId = itemId || null;
  const scopeType = effectiveItemId ? 'item' : effectiveModuleId ? 'module' : 'course';

  // Look for an existing section with the same scope
  let query = sb
    .from('course_resource_sections')
    .select('*')
    .eq('course_id', courseId)
    .eq('scope_type', scopeType);

  if (effectiveModuleId) {
    query = query.eq('module_id', effectiveModuleId);
  } else {
    query = query.is('module_id', null);
  }
  if (effectiveItemId) {
    query = query.eq('item_id', effectiveItemId);
  } else {
    query = query.is('item_id', null);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    return existing as CourseResourceSectionsRow;
  }

  // Create a new section
  const { data, error } = await sb
    .from('course_resource_sections')
    .insert({
      course_id: courseId,
      scope_type: scopeType,
      module_id: effectiveModuleId,
      item_id: effectiveItemId,
      title,
      icon,
      sort_order: 0,
      is_visible: true,
      visibility: 'per_course',
    })
    .select()
    .single();

  if (error) throw error;
  return data as CourseResourceSectionsRow;
}

/**
 * @deprecated Use findOrCreateCourseResourceSectionForScope instead.
 * Kept for backward compatibility with existing callers.
 */
export const findOrCreateResourceSectionForNote = findOrCreateCourseResourceSectionForScope;

/**
 * Create a course_resource_items row with kind='note_collection' under the given section.
 * Skips if a note_collection item with the same note_collection_id already exists in the section.
 */
export async function createNoteResourceItem(
  sectionId: string,
  noteCollectionId: string,
  title: string,
): Promise<CourseResourceItemsRow> {
  const sb = createAdminClient();

  // Check for existing item to prevent duplicates
  const { data: existing } = await sb
    .from('course_resource_items')
    .select('id')
    .eq('section_id', sectionId)
    .eq('kind', 'note_collection')
    .eq('note_collection_id', noteCollectionId)
    .maybeSingle();

  if (existing) {
    return existing as CourseResourceItemsRow;
  }

  const { data, error } = await sb
    .from('course_resource_items')
    .insert({
      section_id: sectionId,
      kind: 'note_collection',
      title,
      note_collection_id: noteCollectionId,
      open_in_new_tab: true,
      sort_order: 0,
      is_visible: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CourseResourceItemsRow;
}

// ─── Excalidraw Resource Integration ──────────────────────────────────────

export type ExcalidrawResourceInfo = {
  resource_item_id: string;
  title: string;
  subtitle: string | null;
  excalidraw_url: string | null;
  excalidraw_scene_json: Record<string, unknown> | null;
  section_id: string;
  is_visible: boolean;
};

/**
 * List all Excalidraw resources for a given course, grouped by item_id.
 * Returns a map of item_id -> Excalidraw resource info.
 */
export async function listExcalidrawResourcesByCourseId(
  courseId: string,
): Promise<Map<string, ExcalidrawResourceInfo[]>> {
  const sb = createAdminClient();

  // Get all sections for this course that have excalidraw items
  const { data: sections, error: sectionsError } = await sb
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
    .eq('scope_type', 'item')
    .not('item_id', 'is', null);

  if (sectionsError) throw sectionsError;

  const result = new Map<string, ExcalidrawResourceInfo[]>();

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
      result.set(section.item_id, excalidrawItems.map((item) => ({
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

  return result;
}

/**
 * Create an Excalidraw resource item for a video/item scope.
 * Creates/reuses the course_resource_sections row for the scope.
 * Prevents duplicate Excalidraw resources for the same video scope.
 */
export async function createExcalidrawResourceItem(
  courseId: string,
  moduleId: string,
  itemId: string,
  title: string,
  subtitle: string | null,
  excalidrawUrl: string,
  excalidrawSceneJson?: Record<string, unknown> | null,
): Promise<CourseResourceItemsRow> {
  const sb = createAdminClient();

  // Find or create the section for this scope
  const section = await findOrCreateCourseResourceSectionForScope(
    courseId,
    moduleId,
    itemId,
    'Resources',
    'folder-open',
  );

  // Check for existing Excalidraw resource with the same URL in this section
  const { data: existing } = await sb
    .from('course_resource_items')
    .select('id')
    .eq('section_id', section.id)
    .eq('kind', 'excalidraw_link')
    .eq('excalidraw_url', excalidrawUrl)
    .maybeSingle();

  if (existing) {
    return existing as CourseResourceItemsRow;
  }

  const { data, error } = await sb
    .from('course_resource_items')
    .insert({
      section_id: section.id,
      kind: 'excalidraw_link',
      title,
      subtitle: subtitle || null,
      excalidraw_url: excalidrawUrl,
      excalidraw_scene_json: excalidrawSceneJson ?? null,
      open_in_new_tab: true,
      sort_order: 0,
      is_visible: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CourseResourceItemsRow;
}

/**
 * Update an Excalidraw resource item.
 */
export async function updateExcalidrawResourceItem(
  resourceId: string,
  updates: {
    title?: string;
    subtitle?: string | null;
    excalidraw_url?: string;
    excalidraw_scene_json?: Record<string, unknown> | null;
  },
): Promise<CourseResourceItemsRow> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('course_resource_items')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', resourceId)
    .eq('kind', 'excalidraw_link')
    .select()
    .single();

  if (error) throw error;
  return data as CourseResourceItemsRow;
}

/**
 * Delete an Excalidraw resource item.
 * Only deletes the course_resource_items row, not the section.
 */
export async function deleteExcalidrawResourceItem(resourceId: string): Promise<void> {
  const sb = createAdminClient();

  const { error } = await sb
    .from('course_resource_items')
    .delete()
    .eq('id', resourceId)
    .eq('kind', 'excalidraw_link');

  if (error) throw error;
}

/**
 * Validate that moduleId belongs to courseId, and itemId belongs to courseId (and optionally moduleId).
 * Returns null on success, or an error message string.
 */
export async function validateCourseScopeIds(
  courseId: string,
  moduleId: string | null | undefined,
  itemId: string | null | undefined,
): Promise<string | null> {
  if (!moduleId && !itemId) return null;

  const sb = createAdminClient();

  if (moduleId) {
    const { data: mod } = await sb
      .from('master_course_modules')
      .select('id')
      .eq('id', moduleId)
      .eq('master_course_id', courseId)
      .maybeSingle();
    if (!mod) return `Module does not belong to the selected course`;
  }

  if (itemId) {
    const { data: item } = await sb
      .from('master_course_items')
      .select('id, module_id')
      .eq('id', itemId)
      .eq('master_course_id', courseId)
      .maybeSingle();
    if (!item) return `Item does not belong to the selected course`;
    if (moduleId && item.module_id !== moduleId) return `Item does not belong to the selected module`;
  }

  return null;
}

// ─── Course-level Publish / Unpublish ───────────────────────────────────────

/**
 * Publish all course-linked notes and Excalidraw resources for a course.
 * Sets note_collections.publish_status = 'published' for linked notes,
 * and course_resource_items.is_visible = true for note_collection + excalidraw_link items.
 */
export async function publishCourseLinkedResources(courseId: string): Promise<void> {
  const sb = createAdminClient();

  // 1. Find all note_course_links for this course → collect note_collection_ids
  const { data: links } = await sb
    .from('note_course_links')
    .select('note_collection_id')
    .eq('course_id', courseId);

  const noteCollectionIds = (links ?? [])
    .map((l) => l.note_collection_id)
    .filter(Boolean);

  // 2. Publish all linked note_collections
  if (noteCollectionIds.length > 0) {
    await sb
      .from('note_collections')
      .update({ publish_status: 'published', updated_at: new Date().toISOString() })
      .in('id', noteCollectionIds);
  }

  // 3. Find course_resource_sections for this course → collect section_ids
  const { data: sections } = await sb
    .from('course_resource_sections')
    .select('id')
    .eq('course_id', courseId);

  const sectionIds = (sections ?? []).map((s) => s.id);

  // 4. Make note_collection + excalidraw_link items visible
  if (sectionIds.length > 0) {
    await sb
      .from('course_resource_items')
      .update({ is_visible: true, updated_at: new Date().toISOString() })
      .in('section_id', sectionIds)
      .in('kind', ['note_collection', 'excalidraw_link']);
  }
}

/**
 * Unpublish all course-linked notes and Excalidraw resources for a course.
 * Sets note_collections.publish_status = 'draft' for linked notes,
 * and course_resource_items.is_visible = false for note_collection + excalidraw_link items.
 * Does NOT delete any rows.
 */
export async function unpublishCourseLinkedResources(courseId: string): Promise<void> {
  const sb = createAdminClient();

  // 1. Find all note_course_links for this course → collect note_collection_ids
  const { data: links } = await sb
    .from('note_course_links')
    .select('note_collection_id')
    .eq('course_id', courseId);

  const noteCollectionIds = (links ?? [])
    .map((l) => l.note_collection_id)
    .filter(Boolean);

  // 2. Unpublish all linked note_collections
  if (noteCollectionIds.length > 0) {
    await sb
      .from('note_collections')
      .update({ publish_status: 'draft', updated_at: new Date().toISOString() })
      .in('id', noteCollectionIds);
  }

  // 3. Find course_resource_sections for this course → collect section_ids
  const { data: sections } = await sb
    .from('course_resource_sections')
    .select('id')
    .eq('course_id', courseId);

  const sectionIds = (sections ?? []).map((s) => s.id);

  // 4. Hide note_collection + excalidraw_link items
  if (sectionIds.length > 0) {
    await sb
      .from('course_resource_items')
      .update({ is_visible: false, updated_at: new Date().toISOString() })
      .in('section_id', sectionIds)
      .in('kind', ['note_collection', 'excalidraw_link']);
  }
}

export interface NoteDeletePreview {
  title: string;
  sourceType: string | null;
  moduleCount: number;
  pageCount: number;
  linkCount: number;
  noteResourceCount: number;
  excalidrawResourceCount: number;
  linkedScopes: Array<{
    linkId: string;
    courseId: string;
    courseTitle: string;
    courseCode: string | null;
    moduleId: string | null;
    moduleTitle: string | null;
    itemId: string | null;
    itemTitle: string | null;
  }>;
}

export async function getNoteDeletePreview(noteCollectionId: string): Promise<NoteDeletePreview> {
  const sb = createAdminClient();

  // 1. Note details
  const { data: note, error: noteErr } = await sb
    .from('note_collections')
    .select('title, source_type')
    .eq('id', noteCollectionId)
    .maybeSingle();

  if (noteErr || !note) {
    throw new Error('Note collection not found');
  }

  // 2. Count note modules
  const { count: moduleCount, error: moduleErr } = await sb
    .from('note_modules')
    .select('id', { count: 'exact', head: true })
    .eq('note_collection_id', noteCollectionId);
  if (moduleErr) throw moduleErr;

  // 3. Count pages
  const { data: modules, error: modFetchErr } = await sb
    .from('note_modules')
    .select('id')
    .eq('note_collection_id', noteCollectionId);
  if (modFetchErr) throw modFetchErr;

  const moduleIds = (modules ?? []).map((m) => m.id);
  let pageCount = 0;
  if (moduleIds.length > 0) {
    const { count, error: pageErr } = await sb
      .from('note_pages')
      .select('id', { count: 'exact', head: true })
      .in('note_module_id', moduleIds);
    if (pageErr) throw pageErr;
    pageCount = count ?? 0;
  }

  // 4. Note-course links & scopes details
  const { data: links, error: linksErr } = await sb
    .from('note_course_links')
    .select('id, course_id, module_id, item_id')
    .eq('note_collection_id', noteCollectionId);
  if (linksErr) throw linksErr;

  const linkedScopes: NoteDeletePreview['linkedScopes'] = [];
  const linkCount = links?.length ?? 0;

  // 5. Note resource count
  const { count: noteResourceCount, error: noteResErr } = await sb
    .from('course_resource_items')
    .select('id', { count: 'exact', head: true })
    .eq('note_collection_id', noteCollectionId)
    .eq('kind', 'note_collection');
  if (noteResErr) throw noteResErr;

  // 6. Find excalidraw resources under the same scope(s)
  let excalidrawResourceCount = 0;
  const excalidrawItemIds = new Set<string>();

  if (links && links.length > 0) {
    for (const link of links) {
      // Fetch course, module, item titles
      const { data: course } = await sb
        .from('master_courses')
        .select('title, code')
        .eq('id', link.course_id)
        .maybeSingle();
      
      let moduleTitle: string | null = null;
      if (link.module_id) {
        const { data: mod } = await sb
          .from('master_course_modules')
          .select('title')
          .eq('id', link.module_id)
          .maybeSingle();
        moduleTitle = mod?.title ?? null;
      }

      let itemTitle: string | null = null;
      if (link.item_id) {
        const { data: item } = await sb
          .from('master_course_items')
          .select('title')
          .eq('id', link.item_id)
          .maybeSingle();
        itemTitle = item?.title ?? null;
      }

      linkedScopes.push({
        linkId: link.id,
        courseId: link.course_id,
        courseTitle: course?.title ?? 'Unknown Course',
        courseCode: course?.code ?? null,
        moduleId: link.module_id,
        moduleTitle,
        itemId: link.item_id,
        itemTitle,
      });

      // Query excalidraw resource items linked to the same scope(s)
      let sectionQuery = sb
        .from('course_resource_sections')
        .select('id')
        .eq('course_id', link.course_id);

      if (link.module_id) {
        sectionQuery = sectionQuery.eq('module_id', link.module_id);
      } else {
        sectionQuery = sectionQuery.is('module_id', null);
      }

      if (link.item_id) {
        sectionQuery = sectionQuery.eq('item_id', link.item_id);
      } else {
        sectionQuery = sectionQuery.is('item_id', null);
      }

      const { data: sections } = await sectionQuery;
      const sectionIds = (sections ?? []).map((s) => s.id);

      if (sectionIds.length > 0) {
        const { data: excalItems } = await sb
          .from('course_resource_items')
          .select('id')
          .in('section_id', sectionIds)
          .eq('kind', 'excalidraw_link');
        
        for (const item of excalItems ?? []) {
          excalidrawItemIds.add(item.id);
        }
      }
    }
  }

  excalidrawResourceCount = excalidrawItemIds.size;

  return {
    title: note.title,
    sourceType: note.source_type,
    moduleCount: moduleCount ?? 0,
    pageCount,
    linkCount,
    noteResourceCount: noteResourceCount ?? 0,
    excalidrawResourceCount,
    linkedScopes,
  };
}

export async function deleteNoteCollectionDeep(id: string, confirmationText: string): Promise<void> {
  if (confirmationText !== 'DELETE') {
    throw new Error('Confirmation text must be DELETE');
  }

  const sb = createAdminClient();

  // 1. Get scopes and associated resource counts
  const preview = await getNoteDeletePreview(id);

  // 2. Fetch affected course IDs to revalidate them
  const courseIds = [...new Set(preview.linkedScopes.map(scope => scope.courseId))];

  // 3. Delete matching Excalidraw resource items (rows in course_resource_items)
  // that are under resource sections in the same course scopes (exact course_id + module_id + item_id).
  if (preview.linkedScopes.length > 0) {
    for (const link of preview.linkedScopes) {
      let sectionQuery = sb
        .from('course_resource_sections')
        .select('id')
        .eq('course_id', link.courseId);

      if (link.moduleId) {
        sectionQuery = sectionQuery.eq('module_id', link.moduleId);
      } else {
        sectionQuery = sectionQuery.is('module_id', null);
      }

      if (link.itemId) {
        sectionQuery = sectionQuery.eq('item_id', link.itemId);
      } else {
        sectionQuery = sectionQuery.is('item_id', null);
      }

      const { data: sections } = await sectionQuery;
      const sectionIds = (sections ?? []).map((s) => s.id);

      if (sectionIds.length > 0) {
        const { error: deleteExcalErr } = await sb
          .from('course_resource_items')
          .delete()
          .in('section_id', sectionIds)
          .eq('kind', 'excalidraw_link');
        
        if (deleteExcalErr) throw deleteExcalErr;
      }
    }
  }

  // 4. Global deep delete of the note collection
  await deleteNoteCollection(id);

  // 5. Revalidate cache for the affected courses
  if (courseIds.length > 0) {
    const { revalidateCourseStructures } = await import('@/lib/cache/invalidate-course');
    await revalidateCourseStructures(courseIds);
  }
}
