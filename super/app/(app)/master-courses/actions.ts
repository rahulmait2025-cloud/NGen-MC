'use server';

/**
 * Master Courses Server Actions (Phase 4).
 */

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  createMasterCourse,
  updateMasterCourse,
  updateCourseVisibility,
} from '@/lib/services/master-courses';
import {
  createMasterCoursePillar,
  updateMasterCoursePillar,
  ensureCorePillars,
  moveCourseToPillar,
  getMasterCoursePillarById,
} from '@/lib/services/master-course-pillars';
import {
  retryPillarFolderSync,
  retryCourseFolderSync,
} from '@/lib/services/tpstreams-hierarchy';
import {
  runFullTpSync,
  TpSyncStats,
} from '@/lib/services/tpstreams-sync';
import { createAdminClient } from '@/lib/supabase/admin';
import { repairCollegeCourseEntitlements, type RepairEntitlementsResult } from '@/lib/services/master-course-publish';
import {
  deleteAsset as deleteTpAsset,
  moveAsset as moveTpAsset,
} from '@/lib/tpstreams/assets';
import {
  requireAuth,
} from '@/lib/auth/require-superadmin-action';
import {
  getTpstreamsForceDeleteImpact,
  type TpstreamsForceDeleteImpact,
} from '@/lib/services/tpstreams-force-delete';
import {
  createPillarSchema,
  updatePillarSchema,
  UpdatePillarInput,
} from '@/lib/validation/master-course-pillar';
import {
  createCourseInsidePillarSchema,
  updateCourseInsidePillarSchema,
  courseVisibilitySchema,
} from '@/lib/validation/master-course';
import {
  createModuleInsideCourseSchema,
  updateModuleInsideCourseSchema,
} from '@/lib/validation/master-course-module';
import {
  createModuleInsideCourse,
  updateModuleInsideCourse,
  retryModuleFolderSyncForCourse,
  getMasterCourseById,
} from '@/lib/services/master-courses';

import {
  deleteCourseSafely,
  deleteModuleSafely,
  deletePillarSafely,
  deleteVideoAssetSafely,
  getModuleDeleteImpact,
  type ModuleDeleteImpact,
} from '@/lib/services/master-course-delete';


import { getPillarDiagnosticInfo } from '@/lib/services/master-course-pillars';
import {
  assignPillarToColleges,
  type PillarAssignmentResult,
} from '@/lib/services/pillar-assignments';
import { consumeRateLimit } from '@/lib/security/rate-limit';

// --- Types --------------------------------------------------------------------

interface ActionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  id?: string;
  message?: string;
}

async function revalidateCourseAssignmentPaths(courseId: string) {
  const course = await getMasterCourseById(courseId);
  const pillarId = course?.pillar_id ?? null;

  revalidatePath(`/master-courses/${courseId}`);

  if (pillarId) {
    revalidatePath(`/master-courses/pillars/${pillarId}`);
    revalidatePath(`/master-courses/pillars/${pillarId}/courses/${courseId}`);
    revalidatePath(`/master-courses/pillars/${pillarId}/courses/${courseId}/preview`);
  }
}

// --- Pillar Actions -----------------------------------------------------------

/**
 * Create a new Pillar.
 */
