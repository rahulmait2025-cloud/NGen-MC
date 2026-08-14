import 'server-only';

/**
 * Master Course is the ONLY entity that creates a TPStreams folder.
 * Bundles, Variants, Assignments, and Entitlements must NEVER create folders.
 *
 * Supabase remains the storage layer for metadata, mappings, admin state,
 * and non-video resources (PDFs, notes, worksheets, attachments).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { ensureCourseFolder, ensureModuleFolder, retryModuleFolderSync as retryModuleFolderSyncService } from './tpstreams-hierarchy';
import { ensureBootcampTpFolders } from './tpstreams-bootcamp-hierarchy';
import { cacheTag, cacheLife } from 'next/cache';
import { revalidateCourseStructure } from '@/lib/cache/invalidate-course';
import type {
  MasterCoursesRow,
  MasterCoursePublishStatus,
  MasterCourseModulesRow,
  BootcampCatalogType,
  MasterCourseKind,
} from '@/types/database';

// --- Types --------------------------------------------------------------------

export interface MasterCourseModule {
  id: string;
  title: string;
  description: string;
  sort_order: number;
}

export interface CreateMasterCourseInput {
  pillar_id?: string | null;
  bootcamp_id?: string | null;
  catalog_type?: BootcampCatalogType;
  course_kind?: MasterCourseKind;
  code: string;
  title: string;
  slug?: string | null;
  description?: string;
  short_description?: string;
  pillar?: string; // Legacy text field
  program_tag?: string;
  publish_status?: MasterCoursePublishStatus;
  visible_to_college_admins?: boolean;
  visible_to_college_students?: boolean;
  visible_to_global_students?: boolean;
  modules?: MasterCourseModule[];
  metadata?: Record<string, unknown>;
  created_by?: string;
}

export interface UpdateMasterCourseInput {
  title?: string;
  description?: string;
  short_description?: string;
  pillar?: string;
  program_tag?: string;
  modules?: MasterCourseModule[];
  metadata?: Record<string, unknown>;
  pricing_model?: 'one_time' | 'subscription_ready' | 'per_seat' | 'free' | 'invite_only' | null;
  base_price?: number | null;
  selling_price?: number | null;
  discounted_price?: number | null;
  currency?: string;
  is_free?: boolean;
  is_invite_only?: boolean;
  visible_to_global_students?: boolean;
  show_as_paid_course?: boolean;
}

export interface MasterCourseWithStats extends MasterCoursesRow {
  module_count: number;
  video_count: number;
  completed_video_count: number;
}

// --- CRUD ---------------------------------------------------------------------

/**
 * List all Master Courses for a specific Pillar.
 *
 * Cached via the `use cache` directive (Next.js 16 Cache Components).
 * The `pillarId` argument is part of the auto-generated cache key.
 * Revalidate after 30s; tag for on-demand invalidation from mutations.
 */
export async function listCoursesForPillar(pillarId: string): Promise<MasterCourseWithStats[]> {
  'use cache';
  cacheLife('halfMinute');
  cacheTag('master-courses-by-pillar');

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('master_courses')
    .select(`
      *,
      master_course_modules(id, publish_status, tp_folder_uuid),
      video_assets!left(id, processing_status, sync_status)
    `)
    .eq('pillar_id', pillarId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list courses for pillar: ${error.message}`);
  }

  return (data ?? []).map((course) => {
    // Filter out 'deleted' modules (unpublished + no TP folder)
    const modules = (course.master_course_modules || []).filter((m: { publish_status: string; tp_folder_uuid: string | null }) => 
      m.publish_status !== 'unpublished' || m.tp_folder_uuid !== null
    );
    
    const videoAssets = ((course.video_assets ?? []) as {
      processing_status?: string;
      sync_status?: string;
    }[]).filter((videoAsset) => videoAsset.sync_status === 'active');
    
    return {
      ...course,
      module_count: modules.length,
      video_count: videoAssets.length,
      completed_video_count: videoAssets.filter(
        (v) => v.processing_status === 'completed',
      ).length,
    };
  });
}

/**
 * Get a course within a pillar, validating the relationship.
 */
export async function getCourseInPillar(pillarId: string, courseId: string): Promise<MasterCoursesRow | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('master_courses')
    .select('*')
    .eq('id', courseId)
    .eq('pillar_id', pillarId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch course in pillar: ${error.message}`);
  }

  return data;
}

