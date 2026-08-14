import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateCourseStructure } from '@/lib/cache/invalidate-course';
import { COURSE_RESOURCES_BUCKET } from '@/types/database';
import type {
  CourseResourcesRow,
  CourseResourceScope,
  CourseResourceFileType,
  MasterCoursePublishStatus,
  MasterCourseItemsRow,
} from '@/types/database';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_MARKDOWN_BYTES = 2 * 1024 * 1024; // 2 MB

const ALLOWED_PDF_MIME = new Set(['application/pdf']);
const ALLOWED_MARKDOWN_MIME = new Set([
  'text/markdown',
  'text/plain',
  'text/x-markdown',
]);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateResourceInput {
  master_course_id: string;
  module_id: string;
  parent_item_id?: string | null;
  resource_scope: CourseResourceScope;
  resource_type: CourseResourceFileType;
  title: string;
  description?: string | null;
  content_markdown?: string | null;
  external_url?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  original_filename?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  sort_order?: number;
  publish_status?: MasterCoursePublishStatus;
  visible_to_students?: boolean;
  is_downloadable?: boolean;
  created_by?: string | null;
}

export interface UpdateResourceInput {
  title?: string;
  description?: string | null;
  content_markdown?: string | null;
  external_url?: string | null;
  sort_order?: number;
  publish_status?: MasterCoursePublishStatus;
  visible_to_students?: boolean;
  is_downloadable?: boolean;
}

export type ResourcePlacement =
  | { position: 'before'; reference_item_id: string }
  | { position: 'after'; reference_item_id: string }
  | { position: 'end' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstMetadataString(
  metadata: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) return value;
  }

  const contentJson = asRecord(metadata.content_json);
  for (const key of keys) {
    const value = contentJson[key];
    if (typeof value === 'string' && value.trim()) return value;
  }

  return null;
}

function resourceTypeForItemType(itemType: string | null): CourseResourceFileType | null {
  if (itemType === 'markdown' || itemType === 'pdf' || itemType === 'external_link') {
    return itemType;
  }

  return null;
}

type OrphanResourceItem = Pick<
  MasterCourseItemsRow,
  | 'id'
  | 'master_course_id'
  | 'module_id'
  | 'title'
  | 'description'
  | 'item_type'
  | 'sort_order'
  | 'publish_status'
  | 'metadata'
  | 'resource_id'
>;

function resourceInsertFromItem(item: OrphanResourceItem): CreateResourceInput | null {
  const resourceType = resourceTypeForItemType(item.item_type);
  if (!resourceType) return null;

  const metadata = asRecord(item.metadata);
  const markdownContent = resourceType === 'markdown'
    ? firstMetadataString(metadata, [
        'content_markdown',
        'content',
        'markdown_content',
        'markdown',
        'body',
        'notes',
      ]) ?? item.description
    : null;
  const externalUrl = resourceType === 'external_link'
    ? firstMetadataString(metadata, ['url', 'external_url', 'href', 'link'])
    : null;
  const storagePath = resourceType === 'pdf'
    ? firstMetadataString(metadata, ['file_path', 'storage_path', 'path'])
    : null;
  const originalFilename = firstMetadataString(metadata, ['filename', 'original_filename', 'file_name']);
  const mimeType = resourceType === 'pdf'
    ? firstMetadataString(metadata, ['mime_type', 'content_type']) ?? 'application/pdf'
    : resourceType === 'markdown'
      ? firstMetadataString(metadata, ['mime_type', 'content_type']) ?? 'text/markdown'
      : null;
  const sizeValue = metadata.size ?? metadata.size_bytes;

  return {
    master_course_id: item.master_course_id,
    module_id: item.module_id,
    resource_scope: 'module_item',
    resource_type: resourceType,
    title: item.title,
    description: markdownContent === item.description ? null : item.description,
    content_markdown: markdownContent,
    external_url: externalUrl,
    storage_bucket: storagePath ? COURSE_RESOURCES_BUCKET : null,
    storage_path: storagePath,
    original_filename: originalFilename,
    mime_type: mimeType,
    size_bytes: typeof sizeValue === 'number' ? sizeValue : null,
    sort_order: item.sort_order,
    publish_status: item.publish_status,
    visible_to_students: item.publish_status === 'published',
    is_downloadable: resourceType !== 'external_link',
  };
}

