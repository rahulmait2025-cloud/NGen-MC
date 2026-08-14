import 'server-only';

/**
 * TPStreams Hierarchy Service.
 * 
 * Manages the 3-level folder hierarchy in TPStreams:
 * Pillar (Parent) -> Course (Child) -> Module (Grandchild)
 * 
 * Videos are uploaded directly into the Module folder.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { createFolderIdempotent } from '../tpstreams/folders';
import { deleteAsset } from '../tpstreams/assets';
import { TpStreamsApiError } from '../tpstreams/client';
import type { 
  MasterCoursePillarsRow, 
  MasterCoursesRow, 
  MasterCourseModulesRow 
} from '@/types/database';

// ─── Helper: Folder Titles ──────────────────────────────────────────────────

function buildPillarFolderTitle(code: string, title: string): string {
  return `PILLAR-${code} - ${title}`;
}

function buildCourseFolderTitle(code: string, title: string): string {
  return `MC-${code} - ${title}`;
}

function buildModuleFolderTitle(sortOrder: number, id: string, title: string): string {
  const shortId = id.substring(0, 4);
  return `MOD-${sortOrder}-${shortId} - ${title}`;
}

/** TPStreams folder name: Free-Course_{courseTitle} (minimal sanitization for invalid path chars). */
function buildFreeCourseFolderTitle(courseTitle: string): string {
  const safeTitle =
    courseTitle
      .trim()
      .replace(/[/\\:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .slice(0, 180) || 'Untitled';
  return `Free-Course_${safeTitle}`;
}

// ─── Hierarchy Service ──────────────────────────────────────────────────────

/**
 * Ensure a TPStreams folder exists for a Pillar.
 */
export async function ensurePillarFolder(pillarId: string): Promise<MasterCoursePillarsRow> {
  const admin = createAdminClient();

  // Load pillar
  const { data: pillar, error: loadError } = await admin
    .from('master_course_pillars')
    .select('*')
    .eq('id', pillarId)
    .single();

  if (loadError || !pillar) {
    throw new Error(`Pillar not found: ${pillarId}`);
  }

  // If already created, return
  if (pillar.tp_folder_status === 'created' && pillar.tp_folder_uuid) {
    return pillar;
  }

  const folderTitle = buildPillarFolderTitle(pillar.code, pillar.title);

  try {
    console.log(`[tp-hierarchy] Creating pillar folder: "${folderTitle}"`);
    const folder = await createFolderIdempotent(folderTitle);

    const { data: updated, error: updateError } = await admin
      .from('master_course_pillars')
      .update({
        tp_folder_uuid: folder.uuid,
        tp_folder_title: folderTitle,
        tp_folder_status: 'created',
        tp_last_synced_at: new Date().toISOString(),
        tp_last_error: null,
      })
      .eq('id', pillarId)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error(`[tp-hierarchy] Failed to update pillar after folder creation: ${updateError?.message}`);
      return pillar;
    }

    return updated;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[tp-hierarchy] Pillar folder creation failed: ${msg}`);
    
    await admin
      .from('master_course_pillars')
      .update({
        tp_folder_status: 'failed',
        tp_last_error: msg.substring(0, 500),
      })
      .eq('id', pillarId);
      
    throw new Error(`Pillar folder sync failed: ${msg}`);
  }
}

/**
 * Ensure a TPStreams folder exists for a Course, nested under its Pillar.
 */
export async function ensureCourseFolder(courseId: string): Promise<MasterCoursesRow> {
  const admin = createAdminClient();

  // Load course
  const { data: course, error: loadError } = await admin
    .from('master_courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (loadError || !course) {
    throw new Error(`Master Course not found: ${courseId}`);
  }

  if (!course.pillar_id) {
    throw new Error(`Course ${courseId} is not assigned to a pillar.`);
  }

  // Ensure parent pillar folder exists
  const pillar = await ensurePillarFolder(course.pillar_id);
  if (!pillar.tp_folder_uuid) {
    throw new Error(`Parent pillar folder is not ready for pillar: ${pillar.id}`);
  }

  // If already created, return
  // Note: We respect existing tp_folder_uuid from Phase 1 backfill.
  if (course.tp_folder_status === 'created' && course.tp_folder_uuid) {
    return course;
  }

  const folderTitle = buildCourseFolderTitle(course.code, course.title);

  try {
    console.log(`[tp-hierarchy] Creating course folder: "${folderTitle}" under parent ${pillar.tp_folder_uuid}`);
    const folder = await createFolderIdempotent(folderTitle, pillar.tp_folder_uuid);

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
      console.error(`[tp-hierarchy] Failed to update course after folder creation: ${updateError?.message}`);
      return course;
    }

    return updated;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[tp-hierarchy] Course folder creation failed: ${msg}`);
    
    await admin
      .from('master_courses')
      .update({
        tp_folder_status: 'failed',
        tp_last_error: msg.substring(0, 500),
      })
      .eq('id', courseId);
      
    throw new Error(`Course folder sync failed: ${msg}`);
  }
}

