import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateCourseStructure } from '@/lib/cache/invalidate-course';
import { generateItemSlug } from '@/lib/utils/slug';
import { deleteLessonQuiz } from '@/lib/services/lesson-quiz-admin';
import type {
  MasterCourseModulesRow,
  MasterCourseItemsRow,
  MasterCoursePublishStatus,
  MasterCourseItemType,
  MasterCoursesRow,
  VideoAssetsRow,
} from '@/types/database';

// --- Types --------------------------------------------------------------------

export interface CreateModuleInput {
  master_course_id: string;
  title: string;
  description?: string;
  slug?: string;
  sort_order?: number;
  publish_status?: MasterCoursePublishStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateModuleInput {
  title?: string;
  description?: string;
  slug?: string;
  sort_order?: number;
  publish_status?: MasterCoursePublishStatus;
  metadata?: Record<string, unknown>;
}

export interface CreateItemInput {
  master_course_id: string;
  module_id: string;
  title: string;
  description?: string;
  item_type: MasterCourseItemType;
  sort_order?: number;
  publish_status?: MasterCoursePublishStatus;
  video_asset_id?: string;
  is_preview?: boolean;
  is_required?: boolean;
  duration_seconds?: number | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateItemInput {
  title?: string;
  description?: string;
  item_type?: MasterCourseItemType;
  sort_order?: number;
  publish_status?: MasterCoursePublishStatus;
  video_asset_id?: string | null;
  quiz_id?: string | null;
  is_preview?: boolean;
  is_required?: boolean;
  duration_seconds?: number | null;
  metadata?: Record<string, unknown>;
}

// --- Module CRUD --------------------------------------------------------------

export async function createModule(input: CreateModuleInput): Promise<MasterCourseModulesRow> {
  const admin = createAdminClient();

  // Calculate generic sort_order if not provided
  let sort_order = input.sort_order;
  if (sort_order === undefined) {
    const { data: latest } = await admin
      .from('master_course_modules')
      .select('sort_order')
      .eq('master_course_id', input.master_course_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    sort_order = latest ? latest.sort_order + 10 : 0;
  }

  let publish_status = input.publish_status;
  let visible_to_students: boolean | undefined;
  if (!publish_status) {
    const { data: course } = await admin
      .from('master_courses')
      .select('publish_status')
      .eq('id', input.master_course_id)
      .maybeSingle();
    
    if (course?.publish_status === 'published') {
      publish_status = 'published';
      visible_to_students = true;
    } else {
      publish_status = 'draft';
    }
  }

  const { data, error } = await admin
    .from('master_course_modules')
    .insert({
      master_course_id: input.master_course_id,
      title: input.title,
      description: input.description ?? null,
      slug: input.slug ?? null,
      sort_order,
      publish_status,
      ...(visible_to_students !== undefined ? { visible_to_students } : {}),
      metadata: (input.metadata ?? {}) as MasterCourseModulesRow['metadata'],
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create module: ${error?.message ?? 'No data returned'}`);
  }

  revalidateCourseStructure(input.master_course_id);

  return data;
}

export async function updateModule(
  moduleId: string,
  input: UpdateModuleInput
): Promise<MasterCourseModulesRow> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('master_course_modules')
    .update({
      title: input.title,
      description: input.description,
      slug: input.slug,
      sort_order: input.sort_order,
      publish_status: input.publish_status,
      metadata: input.metadata ? (input.metadata as MasterCourseModulesRow['metadata']) : undefined,
    })
    .eq('id', moduleId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update module: ${error?.message ?? 'No data returned'}`);
  }

  const { data: moduleRow } = await admin
    .from('master_course_modules')
    .select('master_course_id')
    .eq('id', moduleId)
    .maybeSingle();

  if (moduleRow?.master_course_id) {
    revalidateCourseStructure(moduleRow.master_course_id);
  }

  return data;
}

export async function deleteModule(moduleId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('master_course_modules').delete().eq('id', moduleId);
  
  if (error) {
    throw new Error(`Failed to delete module: ${error.message}`);
  }
}

async function _listModules(masterCourseId: string): Promise<MasterCourseModulesRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('master_course_modules')
    .select('*')
    .eq('master_course_id', masterCourseId)
    .or('publish_status.neq.unpublished,tp_folder_uuid.not.is.null')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to list modules: ${error.message}`);
  }

  return data ?? [];
}

export async function reorderModules(masterCourseId: string, moduleIds: string[]): Promise<void> {
  const admin = createAdminClient();
  
  // Basic optimization: don't bulk update if empty
  if (!moduleIds.length) return;

  await Promise.all(
    moduleIds.map((id, i) =>
      admin
        .from('master_course_modules')
        .update({ sort_order: i * 10 })
        .eq('id', id)
        .eq('master_course_id', masterCourseId)
        .then(({ error }) => {
          if (error) console.error(`Error reordering module ${id}:`, error);
        }),
    ),
  );
}

// --- Item CRUD ----------------------------------------------------------------

export async function createItem(input: CreateItemInput): Promise<MasterCourseItemsRow> {
  const admin = createAdminClient();

  // Calculate generic sort_order if not provided
  let sort_order = input.sort_order;
  if (sort_order === undefined) {
    const { data: latest } = await admin
      .from('master_course_items')
      .select('sort_order')
      .eq('module_id', input.module_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    sort_order = latest ? latest.sort_order + 10 : 0;
  }

  // Generate unique slug within the course
  const { data: existingItems } = await admin
    .from('master_course_items')
    .select('slug')
    .eq('master_course_id', input.master_course_id);

  const existingSlugs = new Set(
    (existingItems ?? [])
      .map((i) => i.slug)
      .filter((s): s is string => s != null),
  );
  const slug = generateItemSlug(input.title, existingSlugs);

  let publish_status = input.publish_status;
  if (!publish_status) {
    const { data: course } = await admin
      .from('master_courses')
      .select('publish_status')
      .eq('id', input.master_course_id)
      .maybeSingle();
    publish_status = course?.publish_status === 'published' ? 'published' : 'draft';
  }

  const { data, error } = await admin
    .from('master_course_items')
    .insert({
      master_course_id: input.master_course_id,
      module_id: input.module_id,
      title: input.title,
      slug,
      description: input.description ?? null,
      item_type: input.item_type,
      sort_order,
      publish_status,
      video_asset_id: input.video_asset_id ?? null,
      is_preview: input.is_preview ?? false,
      is_required: input.is_required ?? true,
      duration_seconds: input.duration_seconds ?? null,
      metadata: (input.metadata ?? {}) as MasterCourseItemsRow['metadata'],
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create item: ${error?.message ?? 'No data returned'}`);
  }