async function syncLinkedCurriculumItemFromResource(resource: CourseResourcesRow): Promise<void> {
  const admin = createAdminClient();

  const updates: Partial<MasterCourseItemsRow> = {
    title: resource.title,
    description: resource.description,
    publish_status: resource.publish_status,
  };

  const { error } = await admin
    .from('master_course_items')
    .update(updates)
    .eq('resource_id', resource.id);

  if (error) {
    console.warn('[course-resources] Failed to sync linked curriculum item:', error.message);
  }
}

async function backfillMissingResourceLinks(masterCourseId: string): Promise<void> {
  const admin = createAdminClient();
  let linkedAny = false;

  const { data: orphanItems, error } = await admin
    .from('master_course_items')
    .select('id, master_course_id, module_id, title, description, item_type, sort_order, publish_status, metadata, resource_id')
    .eq('master_course_id', masterCourseId)
    .in('item_type', ['markdown', 'pdf', 'external_link'])
    .is('resource_id', null)
    .order('sort_order', { ascending: true });

  if (error) {
    console.warn('[course-resources] Failed to find orphan resource items:', error.message);
    return;
  }

  for (const item of (orphanItems ?? []) as OrphanResourceItem[]) {
    const input = resourceInsertFromItem(item);
    if (!input) continue;

    try {
      const resource = await createResource(input);
      const { error: updateError } = await admin
        .from('master_course_items')
        .update({ resource_id: resource.id })
        .eq('id', item.id)
        .is('resource_id', null);

      if (updateError) {
        console.warn('[course-resources] Failed to link backfilled resource:', updateError.message);
      } else {
        linkedAny = true;
      }
    } catch (err) {
      console.warn(
        '[course-resources] Failed to backfill resource item:',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  if (linkedAny) {
    await revalidateCourseStructure(masterCourseId);
  }
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createResource(input: CreateResourceInput): Promise<CourseResourcesRow> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('course_resources')
    .insert({
      master_course_id: input.master_course_id,
      module_id: input.module_id,
      parent_item_id: input.parent_item_id ?? null,
      resource_scope: input.resource_scope,
      resource_type: input.resource_type,
      title: input.title,
      description: input.description ?? null,
      content_markdown: input.content_markdown ?? null,
      external_url: input.external_url ?? null,
      storage_bucket: input.storage_bucket ?? null,
      storage_path: input.storage_path ?? null,
      original_filename: input.original_filename ?? null,
      mime_type: input.mime_type ?? null,
      size_bytes: input.size_bytes ?? null,
      sort_order: input.sort_order ?? 0,
      publish_status: input.publish_status ?? 'published',
      visible_to_students: input.visible_to_students ?? true,
      is_downloadable: input.is_downloadable ?? true,
      created_by: input.created_by ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create resource: ${error?.message ?? 'No data returned'}`);
  }

  return data as CourseResourcesRow;
}

export async function updateResource(
  id: string,
  updates: UpdateResourceInput,
): Promise<CourseResourcesRow> {
  const admin = createAdminClient();

  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.content_markdown !== undefined) payload.content_markdown = updates.content_markdown;
  if (updates.external_url !== undefined) payload.external_url = updates.external_url;
  if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order;
  if (updates.publish_status !== undefined) payload.publish_status = updates.publish_status;
  if (updates.visible_to_students !== undefined) payload.visible_to_students = updates.visible_to_students;
  if (updates.is_downloadable !== undefined) payload.is_downloadable = updates.is_downloadable;

  const { data, error } = await admin
    .from('course_resources')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update resource: ${error?.message ?? 'No data returned'}`);
  }

  await syncLinkedCurriculumItemFromResource(data as CourseResourcesRow);
  await revalidateCourseStructure((data as CourseResourcesRow).master_course_id);

  return data as CourseResourcesRow;
}

export async function deleteResource(id: string): Promise<void> {
  const admin = createAdminClient();

  // Fetch resource and linked curriculum item in parallel
  const [{ data: resource }, { data: linkedItem }] = await Promise.all([
    admin
      .from('course_resources')
      .select('storage_bucket, storage_path')
      .eq('id', id)
      .single(),
    admin
      .from('master_course_items')
      .select('id')
      .eq('resource_id', id)
      .maybeSingle(),
  ]);

  if (linkedItem) {
    // Delete the curriculum item first
    const { error: itemError } = await admin
      .from('master_course_items')
      .delete()
      .eq('id', linkedItem.id);

    if (itemError) {
      console.error('Failed to delete linked curriculum item:', itemError);
    }
  }

  // 2. Delete the resource itself
  const { error } = await admin
    .from('course_resources')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete resource: ${error.message}`);
  }

  // 3. Clean up storage file if present
  if (resource?.storage_bucket && resource?.storage_path) {
    await admin.storage.from(resource.storage_bucket).remove([resource.storage_path]);
  }
}

async function _getResourceById(id: string): Promise<CourseResourcesRow | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('course_resources')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as CourseResourcesRow;
}

// ─── List / Query ────────────────────────────────────────────────────────────

export interface CourseResourceWithItem extends CourseResourcesRow {
  attached_item_title?: string | null;
}

export async function getCourseResourcesForAdmin(
  masterCourseId: string,
): Promise<CourseResourceWithItem[]> {
  const admin = createAdminClient();

  await backfillMissingResourceLinks(masterCourseId);

  const { data, error } = await admin
    .from('course_resources')
    .select('*, attached_item:master_course_items!course_resources_parent_item_id_fkey(title)')
    .eq('master_course_id', masterCourseId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch course resources: ${error.message}`);
  }

  return (data ?? []).map((r) => ({
    ...r,
    attached_item_title: (r.attached_item as { title?: string } | null)?.title ?? null,
  })) as CourseResourceWithItem[];
}

export async function listLessonAttachedResources(
  courseId: string,
  parentItemId: string,
): Promise<CourseResourcesRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('course_resources')
    .select('*')
    .eq('master_course_id', courseId)
    .eq('parent_item_id', parentItemId)
    .eq('resource_scope', 'lesson_attachment')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to list lesson resources: ${error.message}`);
  }

  return (data ?? []) as CourseResourcesRow[];
}

async function _listModuleResources(
  courseId: string,
  moduleId: string,
): Promise<CourseResourcesRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('course_resources')
    .select('*')
    .eq('master_course_id', courseId)
    .eq('module_id', moduleId)
    .eq('resource_scope', 'module_item')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to list module resources: ${error.message}`);
  }

  return (data ?? []) as CourseResourcesRow[];
}