/**
 * Ensure a TPStreams folder exists for a Module, nested under its Course.
 */
export async function ensureModuleFolder(moduleId: string): Promise<MasterCourseModulesRow> {
  const admin = createAdminClient();

  // Load module
  const { data: moduleData, error: loadError } = await admin
    .from('master_course_modules')
    .select('*')
    .eq('id', moduleId)
    .single();

  if (loadError || !moduleData) {
    throw new Error(`Module not found: ${moduleId}`);
  }

  // Ensure parent course folder exists
  const course = await ensureCourseFolder(moduleData.master_course_id);
  if (!course.tp_folder_uuid) {
    throw new Error(`Parent course folder is not ready for course: ${course.id}`);
  }

  // If already created, return
  if (moduleData.tp_folder_status === 'created' && moduleData.tp_folder_uuid) {
    return moduleData;
  }

  const folderTitle = buildModuleFolderTitle(moduleData.sort_order, moduleData.id, moduleData.title);

  try {
    console.log(`[tp-hierarchy] Creating module folder: "${folderTitle}" under parent ${course.tp_folder_uuid}`);
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
      console.error(`[tp-hierarchy] Failed to update module after folder creation: ${updateError?.message}`);
      return moduleData;
    }

    return updated;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[tp-hierarchy] Module folder creation failed: ${msg}`);
    
    await admin
      .from('master_course_modules')
      .update({
        tp_folder_status: 'failed',
        tp_last_error: msg.substring(0, 500),
      })
      .eq('id', moduleId);
      
    throw new Error(`Module folder sync failed: ${msg}`);
  }
}

/**
 * Get the target upload folder for a module.
 * Ensures the hierarchy is ready before returning the UUID.
 */
async function _getUploadFolderForModule(moduleId: string): Promise<string> {
  const moduleData = await ensureModuleFolder(moduleId);
  if (moduleData.tp_folder_status !== 'created' || !moduleData.tp_folder_uuid) {
    throw new Error(`Module TPStreams folder is not ready. Please retry folder sync.`);
  }
  return moduleData.tp_folder_uuid;
}

// ─── Delete Cascade ─────────────────────────────────────────────────────────

/**
 * Delete a Module folder and its videos from TPStreams.
 */
async function _deleteModuleFolderCascade(moduleId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: moduleData } = await admin
    .from('master_course_modules')
    .select('tp_folder_uuid')
    .eq('id', moduleId)
    .single();

  if (moduleData?.tp_folder_uuid) {
    console.log(`[tp-hierarchy] Deleting module folder: ${moduleData.tp_folder_uuid}`);
    try {
      await deleteAsset(moduleData.tp_folder_uuid);
    } catch (err) {
      if (err instanceof TpStreamsApiError && err.status === 404) {
        console.warn(`[tp-hierarchy] Module folder ${moduleData.tp_folder_uuid} already deleted on TPStreams.`);
      } else {
        throw err;
      }
    }
  }

  // Local status update placeholder
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
 * Delete a Course folder and all its modules/videos from TPStreams.
 */
async function _deleteCourseFolderCascade(courseId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: course } = await admin
    .from('master_courses')
    .select('tp_folder_uuid')
    .eq('id', courseId)
    .single();

  if (course?.tp_folder_uuid) {
    console.log(`[tp-hierarchy] Deleting course folder: ${course.tp_folder_uuid}`);
    try {
      await deleteAsset(course.tp_folder_uuid);
    } catch (err) {
      if (err instanceof TpStreamsApiError && err.status === 404) {
        console.warn(`[tp-hierarchy] Course folder ${course.tp_folder_uuid} already deleted on TPStreams.`);
      } else {
        throw err;
      }
    }
  }

  // Local status update placeholder
  await admin
    .from('master_courses')
    .update({
      tp_folder_status: 'pending',
      tp_folder_uuid: null,
      tp_folder_title: null,
    })
    .eq('id', courseId);
}

/**
 * Delete a Pillar folder and all its courses/modules/videos from TPStreams.
 */
export async function deletePillarFolderCascade(pillarId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: pillar } = await admin
    .from('master_course_pillars')
    .select('tp_folder_uuid')
    .eq('id', pillarId)
    .single();

  if (pillar?.tp_folder_uuid) {
    console.log(`[tp-hierarchy] Deleting pillar folder: ${pillar.tp_folder_uuid}`);
    try {
      await deleteAsset(pillar.tp_folder_uuid);
    } catch (err) {
      if (err instanceof TpStreamsApiError && err.status === 404) {
        console.warn(`[tp-hierarchy] Pillar folder ${pillar.tp_folder_uuid} already deleted on TPStreams.`);
      } else {
        throw err;
      }
    }
  }

  // Local status update placeholder
  await admin
    .from('master_course_pillars')
    .update({
      tp_folder_status: 'pending',
      tp_folder_uuid: null,
      tp_folder_title: null,
    })
    .eq('id', pillarId);
}

// ─── Rename Note ────────────────────────────────────────────────────────────

/**
 * NOTE: TPStreams folder physical rename is intentionally not implemented 
 * because no official folder rename endpoint is present in current TPStreams docs.
 */

// ─── Retry Actions ──────────────────────────────────────────────────────────

/**
 * Retry TPStreams folder creation for a failed Pillar.
 */
export async function retryPillarFolderSync(pillarId: string): Promise<MasterCoursePillarsRow> {
  const admin = createAdminClient();
  
  // Clear error and reset status
  await admin.from('master_course_pillars')
    .update({ 
      tp_folder_status: 'pending',
      tp_last_error: null 
    })
    .eq('id', pillarId);
  
  return ensurePillarFolder(pillarId);
}

/**
 * Retry TPStreams folder creation for a failed Course.
 */
export async function retryCourseFolderSync(courseId: string): Promise<MasterCoursesRow> {
  const admin = createAdminClient();
  
  // Clear error and reset status
  await admin.from('master_courses')
    .update({ 
      tp_folder_status: 'pending',
      tp_last_error: null 
    })
    .eq('id', courseId);
  
  return ensureCourseFolder(courseId);
}

/**
 * Ensure a TPStreams folder exists for a free course (no pillar parent; org root).
 */
export async function ensureFreeCourseFolder(courseId: string): Promise<MasterCoursesRow> {
  const admin = createAdminClient();

  const { data: course, error: loadError } = await admin
    .from('master_courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (loadError || !course) {
    throw new Error(`Master Course not found: ${courseId}`);
  }

  if (course.course_kind !== 'free_course') {
    throw new Error(`Course ${courseId} is not a free course.`);
  }

  if (course.tp_folder_status === 'created' && course.tp_folder_uuid) {
    return course;
  }

  const folderTitle = buildFreeCourseFolderTitle(course.title);

  try {
    console.log(`[tp-hierarchy] Creating free course folder: "${folderTitle}"`);
    const folder = await createFolderIdempotent(folderTitle);

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
      console.error(`[tp-hierarchy] Failed to update free course after folder creation: ${updateError?.message}`);
      return course;
    }

    return updated;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[tp-hierarchy] Free course folder creation failed: ${msg}`);

    await admin
      .from('master_courses')
      .update({
        tp_folder_status: 'failed',
        tp_last_error: msg.substring(0, 500),
      })
      .eq('id', courseId);

    throw new Error(`Free course TPStreams folder could not be created. ${msg}`);
  }
}