export async function createPillarAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const rawData = {
      code: formData.get('code'),
      title: formData.get('title'),
      slug: formData.get('slug'),
      description: formData.get('description'),
      short_description: formData.get('short_description'),
      sort_order: formData.get('sort_order') ? Number(formData.get('sort_order')) : 0,
      publish_status: formData.get('publish_status') || 'draft',
      visible_to_college_admins: formData.get('visible_to_college_admins') === 'true',
      visible_to_college_students: formData.get('visible_to_college_students') === 'true',
      visible_to_global_students: formData.get('visible_to_global_students') === 'true',
      tp_folder_uuid: formData.get('tp_folder_uuid') || undefined,
    };

    const parsed = createPillarSchema.safeParse(rawData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const pillar = await createMasterCoursePillar({
      ...parsed.data,
      tp_folder_uuid: rawData.tp_folder_uuid as string | undefined,
      created_by: authCheck.user.id,
    });

    revalidatePath('/master-courses');
    return { ok: true, data: pillar, id: pillar.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Update an existing Pillar.
 */
export async function updatePillarAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const pillarId = formData.get('pillar_id') as string;
    if (!pillarId) return { ok: false, error: 'Pillar ID is required' };

    const rawData: Record<string, unknown> = {};
    if (formData.has('title')) rawData.title = formData.get('title');
    if (formData.has('slug')) rawData.slug = formData.get('slug');
    if (formData.has('description')) rawData.description = formData.get('description');
    if (formData.has('short_description')) rawData.short_description = formData.get('short_description');
    if (formData.has('sort_order')) rawData.sort_order = Number(formData.get('sort_order'));
    if (formData.has('publish_status')) rawData.publish_status = formData.get('publish_status');
    if (formData.has('visible_to_college_admins')) {
      rawData.visible_to_college_admins = formData.get('visible_to_college_admins') === 'true';
    }
    if (formData.has('visible_to_college_students')) {
      rawData.visible_to_college_students = formData.get('visible_to_college_students') === 'true';
    }
    if (formData.has('visible_to_global_students')) {
      rawData.visible_to_global_students = formData.get('visible_to_global_students') === 'true';
    }

    const parsed = updatePillarSchema.safeParse(rawData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    let patch = { ...(parsed.data as UpdatePillarInput) };
    const hasStudentAudienceInForm =
      formData.has('visible_to_college_students') || formData.has('visible_to_global_students');

    if (patch.publish_status === 'published' && !hasStudentAudienceInForm) {
      const existing = await getMasterCoursePillarById(pillarId);
      if (
        existing &&
        !existing.visible_to_college_students &&
        !existing.visible_to_global_students
      ) {
        patch = { ...patch, visible_to_college_students: true };
      }
    }

    const pillar = await updateMasterCoursePillar(pillarId, patch);

    revalidatePath('/master-courses');
    revalidatePath(`/master-courses/pillars/${pillarId}`);
    return { ok: true, data: pillar };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Ensure core pillars exist.
 */
export async function ensureCorePillarsAction(): Promise<ActionResponse<{ created: number; existed: number; failedSync: number }>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const counts = await ensureCorePillars(authCheck.user.id);
    revalidatePath('/master-courses');
    return { ok: true, data: counts };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

// --- Course Actions -----------------------------------------------------------


/**
 * Create a new Master Course inside a Pillar.
 */
export async function createCourseInsidePillarAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const rawData = {
      pillar_id: formData.get('pillar_id'),
      code: formData.get('code'),
      title: formData.get('title'),
      slug: formData.get('slug'),
      description: formData.get('description'),
      short_description: formData.get('short_description'),
      publish_status: formData.get('publish_status') || 'draft',
      visible_to_college_admins: formData.get('visible_to_college_admins') === 'true',
      visible_to_college_students: formData.get('visible_to_college_students') === 'true',
      visible_to_global_students: formData.get('visible_to_global_students') === 'true',
      metadata: formData.has('metadata') ? JSON.parse(formData.get('metadata') as string) : undefined,
    };

    const parsed = createCourseInsidePillarSchema.safeParse(rawData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const course = await createMasterCourse({
      ...parsed.data,
      created_by: authCheck.user.id,
    });

    revalidatePath(`/master-courses/pillars/${parsed.data.pillar_id}`);
    revalidatePath('/master-courses');
    return { ok: true, data: course, id: course.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Update a course inside a pillar.
 */
export async function updateCourseInsidePillarAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const pillarId = formData.get('pillar_id') as string;
    const courseId = formData.get('course_id') as string;
    if (!pillarId || !courseId) return { ok: false, error: 'Pillar and Course ID are required' };

    const rawData: Record<string, unknown> = {};
    if (formData.has('title')) rawData.title = formData.get('title');
    if (formData.has('slug')) rawData.slug = formData.get('slug');
    if (formData.has('description')) rawData.description = formData.get('description');
    if (formData.has('short_description')) rawData.short_description = formData.get('short_description');
    if (formData.has('publish_status')) rawData.publish_status = formData.get('publish_status');
    if (formData.has('metadata')) rawData.metadata = JSON.parse(formData.get('metadata') as string);

    const parsed = updateCourseInsidePillarSchema.safeParse(rawData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const course = await updateMasterCourse(courseId, parsed.data);

    await revalidateCourseAssignmentPaths(courseId);
    return { ok: true, data: course };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Update course visibility toggles.
 */
export async function updateCourseVisibilityAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const courseId = formData.get('course_id') as string;
    if (!courseId) return { ok: false, error: 'Course ID is required' };

    const rawData = {
      visible_to_college_admins: formData.get('visible_to_college_admins') === 'true',
      visible_to_college_students: formData.get('visible_to_college_students') === 'true',
      visible_to_global_students: formData.get('visible_to_global_students') === 'true',
    };

    const parsed = courseVisibilitySchema.safeParse(rawData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const course = await updateCourseVisibility(courseId, parsed.data);

    await revalidateCourseAssignmentPaths(courseId);
    
    return { ok: true, data: course };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Delete a Master Course.
 */
async function deleteMasterCourseAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const pillarId = formData.get('pillar_id') as string;
    const courseId = formData.get('course_id') as string;
    const confirmation = formData.get('confirmation') as string;

    if (!courseId) {
      return { ok: false, error: 'Course ID is required' };
    }
    if (!['DELETE COURSE', String(formData.get('course_title') ?? '').trim()].includes((confirmation ?? '').trim())) {
      return { ok: false, error: 'Delete confirmation did not match.' };
    }

    const result = await deleteCourseSafely(courseId, authCheck.user.id);

    if (pillarId) {
      revalidatePath(`/master-courses/pillars/${pillarId}`);
      revalidatePath(`/master-courses/pillars/${pillarId}/courses/${courseId}`);
    }
    revalidatePath('/master-courses');

    return { ok: true, id: courseId, data: result, message: result.message } as ActionResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Move a course to a different pillar.
 */
export async function moveCourseToPillarAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const courseId = formData.get('course_id') as string;
    const targetPillarId = formData.get('target_pillar_id') as string;
    const currentPillarId = formData.get('current_pillar_id') as string;

    if (!courseId) {
      return { ok: false, error: 'Course ID is required' };
    }
    if (!targetPillarId) {
      return { ok: false, error: 'Target pillar ID is required' };
    }

    const course = await moveCourseToPillar(courseId, targetPillarId);

    // Revalidate all relevant paths
    revalidatePath('/master-courses');
    if (currentPillarId) {
      revalidatePath(`/master-courses/pillars/${currentPillarId}`);
    }
    revalidatePath(`/master-courses/pillars/${targetPillarId}`);
    revalidatePath(`/master-courses/pillars/${targetPillarId}/courses/${courseId}`);

    return { ok: true, data: course, message: `Course moved to new pillar` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

export async function deletePillarAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const limited = await consumeRateLimit({ key: `delete-pillar:${authCheck.user.id}`, limit: 10, windowMs: 5 * 60 * 1000 });
  if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

  try {
    const pillarId = formData.get('pillar_id') as string;
    const confirmation = (formData.get('confirmation') as string | null)?.trim() ?? '';
    const pillarTitle = (formData.get('pillar_title') as string | null)?.trim() ?? '';

    if (!pillarId) return { ok: false, error: 'Pillar ID is required.' };
    if (!['DELETE PILLAR', pillarTitle].includes(confirmation)) {
      return { ok: false, error: 'Delete confirmation did not match.' };
    }

    const result = await deletePillarSafely(pillarId, authCheck.user.id);
    revalidatePath('/master-courses');
    revalidatePath(`/master-courses/pillars/${pillarId}`);

    return { ok: true, id: pillarId, data: result, message: result.message } as ActionResponse;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to delete pillar.',
    };
  }
}

export async function deleteCourseAction(formData: FormData): Promise<ActionResponse> {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false, error: authResult.error };
  return deleteMasterCourseAction(formData);
}

export async function deleteModuleAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const limited = await consumeRateLimit({ key: `delete-module:${authCheck.user.id}`, limit: 20, windowMs: 5 * 60 * 1000 });
  if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

  try {
    const pillarId = formData.get('pillar_id') as string;
    const courseId = formData.get('course_id') as string;
    const moduleId = formData.get('module_id') as string;
    const confirmation = (formData.get('confirmation') as string | null)?.trim() ?? '';
    const moduleTitle = (formData.get('module_title') as string | null)?.trim() ?? '';

    if (!pillarId || !courseId || !moduleId) {
      return { ok: false, error: 'Pillar, Course, and Module ID are required.' };
    }
    if (!['DELETE MODULE', moduleTitle].includes(confirmation)) {
      return { ok: false, error: 'Delete confirmation did not match.' };
    }

    const result = await deleteModuleSafely(moduleId);
    revalidatePath(`/master-courses/pillars/${pillarId}/courses/${courseId}`);
    revalidatePath(`/master-courses/pillars/${pillarId}/courses/${courseId}/modules/${moduleId}/videos`);

    return { ok: true, id: moduleId, data: result, message: result.message } as ActionResponse;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to delete module.',
    };
  }
}

export async function deleteVideoAssetAction(formData: FormData): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const pillarId = formData.get('pillar_id') as string | null;
    const bootcampId = formData.get('bootcamp_id') as string | null;
    const courseId = formData.get('course_id') as string;
    const moduleId = formData.get('module_id') as string;
    const videoAssetId = formData.get('video_asset_id') as string;

    if ((!pillarId && !bootcampId) || !courseId || !moduleId || !videoAssetId) {
      return { ok: false, error: 'Container, Course, Module, and Video ID are required.' };
    }

    const result = await deleteVideoAssetSafely(videoAssetId);

    if (pillarId) {
      revalidatePath(`/master-courses/pillars/${pillarId}/courses/${courseId}`);
      revalidatePath(`/master-courses/pillars/${pillarId}/courses/${courseId}/modules/${moduleId}/videos`);
    } else if (bootcampId) {
      revalidatePath(`/bootcamps/${bootcampId}/courses/${courseId}`);
      revalidatePath(`/bootcamps/${bootcampId}/courses/${courseId}/unassigned-videos`);
    }

    return { ok: true, id: videoAssetId, data: result, message: result.message } as ActionResponse;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to delete video.',
    };
  }
}

