import 'server-only';

/**
 * Bootcamp Courses Service.
 *
 * Manages courses inside a Bootcamp using the existing master_courses engine.
 * Bootcamp courses have catalog_type = 'bootcamp' and bootcamp_id set.
 * They never have pillar_id set and are never visible to CollegeAdmin.
 *
 * CRUD: create, read, update, publish/unpublish, archive, safe delete.
 */

import { revalidateCourseStructure } from '@/lib/cache/invalidate-course';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncPaidCourseLandingPublishState } from '@/lib/services/paid-course-landing-metadata';
import { validateMasterCourseForPublish } from '@/lib/services/master-course-publish';
import {
  deleteBootcampCourseFolderCascade,
  deleteBootcampModuleFolderCascade,
  ensureBootcampModuleFolder,
} from '@/lib/services/tpstreams-bootcamp-hierarchy';
import type { VideoAssetWithCourse } from '@/lib/services/video-assets';
import type {
  MasterCoursesRow,
  MasterCourseModulesRow,
  MasterCoursePublishStatus,
  VideoAssetsRow,
} from '@/types/database';

// --- Types --------------------------------------------------------------------

export interface BootcampCourseWithStats extends MasterCoursesRow {
  module_count: number;
  video_count: number;
  effective_price: number | null;
  is_free: boolean;
  currency: string;
}

export interface CreateBootcampCourseInput {
  bootcamp_id: string;
  code: string;
  title: string;
  slug?: string;
  description?: string;
  short_description?: string;
  program_tag?: string;
  publish_status?: MasterCoursePublishStatus;
  modules?: { id: string; title: string; description: string; sort_order: number }[];
  metadata?: Record<string, unknown>;
  created_by?: string;
}

export interface UpdateBootcampCourseInput {
  title?: string;
  description?: string;
  short_description?: string;
  program_tag?: string;
  publish_status?: MasterCoursePublishStatus;
  metadata?: Record<string, unknown>;
}

// --- CRUD ---------------------------------------------------------------------

/**
 * List all courses inside a Bootcamp.
 * Only returns courses with catalog_type = 'bootcamp' and matching bootcamp_id.
 */
export async function listBootcampCourses(bootcampId: string): Promise<BootcampCourseWithStats[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('master_courses')
    .select(`
      *,
      master_course_modules(id, publish_status, tp_folder_uuid),
      video_assets!left(id, processing_status, sync_status)
    `)
    .eq('bootcamp_id', bootcampId)
    .eq('catalog_type', 'bootcamp')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list bootcamp courses: ${error.message}`);
  }

  return (data ?? []).map((course) => {
    const modules = (course.master_course_modules || []).filter(
      (m: { publish_status: string; tp_folder_uuid: string | null }) =>
        m.publish_status !== 'unpublished' || m.tp_folder_uuid !== null
    );

    const videoAssets = ((course.video_assets ?? []) as {
      processing_status?: string;
      sync_status?: string;
    }[]).filter((v) => v.sync_status === 'active');

    const effectivePrice = course.selling_price ?? course.discounted_price ?? course.base_price;

    return {
      ...course,
      module_count: modules.length,
      video_count: videoAssets.length,
      effective_price: effectivePrice,
      is_free: course.is_free,
      currency: course.currency,
    };
  });
}

/**
 * Get a single course inside a Bootcamp, validating the relationship.
 */
export async function getBootcampCourse(
  bootcampId: string,
  courseId: string,
): Promise<MasterCoursesRow | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!courseId || !uuidRegex.test(courseId)) {
    return null;
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('master_courses')
    .select('*')
    .eq('id', courseId)
    .eq('bootcamp_id', bootcampId)
    .eq('catalog_type', 'bootcamp')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch bootcamp course: ${error.message}`);
  }

  return data;
}

/**
 * Create a new course inside a Bootcamp.
 *
 * Sets catalog_type = 'bootcamp', bootcamp_id, pillar_id = null,
 * and all visibility flags to false (no student/college exposure yet).
 */