/**
 * Ensure a TPStreams folder exists for a module under a free course.
 */
export async function ensureFreeCourseModuleFolder(moduleId: string): Promise<MasterCourseModulesRow> {
  const admin = createAdminClient();

  const { data: moduleData, error: loadError } = await admin
    .from('master_course_modules')
    .select('*')
    .eq('id', moduleId)
    .single();

  if (loadError || !moduleData) {
    throw new Error(`Module not found: ${moduleId}`);
  }

  const course = await ensureFreeCourseFolder(moduleData.master_course_id);
  if (!course.tp_folder_uuid) {
    throw new Error(`Parent free course folder is not ready for course: ${course.id}`);
  }

  if (moduleData.tp_folder_status === 'created' && moduleData.tp_folder_uuid) {
    return moduleData;
  }

  const folderTitle = buildModuleFolderTitle(
    moduleData.sort_order,
    moduleData.id,
    moduleData.title,
  );

  try {
    console.log(`[tp-hierarchy] Creating free course module folder: "${folderTitle}"`);
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
      console.error(`[tp-hierarchy] Failed to update free course module after folder creation: ${updateError?.message}`);
      return moduleData;
    }

    return updated;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[tp-hierarchy] Free course module folder creation failed: ${msg}`);

    await admin
      .from('master_course_modules')
      .update({
        tp_folder_status: 'failed',
        tp_last_error: msg.substring(0, 500),
      })
      .eq('id', moduleId);

    throw new Error(`Free course module folder sync failed: ${msg}`);
  }
}

/**
 * Retry TPStreams folder creation for a failed Module.
 */
export async function retryModuleFolderSync(moduleId: string): Promise<MasterCourseModulesRow> {
  const admin = createAdminClient();
  
  // Clear error and reset status
  await admin.from('master_course_modules')
    .update({ 
      tp_folder_status: 'pending',
      tp_last_error: null 
    })
    .eq('id', moduleId);
  
  return ensureModuleFolder(moduleId);
}
