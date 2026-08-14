import 'server-only';

/**
 * TPStreams Bootcamp Hierarchy Service.
 *
 * Manages the 3-level folder hierarchy in TPStreams for Bootcamps:
 * Bootcamp (Root) → Course (Child) → Module (Grandchild)
 *
 * Videos are uploaded directly into the Module folder.
 *
 * This mirrors tpstreams-hierarchy.ts but for bootcamp courses
 * which have catalog_type='bootcamp' and bootcamp_id set.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { createFolderIdempotent } from '../tpstreams/folders';
import { deleteAsset } from '../tpstreams/assets';
import { TpStreamsApiError } from '../tpstreams/client';
import type {
  BootcampsRow,
  MasterCoursesRow,
  MasterCourseModulesRow,
} from '@/types/database';

// ─── Helper: Folder Titles ──────────────────────────────────────────────────

function buildBootcampFolderTitle(code: string, title: string): string {
  return `BOOTCAMP-${code} - ${title}`;
}

function buildBootcampCourseFolderTitle(code: string, title: string): string {
  return `BC-${code} - ${title}`;
}

function buildModuleFolderTitle(sortOrder: number, id: string, title: string): string {
  const shortId = id.substring(0, 4);
  return `MOD-${sortOrder}-${shortId} - ${title}`;
}

// ─── Hierarchy Service ──────────────────────────────────────────────────────

/**
 * Ensure a TPStreams folder exists for a Bootcamp (root level).
 */
async function ensureBootcampFolder(bootcampId: string): Promise<BootcampsRow> {
  const admin = createAdminClient();

  const { data: bootcamp, error: loadError } = await admin
    .from('bootcamps')
    .select('*')
    .eq('id', bootcampId)
    .single();

  if (loadError || !bootcamp) {
    throw new Error(`Bootcamp not found: ${bootcampId}`);
  }

  // If already created, return
  if (bootcamp.tp_folder_status === 'created' && bootcamp.tp_folder_uuid) {
    return bootcamp;
  }

  const folderTitle = buildBootcampFolderTitle(bootcamp.code, bootcamp.title);

  try {
    console.log(`[tp-bootcamp-hierarchy] Creating bootcamp folder: "${folderTitle}"`);
    const folder = await createFolderIdempotent(folderTitle);

    const { data: updated, error: updateError } = await admin
      .from('bootcamps')
      .update({
        tp_folder_uuid: folder.uuid,
        tp_folder_title: folderTitle,
        tp_folder_status: 'created',
        tp_last_synced_at: new Date().toISOString(),
        tp_last_error: null,
      })
      .eq('id', bootcampId)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error(`[tp-bootcamp-hierarchy] Failed to update bootcamp after folder creation: ${updateError?.message}`);
      return bootcamp;
    }

    return updated;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[tp-bootcamp-hierarchy] Bootcamp folder creation failed: ${msg}`);

    await admin
      .from('bootcamps')
      .update({
        tp_folder_status: 'failed',
        tp_last_error: msg.substring(0, 500),
      })
      .eq('id', bootcampId);

    throw new Error(`Bootcamp folder sync failed: ${msg}`);
  }
}

/**
 * Ensure a TPStreams folder exists for a Bootcamp Course, nested under its Bootcamp.
 */
async function ensureBootcampCourseFolder(courseId: string): Promise<MasterCoursesRow> {
  const admin = createAdminClient();

  const { data: course, error: loadError } = await admin
    .from('master_courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (loadError || !course) {
    throw new Error(`Master Course not found: ${courseId}`);
  }

  if (course.catalog_type !== 'bootcamp' || !course.bootcamp_id) {
    throw new Error(`Course ${courseId} is not a bootcamp course.`);
  }

  // Ensure parent bootcamp folder exists
  const bootcamp = await ensureBootcampFolder(course.bootcamp_id);
  if (!bootcamp.tp_folder_uuid) {
    throw new Error(`Parent bootcamp folder is not ready for bootcamp: ${bootcamp.id}`);
  }

  // If already created, return
  if (course.tp_folder_status === 'created' && course.tp_folder_uuid) {
    return course;
  }

  const folderTitle = buildBootcampCourseFolderTitle(course.code, course.title);

  try {
    console.log(`[tp-bootcamp-hierarchy] Creating bootcamp course folder: "${folderTitle}" under parent ${bootcamp.tp_folder_uuid}`);
    const folder = await createFolderIdempotent(folderTitle, bootcamp.tp_folder_uuid);

    const { data: updated, error: updateError } = await admin
      .from('master_courses')
      .update({
        tp_folder_uuid: folder.uuid,
        tp_folder_title: folderTitle,
        tp_folder_status: 'created',
        tp_last_synced_at: new Date().toISOString(),
        tp_last_error: null,
      })
      .eq('id', courseId)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error(`[tp-bootcamp-hierarchy] Failed to update bootcamp course after folder creation: ${updateError?.message}`);
      return course;
    }

    return updated;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[tp-bootcamp-hierarchy] Bootcamp course folder creation failed: ${msg}`);

    await admin
      .from('master_courses')
      .update({
        tp_folder_status: 'failed',
        tp_last_error: msg.substring(0, 500),
      })
      .eq('id', courseId);

    throw new Error(`Bootcamp course folder sync failed: ${msg}`);
  }
}