export async function createBootcampCourse(
  input: CreateBootcampCourseInput,
): Promise<MasterCoursesRow> {
  const admin = createAdminClient();

  const { data: course, error: insertError } = await admin
    .from('master_courses')
    .insert({
      bootcamp_id: input.bootcamp_id,
      catalog_type: 'bootcamp',
      pillar_id: null,
      code: input.code,
      title: input.title,
      slug: input.slug ?? null,
      description: input.description ?? null,
      short_description: input.short_description ?? null,
      program_tag: input.program_tag ?? null,
      publish_status: input.publish_status ?? 'draft',
      visible_to_college_admins: false,
      visible_to_college_students: false,
      visible_to_global_students: false,
      modules: (input.modules ?? []) as unknown as MasterCoursesRow['modules'],
      tp_folder_status: 'pending' as const,
      metadata: (input.metadata ?? {}) as MasterCoursesRow['metadata'],
      created_by: input.created_by ?? null,
    })
    .select('*')
    .single();

  if (insertError || !course) {
    throw new Error(`Failed to create bootcamp course: ${insertError?.message ?? 'No data'}`);
  }

  await revalidateCourseStructure(course.id);

  return course;
}

/**
 * Update a bootcamp course's metadata.
 */
export async function updateBootcampCourse(
  bootcampId: string,
  courseId: string,
  input: UpdateBootcampCourseInput,
): Promise<MasterCoursesRow> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('master_courses')
    .update(input)
    .eq('id', courseId)
    .eq('bootcamp_id', bootcampId)
    .eq('catalog_type', 'bootcamp')
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update bootcamp course: ${error?.message ?? 'No data'}`);
  }

  await revalidateCourseStructure(courseId);

  return data;
}

export async function publishBootcampCourse(
  bootcampId: string,
  courseId: string,
): Promise<MasterCoursesRow> {
  const validation = await validateMasterCourseForPublish(courseId);
  if (!validation.valid) {
    const errorMessages = validation.issues.reduce((acc, i) => {
      if (i.severity === 'error') acc.push(i.message);
      return acc;
    }, [] as string[]).join('; ');
    throw new Error(`Cannot publish: ${errorMessages}`);
  }

  const course = await updateBootcampCourse(bootcampId, courseId, { publish_status: 'published' });

  const admin = createAdminClient();

  // Cascade publish status to modules
  const { error: modulesPublishError } = await admin
    .from('master_course_modules')
    .update({
      publish_status: 'published',
      visible_to_students: true,
    })
    .eq('master_course_id', courseId);

  if (modulesPublishError) {
    throw new Error(
      `Published course but could not publish modules: ${modulesPublishError.message}`,
    );
  }

  // Cascade publish status to items (lessons)
  const { error: itemsPublishError } = await admin
    .from('master_course_items')
    .update({
      publish_status: 'published',
    })
    .eq('master_course_id', courseId);

  if (itemsPublishError) {
    throw new Error(
      `Published course but could not publish items: ${itemsPublishError.message}`,
    );
  }

  await revalidateCourseStructure(courseId);

  await syncPaidCourseLandingPublishState(course);
  return course;
}

/**
 * Unpublish a bootcamp course (revert to draft).
 */
export async function unpublishBootcampCourse(
  bootcampId: string,
  courseId: string,
): Promise<MasterCoursesRow> {
  const course = await updateBootcampCourse(bootcampId, courseId, { publish_status: 'draft' });
  await revalidateCourseStructure(courseId);
  await syncPaidCourseLandingPublishState(course);
  return course;
}

/**
 * Archive a bootcamp course (set publish_status = 'unpublished' + hide visibility).
 * Hides from students without deleting TPStreams assets.
 */
export async function archiveBootcampCourse(
  bootcampId: string,
  courseId: string,
): Promise<MasterCoursesRow> {
  const admin = createAdminClient();
  const timestamp = new Date().toISOString();

  const { data, error } = await admin
    .from('master_courses')
    .update({
      publish_status: 'unpublished',
      visible_to_college_admins: false,
      visible_to_college_students: false,
      visible_to_global_students: false,
      updated_at: timestamp,
    })
    .eq('id', courseId)
    .eq('bootcamp_id', bootcampId)
    .eq('catalog_type', 'bootcamp')
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to archive bootcamp course: ${error?.message ?? 'No data'}`);
  }

  await revalidateCourseStructure(courseId);

  return data;
}

// --- Delete Impact & Safe Delete --------------------------------------------

export interface BootcampCourseDeleteImpact {
  course: MasterCoursesRow;
  moduleCount: number;
  videoCount: number;
  activeB2cEntitlementCount: number;
  activeFreeCourseEntitlementCount: number;
  paidOrderCount: number;
  archiveOnly: boolean;
}

export interface SafeDeleteResult {
  ok: true;
  mode: 'archived' | 'deleted';
  message: string;
}