/**
 * Retry TPStreams folder creation for a failed Course.
 */
export async function retryCourseFolderSyncAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const pillarId = formData.get('pillar_id') as string;
    const courseId = formData.get('course_id') as string;
    if (!courseId) {
      return { ok: false, error: 'Course ID is required' };
    }

    const course = await retryCourseFolderSync(courseId);

    if (pillarId) {
      revalidatePath(`/master-courses/pillars/${pillarId}`);
    }

    return { ok: true, data: course };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Retry TPStreams folder creation for a failed Pillar.
 */
export async function retryPillarFolderSyncAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const pillarId = formData.get('pillar_id') as string;
    if (!pillarId) {
      return { ok: false, error: 'Pillar ID is required' };
    }

    const pillar = await retryPillarFolderSync(pillarId);

    revalidatePath('/master-courses');
    revalidatePath(`/master-courses/pillars/${pillarId}`);

    return { ok: true, data: pillar };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Retry TPStreams folder creation for a failed Module.
 */
export async function retryModuleFolderSyncAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    const pillarId = formData.get('pillar_id') as string;
    const courseId = formData.get('course_id') as string;
    const moduleId = formData.get('module_id') as string;

    if (!moduleId) {
      return { ok: false, error: 'Module ID is required' };
    }

    const m = await retryModuleFolderSyncForCourse(pillarId || '', courseId || '', moduleId);

    if (pillarId && courseId) {
      revalidatePath(`/master-courses/pillars/${pillarId}/courses/${courseId}`);
      revalidatePath(`/master-courses/pillars/${pillarId}/courses/${courseId}/modules/${moduleId}/videos`);
    }

    return { ok: true, data: m };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