/**
 * Update course visibility flags.
 */
export async function updateCourseVisibility(
  courseId: string, 
  input: {
    visible_to_college_admins?: boolean;
    visible_to_college_students?: boolean;
    visible_to_global_students?: boolean;
  }
): Promise<MasterCoursesRow> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('master_courses')
    .update(input)
    .eq('id', courseId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update course visibility: ${error?.message ?? 'No data returned'}`);
  }

  revalidateCourseStructure(courseId);

  return data;
}

/**
 * Create a new Master Course and its nested TPStreams folder.
 *
 * The operation is retry-safe and idempotent:
 *   1. The course row is inserted first (tp_folder_status = 'pending').
 *   2. Then ensureCourseFolder is called to create/link nested TPStreams folder.
 *
 * Context rules:
 *   - Pillar context: pass `pillar_id`. `bootcamp_id` must be null/undefined.
 *     catalog_type defaults to 'pillar'.
 *   - Bootcamp context: pass `bootcamp_id`. `pillar_id` must be null/undefined.
 *     catalog_type defaults to 'bootcamp'. The bootcamp folder hierarchy is used.
 *
 * @param input  Course details.
 * @returns      The created Master Course row.
 */
export async function createMasterCourse(
  input: CreateMasterCourseInput,
): Promise<MasterCoursesRow> {
  const admin = createAdminClient();

  // Context guardrails — exactly one of pillar_id / bootcamp_id must be set.
  const hasPillar = !!input.pillar_id;
  const hasBootcamp = !!input.bootcamp_id;
  if (hasPillar && hasBootcamp) {
    throw new Error('A course cannot belong to both a Pillar and a Bootcamp.');
  }
  if (!hasPillar && !hasBootcamp) {
    throw new Error('A course must belong to either a Pillar or a Bootcamp.');
  }

  const resolvedCatalogType: BootcampCatalogType = input.catalog_type
    ?? (hasBootcamp ? 'bootcamp' : 'pillar');

  // Step 1: Insert the course row with pending folder status
  const modules = input.modules ?? [];
  
  const { data: course, error: insertError } = await admin
    .from('master_courses')
    .insert({
      pillar_id: input.pillar_id ?? null,
      bootcamp_id: input.bootcamp_id ?? null,
      catalog_type: resolvedCatalogType,
      course_kind: input.course_kind ?? 'platform',
      code: input.code,
      title: input.title,
      slug: input.slug ?? null,
      description: input.description ?? null,
      short_description: input.short_description ?? null,
      pillar: input.pillar ?? null, // keep legacy field for now
      program_tag: input.program_tag ?? null,
      publish_status: input.publish_status ?? 'draft',
      visible_to_college_admins: input.visible_to_college_admins ?? false,
      visible_to_college_students: input.visible_to_college_students ?? false,
      visible_to_global_students: input.visible_to_global_students ?? true,
      modules: modules as unknown as MasterCoursesRow['modules'],
      tp_folder_status: 'pending' as const,
      metadata: (input.metadata ?? {}) as MasterCoursesRow['metadata'],
      created_by: input.created_by ?? null,
    })
    .select('*')
    .single();

  if (insertError || !course) {
    throw new Error(`Failed to create Master Course: ${insertError?.message ?? 'No data returned'}`);
  }

  // Step 2: Ensure Course Folder — pick hierarchy based on context.
  if (hasBootcamp) {
    try {
      return await ensureBootcampTpFolders(course.id);
    } catch {
      // Folder creation failure is logged by ensureBootcampCourseFolder.
      // We still return the inserted course row.
      return course;
    }
  }

  // Step 2 (Pillar): Ensure Course Folder (nested under Pillar)
  try {
    return await ensureCourseFolder(course.id);
  } catch {
    // Note: ensureCourseFolder already updates tp_folder_status to 'failed' and logs
    // We just return the course row as is (it was inserted successfully)
    return course;
  }
}

/**
 * Get a Master Course by ID.
 */
export async function getMasterCourseById(id: string): Promise<MasterCoursesRow | null> {
  // Validate UUID format to prevent DB syntax errors from "undefined" or malformed strings
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) {
    return null;
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('master_courses')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch Master Course: ${error.message}`);
  }

  return data;
}