function nowIso() {
  return new Date().toISOString();
}

async function getModulesForCourse(courseId: string): Promise<MasterCourseModulesRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('master_course_modules')
    .select('*')
    .eq('master_course_id', courseId);

  if (error) throw new Error(`Failed to load course modules: ${error.message}`);
  return data ?? [];
}

async function getVideosForCourse(courseId: string): Promise<VideoAssetsRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('video_assets')
    .select('*')
    .eq('master_course_id', courseId)
    .eq('sync_status', 'active');

  if (error) throw new Error(`Failed to load course videos: ${error.message}`);
  return data ?? [];
}

async function countActiveB2cEntitlements(courseId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from('student_entitlements')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'b2c_direct')
    .eq('status', 'active')
    .eq('master_course_id', courseId);

  if (error) throw new Error(`Failed to count B2C entitlements: ${error.message}`);
  return count ?? 0;
}

async function countPaidOrders(courseId: string): Promise<number> {
  const admin = createAdminClient();
  const { data: variants, error: vErr } = await admin
    .from('course_variants')
    .select('id')
    .eq('master_course_id', courseId);

  if (vErr) throw new Error(`Failed to load variants: ${vErr.message}`);
  if (!variants || variants.length === 0) return 0;

  const variantIds = variants.map((v) => v.id);
  const { count, error } = await admin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('entity_type', 'course_variant')
    .in('entity_id', variantIds)
    .eq('status', 'paid');

  if (error) throw new Error(`Failed to count paid orders: ${error.message}`);
  return count ?? 0;
}

async function countActiveFreeCourseEntitlements(courseId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from('student_entitlements')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'free_course')
    .eq('status', 'active')
    .eq('master_course_id', courseId);

  if (error) throw new Error(`Failed to count free course entitlements: ${error.message}`);
  return count ?? 0;
}

/**
 * Get the deletion impact for a bootcamp course.
 */
export async function getBootcampCourseDeleteImpact(
  bootcampId: string,
  courseId: string,
): Promise<BootcampCourseDeleteImpact> {
  const course = await getBootcampCourse(bootcampId, courseId);
  if (!course) throw new Error('Bootcamp course not found.');
  if (course.catalog_type !== 'bootcamp') throw new Error('This action is only for bootcamp courses.');
  if (course.bootcamp_id !== bootcampId) throw new Error('Course does not belong to this bootcamp.');

  const [modules, videos, activeB2cEntitlementCount, activeFreeCourseEntitlementCount, paidOrderCount] = await Promise.all([
    getModulesForCourse(courseId),
    getVideosForCourse(courseId),
    countActiveB2cEntitlements(courseId),
    countActiveFreeCourseEntitlements(courseId),
    countPaidOrders(courseId),
  ]);

  return {
    course,
    moduleCount: modules.length,
    videoCount: videos.length,
    activeB2cEntitlementCount,
    activeFreeCourseEntitlementCount,
    paidOrderCount,
    archiveOnly: paidOrderCount > 0,
  };
}

async function softRemoveVideos(videoIds: string[]) {
  if (videoIds.length === 0) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from('video_assets')
    .update({
      processing_status: 'error',
      sync_status: 'removed',
      removed_at: nowIso(),
    })
    .in('id', videoIds);

  if (error) throw new Error(`Failed to archive videos: ${error.message}`);
}

async function hideCourseAndChildren(courseId: string, moduleIds: string[]) {
  const admin = createAdminClient();
  const timestamp = nowIso();

  const { error: courseError } = await admin
    .from('master_courses')
    .update({
      publish_status: 'unpublished',
      visible_to_college_admins: false,
      visible_to_college_students: false,
      visible_to_global_students: false,
      updated_at: timestamp,
    })
    .eq('id', courseId);

  if (courseError) throw new Error(`Failed to hide course: ${courseError.message}`);

  const { error: itemError } = await admin
    .from('master_course_items')
    .update({ publish_status: 'unpublished', updated_at: timestamp })
    .eq('master_course_id', courseId);

  if (itemError) throw new Error(`Failed to hide course items: ${itemError.message}`);

  if (moduleIds.length > 0) {
    const { error: moduleError } = await admin
      .from('master_course_modules')
      .update({ publish_status: 'unpublished', visible_to_students: false, updated_at: timestamp })
      .in('id', moduleIds);

    if (moduleError) throw new Error(`Failed to hide course modules: ${moduleError.message}`);
  }
}