/**
 * Ensure a TPStreams folder exists for a Module under a Bootcamp Course.
 */
export async function ensureBootcampModuleFolder(moduleId: string): Promise<MasterCourseModulesRow> {
  const admin = createAdminClient();

  const { data: moduleData, error: loadError } = await admin
    .from('master_course_modules')
    .select('*')
    .eq('id', moduleId)
    .single();

  if (loadError || !moduleData) {
    throw new Error(`Module not found: ${moduleId}`);
  }

  // Ensure parent bootcamp course folder exists
  const course = await ensureBootcampCourseFolder(moduleData.master_course_id);
  if (!course.tp_folder_uuid) {
    throw new Error(`Parent bootcamp course folder is not ready for course: ${course.id}`);
  }

  // If already created, return
  if (moduleData.tp_folder_status === 'created' && moduleData.tp_folder_uuid) {
    return moduleData;
  }

  const folderTitle = buildModuleFolderTitle(moduleData.sort_order, moduleData.id, moduleData.title);

  try {
    console.log(`[tp-bootcamp-hierarchy] Creating bootcamp module folder: "${folderTitle}" under parent ${course.tp_folder_uuid}`);
    const folder = await createFolderIdempotent(folderTitle, course.tp_folder_uuid);

    const { data: updated, error: updateError } = await admin
      .from('master_course_modules')
      .update({
        tp_folder_uuid: folder.uuid,
        tp_folder_title: folderTitle,
        tp_folder_status: 'created',
        tp_last_synced_at: new Date().toISOString(),
        tp_last_error: null,
      })
      .eq('id', moduleId)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error(`[tp-bootcamp-hierarchy] Failed to update bootcamp module after folder creation: ${updateError?.message}`);
      return moduleData;
    }

    return updated;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[tp-bootcamp-hierarchy] Bootcamp module folder creation failed: ${msg}`);

    await admin
      .from('master_course_modules')
      .update({
        tp_folder_status: 'failed',
        tp_last_error: msg.substring(0, 500),
      })
      .eq('id', moduleId);

    throw new Error(`Bootcamp module folder sync failed: ${msg}`);
  }
}

/**
 * Ensure the full TPStreams folder hierarchy exists for a Bootcamp Course:
 * Bootcamp → Course → all Module folders.
 *
 * Returns the course with its tp_folder_uuid populated.
 */
export async function ensureBootcampTpFolders(courseId: string): Promise<MasterCoursesRow> {
  const course = await ensureBootcampCourseFolder(courseId);

  const admin = createAdminClient();
  const { data: modules } = await admin
    .from('master_course_modules')
    .select('id')
    .eq('master_course_id', courseId)
    .order('sort_order', { ascending: true });

  if (modules && modules.length > 0) {
    await Promise.allSettled(
      modules.map((m) => ensureBootcampModuleFolder(m.id)),
    );
  }

  return course;
}

// ─── Retry Actions ──────────────────────────────────────────────────────────

/**
 * Retry TPStreams folder creation for a failed Bootcamp.
 */
async function _retryBootcampFolderSync(bootcampId: string): Promise<BootcampsRow> {
  const admin = createAdminClient();

  await admin.from('bootcamps')
    .update({
      tp_folder_status: 'pending',
      tp_last_error: null,
    })
    .eq('id', bootcampId);

  return ensureBootcampFolder(bootcampId);
}

/**
 * Retry TPStreams folder creation for a failed Bootcamp Course.
 */
export async function retryBootcampCourseFolderSync(courseId: string): Promise<MasterCoursesRow> {
  const admin = createAdminClient();

  await admin.from('master_courses')
    .update({
      tp_folder_status: 'pending',
      tp_last_error: null,
    })
    .eq('id', courseId);

  return ensureBootcampCourseFolder(courseId);
}

/**
 * Retry TPStreams folder creation for a failed Bootcamp Module.
 */
export async function retryBootcampModuleFolderSync(moduleId: string): Promise<MasterCourseModulesRow> {
  const admin = createAdminClient();

  await admin.from('master_course_modules')
    .update({
      tp_folder_status: 'pending',
      tp_last_error: null,
    })
    .eq('id', moduleId);

  return ensureBootcampModuleFolder(moduleId);
}

// ─── Delete Cascade ─────────────────────────────────────────────────────────

/**
 * Delete a Bootcamp Module folder from TPStreams.
 */
export async function deleteBootcampModuleFolderCascade(moduleId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: moduleData } = await admin
    .from('master_course_modules')
    .select('tp_folder_uuid')
    .eq('id', moduleId)
    .single();

  if (moduleData?.tp_folder_uuid) {
    console.log(`[tp-bootcamp-hierarchy] Deleting bootcamp module folder: ${moduleData.tp_folder_uuid}`);
    try {
      await deleteAsset(moduleData.tp_folder_uuid);
    } catch (err) {
      if (err instanceof TpStreamsApiError && err.status === 404) {
        console.warn(`[tp-bootcamp-hierarchy] Module folder ${moduleData.tp_folder_uuid} already deleted on TPStreams.`);
      } else {
        throw err;
      }
    }
  }

  await admin
    .from('master_course_modules')
    .update({
      tp_folder_status: 'pending',
      tp_folder_uuid: null,
      tp_folder_title: null,
    })
    .eq('id', moduleId);
}

/**
 * Delete a Bootcamp Course folder and all its module folders from TPStreams.
 */
export async function deleteBootcampCourseFolderCascade(courseId: string): Promise<void> {
  const admin = createAdminClient();

  // Delete all module folders first
  const { data: modules } = await admin
    .from('master_course_modules')
    .select('id')
    .eq('master_course_id', courseId);

  if (modules) {
    await Promise.allSettled(
      modules.map((m) => deleteBootcampModuleFolderCascade(m.id)),
    );
  }

  const { data: course } = await admin
    .from('master_courses')
    .select('tp_folder_uuid')
    .eq('id', courseId)
    .single();

  if (course?.tp_folder_uuid) {
    console.log(`[tp-bootcamp-hierarchy] Deleting bootcamp course folder: ${course.tp_folder_uuid}`);
    try {
      await deleteAsset(course.tp_folder_uuid);
    } catch (err) {
      if (err instanceof TpStreamsApiError && err.status === 404) {
        console.warn(`[tp-bootcamp-hierarchy] Course folder ${course.tp_folder_uuid} already deleted on TPStreams.`);
      } else {
        throw err;
      }
    }
  }

  await admin
    .from('master_courses')
    .update({
      tp_folder_status: 'pending',
      tp_folder_uuid: null,
      tp_folder_title: null,
    })
    .eq('id', courseId);
}