/**
 * Get a Master Course by code.
 */
async function _getMasterCourseByCode(code: string): Promise<MasterCoursesRow | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('master_courses')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch Master Course: ${error.message}`);
  }

  return data;
}

/**
 * List all Master Courses with optional filters.
 */
export async function listMasterCourses(params?: {
  publish_status?: MasterCoursePublishStatus;
  pillar?: string;
  limit?: number;
  offset?: number;
}): Promise<MasterCourseWithStats[]> {
  const admin = createAdminClient();

  let query = admin
    .from('master_courses')
    .select(
      `
      *,
      video_assets!left(id, processing_status, sync_status)
    `,
    );

  if (params?.publish_status) {
    query = query.eq('publish_status', params.publish_status);
  }

  if (params?.pillar) {
    query = query.eq('pillar', params.pillar);
  }

  query = query.order('created_at', { ascending: false });

  if (params?.limit) {
    query = query.limit(params.limit);
  }

  if (params?.offset) {
    query = query.range(params.offset, params.offset + (params.limit ?? 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list Master Courses: ${error.message}`);
  }

  // Enrich with video counts
  const coursesWithStats: MasterCourseWithStats[] = (data ?? []).map((course) => {
    const videoAssets = ((course.video_assets ?? []) as {
      processing_status?: string;
      sync_status?: string;
    }[]).filter((videoAsset) => videoAsset.sync_status === 'active');
    return {
      ...course,
      video_count: videoAssets.length,
      completed_video_count: videoAssets.filter(
        (v) => v.processing_status === 'completed',
      ).length,
    };
  });

  return coursesWithStats;
}

/**
 * Update a Master Course's metadata (NOT TPStreams folder fields).
 *
 * WARNING: tp_folder_uuid and tp_folder_status can NEVER be changed here.
 * They are set only during creation.
 */
export async function updateMasterCourse(
  id: string,
  input: UpdateMasterCourseInput,
): Promise<MasterCoursesRow> {
  const admin = createAdminClient();

  const updatePayload: Record<string, unknown> = {};

  if (input.title !== undefined) updatePayload.title = input.title;
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.short_description !== undefined)
    updatePayload.short_description = input.short_description;
  if (input.pillar !== undefined) updatePayload.pillar = input.pillar;
  if (input.program_tag !== undefined) updatePayload.program_tag = input.program_tag;
  if (input.modules !== undefined)
    updatePayload.modules = input.modules as unknown as MasterCoursesRow['modules'];
  if (input.metadata !== undefined)
    updatePayload.metadata = input.metadata as MasterCoursesRow['metadata'];
  if (input.pricing_model !== undefined) updatePayload.pricing_model = input.pricing_model;
  if (input.base_price !== undefined) updatePayload.base_price = input.base_price;
  if (input.selling_price !== undefined) updatePayload.selling_price = input.selling_price;
  if (input.discounted_price !== undefined)
    updatePayload.discounted_price = input.discounted_price;
  if (input.currency !== undefined) updatePayload.currency = input.currency;
  if (input.is_free !== undefined) updatePayload.is_free = input.is_free;
  if (input.is_invite_only !== undefined) updatePayload.is_invite_only = input.is_invite_only;
  if (input.visible_to_global_students !== undefined)
    updatePayload.visible_to_global_students = input.visible_to_global_students;
  if (input.show_as_paid_course !== undefined)
    updatePayload.show_as_paid_course = input.show_as_paid_course;

  const { data, error } = await admin
    .from('master_courses')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update Master Course: ${error?.message ?? 'No data returned'}`);
  }

  revalidateCourseStructure(id);

  return data;
}

/**
 * Update the publish status of a Master Course.
 */
async function _updateMasterCoursePublishStatus(
  id: string,
  status: MasterCoursePublishStatus,
): Promise<MasterCoursesRow> {
  const admin = createAdminClient();

  const updatePayload: Record<string, unknown> = {
    publish_status: status,
  };

  if (status === 'published') {
    updatePayload.tp_last_synced_at = new Date().toISOString();
  }

  const { data, error } = await admin
    .from('master_courses')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to update publish status: ${error?.message ?? 'No data returned'}`,
    );
  }

  return data;
}