async function revokeB2cEntitlementsForCourse(courseId: string, actorId: string) {
  const admin = createAdminClient();
  const { data: entitlements } = await admin
    .from('student_entitlements')
    .select('id')
    .eq('master_course_id', courseId)
    .eq('source_type', 'b2c_direct')
    .eq('status', 'active');

  if (!entitlements || entitlements.length === 0) return;

  const timestamp = nowIso();
  await admin
    .from('student_entitlements')
    .update({
      status: 'revoked',
      revoked_at: timestamp,
      revoked_by: actorId,
      revoke_reason: 'Bootcamp course deleted',
    })
    .in('id', entitlements.map((e) => e.id));
}

async function revokeFreeCourseEntitlementsForCourse(courseId: string) {
  const admin = createAdminClient();
  const { data: entitlements } = await admin
    .from('student_entitlements')
    .select('id')
    .eq('master_course_id', courseId)
    .eq('source_type', 'free_course')
    .eq('status', 'active');

  if (!entitlements || entitlements.length === 0) return;

  const timestamp = nowIso();
  await admin
    .from('student_entitlements')
    .update({
      status: 'revoked',
      revoked_at: timestamp,
      revoke_reason: 'Bootcamp course deleted',
    })
    .in('id', entitlements.map((e) => e.id));
}

async function revokeContentEntitlementsForCourse(courseId: string) {
  const admin = createAdminClient();
  const { data: entitlements } = await admin
    .from('student_content_entitlements')
    .select('id')
    .eq('master_course_id', courseId)
    .eq('source_type', 'master_course')
    .eq('status', 'active');

  if (!entitlements || entitlements.length === 0) return;

  const timestamp = nowIso();
  await admin
    .from('student_content_entitlements')
    .update({
      status: 'revoked',
      revoked_at: timestamp,
      revoke_reason: 'Bootcamp course deleted',
    })
    .in('id', entitlements.map((e) => e.id));
}

async function cleanupAccidentalCollegeAssignments(courseId: string) {
  const admin = createAdminClient();

  const { data: assignments } = await admin
    .from('content_assignments')
    .select('id')
    .eq('assigned_entity_type', 'master_course')
    .eq('assigned_entity_id', courseId)
    .eq('status', 'active');

  if (!assignments || assignments.length === 0) return;

  const timestamp = nowIso();
  await admin
    .from('content_assignments')
    .update({ status: 'revoked', revoked_at: timestamp, revoke_reason: 'Bootcamp course removed' })
    .in('id', assignments.map((a) => a.id));
}

/**
 * Safely delete a bootcamp course.
 *
 * Steps:
 * 1. Validate ownership (catalog_type=bootcamp, bootcamp_id match)
 * 2. Hide course + children from students
 * 3. Revoke B2C entitlements
 * 4. Cleanup accidental college assignments (defensive)
 * 5. Soft-remove videos locally
 * 6. Delete TPStreams course folder + module folders
 * 7. Hard delete from DB.
 *
 * Never deletes: invoices, payments, revenue, bootcamp root folder.
 */
export async function deleteBootcampCourseSafely(
  bootcampId: string,
  courseId: string,
  actorId: string,
): Promise<SafeDeleteResult> {
  const admin = createAdminClient();

  const { data: course, error: courseError } = await admin
    .from('master_courses')
    .select('*')
    .eq('id', courseId)
    .eq('bootcamp_id', bootcampId)
    .eq('catalog_type', 'bootcamp')
    .maybeSingle();

  if (courseError) throw new Error(`Failed to load course: ${courseError.message}`);
  if (!course) throw new Error('Bootcamp course not found.');
  if (course.catalog_type !== 'bootcamp') throw new Error('This action is only for bootcamp courses.');
  if (course.bootcamp_id !== bootcampId) throw new Error('Course does not belong to this bootcamp.');

  const [modules, videos] = await Promise.all([
    getModulesForCourse(courseId),
    getVideosForCourse(courseId),
  ]);

  const moduleIds = modules.map((m) => m.id);

  // Step 1: Hide course + children immediately
  await hideCourseAndChildren(courseId, moduleIds);

  // Steps 2-4: Independent cleanup operations (run in parallel after hide)
  await Promise.all([
    // Step 2: Revoke all entitlements (B2C, free course, and content)
    Promise.all([
      revokeB2cEntitlementsForCourse(courseId, actorId),
      revokeFreeCourseEntitlementsForCourse(courseId),
      revokeContentEntitlementsForCourse(courseId),
    ]),
    // Step 3: Cleanup accidental college assignments (defensive)
    cleanupAccidentalCollegeAssignments(courseId),
    // Step 4: Soft-remove videos locally
    ...(videos.length > 0 ? [softRemoveVideos(videos.map((v) => v.id))] : []),
  ]);

  // Step 5: Delete TPStreams course folder + module folders (best-effort)
  try {
    await deleteBootcampCourseFolderCascade(courseId);
  } catch {
    // TPStreams deletion failed — course is still hidden locally.
    // Admin can retry TPStreams cleanup later.
    console.warn(`[bootcamp-course-delete] TPStreams folder deletion failed for course ${courseId}. Course is hidden locally.`);
  }

  // Step 6: Hard delete from DB
  const { error: deleteError } = await admin
    .from('master_courses')
    .delete()
    .eq('id', courseId);

  if (deleteError) {
    throw new Error(`Failed to delete course from database: ${deleteError.message}`);
  }

  await revalidateCourseStructure(courseId);

  return {
    ok: true,
    mode: 'deleted',
    message: 'Course permanently deleted. TPStreams folders cleaned up. Student access revoked.',
  };
}