// --- Module Actions -----------------------------------------------------------

/**
 * Create a new module inside a course.
 */
export async function createModuleInsideCourseAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const rawData = {
      pillar_id: formData.get('pillar_id'),
      course_id: formData.get('course_id'),
      title: formData.get('title'),
      description: formData.get('description') || undefined,
      sort_order: formData.get('sort_order') ? Number(formData.get('sort_order')) : undefined,
      visible_to_students: formData.get('visible_to_students') !== 'false',
    };

    const parsed = createModuleInsideCourseSchema.safeParse(rawData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const newModule = await createModuleInsideCourse(parsed.data);

    revalidatePath(`/master-courses/pillars/${parsed.data.pillar_id}/courses/${parsed.data.course_id}`);
    revalidatePath(`/master-courses/pillars/${parsed.data.pillar_id}/courses/${parsed.data.course_id}/modules`);
    
    return { ok: true, data: newModule, id: newModule.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Update a module inside a course.
 */
export async function updateModuleInsideCourseAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const pillarId = formData.get('pillar_id') as string;
    const courseId = formData.get('course_id') as string;
    const moduleId = formData.get('module_id') as string;

    if (!pillarId || !courseId || !moduleId) {
      return { ok: false, error: 'Pillar, Course, and Module ID are required' };
    }

    const rawData: Record<string, unknown> = {};
    if (formData.has('title')) rawData.title = formData.get('title');
    if (formData.has('description')) rawData.description = formData.get('description');
    if (formData.has('sort_order')) rawData.sort_order = Number(formData.get('sort_order'));
    if (formData.has('publish_status')) rawData.publish_status = formData.get('publish_status');

    const parsed = updateModuleInsideCourseSchema.safeParse(rawData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const updatedModule = await updateModuleInsideCourse(pillarId, courseId, moduleId, parsed.data);

    revalidatePath(`/master-courses/pillars/${pillarId}/courses/${courseId}`);
    revalidatePath(`/master-courses/pillars/${pillarId}/courses/${courseId}/modules/${moduleId}/videos`);
    
    return { ok: true, data: updatedModule };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Get module upload folder configuration for the video uploader.
 */
/**
 * Get module upload folder configuration for the video uploader.
 * Supports both FormData (legacy/standard) and string moduleId.
 */
export async function getModuleUploadConfigAction(
  input: string | FormData,
): Promise<{
  ok: boolean;
  folderUuid?: string;
  moduleId?: string;
  courseId?: string;
  error?: string;
  data?: { tp_folder_uuid: string | null };
}> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) {
    return { ok: false, error: authCheck.error };
  }

  try {
    let moduleId: string;

    if (typeof input === 'string') {
      moduleId = input;
    } else {
      moduleId = input.get('module_id') as string;
    }

    if (!moduleId) {
      return { ok: false, error: 'Module ID is required' };
    }

    // Attempt to find module
    const admin = createAdminClient();
    const { data: moduleData } = await admin
      .from('master_course_modules')
      .select('id, tp_folder_uuid, master_course_id')
      .eq('id', moduleId)
      .maybeSingle();

    if (!moduleData) {
      return { ok: false, error: 'Module not found' };
    }

    const folderUuid = moduleData.tp_folder_uuid;

    return {
      ok: true,
      folderUuid: folderUuid || undefined,
      moduleId: moduleData.id,
      courseId: moduleData.master_course_id,
      data: { tp_folder_uuid: folderUuid },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Run a full TPStreams → SuperAdmin synchronization.
 */
export async function runFullSyncAction(): Promise<ActionResponse<TpSyncStats>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const limited = await consumeRateLimit({ key: `full-sync:${authCheck.user.id}`, limit: 5, windowMs: 10 * 60 * 1000 });
  if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

  try {
    const result = await runFullTpSync();

    revalidatePath('/master-courses');
    // Revalidate common sub-paths
    revalidatePath('/master-courses/pillars');

    if (!result.ok) {
      return { ok: false, error: result.message ?? 'Sync failed' };
    }

    return { ok: true, data: result.stats, message: result.message ?? 'Sync completed successfully' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Get the impact of force-deleting a TPStreams asset.
 */
export async function getTpstreamsForceDeleteImpactAction(
  tpAssetId: string
): Promise<ActionResponse<TpstreamsForceDeleteImpact>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const impact = await getTpstreamsForceDeleteImpact(tpAssetId);
    return { ok: true, data: impact };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Delete an unlinked TPStreams folder.
 */
export async function forceDeleteTpstreamsAssetAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const limited = await consumeRateLimit({ key: `force-delete-tp:${authCheck.user.id}`, limit: 10, windowMs: 5 * 60 * 1000 });
  if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

  try {
    const tpFolderAssetId = formData.get('tpFolderAssetId') as string;
    const confirmation = (formData.get('confirmation') as string | null)?.trim() ?? '';

    if (!tpFolderAssetId) return { ok: false, error: 'Folder Asset ID is required' };
    
    // 1. Re-validate impact server-side
    const impact = await getTpstreamsForceDeleteImpact(tpFolderAssetId);
    if (!impact.canForceDelete) {
      return { ok: false, error: impact.blockedReason || 'Force delete is blocked for this asset.' };
    }

    // 2. Stronger confirmation logic
    const isOrphan = impact.type === 'orphan_folder';
    const requiredPhrase = isOrphan ? 'FORCE DELETE' : `FORCE DELETE ${tpFolderAssetId}`;
    
    if (confirmation !== requiredPhrase) {
      return { ok: false, error: `Type ${requiredPhrase} to confirm.` };
    }

    // 3. Call official TPStreams delete
    try {
      await deleteTpAsset(tpFolderAssetId);
    } catch (e: unknown) {
      if (e instanceof Error && e.message?.includes('404')) {
        after(() => console.log("Folder already deleted from TPStreams", tpFolderAssetId));
      } else {
        throw e;
      }
    }

    const [supabase, { revokeAssignment }] = await Promise.all([
      createAdminClient(),
      import('@/lib/services/content-assignments'),
    ]);
    const timestamp = new Date().toISOString();

    // 4. Pillar Cleanup
    const { data: pillars } = await supabase.from('master_course_pillars').select('id').eq('tp_folder_uuid', tpFolderAssetId);
    await Promise.all((pillars || []).map(async (p) => {
      await supabase.from('master_course_pillars').update({
        publish_status: 'unpublished',
        visible_to_college_admins: false,
        visible_to_college_students: false,
        visible_to_global_students: false,
        tp_folder_uuid: null,
        updated_at: timestamp,
      }).eq('id', p.id);
      
      const { data: courses } = await supabase.from('master_courses').select('id').eq('pillar_id', p.id);
      const courseIds = (courses || []).map(c => c.id);
      if (courseIds.length > 0) {
        const [, , , { data: assignments }, { data: modules }] = await Promise.all([
          supabase.from('master_courses').update({
            publish_status: 'unpublished',
            visible_to_college_admins: false,
            visible_to_college_students: false,
            visible_to_global_students: false,
            updated_at: timestamp,
          }).in('id', courseIds),
          supabase.from('master_course_items').update({
            publish_status: 'unpublished',
            updated_at: timestamp,
          }).in('master_course_id', courseIds),
          supabase.from('course_variants').update({
            publish_status: 'unpublished',
            updated_at: timestamp,
          }).in('master_course_id', courseIds),
          supabase.from('content_assignments')
            .select('id').eq('assigned_entity_type', 'master_course').in('assigned_entity_id', courseIds).eq('status', 'active'),
          supabase.from('master_course_modules').select('id').in('master_course_id', courseIds),
        ]);

        if (assignments && assignments.length > 0) {
           await Promise.allSettled(
             assignments.map((a) => revokeAssignment(a.id, authCheck.user.id)),
           );
        }

        const moduleIds = (modules || []).map(m => m.id);
        if (moduleIds.length > 0) {
          await supabase.from('master_course_modules').update({
            publish_status: 'unpublished',
            visible_to_students: false,
            updated_at: timestamp,
          }).in('id', moduleIds);
        }
      }
    }));

    // 5. Course Cleanup
    const { data: courses } = await supabase.from('master_courses').select('id').eq('tp_folder_uuid', tpFolderAssetId);
    await Promise.all((courses || []).map(async (c) => {
      const [, , , { data: assignments }, { data: modules }] = await Promise.all([
        supabase.from('master_courses').update({
          publish_status: 'unpublished',
          visible_to_college_admins: false,
          visible_to_college_students: false,
          visible_to_global_students: false,
          tp_folder_uuid: null,
          updated_at: timestamp,
        }).eq('id', c.id),
        supabase.from('master_course_items').update({
          publish_status: 'unpublished',
          updated_at: timestamp,
        }).eq('master_course_id', c.id),
        supabase.from('course_variants').update({
          publish_status: 'unpublished',
          updated_at: timestamp,
        }).eq('master_course_id', c.id),
        supabase.from('content_assignments')
          .select('id').eq('assigned_entity_type', 'master_course').eq('assigned_entity_id', c.id).eq('status', 'active'),
        supabase.from('master_course_modules').select('id').eq('master_course_id', c.id),
      ]);
      if (assignments && assignments.length > 0) {
         await Promise.allSettled(
           assignments.map((a) => revokeAssignment(a.id, authCheck.user.id)),
         );
      }
      const moduleIds = (modules || []).map(m => m.id);
      if (moduleIds.length > 0) {
        await supabase.from('master_course_modules').update({
          publish_status: 'unpublished',
          visible_to_students: false,
          updated_at: timestamp,
        }).in('id', moduleIds);
      }
    }));

    // 6. Module Cleanup
    const { data: modules } = await supabase.from('master_course_modules').select('id').eq('tp_folder_uuid', tpFolderAssetId);
    await Promise.all((modules || []).map(async (m) => {
      await Promise.all([
        supabase.from('master_course_modules').update({
          publish_status: 'unpublished',
          visible_to_students: false,
          tp_folder_uuid: null,
          updated_at: timestamp,
        }).eq('id', m.id),
        supabase.from('master_course_items').update({
          publish_status: 'unpublished',
          updated_at: timestamp,
        }).eq('module_id', m.id),
        supabase.from('video_assets').update({
          processing_status: 'error',
          sync_status: 'removed',
          removed_at: timestamp,
        }).eq('master_course_module_id', m.id).eq('sync_status', 'active'),
      ]);
    }));

    // 7. Video Asset Cleanup
    const { data: videosByFolder } = await supabase.from('video_assets').select('id').eq('tp_folder_uuid', tpFolderAssetId);
    if (videosByFolder && videosByFolder.length > 0) {
      await supabase.from('video_assets').update({
        processing_status: 'error',
        sync_status: 'removed',
        removed_at: timestamp,
      }).in('id', videosByFolder.map(v => v.id));
    }

    const { data: videosByAsset } = await supabase.from('video_assets').select('id').eq('tp_asset_id', tpFolderAssetId);
    if (videosByAsset && videosByAsset.length > 0) {
      await supabase.from('video_assets').update({
        processing_status: 'error',
        sync_status: 'removed',
        removed_at: timestamp,
      }).in('id', videosByAsset.map(v => v.id));
    }

    revalidatePath('/master-courses');
    return { ok: true, message: 'Force Delete completed successfully.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Repair a misplaced linked folder by moving it to its correct parent.
 */
export async function repairTpFolderLocationAction(
  formData: FormData
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  const tpFolderUuid = formData.get('tpFolderUuid') as string;

  if (!tpFolderUuid) return { ok: false, error: 'Folder UUID is required' };

  try {
    // 1. Re-fetch DB ownership server-side to prevent client spoofing
    const admin = createAdminClient();
    
    const [
      { data: pillar }, 
      { data: course }, 
      { data: module }
    ] = await Promise.all([
      admin.from('master_course_pillars').select('id, tp_folder_uuid').eq('tp_folder_uuid', tpFolderUuid).maybeSingle(),
      admin.from('master_courses').select('id, pillar_id, tp_folder_uuid').eq('tp_folder_uuid', tpFolderUuid).maybeSingle(),
      admin.from('master_course_modules').select('id, master_course_id, tp_folder_uuid').eq('tp_folder_uuid', tpFolderUuid).maybeSingle()
    ]);

    let targetParentUuid: string | null = null;

    if (pillar) {
      // Pillars should be at root in TPStreams
      targetParentUuid = null; 
    } else if (course) {
      // Courses should be under Pillar
      const { data: p } = await admin.from('master_course_pillars').select('tp_folder_uuid').eq('id', course.pillar_id).single();
      targetParentUuid = p?.tp_folder_uuid ?? null;
    } else if (module) {
      // Modules should be under Course
      const { data: c } = await admin.from('master_courses').select('tp_folder_uuid').eq('id', module.master_course_id).single();
      targetParentUuid = c?.tp_folder_uuid ?? null;
    } else {
      return { ok: false, error: 'This folder is not linked to any repairable entity.' };
    }

    // 2. Call TPStreams move
    await moveTpAsset(tpFolderUuid, targetParentUuid ? { parent: targetParentUuid } : {});

    after(() => console.log(`[SuperAdmin] Repaired folder location: ${tpFolderUuid} -> ${targetParentUuid ?? "root"}`));

    revalidatePath('/master-courses');
    return { ok: true, message: 'Folder location repaired successfully.' };

  } catch (error) {
    console.error('[repairTpFolderLocationAction] Error:', error);
    return { ok: false, error: 'Failed to repair folder location.' };
  }
}

/**
 * Get diagnostic info for a pillar.
 */
export async function getPillarDiagnosticInfoAction(
  pillarId: string
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const info = await getPillarDiagnosticInfo(pillarId);
    return { ok: true, data: info };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Assign a pillar (and all its courses) to multiple colleges.
 */
export async function assignPillarToCollegesAction(
  pillarId: string,
  collegeIds: string[],
): Promise<ActionResponse<PillarAssignmentResult>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    if (!pillarId) return { ok: false, error: 'Pillar ID is required' };
    if (!collegeIds || collegeIds.length === 0) return { ok: false, error: 'At least one college must be selected' };

    const result = await assignPillarToColleges(pillarId, collegeIds, authCheck.user.id);

    revalidatePath('/master-courses');
    revalidatePath(`/master-courses/pillars/${pillarId}`);
    revalidatePath('/assignments');

    return { ok: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Repair entitlements for a specific college.
 */
export async function repairCollegeCourseEntitlementsAction(
  collegeId: string,
): Promise<ActionResponse<RepairEntitlementsResult>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    if (!collegeId) return { ok: false, error: 'College ID is required' };

    const result = await repairCollegeCourseEntitlements(collegeId);

    return { ok: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

export async function getModuleDeleteImpactAction(
  moduleId: string,
): Promise<ActionResponse<ModuleDeleteImpact>> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    if (!moduleId) return { ok: false, error: 'Module ID is required' };
    const impact = await getModuleDeleteImpact(moduleId);
    return { ok: true, data: impact };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Get upload config for a specific module.
 */