/**
 * Delete a Master Course (cascades to video_assets and TPStreams folder).
 *
 * WARNING: This also deletes the TPStreams folder and ALL its child assets
 * via the TPStreams API. Use with extreme caution.
 */
async function _deleteMasterCourse(courseId: string): Promise<void> {
  const admin = createAdminClient();

  // Load course to verify existence and publish status
  const { data: course, error: courseErr } = await admin
    .from('master_courses')
    .select('id, publish_status')
    .eq('id', courseId)
    .maybeSingle();

  if (courseErr) throw new Error(`Failed to load course: ${courseErr.message}`);
  if (!course) throw new Error('Master Course not found');

  if (course.publish_status === 'published') {
    throw new Error('Published master courses cannot be deleted. You can edit them or archive them.');
  }

  // Dependency checks
  const [{ data: variants }, { data: bundleRefs }, { data: assignments }, { data: items }] = await Promise.all([
    admin
      .from('course_variants')
      .select('id')
      .eq('master_course_id', courseId),
    admin
      .from('bundle_items')
      .select('id')
      .eq('item_type', 'master_course')
      .eq('reference_id', courseId),
    admin
      .from('content_assignments')
      .select('id')
      .eq('assigned_entity_type', 'master_course')
      .eq('assigned_entity_id', courseId),
    admin
      .from('master_course_items')
      .select('id')
      .eq('master_course_id', courseId),
  ]);

  // Check bundle_items that reference master_course_items of this course
  let bundleItemRefsForItems: { id: string }[] = [];
  const itemIds = (items ?? []).map((i: { id: string }) => i.id);
  if (itemIds.length > 0) {
    const { data: refs } = await admin
      .from('bundle_items')
      .select('id')
      .eq('item_type', 'master_course_item')
      .in('reference_id', itemIds);
    bundleItemRefsForItems = refs ?? [];
  }

  // Check student entitlements
  const { data: entitlements } = await admin
    .from('student_entitlements')
    .select('id')
    .eq('master_course_id', courseId)
    .eq('status', 'active');

  if ((variants ?? []).length > 0 || (bundleRefs ?? []).length > 0 || (bundleItemRefsForItems ?? []).length > 0 || (assignments ?? []).length > 0 || (entitlements ?? []).length > 0) {
    throw new Error('This master course cannot be deleted because it is used by variants/bundles/assignments/entitlements.');
  }

  // Safe to delete: remove course row (this will cascade to master_course_items and video_assets in DB)
  const { error: delErr } = await admin.from('master_courses').delete().eq('id', courseId);

  if (delErr) {
    throw new Error(`Failed to delete Master Course: ${delErr.message}`);
  }

  // Note: We DO NOT call TPStreams deletion here per policy for this phase.
}

/**
 * Retry TPStreams folder creation for a failed course.
 *
 * Use this when a course has tp_folder_status = 'failed' and you want
 * to retry the folder creation without recreating the course.
 */