  revalidateCourseStructure(input.master_course_id);

  return data;
}

export async function updateItem(
  itemId: string,
  input: UpdateItemInput
): Promise<MasterCourseItemsRow> {
  const admin = createAdminClient();

  // If title changed, regenerate slug
  let slug: string | undefined;
  if (input.title) {
    const { data: currentItem } = await admin
      .from('master_course_items')
      .select('master_course_id, slug')
      .eq('id', itemId)
      .maybeSingle();

    if (currentItem) {
      const { data: existingItems } = await admin
        .from('master_course_items')
        .select('slug')
        .eq('master_course_id', currentItem.master_course_id)
        .neq('id', itemId);

      const existingSlugs = new Set(
        (existingItems ?? [])
          .map((i) => i.slug)
          .filter((s): s is string => s != null),
      );
      slug = generateItemSlug(input.title, existingSlugs);
    }
  }

  // Merge metadata if provided
  let mergedMetadata = input.metadata;
  if (input.metadata) {
    const { data: currentItem } = await admin
      .from('master_course_items')
      .select('metadata')
      .eq('id', itemId)
      .maybeSingle();

    if (currentItem?.metadata) {
      mergedMetadata = {
        ...(currentItem.metadata as Record<string, unknown>),
        ...(input.metadata as Record<string, unknown>),
      };
    }
  }

  const { data, error } = await admin
    .from('master_course_items')
    .update({
      title: input.title,
      ...(slug !== undefined ? { slug } : {}),
      description: input.description,
      item_type: input.item_type,
      sort_order: input.sort_order,
      publish_status: input.publish_status,
      video_asset_id: input.video_asset_id,
      quiz_id: input.quiz_id,
      is_preview: input.is_preview,
      is_required: input.is_required,
      duration_seconds: input.duration_seconds,
      metadata: mergedMetadata !== undefined ? (mergedMetadata as MasterCourseItemsRow['metadata']) : undefined,
    })
    .eq('id', itemId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update item: ${error?.message ?? 'No data returned'}`);
  }

  if (data.master_course_id) {
    revalidateCourseStructure(data.master_course_id);
  }

  return data;
}

export async function deleteItem(itemId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('master_course_items')
    .select('id, quiz_id, master_course_id, item_type')
    .eq('id', itemId)
    .maybeSingle();

  // Quiz placeholders need full cleanup (attempts + quiz definition), not just the item row
  if (existing?.item_type === 'quiz_placeholder') {
    await deleteLessonQuiz(itemId);
    return;
  }

  const { error } = await admin.from('master_course_items').delete().eq('id', itemId);

  if (error) {
    throw new Error(`Failed to delete item: ${error.message}`);
  }

  if (existing?.master_course_id) {
    await revalidateCourseStructure(existing.master_course_id);
  }
}

async function _listItems(moduleId: string): Promise<MasterCourseItemsRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('master_course_items')
    .select('*')
    .eq('module_id', moduleId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to list items: ${error.message}`);
  }

  return data ?? [];
}