// ─── File Upload ─────────────────────────────────────────────────────────────

export async function uploadPdfResource(
  masterCourseId: string,
  moduleId: string,
  file: File,
): Promise<{ storagePath: string; sizeBytes: number; mimeType: string }> {
  const admin = createAdminClient();

  if (!ALLOWED_PDF_MIME.has(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Only PDF files are allowed');
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(`PDF file size must be under ${MAX_PDF_BYTES / 1024 / 1024}MB`);
  }

  const storagePath = `${masterCourseId}/${moduleId}/${Date.now()}-${safeFilename(file.name)}`;
  const buf = await file.arrayBuffer();

  const { error } = await admin.storage
    .from(COURSE_RESOURCES_BUCKET)
    .upload(storagePath, buf, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }

  return {
    storagePath,
    sizeBytes: file.size,
    mimeType: file.type || 'application/pdf',
  };
}

export async function uploadMarkdownFileResource(
  masterCourseId: string,
  moduleId: string,
  file: File,
): Promise<{ storagePath: string; contentMarkdown: string; sizeBytes: number; mimeType: string }> {
  const admin = createAdminClient();

  const ext = file.name.toLowerCase().split('.').pop();
  if (ext !== 'md' && ext !== 'txt' && !ALLOWED_MARKDOWN_MIME.has(file.type)) {
    throw new Error('Only Markdown (.md) and plain text (.txt) files are allowed');
  }
  if (file.size > MAX_MARKDOWN_BYTES) {
    throw new Error(`Markdown file size must be under ${MAX_MARKDOWN_BYTES / 1024 / 1024}MB`);
  }

  // Read content as text
  const contentMarkdown = await file.text();

  const storagePath = `${masterCourseId}/${moduleId}/${Date.now()}-${safeFilename(file.name)}`;
  const buf = await file.arrayBuffer();

  const { error } = await admin.storage
    .from(COURSE_RESOURCES_BUCKET)
    .upload(storagePath, buf, {
      contentType: file.type || 'text/markdown',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload markdown file: ${error.message}`);
  }

  return {
    storagePath,
    contentMarkdown,
    sizeBytes: file.size,
    mimeType: file.type || 'text/markdown',
  };
}

// ─── Signed URL (for SuperAdmin preview) ─────────────────────────────────────

export async function getResourceSignedUrl(
  storagePath: string,
  expiresIn: number = 3600,
): Promise<string | null> {
  const admin = createAdminClient();

  const { data, error } = await admin.storage
    .from(COURSE_RESOURCES_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

// ─── Reorder ─────────────────────────────────────────────────────────────────

export async function reorderModuleResources(
  moduleId: string,
  resourceIds: string[],
): Promise<void> {
  const admin = createAdminClient();

  const updates = resourceIds.map((id, index) =>
    admin
      .from('course_resources')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('module_id', moduleId),
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    throw new Error(`Failed to reorder resources: ${errors[0].error!.message}`);
  }
}

// ─── Attach to Lesson ────────────────────────────────────────────────────────

export async function attachResourceToLesson(
  input: CreateResourceInput & { parent_item_id: string },
): Promise<CourseResourcesRow> {
  if (!input.parent_item_id) {
    throw new Error('parent_item_id is required for lesson attachments');
  }

  return createResource({
    ...input,
    resource_scope: 'lesson_attachment',
    parent_item_id: input.parent_item_id,
  });
}

export async function linkExistingResourceToLesson(
  resourceId: string,
  itemId: string,
): Promise<CourseResourcesRow> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('course_resources')
    .update({
      parent_item_id: itemId,
      resource_scope: 'lesson_attachment',
    })
    .eq('id', resourceId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to link resource to lesson: ${error.message}`);
  }

  return data as CourseResourcesRow;
}

export async function unattachResource(resourceId: string): Promise<void> {
  const admin = createAdminClient();

  // Clear the parent_item_id to detach the resource from a lesson
  const { error } = await admin
    .from('course_resources')
    .update({ parent_item_id: null, resource_scope: 'module_item' })
    .eq('id', resourceId);

  if (error) {
    throw new Error(`Failed to unattach resource: ${error.message}`);
  }
}

/**
 * When a new curriculum item is created in a module, add it to every course
 * variant that already includes at least one item from that same module.
 * Students on scoped variants otherwise never see newly linked resources.
 */
async function includeNewItemInMatchingVariants(
  masterCourseId: string,
  moduleId: string,
  newItemId: string,
): Promise<void> {
  const admin = createAdminClient();

  const { data: variants, error: variantsError } = await admin
    .from('course_variants')
    .select('id')
    .eq('master_course_id', masterCourseId);

  if (variantsError || !variants?.length) return;

  const variantIds = variants.map((v) => v.id);

  const { data: moduleItems } = await admin
    .from('master_course_items')
    .select('id')
    .eq('module_id', moduleId);

  const moduleItemIds = (moduleItems ?? []).map((i) => i.id);
  if (moduleItemIds.length === 0) return;

  const { data: existingVariantItems } = await admin
    .from('course_variant_items')
    .select('course_variant_id, master_course_item_id, sort_order')
    .in('course_variant_id', variantIds)
    .in('master_course_item_id', moduleItemIds);

  if (!existingVariantItems?.length) return;

  const variantsWithModuleItems = new Set(
    existingVariantItems.map((row) => row.course_variant_id),
  );

  const alreadyHasNewItem = new Set(
    existingVariantItems
      .filter((row) => row.master_course_item_id === newItemId)
      .map((row) => row.course_variant_id),
  );

  const maxSortByVariant = new Map<string, number>();
  for (const row of existingVariantItems) {
    const prev = maxSortByVariant.get(row.course_variant_id) ?? -1;
    if (row.sort_order > prev) maxSortByVariant.set(row.course_variant_id, row.sort_order);
  }

  const inserts = [...variantsWithModuleItems]
    .filter((variantId) => !alreadyHasNewItem.has(variantId))
    .map((variantId) => ({
      course_variant_id: variantId,
      master_course_item_id: newItemId,
      inclusion_type: 'selected_item' as const,
      sort_order: (maxSortByVariant.get(variantId) ?? -1) + 1,
    }));

  if (inserts.length === 0) return;

  const { error: insertError } = await admin.from('course_variant_items').insert(inserts);
  if (insertError) {
    console.warn(
      '[includeNewItemInMatchingVariants] failed to add item to variants:',
      insertError.message,
    );
  }
}

// ─── Standalone Module Resource ──────────────────────────────────────────────

export async function createStandaloneModuleResource(
  input: CreateResourceInput,
  placement: ResourcePlacement,
): Promise<{ resource: CourseResourcesRow; itemId: string }> {
  const admin = createAdminClient();

  // Calculate sort_order based on placement
  let targetSortOrder: number;

  if (placement.position === 'end') {
    // Get max sort_order in the module
    const { data: lastItem } = await admin
      .from('master_course_items')
      .select('sort_order')
      .eq('module_id', input.module_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    targetSortOrder = (lastItem?.sort_order ?? -1) + 1;
  } else {
    // Get reference item's sort_order
    const { data: refItem } = await admin
      .from('master_course_items')
      .select('sort_order')
      .eq('id', placement.reference_item_id)
      .single();
    if (!refItem) throw new Error('Reference item not found');
    targetSortOrder = placement.position === 'before'
      ? refItem.sort_order
      : refItem.sort_order + 1;

    // Shift items after the insertion point
    try {
      await admin.rpc('increment_sort_order', {
        p_module_id: input.module_id,
        p_after_sort_order: targetSortOrder,
      });
    } catch {
      // If rpc doesn't exist, fall back to manual shift
    }

    // Manual shift as fallback
    const { data: shiftItems } = await admin
      .from('master_course_items')
      .select('id, sort_order')
      .eq('module_id', input.module_id)
      .gte('sort_order', targetSortOrder)
      .order('sort_order', { ascending: false });

    if (shiftItems) {
      await Promise.all(
        shiftItems.map((item) =>
          admin
            .from('master_course_items')
            .update({ sort_order: item.sort_order + 1 })
            .eq('id', item.id),
        ),
      );
    }
  }

  // Create the resource
  const resource = await createResource({
    ...input,
    resource_scope: 'module_item',
    sort_order: targetSortOrder,
  });

  // Create corresponding master_course_items row
  const itemTypeMap: Record<CourseResourceFileType, string> = {
    markdown: 'markdown',
    pdf: 'pdf',
    external_link: 'external_link',
  };

  const placementMeta: Record<string, unknown> =
    placement.position === 'end'
      ? { placement: 'end' }
      : {
          placement: placement.position === 'after' ? 'after_video' : 'before_item',
          linked_item_id: placement.reference_item_id,
        };

  if (placement.position !== 'end') {
    const { data: refItem } = await admin
      .from('master_course_items')
      .select('id, item_type')
      .eq('id', placement.reference_item_id)
      .maybeSingle();
    if (refItem?.item_type === 'video') {
      placementMeta.linked_video_id = refItem.id;
    }
  }

  const { data: item, error: itemError } = await admin
    .from('master_course_items')
    .insert({
      master_course_id: input.master_course_id,
      module_id: input.module_id,
      title: input.title,
      description: input.description ?? null,
      item_type: itemTypeMap[input.resource_type],
      sort_order: targetSortOrder,
      publish_status: input.publish_status ?? 'published',
      is_preview: false,
      is_required: true,
      resource_id: resource.id,
      metadata: {
        resource_type: input.resource_type,
        ...(input.external_url ? { url: input.external_url } : {}),
        ...(input.storage_path ? { file_path: input.storage_path } : {}),
        ...(input.original_filename ? { filename: input.original_filename } : {}),
        ...(input.size_bytes ? { size: input.size_bytes } : {}),
        ...placementMeta,
      },
    })
    .select('id')
    .single();

  if (itemError || !item) {
    // Rollback resource creation
    await deleteResource(resource.id);
    throw new Error(`Failed to create curriculum item: ${itemError?.message ?? 'No data'}`);
  }

  await includeNewItemInMatchingVariants(input.master_course_id, input.module_id, item.id);
  await revalidateCourseStructure(input.master_course_id);

  return { resource, itemId: item.id };
}

// ─── Promote Existing Resource to Curriculum Item ───────────────────────────

export async function promoteResourceToCurriculum(
  resourceId: string,
  placement: ResourcePlacement,
): Promise<{ resource: CourseResourcesRow; itemId: string }> {
  const admin = createAdminClient();

  // Fetch the existing resource
  const { data: resource, error: fetchError } = await admin
    .from('course_resources')
    .select('*')
    .eq('id', resourceId)
    .single();

  if (fetchError || !resource) {
    throw new Error(`Resource not found: ${fetchError?.message ?? 'No data'}`);
  }

  // Calculate sort_order based on placement
  let targetSortOrder: number;

  if (placement.position === 'end') {
    const { data: lastItem } = await admin
      .from('master_course_items')
      .select('sort_order')
      .eq('module_id', resource.module_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    targetSortOrder = (lastItem?.sort_order ?? -1) + 1;
  } else {
    const { data: refItem } = await admin
      .from('master_course_items')
      .select('sort_order')
      .eq('id', placement.reference_item_id)
      .single();
    if (!refItem) throw new Error('Reference item not found');
    targetSortOrder = placement.position === 'before'
      ? refItem.sort_order
      : refItem.sort_order + 1;

    // Shift items after the insertion point
    try {
      await admin.rpc('increment_sort_order', {
        p_module_id: resource.module_id,
        p_after_sort_order: targetSortOrder,
      });
    } catch {
      // If rpc doesn't exist, fall back to manual shift
    }

    const { data: shiftItems } = await admin
      .from('master_course_items')
      .select('id, sort_order')
      .eq('module_id', resource.module_id)
      .gte('sort_order', targetSortOrder)
      .order('sort_order', { ascending: false });

    if (shiftItems) {
      await Promise.all(
        shiftItems.map((item) =>
          admin
            .from('master_course_items')
            .update({ sort_order: item.sort_order + 1 })
            .eq('id', item.id),
        ),
      );
    }
  }

  // Update the resource to be a module_item
  const { error: updateError } = await admin
    .from('course_resources')
    .update({
      resource_scope: 'module_item',
      sort_order: targetSortOrder,
    })
    .eq('id', resourceId);

  if (updateError) {
    throw new Error(`Failed to update resource: ${updateError.message}`);
  }

  // Create corresponding master_course_items row
  const itemTypeMap: Record<CourseResourceFileType, string> = {
    markdown: 'markdown',
    pdf: 'pdf',
    external_link: 'external_link',
  };

  const placementMeta: Record<string, unknown> =
    placement.position === 'end'
      ? { placement: 'end' }
      : {
          placement: placement.position === 'after' ? 'after_video' : 'before_item',
          linked_item_id: placement.reference_item_id,
        };

  // If anchoring to a video, also set linked_video_id so the student player
  // can virtual-sort this note next to that lesson (same pattern as quizzes).
  if (placement.position !== 'end') {
    const { data: refItem } = await admin
      .from('master_course_items')
      .select('id, item_type')
      .eq('id', placement.reference_item_id)
      .maybeSingle();
    if (refItem?.item_type === 'video') {
      placementMeta.linked_video_id = refItem.id;
    }
  }

  const { data: item, error: itemError } = await admin
    .from('master_course_items')
    .insert({
      master_course_id: resource.master_course_id,
      module_id: resource.module_id,
      title: resource.title,
      description: resource.description ?? null,
      item_type: itemTypeMap[resource.resource_type as CourseResourceFileType] ?? 'resource',
      sort_order: targetSortOrder,
      publish_status: resource.publish_status ?? 'published',
      is_preview: false,
      is_required: true,
      resource_id: resource.id,
      metadata: {
        resource_type: resource.resource_type,
        ...(resource.external_url ? { url: resource.external_url } : {}),
        ...(resource.storage_path ? { file_path: resource.storage_path } : {}),
        ...(resource.original_filename ? { filename: resource.original_filename } : {}),
        ...(resource.size_bytes ? { size: resource.size_bytes } : {}),
        ...placementMeta,
      },
    })
    .select('id')
    .single();

  if (itemError || !item) {
    throw new Error(`Failed to create curriculum item: ${itemError?.message ?? 'No data'}`);
  }

  await includeNewItemInMatchingVariants(
    resource.master_course_id,
    resource.module_id,
    item.id,
  );
  await revalidateCourseStructure(resource.master_course_id);

  return { resource: resource as CourseResourcesRow, itemId: item.id };
}

/**
 * Move an existing curriculum resource item to a new before/after/end placement.
 */
export async function relocateCurriculumResource(
  resourceId: string,
  placement: ResourcePlacement,
): Promise<{ itemId: string; sort_order: number }> {
  const admin = createAdminClient();

  const { data: resource, error: resourceError } = await admin
    .from('course_resources')
    .select('id, module_id, master_course_id')
    .eq('id', resourceId)
    .single();

  if (resourceError || !resource) {
    throw new Error(`Resource not found: ${resourceError?.message ?? 'No data'}`);
  }

  const { data: item, error: itemError } = await admin
    .from('master_course_items')
    .select('id, module_id, sort_order, metadata')
    .eq('resource_id', resourceId)
    .maybeSingle();

  if (itemError || !item) {
    throw new Error('This resource is not in the curriculum yet. Publish it as a curriculum item first.');
  }

  let targetSortOrder: number;
  let placementMeta: Record<string, unknown> = { placement: 'end' };

  if (placement.position === 'end') {
    const { data: lastItem } = await admin
      .from('master_course_items')
      .select('sort_order')
      .eq('module_id', item.module_id)
      .neq('id', item.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    targetSortOrder = (lastItem?.sort_order ?? -1) + 1;
    placementMeta = { placement: 'end' };
  } else {
    if (placement.reference_item_id === item.id) {
      throw new Error('Cannot place a resource relative to itself');
    }

    const { data: refItem } = await admin
      .from('master_course_items')
      .select('id, sort_order, item_type, title')
      .eq('id', placement.reference_item_id)
      .single();

    if (!refItem) throw new Error('Reference item not found');

    // Insert exactly adjacent to the reference item, then shift everything at or
    // after the slot. The student playlist sorts strictly by sort_order, so a
    // "+5" style offset overshoots when module items use dense sequences (1,2,3…).
    targetSortOrder =
      placement.position === 'before'
        ? (refItem.sort_order ?? 0)
        : (refItem.sort_order ?? 0) + 1;

    const { data: shiftItems } = await admin
      .from('master_course_items')
      .select('id, sort_order')
      .eq('module_id', item.module_id)
      .gte('sort_order', targetSortOrder)
      .neq('id', item.id)
      .order('sort_order', { ascending: false });

    if (shiftItems && shiftItems.length > 0) {
      for (const shiftItem of shiftItems) {
        await admin
          .from('master_course_items')
          .update({ sort_order: shiftItem.sort_order + 1 })
          .eq('id', shiftItem.id);
      }
    }

    placementMeta = {
      placement: placement.position === 'after' ? 'after_video' : 'before_item',
      linked_item_id: refItem.id,
      ...(refItem.item_type === 'video' ? { linked_video_id: refItem.id } : {}),
    };
  }

  const existingMetadata = asRecord(item.metadata);
  const { error: updateItemError } = await admin
    .from('master_course_items')
    .update({
      sort_order: targetSortOrder,
      metadata: {
        ...existingMetadata,
        ...placementMeta,
      },
    })
    .eq('id', item.id);

  if (updateItemError) {
    throw new Error(`Failed to move curriculum item: ${updateItemError.message}`);
  }

  await admin
    .from('course_resources')
    .update({ sort_order: targetSortOrder })
    .eq('id', resourceId);

  await revalidateCourseStructure(resource.master_course_id);

  return { itemId: item.id, sort_order: targetSortOrder };
}