export async function retryFolderCreation(id: string): Promise<MasterCoursesRow> {
  const admin = createAdminClient();

  const course = await getMasterCourseById(id);
  if (!course) {
    throw new Error(`Master Course not found: ${id}`);
  }

  if (course.tp_folder_status === 'created' && course.tp_folder_uuid) {
    return course;
  }

  // Reset status to pending to force ensureCourseFolder to try again
  await admin
    .from('master_courses')
    .update({ tp_folder_status: 'pending' as const })
    .eq('id', id);

  return ensureCourseFolder(id);
}

/**
 * Parse the modules JSON from a Master Course row.
 */
function _parseCourseModules(
  modules: MasterCoursesRow['modules'],
): MasterCourseModule[] {
  if (!Array.isArray(modules)) return [];
  return modules.map((m) => {
    const mod = m as Record<string, unknown>;
    return {
      id: String(mod.id ?? ''),
      title: String(mod.title ?? ''),
      description: String(mod.description ?? ''),
      sort_order: Number(mod.sort_order ?? 0),
    };
  });
}

// --- Module Management inside Course (Phase 5) ----------------------------------

export interface ModuleWithVideoCount extends MasterCourseModulesRow {
  video_count: number;
}

interface CreateModuleInsideCourseInput {
  pillar_id: string;
  course_id: string;
  title: string;
  description?: string;
  sort_order?: number;
  visible_to_students?: boolean;
  metadata?: Record<string, unknown>;
}

interface UpdateModuleInsideCourseInput {
  title?: string;
  description?: string;
  sort_order?: number;
  publish_status?: MasterCoursePublishStatus;
  metadata?: Record<string, unknown>;
}

/**
 * List all modules for a specific course with video counts.
 */
export async function listModulesForCourse(
  pillarId: string,
  courseId: string,
): Promise<ModuleWithVideoCount[]> {
  const admin = createAdminClient();

  const { data: course, error: courseError } = await admin
    .from('master_courses')
    .select('pillar_id')
    .eq('id', courseId)
    .maybeSingle();

  if (courseError || !course) {
    throw new Error(`Course not found: ${courseId}`);
  }

  if (course.pillar_id !== pillarId) {
    throw new Error(`Course ${courseId} does not belong to Pillar ${pillarId}`);
  }

  const { data: modules, error: modulesError } = await admin
    .from('master_course_modules')
    .select('*')
    .eq('master_course_id', courseId)
    .or('publish_status.neq.unpublished,tp_folder_uuid.not.is.null')
    .order('sort_order', { ascending: true });

  if (modulesError) {
    throw new Error(`Failed to list modules: ${modulesError.message}`);
  }

  const moduleIds = (modules ?? []).map(m => m.id);
  
  let videoCounts: Record<string, number> = {};
  
  if (moduleIds.length > 0) {
    const { data: videoData, error: videoError } = await admin
      .from('video_assets')
      .select('id, master_course_module_id')
      .eq('master_course_id', courseId)
      .eq('sync_status', 'active')
      .in('master_course_module_id', moduleIds);

    if (!videoError && videoData) {
      const counts: Record<string, number> = {};
      for (const v of videoData) {
        if (v.master_course_module_id) {
          counts[v.master_course_module_id] = (counts[v.master_course_module_id] || 0) + 1;
        }
      }
      videoCounts = counts;
    }
  }

  return (modules ?? []).map(m => ({
    ...m,
    video_count: videoCounts[m.id] || 0,
  }));
}

/**
 * Get a module within a course, validating the pillar/course/module relationship.
 */
export async function getModuleInCourse(
  pillarId: string,
  courseId: string,
  moduleId: string,
): Promise<MasterCourseModulesRow | null> {
  const admin = createAdminClient();

  const { data: course, error: courseError } = await admin
    .from('master_courses')
    .select('pillar_id')
    .eq('id', courseId)
    .maybeSingle();

  if (courseError || !course) {
    throw new Error(`Course not found: ${courseId}`);
  }

  if (course.pillar_id !== pillarId) {
    throw new Error(`Course ${courseId} does not belong to Pillar ${pillarId}`);
  }

  const { data: module, error: moduleError } = await admin
    .from('master_course_modules')
    .select('*')
    .eq('id', moduleId)
    .eq('master_course_id', courseId)
    .maybeSingle();

  if (moduleError) {
    throw new Error(`Failed to fetch module: ${moduleError.message}`);
  }

  return module;
}