export async function reorderItems(moduleId: string, itemIds: string[]): Promise<void> {
  const admin = createAdminClient();
  
  if (!itemIds.length) return;

  await Promise.all(
    itemIds.map((id, i) =>
      admin
        .from('master_course_items')
        .update({ sort_order: i * 10 })
        .eq('id', id)
        .eq('module_id', moduleId)
        .then(({ error }) => {
          if (error) console.error(`Error reordering item ${id}:`, error);
        }),
    ),
  );
}

// --- Publish: module videos → lessons -----------------------------------------

function videoAttachedModuleId(video: Pick<VideoAssetsRow, 'master_course_module_id' | 'module_id'>): string | null {
  return video.master_course_module_id ?? video.module_id ?? null;
}

/**
 * Ensures completed, active videos that sit on a course module appear as lesson rows.
 * LMS and publish checks use `master_course_items`; SuperAdmin often only links `video_assets` to modules.
 * Idempotent: skips assets already referenced by any item in this course.
 */
export async function syncModuleVideosToCourseLessons(courseId: string): Promise<{ createdCount: number }> {
  const admin = createAdminClient();

  const { data: itemRows, error: itemsErr } = await admin
    .from('master_course_items')
    .select('video_asset_id')
    .eq('master_course_id', courseId);

  if (itemsErr) {
    throw new Error(`Failed to load course items: ${itemsErr.message}`);
  }

  const linkedVideoIds = new Set<string>();
  for (const i of itemRows ?? []) {
    if (i.video_asset_id && i.video_asset_id.length > 0) {
      linkedVideoIds.add(i.video_asset_id);
    }
  }

  const { data: modules, error: modErr } = await admin
    .from('master_course_modules')
    .select('id, sort_order')
    .eq('master_course_id', courseId)
    .order('sort_order', { ascending: true });

  if (modErr) {
    throw new Error(`Failed to load modules: ${modErr.message}`);
  }

  const moduleIds = new Set((modules ?? []).map((m) => m.id));
  const moduleOrder = new Map<string, number>();
  for (let idx = 0; idx < (modules ?? []).length; idx++) {
    moduleOrder.set(modules![idx].id, idx);
  }

  const { data: videos, error: vidErr } = await admin
    .from('video_assets')
    .select('*')
    .eq('master_course_id', courseId)
    .eq('sync_status', 'active')
    .is('removed_at', null);

  if (vidErr) {
    throw new Error(`Failed to load videos: ${vidErr.message}`);
  }

  const candidates = (videos ?? []).filter((v) => {
    const moduleId = videoAttachedModuleId(v as VideoAssetsRow);
    if (!moduleId || !moduleIds.has(moduleId)) return false;
    if (v.processing_status !== 'completed') return false;
    if (linkedVideoIds.has(v.id)) return false;
    return true;
  });

  candidates.sort((a, b) => {
    const ma = videoAttachedModuleId(a as VideoAssetsRow) ?? '';
    const mb = videoAttachedModuleId(b as VideoAssetsRow) ?? '';
    const ordA = moduleOrder.get(ma) ?? 0;
    const ordB = moduleOrder.get(mb) ?? 0;
    if (ordA !== ordB) return ordA - ordB;
    const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (so !== 0) return so;
    return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
  });

  let createdCount = 0;
  const touchedModules = new Set<string>();
  const moduleSortOrders = new Map<string, number>();

  for (const row of candidates) {
    const v = row as VideoAssetsRow;
    const moduleId = videoAttachedModuleId(v)!;

    if (!moduleSortOrders.has(moduleId)) {
      const { data: latest } = await admin
        .from('master_course_items')
        .select('sort_order')
        .eq('module_id', moduleId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      moduleSortOrders.set(moduleId, latest ? latest.sort_order : 0);
    }

    const currentMax = moduleSortOrders.get(moduleId) ?? 0;
    const nextSortOrder = currentMax + 10;
    moduleSortOrders.set(moduleId, nextSortOrder);

    try {
      await createItem({
        master_course_id: courseId,
        module_id: moduleId,
        title: v.title?.trim() || 'Video',
        description: v.description?.trim() || undefined,
        item_type: 'video',
        publish_status: 'published',
        video_asset_id: v.id,
        duration_seconds: v.duration_seconds,
        is_preview: false,
        is_required: true,
        sort_order: nextSortOrder,
      });
      linkedVideoIds.add(v.id);
      touchedModules.add(moduleId);
      createdCount++;
    } catch (err) {
      console.error(`Failed to sync video ${v.id} as master course item:`, err);
    }
  }

  // Sync descriptions from video_assets to existing linked items that are missing them.
  // This handles the case where a description was added to a video asset after the
  // course item was initially created without one.
  if (linkedVideoIds.size > 0) {
    const { data: linkedItems } = await admin
      .from('master_course_items')
      .select('id, video_asset_id')
      .eq('master_course_id', courseId)
      .not('video_asset_id', 'is', null)
      .is('description', null);

    for (const item of linkedItems ?? []) {
      if (!item.video_asset_id) continue;
      const vRow = (videos ?? []).find(
        (v) => v.id === item.video_asset_id,
      );
      const trimmedDesc = vRow?.description?.trim() || null;
      if (trimmedDesc) {
        await admin
          .from('master_course_items')
          .update({ description: trimmedDesc })
          .eq('id', item.id);
      }
    }
  }

  const moduleUpdateSettled = await Promise.allSettled(
    Array.from(touchedModules).map(async (moduleId) => {
      const { error: upErr } = await admin
        .from('master_course_modules')
        .update({
          publish_status: 'published',
          visible_to_students: true,
        })
        .eq('id', moduleId)
        .eq('master_course_id', courseId);

      if (upErr) {
        throw new Error(`Failed to update module for publish: ${upErr.message}`);
      }
    }),
  );

  for (const r of moduleUpdateSettled) {
    if (r.status === 'rejected') {
      throw r.reason;
    }
  }

  return { createdCount };
}

/**
 * Idempotently upsert a single lesson item for a completed video asset.
 * 
 * Does NOT publish the parent module automatically - caller is responsible for that.
 * 
 * @returns The created/updated item, or null if video is not a valid candidate
 */
export async function upsertLessonItemForVideoAsset(
  videoAssetId: string,
): Promise<{ item: MasterCourseItemsRow | null; created: boolean }> {
  const admin = createAdminClient();

  const { data: video, error: videoError } = await admin
    .from('video_assets')
    .select('id, master_course_id, master_course_module_id, module_id, title, description, duration_seconds, processing_status, sync_status, removed_at')
    .eq('id', videoAssetId)
    .maybeSingle();

  if (videoError || !video) {
    return { item: null, created: false };
  }

  if (video.sync_status !== 'active') {
    return { item: null, created: false };
  }

  if (video.processing_status !== 'completed') {
    return { item: null, created: false };
  }

  const moduleId = video.master_course_module_id ?? video.module_id;
  if (!moduleId) {
    return { item: null, created: false };
  }

  const { data: existingItems } = await admin
    .from('master_course_items')
    .select('id, video_asset_id')
    .eq('master_course_id', video.master_course_id)
    .not('video_asset_id', 'is', null);

  const linkedItem = (existingItems ?? []).find(
    (item) => item.video_asset_id === videoAssetId,
  );

  if (linkedItem) {
    // Sync description from video asset to course item if the asset has one
    // and the item is missing it.
    const trimmedDesc = video.description?.trim() || null;
    if (trimmedDesc) {
      await admin
        .from('master_course_items')
        .update({ description: trimmedDesc })
        .eq('id', linkedItem.id)
        .is('description', null);
    }
    return { item: null, created: false };
  }

  const { data: latestItem } = await admin
    .from('master_course_items')
    .select('sort_order')
    .eq('module_id', moduleId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = latestItem ? latestItem.sort_order + 10 : 0;

  const { data: newItem, error: insertError } = await admin
    .from('master_course_items')
    .insert({
      master_course_id: video.master_course_id,
      module_id: moduleId,
      title: video.title?.trim() || 'Video',
      description: video.description?.trim() || null,
      item_type: 'video',
      publish_status: 'published',
      video_asset_id: videoAssetId,
      duration_seconds: video.duration_seconds ?? null,
      is_preview: false,
      is_required: true,
      sort_order,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('[upsertLessonItemForVideoAsset] Failed to create item:', insertError);
    return { item: null, created: false };
  }

  return { item: newItem as MasterCourseItemsRow, created: true };
}

// --- Resources ----------------------------------------------------------------

const ALLOWED_RESOURCE_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/mpeg',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'application/zip',
  'application/x-zip-compressed',
]);

export async function uploadCourseResource(
  masterCourseId: string,
  file: File
): Promise<{ url: string; filepath: string }> {
  const admin = createAdminClient();

  if (!ALLOWED_RESOURCE_MIME_TYPES.has(file.type)) {
    throw new Error(`File type "${file.type}" is not allowed. Allowed types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, Images, Videos, Audio, ZIP`);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
  const timestamp = Date.now();
  const filePath = `${masterCourseId}/${timestamp}-${safeName}`;

  const { data, error } = await admin.storage
    .from('course_resources')
    .upload(filePath, file, { upsert: false });

  if (error || !data) {
    throw new Error(`Failed to upload resource: ${error?.message ?? 'Unknown error'}`);
  }

  const { data: urlData } = admin.storage
    .from('course_resources')
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    filepath: data.path,
  };
}

// --- Complex Retrieval --------------------------------------------------------

export interface CourseCurriculum {
  modules: (MasterCourseModulesRow & {
    items: MasterCourseItemsRow[];
  })[];
}

export async function getCourseCurriculum(masterCourseId: string): Promise<CourseCurriculum> {
  const admin = createAdminClient();

  // SuperAdmin sees ALL modules/items for a course (no publish_status filter)
  const [{ data: modules, error: modulesError }, { data: items, error: itemsError }] = await Promise.all([
    admin
      .from('master_course_modules')
      .select('*')
      .eq('master_course_id', masterCourseId)
      .order('sort_order', { ascending: true }),
    admin
      .from('master_course_items')
      .select('*')
      .eq('master_course_id', masterCourseId)
      .order('sort_order', { ascending: true })
  ]);

  if (modulesError) throw new Error(`Failed to fetch curriculum modules: ${modulesError.message}`);
  if (itemsError) throw new Error(`Failed to fetch curriculum items: ${itemsError.message}`);

  const enrichedModules = (modules || []).map((m) => ({
    ...m,
    items: (items || []).filter((i) => i.module_id === m.id),
  }));

  return { modules: enrichedModules };
}

// --- Course Builder -----------------------------------------------------------

export interface CourseBuilderData {
  course: MasterCoursesRow;
  modules: MasterCourseModulesRow[];
  items: MasterCourseItemsRow[];
  linkedVideos: Record<string, VideoAssetsRow>; // mapped by video_asset_id
  unlinkedVideos: VideoAssetsRow[];
}

async function _getCourseBuilder(courseId: string): Promise<CourseBuilderData> {
  const admin = createAdminClient();

  const [
    { data: course, error: courseError },
    { data: modules, error: modulesError },
    { data: items, error: itemsError },
    { data: videos, error: videosError },
  ] = await Promise.all([
    admin.from('master_courses').select('*').eq('id', courseId).single(),
    admin.from('master_course_modules')
      .select('*')
      .eq('master_course_id', courseId)
      .or('publish_status.neq.unpublished,tp_folder_uuid.not.is.null')
      .order('sort_order', { ascending: true }),
    admin.from('master_course_items').select('*').eq('master_course_id', courseId).order('sort_order', { ascending: true }),
    admin.from('video_assets').select('*').eq('master_course_id', courseId).eq('sync_status', 'active'),
  ]);

  if (courseError || !course) throw new Error(`Course not found: ${courseError?.message}`);
  if (modulesError) throw new Error(`Modules error: ${modulesError.message}`);
  if (itemsError) throw new Error(`Items error: ${itemsError.message}`);
  if (videosError) throw new Error(`Videos error: ${videosError.message}`);

  const linkedVideos: Record<string, VideoAssetsRow> = {};
  const linkedVideoIds = new Set<string>();

  for (const item of items || []) {
    if (item.video_asset_id) {
      linkedVideoIds.add(item.video_asset_id);
    }
  }

  const unlinkedVideos: VideoAssetsRow[] = [];

  for (const video of videos || []) {
    if (linkedVideoIds.has(video.id)) {
      linkedVideos[video.id] = video as VideoAssetsRow;
    } else {
      unlinkedVideos.push(video as VideoAssetsRow);
    }
  }

  return {
    course: course as MasterCoursesRow,
    modules: modules || [],
    items: items || [],
    linkedVideos,
    unlinkedVideos,
  };
}

async function _attachVideoAssetToCourseItem(itemId: string, videoAssetId: string | null): Promise<MasterCourseItemsRow> {
  const admin = createAdminClient();

  // Validate item exists
  const { data: item, error: itemError } = await admin
    .from('master_course_items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (itemError || !item) {
    throw new Error(`Item not found: ${itemError?.message}`);
  }

  if (videoAssetId) {
    // Validate video asset exists and belongs to the same course
    const { data: video, error: videoError } = await admin
      .from('video_assets')
      .select('*')
      .eq('id', videoAssetId)
      .single();

    if (videoError || !video) {
      throw new Error(`Video asset not found: ${videoError?.message}`);
    }

    if (video.master_course_id !== item.master_course_id) {
      throw new Error(`Cannot link video from a different course`);
    }
  }

  const { data, error } = await admin
    .from('master_course_items')
    .update({ video_asset_id: videoAssetId })
    .eq('id', itemId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to attach video to item: ${error?.message}`);
  }

  return data;
}

async function _listUnlinkedVideoAssets(courseId: string): Promise<VideoAssetsRow[]> {
  const admin = createAdminClient();

  const { data: items } = await admin
    .from('master_course_items')
    .select('video_asset_id')
    .eq('master_course_id', courseId)
    .not('video_asset_id', 'is', null);

  const linkedIds: string[] = [];
  for (const i of items || []) {
    if (i.video_asset_id) linkedIds.push(i.video_asset_id);
  }

  let query = admin
    .from('video_assets')
    .select('*')
    .eq('master_course_id', courseId)
    .eq('sync_status', 'active');

  if (linkedIds.length > 0) {
    query = query.not('id', 'in', `(${linkedIds.join(',')})`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list unlinked videos: ${error.message}`);
  }

  return data || [];
}