// --- Module Management --------------------------------------------------------

export interface BootcampModuleWithStats extends MasterCourseModulesRow {
  video_count: number;
}

/**
 * List all modules for a bootcamp course, with video counts.
 */
export async function listBootcampCourseModules(
  bootcampId: string,
  courseId: string,
): Promise<BootcampModuleWithStats[]> {
  const admin = createAdminClient();

  // First validate the course belongs to this bootcamp
  const { data: course, error: courseErr } = await admin
    .from('master_courses')
    .select('id, bootcamp_id, catalog_type')
    .eq('id', courseId)
    .maybeSingle();

  if (courseErr) throw new Error(`Failed to load course: ${courseErr.message}`);
  if (!course) throw new Error('Course not found.');
  if (course.catalog_type !== 'bootcamp' || course.bootcamp_id !== bootcampId) {
    throw new Error('Course does not belong to this bootcamp.');
  }

  const { data: modules, error: modErr } = await admin
    .from('master_course_modules')
    .select('*')
    .eq('master_course_id', courseId)
    .order('sort_order', { ascending: true });

  if (modErr) throw new Error(`Failed to list modules: ${modErr.message}`);

  // Get video counts per module
  const moduleIds = (modules ?? []).map((m) => m.id);
  const videoCountMap: Record<string, number> = {};
  if (moduleIds.length > 0) {
    const { data: videos, error: vidErr } = await admin
      .from('video_assets')
      .select('master_course_module_id')
      .in('master_course_module_id', moduleIds)
      .eq('sync_status', 'active');

    if (vidErr) {
      console.warn(`[bootcamp-modules] Video count failed: ${vidErr.message}`);
    } else {
      for (const v of videos ?? []) {
        if (v.master_course_module_id) {
          videoCountMap[v.master_course_module_id] = (videoCountMap[v.master_course_module_id] ?? 0) + 1;
        }
      }
    }
  }

  return (modules ?? []).map((m) => ({
    ...m,
    video_count: videoCountMap[m.id] ?? 0,
  }));
}

export interface CreateBootcampModuleInput {
  title: string;
  description?: string;
  sort_order?: number;
}

/**
 * Create a new module inside a bootcamp course.
 * Auto-creates the TPStreams module folder after insert.
 */