/**
 * Create a module inside a course with TPStreams folder creation.
 */
export async function createModuleInsideCourse(
  input: CreateModuleInsideCourseInput,
): Promise<MasterCourseModulesRow> {
  const admin = createAdminClient();

  const { data: course, error: courseError } = await admin
    .from('master_courses')
    .select('id, pillar_id, code, title')
    .eq('id', input.course_id)
    .maybeSingle();

  if (courseError || !course) {
    throw new Error(`Course not found: ${input.course_id}`);
  }

  if (course.pillar_id !== input.pillar_id) {
    throw new Error(`Course ${input.course_id} does not belong to Pillar ${input.pillar_id}`);
  }

  let sort_order = input.sort_order;
  if (sort_order === undefined) {
    const { data: latest } = await admin
      .from('master_course_modules')
      .select('sort_order')
      .eq('master_course_id', input.course_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    sort_order = latest ? latest.sort_order + 10 : 0;
  }

  const { data: module, error: insertError } = await admin
    .from('master_course_modules')
    .insert({
      master_course_id: input.course_id,
      title: input.title,
      description: input.description ?? null,
      sort_order,
      publish_status: 'draft',
      visible_to_students: input.visible_to_students ?? true,
      tp_folder_status: 'pending',
      metadata: (input.metadata ?? {}) as MasterCourseModulesRow['metadata'],
    })
    .select('*')
    .single();

  if (insertError || !module) {
    throw new Error(`Failed to create module: ${insertError?.message ?? 'No data returned'}`);
  }

  try {
    return await ensureModuleFolder(module.id);
  } catch {
    return module;
  }
}

/**
 * Update a module inside a course.
 */
export async function updateModuleInsideCourse(
  pillarId: string,
  courseId: string,
  moduleId: string,
  input: UpdateModuleInsideCourseInput,
): Promise<MasterCourseModulesRow> {
  const admin = createAdminClient();

  const existingModule = await getModuleInCourse(pillarId, courseId, moduleId);
  if (!existingModule) {
    throw new Error(`Module not found: ${moduleId}`);
  }

  const { data, error } = await admin
    .from('master_course_modules')
    .update({
      title: input.title,
      description: input.description,
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

  // Rename the TPStreams folder if title changed and folder exists
  if (input.title && data.tp_folder_uuid) {
    try {
      const { updateAsset } = await import('../tpstreams/assets');
      await updateAsset(data.tp_folder_uuid, { title: input.title.trim() });
    } catch (tpError) {
      console.error(`[updateModuleInsideCourse] Failed to rename TPStreams folder:`, tpError);
    }
  }

  return data;
}

/**
 * Update module visibility for students.
 */
async function _updateModuleVisibility(
  pillarId: string,
  courseId: string,
  moduleId: string,
  input: { visible_to_students: boolean },
): Promise<MasterCourseModulesRow> {
  const admin = createAdminClient();

  const foundModule = await getModuleInCourse(pillarId, courseId, moduleId);
  if (!foundModule) {
    throw new Error(`Module not found: ${moduleId}`);
  }

  const { data, error } = await admin
    .from('master_course_modules')
    .update({
      visible_to_students: input.visible_to_students,
    })
    .eq('id', moduleId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update module visibility: ${error?.message ?? 'No data returned'}`);
  }

  return data;
}

/**
 * Retry TPStreams folder sync for a module.
 */
export async function retryModuleFolderSyncForCourse(
  pillarId: string,
  courseId: string,
  moduleId: string,
): Promise<MasterCourseModulesRow> {
  const foundModule = await getModuleInCourse(pillarId, courseId, moduleId);
  if (!foundModule) {
    throw new Error(`Module not found: ${moduleId}`);
  }

  return retryModuleFolderSyncService(moduleId);
}