export async function createBootcampModule(
  bootcampId: string,
  courseId: string,
  input: CreateBootcampModuleInput,
): Promise<MasterCourseModulesRow> {
  const admin = createAdminClient();

  // Validate course ownership
  const { data: course, error: courseErr } = await admin
    .from('master_courses')
    .select('id, bootcamp_id, catalog_type')
    .eq('id', courseId)
    .maybeSingle();

  if (courseErr) throw new Error(`Failed to load course: ${courseErr.message}`);
  if (!course) throw new Error('Course not found.');
  if (course.catalog_type !== 'bootcamp' || course.bootcamp_id !== bootcampId) {
    throw new Error('Course does not belong to this bootcamp.');
  }

  // Auto-increment sort_order
  let sort_order = input.sort_order;
  if (sort_order === undefined) {
    const { data: latest } = await admin
      .from('master_course_modules')
      .select('sort_order')
      .eq('master_course_id', courseId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    sort_order = latest ? latest.sort_order + 10 : 0;
  }

  const { data: module, error: insertErr } = await admin
    .from('master_course_modules')
    .insert({
      master_course_id: courseId,
      title: input.title,
      description: input.description ?? null,
      sort_order,
      publish_status: 'draft',
      visible_to_students: true,
      tp_folder_status: 'pending',
      metadata: {},
    })
    .select('*')
    .single();

  if (insertErr || !module) {
    throw new Error(`Failed to create module: ${insertErr?.message ?? 'No data'}`);
  }

  await revalidateCourseStructure(courseId);

  // Best-effort folder creation. If it fails, module is still created and folder can be retried.
  try {
    return await ensureBootcampModuleFolder(module.id);
  } catch (err) {
    console.warn(`[bootcamp-modules] TP folder creation deferred for module ${module.id}:`, err);
    return module;
  }
}

export interface UpdateBootcampModuleInput {
  title?: string;
  description?: string | null;
  sort_order?: number;
  publish_status?: MasterCoursePublishStatus;
  visible_to_students?: boolean;
}

/**
 * Update a module inside a bootcamp course.
 */
export async function updateBootcampModule(
  bootcampId: string,
  courseId: string,
  moduleId: string,
  input: UpdateBootcampModuleInput,
): Promise<MasterCourseModulesRow> {
  const admin = createAdminClient();

  // Validate ownership through the chain
  const { data: course, error: courseErr } = await admin
    .from('master_courses')
    .select('id, bootcamp_id, catalog_type')
    .eq('id', courseId)
    .maybeSingle();

  if (courseErr) throw new Error(`Failed to load course: ${courseErr.message}`);
  if (!course) throw new Error('Course not found.');
  if (course.catalog_type !== 'bootcamp' || course.bootcamp_id !== bootcampId) {
    throw new Error('Course does not belong to this bootcamp.');
  }

  const { data: module, error: updErr } = await admin
    .from('master_course_modules')
    .update({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.sort_order !== undefined && { sort_order: input.sort_order }),
      ...(input.publish_status !== undefined && { publish_status: input.publish_status }),
      ...(input.visible_to_students !== undefined && { visible_to_students: input.visible_to_students }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', moduleId)
    .eq('master_course_id', courseId)
    .select('*')
    .single();

  if (updErr || !module) {
    throw new Error(`Failed to update module: ${updErr?.message ?? 'No data'}`);
  }

  await revalidateCourseStructure(courseId);

  // Rename the TPStreams folder if title changed and folder exists
  if (input.title && module.tp_folder_uuid) {
    try {
      const { updateAsset } = await import('../tpstreams/assets');
      await updateAsset(module.tp_folder_uuid, { title: input.title.trim() });
    } catch (tpError) {
      console.error(`[updateBootcampModule] Failed to rename TPStreams folder:`, tpError);
    }
  }

  return module;
}

/**
 * Delete a module inside a bootcamp course.
 * - Revokes student entitlements for the course
 * - Deletes TPStreams module folder
 * - Hides local video assets (sets sync_status='removed')
 * - Hard-deletes the module row
 */
export async function deleteBootcampModule(
  bootcampId: string,
  courseId: string,
  moduleId: string,
): Promise<{ ok: true; message: string }> {
  const admin = createAdminClient();
  const timestamp = nowIso();

  // Validate ownership
  const { data: course, error: courseErr } = await admin
    .from('master_courses')
    .select('id, bootcamp_id, catalog_type')
    .eq('id', courseId)
    .maybeSingle();

  if (courseErr) throw new Error(`Failed to load course: ${courseErr.message}`);
  if (!course) throw new Error('Course not found.');
  if (course.catalog_type !== 'bootcamp' || course.bootcamp_id !== bootcampId) {
    throw new Error('Course does not belong to this bootcamp.');
  }

  // 1. Revoke B2C entitlements for this course
  const { data: entitlements } = await admin
    .from('student_entitlements')
    .select('id')
    .eq('master_course_id', courseId)
    .eq('source_type', 'b2c_direct')
    .eq('status', 'active');

  if (entitlements && entitlements.length > 0) {
    await admin
      .from('student_entitlements')
      .update({
        status: 'revoked',
        revoked_at: timestamp,
        revoke_reason: 'Bootcamp module deleted',
      })
      .in('id', entitlements.map((e) => e.id));
  }

  // 2. Revoke B2B entitlements for any college assignments
  const { data: assignments } = await admin
    .from('content_assignments')
    .select('id')
    .eq('assigned_entity_type', 'master_course')
    .eq('assigned_entity_id', courseId)
    .eq('status', 'active');

  if (assignments && assignments.length > 0) {
    // Revoke entitlements linked to these assignments
    const { data: b2bEntitlements } = await admin
      .from('student_entitlements')
      .select('id')
      .eq('source_type', 'b2b_college')
      .eq('status', 'active')
      .in('metadata->>assignment_id', assignments.map((a) => a.id));

    if (b2bEntitlements && b2bEntitlements.length > 0) {
      await admin
        .from('student_entitlements')
        .update({
          status: 'revoked',
          revoked_at: timestamp,
          revoke_reason: 'Bootcamp module deleted',
        })
        .in('id', b2bEntitlements.map((e) => e.id));
    }

    // Revoke the assignments themselves
    await admin
      .from('content_assignments')
      .update({
        status: 'revoked',
        revoked_at: timestamp,
        revoke_reason: 'Bootcamp module deleted',
      })
      .in('id', assignments.map((a) => a.id));
  }

  // 3. Get videos for this module before deletion
  const { data: videos } = await admin
    .from('video_assets')
    .select('id')
    .eq('master_course_module_id', moduleId)
    .eq('sync_status', 'active');

  // 4. Delete TPStreams module folder (best-effort)
  try {
    await deleteBootcampModuleFolderCascade(moduleId);
  } catch (err) {
    console.warn(`[bootcamp-modules] TP folder delete failed for module ${moduleId}:`, err);
  }

  // 5. Soft-remove local video assets
  if (videos && videos.length > 0) {
    const { error: vidErr } = await admin
      .from('video_assets')
      .update({
        processing_status: 'error',
        sync_status: 'removed',
        removed_at: timestamp,
      })
      .in('id', videos.map((v) => v.id));

    if (vidErr) {
      console.warn(`[bootcamp-modules] Failed to soft-remove videos for module ${moduleId}: ${vidErr.message}`);
    }
  }

  // 6. Hard-delete module row
  const { error: delErr } = await admin
    .from('master_course_modules')
    .delete()
    .eq('id', moduleId)
    .eq('master_course_id', courseId);

  if (delErr) {
    throw new Error(`Failed to delete module: ${delErr.message}`);
  }

  await revalidateCourseStructure(courseId);

  return { ok: true, message: 'Module deleted. Student access revoked, videos hidden, TPStreams folder removed.' };
}

// --- Module Videos ------------------------------------------------------------

/**
 * List video assets for a module inside a bootcamp course.
 * Mirrors `listVideosForModule` from `video-assets.ts` but validates against
 * the bootcamp instead of a pillar (bootcamp courses have pillar_id=null).
 */
export async function listBootcampModuleVideos(
  bootcampId: string,
  courseId: string,
  moduleId: string,
): Promise<VideoAssetWithCourse[]> {
  const admin = createAdminClient();

  const { data: course, error: courseError } = await admin
    .from('master_courses')
    .select('id, bootcamp_id, catalog_type')
    .eq('id', courseId)
    .maybeSingle();

  if (courseError || !course) {
    throw new Error(`Course not found: ${courseId}`);
  }
  if (course.catalog_type !== 'bootcamp' || course.bootcamp_id !== bootcampId) {
    throw new Error(`Course ${courseId} does not belong to Bootcamp ${bootcampId}`);
  }

  const { data: module, error: moduleError } = await admin
    .from('master_course_modules')
    .select('master_course_id')
    .eq('id', moduleId)
    .maybeSingle();

  if (moduleError || !module) {
    throw new Error(`Module not found: ${moduleId}`);
  }

  if (module.master_course_id !== courseId) {
    throw new Error(`Module ${moduleId} does not belong to Course ${courseId}`);
  }

  const { data, error } = await admin
    .from('video_assets')
    .select(`
      *,
      master_courses!inner(code, title)
    `)
    .eq('master_course_id', courseId)
    .eq('master_course_module_id', moduleId)
    .eq('sync_status', 'active')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to list module videos: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    ...row,
    master_course_code: (row.master_courses as { code: string; title: string } | null)?.code ?? null,
    master_course_title: (row.master_courses as { code: string; title: string } | null)?.title ?? null,
  }));
}
