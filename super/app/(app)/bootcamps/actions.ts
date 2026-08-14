'use server';

/**
 * Bootcamps Server Actions.
 *
 * CRUD-only — no TPStreams, no student visibility, no purchase flow.
 *
 * The UI is single-bootcamp (one canonical container). {@link createBootcampAction}
 * provisions the canonical Bootcamp from the /bootcamps page when none exists.
 * All course/module/video mutations inside a bootcamp work through the actions
 * below.
 */

import { revalidatePath } from 'next/cache';
import {
  createBootcamp,
} from '@/lib/services/bootcamps';
import {
  createBootcampCourse,
  updateBootcampCourse,
  publishBootcampCourse,
  unpublishBootcampCourse,
  archiveBootcampCourse,
  deleteBootcampCourseSafely,
  getBootcampCourseDeleteImpact,
  createBootcampModule,
  updateBootcampModule,
  deleteBootcampModule,
} from '@/lib/services/bootcamp-courses';
import {
  ensurePaidCourseLandingMetadata,
  syncPaidCourseLandingPublishState,
} from '@/lib/services/paid-course-landing-metadata';
import { createMasterCourse } from '@/lib/services/master-courses';
import {
  retryBootcampCourseFolderSync,
  retryBootcampModuleFolderSync,
} from '@/lib/services/tpstreams-bootcamp-hierarchy';
import {
  syncCourseVideoAssetsFromTpStreams,
} from '@/lib/services/video-assets';
import { syncModuleVideosToCourseLessons } from '@/lib/services/master-course-structure';
import {
  requireAuth,
} from '@/lib/auth/require-superadmin-action';
import {
  createBootcampSchema,
} from '@/lib/validation/bootcamp';
import { createCourseInsideBootcampSchema } from '@/lib/validation/master-course';
import { createAdminClient } from '@/lib/supabase/admin';

// --- Types --------------------------------------------------------------------

interface ActionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  id?: string;
  message?: string;
}

// --- Actions ------------------------------------------------------------------

/**
 * Create a new Bootcamp.
 *
 * The UI is single-bootcamp (one canonical container). This action is used
 * by the /bootcamps page to provision the canonical Bootcamp when none
 * exists. After creation, the UI redirects to /bootcamps/[id].
 */
async function _createBootcampAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const rawData = {
      code: formData.get('code'),
      title: formData.get('title'),
      slug: formData.get('slug'),
      description: formData.get('description') || undefined,
      short_description: formData.get('short_description') || undefined,
      thumbnail_url: formData.get('thumbnail_url') || undefined,
      cover_image_url: formData.get('cover_image_url') || undefined,
      sort_order: formData.get('sort_order') ? Number(formData.get('sort_order')) : 0,
      publish_status: formData.get('publish_status') || 'published',
    };

    const parsed = createBootcampSchema.safeParse(rawData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const bootcamp = await createBootcamp({
      ...parsed.data,
      thumbnail_url: parsed.data.thumbnail_url || undefined,
      cover_image_url: parsed.data.cover_image_url || undefined,
      created_by: authCheck.user.id,
    });

    revalidatePath('/bootcamps');
    return { ok: true, data: bootcamp, id: bootcamp.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

// --- Bootcamp Course Actions --------------------------------------------------

/**
 * @deprecated Kept for backwards compatibility with the legacy simplified
 * bootcamp course form. New code should use {@link createCourseInsideBootcampAction}
 * which reuses the full Master Course creation flow.
 */
async function _createBootcampCourseAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const bootcampId = formData.get('bootcamp_id') as string;
    const code = formData.get('code') as string;
    const title = formData.get('title') as string;
    const slug = formData.get('slug') as string | null;
    const description = formData.get('description') as string | null;
    const shortDescription = formData.get('short_description') as string | null;

    if (!bootcampId) return { ok: false, error: 'Bootcamp ID is required' };
    if (!code || code.length < 2) return { ok: false, error: 'Code must be at least 2 characters' };
    if (!title || title.length < 3) return { ok: false, error: 'Title must be at least 3 characters' };

    const course = await createBootcampCourse({
      bootcamp_id: bootcampId,
      code,
      title,
      slug: slug ?? undefined,
      description: description ?? undefined,
      short_description: shortDescription ?? undefined,
      created_by: authCheck.user.id,
    });

    revalidatePath('/bootcamps');
    revalidatePath(`/bootcamps/${bootcampId}`);
    return { ok: true, data: course, id: course.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Create a new Course inside a Bootcamp using the full Master Course
 * creation flow (same engine as Pillar courses).
 *
 * Hard guardrails (cannot be overridden by client input):
 *  - catalog_type = 'bootcamp'
 *  - bootcamp_id = current bootcamp id
 *  - pillar_id = null
 *  - visible_to_college_admins = false
 *  - visible_to_college_students = false
 *  - visible_to_global_students = false
 */
export async function createCourseInsideBootcampAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const rawData = {
      bootcamp_id: formData.get('bootcamp_id'),
      code: formData.get('code'),
      title: formData.get('title'),
      slug: formData.get('slug'),
      description: formData.get('description') || undefined,
      short_description: formData.get('short_description') || undefined,
      publish_status: formData.get('publish_status') || 'draft',
      metadata: formData.has('metadata') ? JSON.parse(formData.get('metadata') as string) : undefined,
    };

    const parsed = createCourseInsideBootcampSchema.safeParse(rawData);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    // Verify bootcamp exists
    const admin = createAdminClient();
    const { data: bootcamp, error: bootcampErr } = await admin
      .from('bootcamps')
      .select('id')
      .eq('id', parsed.data.bootcamp_id)
      .maybeSingle();
    if (bootcampErr) {
      return { ok: false, error: `Failed to load bootcamp: ${bootcampErr.message}` };
    }
    if (!bootcamp) {
      return { ok: false, error: 'Bootcamp not found' };
    }

    const course = await createMasterCourse({
      bootcamp_id: parsed.data.bootcamp_id,
      catalog_type: 'bootcamp',
      code: parsed.data.code,
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description,
      short_description: parsed.data.short_description,
      publish_status: parsed.data.publish_status,
      metadata: parsed.data.metadata,
      // Guardrails — cannot be overridden by client:
      pillar_id: null,
      visible_to_college_admins: false,
      visible_to_college_students: false,
      visible_to_global_students: false,
      created_by: authCheck.user.id,
    });

    await ensurePaidCourseLandingMetadata(course, 'paid_course_builder');
    if (course.publish_status === 'published') {
      await syncPaidCourseLandingPublishState(course);
    }

    revalidatePath('/bootcamps');
    revalidatePath(`/bootcamps/${parsed.data.bootcamp_id}`);
    revalidatePath(`/bootcamps/${parsed.data.bootcamp_id}/courses/${course.id}`);
    return { ok: true, data: course, id: course.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

// --- Bootcamp TPStreams Upload Actions ----------------------------------------
// Bootcamp course uploads now reuse the shared master-course engine:
//   - `registerDirectTpUploadAction` (with `bootcamp_id` for revalidation)
//   - `syncModuleFolderAssetsAction` / `syncCourseFolderAssetsAction`
//   - `getTpUploaderTokenAction` / `getModuleUploadConfigAction`
// The bootcamp-specific copies were deleted in Phase B; the inline upload
// dialog lives on the bootcamp course manage page (`ModuleVideosClient` with
// `context="bootcamp"`).

/**
 * Sync a bootcamp course folder from TPStreams.
 */
async function _syncBootcampCourseFolderAssetsAction(
  formData: FormData,
): Promise<{ ok: boolean; data?: { active_asset_count: number; inserted: number; updated: number; removed: number }; error?: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const courseId = formData.get('master_course_id') as string;
    if (!courseId) return { ok: false, error: 'Course ID is required' };

    const result = await syncCourseVideoAssetsFromTpStreams(courseId);
    await syncModuleVideosToCourseLessons(courseId);
    return { ok: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Retry TPStreams folder creation for a failed bootcamp course.
 */
export async function retryBootcampCourseFolderSyncAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const courseId = formData.get('course_id') as string;
    if (!courseId) return { ok: false, error: 'Course ID is required' };

    const course = await retryBootcampCourseFolderSync(courseId);
    const bootcampId = course.bootcamp_id;

    if (bootcampId) {
      revalidatePath(`/bootcamps/${bootcampId}`);
    }
    return { ok: true, data: course };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Retry TPStreams folder creation for a failed bootcamp module.
 */
export async function retryBootcampModuleFolderSyncAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const moduleId = formData.get('module_id') as string;
    if (!moduleId) return { ok: false, error: 'Module ID is required' };

    const moduleData = await retryBootcampModuleFolderSync(moduleId);

    // Find the bootcamp course to revalidate the right path
    const admin = createAdminClient();
    const { data: course } = await admin
      .from('master_courses')
      .select('id, bootcamp_id')
      .eq('id', moduleData.master_course_id)
      .maybeSingle();

    if (course?.bootcamp_id) {
      revalidatePath(`/bootcamps/${course.bootcamp_id}/courses/${course.id}`);
    }

    return { ok: true, data: moduleData };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

// --- Bootcamp Course CRUD Actions --------------------------------------------

/**
 * Update a Bootcamp course's metadata.
 */
export async function updateBootcampCourseAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const bootcampId = formData.get('bootcamp_id') as string;
    const courseId = formData.get('course_id') as string;
    if (!bootcampId || !courseId) return { ok: false, error: 'Bootcamp ID and Course ID are required' };

    const rawData: Record<string, unknown> = {};
    if (formData.has('title')) rawData.title = formData.get('title');
    if (formData.has('description')) rawData.description = formData.get('description');
    if (formData.has('short_description')) rawData.short_description = formData.get('short_description');
    if (formData.has('program_tag')) rawData.program_tag = formData.get('program_tag');
    if (formData.has('publish_status')) rawData.publish_status = formData.get('publish_status');

    const course = await updateBootcampCourse(bootcampId, courseId, rawData);

    revalidatePath('/bootcamps');
    revalidatePath(`/bootcamps/${bootcampId}`);
    revalidatePath(`/bootcamps/${bootcampId}/courses/${courseId}`);
    revalidatePath(`/bootcamps/${bootcampId}/courses/${courseId}/edit`);
    return { ok: true, data: course };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Publish a Bootcamp course.
 */
export async function publishBootcampCourseAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const bootcampId = formData.get('bootcamp_id') as string;
    const courseId = formData.get('course_id') as string;
    if (!bootcampId || !courseId) return { ok: false, error: 'Bootcamp ID and Course ID are required' };

    const course = await publishBootcampCourse(bootcampId, courseId);

    revalidatePath('/bootcamps');
    revalidatePath(`/bootcamps/${bootcampId}`);
    revalidatePath(`/bootcamps/${bootcampId}/courses/${courseId}`);
    return { ok: true, data: course, message: 'Course published.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Unpublish a Bootcamp course (revert to draft).
 */
export async function unpublishBootcampCourseAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const bootcampId = formData.get('bootcamp_id') as string;
    const courseId = formData.get('course_id') as string;
    if (!bootcampId || !courseId) return { ok: false, error: 'Bootcamp ID and Course ID are required' };

    const course = await unpublishBootcampCourse(bootcampId, courseId);

    revalidatePath('/bootcamps');
    revalidatePath(`/bootcamps/${bootcampId}`);
    revalidatePath(`/bootcamps/${bootcampId}/courses/${courseId}`);
    return { ok: true, data: course, message: 'Course unpublished.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Archive a Bootcamp course.
 */
async function _archiveBootcampCourseAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const bootcampId = formData.get('bootcamp_id') as string;
    const courseId = formData.get('course_id') as string;
    if (!bootcampId || !courseId) return { ok: false, error: 'Bootcamp ID and Course ID are required' };

    const course = await archiveBootcampCourse(bootcampId, courseId);

    revalidatePath('/bootcamps');
    revalidatePath(`/bootcamps/${bootcampId}`);
    revalidatePath(`/bootcamps/${bootcampId}/courses/${courseId}`);
    return { ok: true, data: course, message: 'Course archived.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Get the deletion impact for a Bootcamp course (for the confirmation dialog).
 */
async function _getBootcampCourseDeleteImpactAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const bootcampId = formData.get('bootcamp_id') as string;
    const courseId = formData.get('course_id') as string;
    if (!bootcampId || !courseId) return { ok: false, error: 'Bootcamp ID and Course ID are required' };

    const impact = await getBootcampCourseDeleteImpact(bootcampId, courseId);
    return { ok: true, data: impact };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Safely delete a Bootcamp course.
 *
 * Requires typed confirmation. Performs full cleanup:
 * - Hides course from students
 * - Revokes B2C entitlements
 * - Cleans up accidental college assignments
 * - Soft-removes videos locally
 * - Deletes TPStreams course folder + module folders
 * - If paid history: archives only. Otherwise: hard deletes from DB.
 */
export async function deleteBootcampCourseAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const bootcampId = formData.get('bootcamp_id') as string;
    const courseId = formData.get('course_id') as string;
    const confirmation = (formData.get('confirmation') as string | null)?.trim() ?? '';
    const courseTitle = (formData.get('course_title') as string | null)?.trim() ?? '';

    if (!bootcampId || !courseId) return { ok: false, error: 'Bootcamp ID and Course ID are required' };
    if (!['DELETE COURSE', courseTitle].includes(confirmation)) {
      return { ok: false, error: 'Delete confirmation did not match.' };
    }

    const result = await deleteBootcampCourseSafely(bootcampId, courseId, authCheck.user.id);

    revalidatePath('/bootcamps');
    revalidatePath(`/bootcamps/${bootcampId}`);
    revalidatePath(`/bootcamps/${bootcampId}/courses/${courseId}`);

    return { ok: true, id: courseId, data: result, message: result.message };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

// --- Bootcamp Module Actions --------------------------------------------------

/**
 * Create a new module inside a bootcamp course.
 */
export async function createBootcampModuleAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const bootcampId = formData.get('bootcamp_id') as string;
    const courseId = formData.get('course_id') as string;
    const title = (formData.get('title') as string | null)?.trim() ?? '';
    const description = (formData.get('description') as string | null)?.trim() || null;

    if (!bootcampId || !courseId) return { ok: false, error: 'Bootcamp ID and Course ID are required' };
    if (!title || title.length < 2) return { ok: false, error: 'Module title must be at least 2 characters' };

    const createdModule = await createBootcampModule(bootcampId, courseId, {
      title,
      description: description ?? undefined,
    });

    revalidatePath(`/bootcamps/${bootcampId}/courses/${courseId}`);

    return { ok: true, data: createdModule, id: createdModule.id, message: 'Module created.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Update a module inside a bootcamp course.
 */
export async function updateBootcampModuleAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const bootcampId = formData.get('bootcamp_id') as string;
    const courseId = formData.get('course_id') as string;
    const moduleId = formData.get('module_id') as string;
    if (!bootcampId || !courseId || !moduleId) {
      return { ok: false, error: 'Bootcamp ID, Course ID, and Module ID are required' };
    }

    const rawData: Record<string, unknown> = {};
    if (formData.has('title')) rawData.title = (formData.get('title') as string).trim();
    if (formData.has('description')) rawData.description = (formData.get('description') as string).trim() || null;
    if (formData.has('publish_status')) rawData.publish_status = formData.get('publish_status');
    if (formData.has('sort_order')) rawData.sort_order = Number(formData.get('sort_order'));
    if (formData.has('visible_to_students')) {
      rawData.visible_to_students = formData.get('visible_to_students') === 'true';
    }

    const updatedModule = await updateBootcampModule(bootcampId, courseId, moduleId, rawData);

    revalidatePath(`/bootcamps/${bootcampId}/courses/${courseId}`);

    return { ok: true, data: updatedModule, message: 'Module updated.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Delete a module inside a bootcamp course.
 */
export async function deleteBootcampModuleAction(
  formData: FormData,
): Promise<ActionResponse> {
  const authCheck = await requireAuth();
  if (!authCheck.ok) return { ok: false, error: authCheck.error };

  try {
    const bootcampId = formData.get('bootcamp_id') as string;
    const courseId = formData.get('course_id') as string;
    const moduleId = formData.get('module_id') as string;
    if (!bootcampId || !courseId || !moduleId) {
      return { ok: false, error: 'Bootcamp ID, Course ID, and Module ID are required' };
    }

    const result = await deleteBootcampModule(bootcampId, courseId, moduleId);

    revalidatePath(`/bootcamps/${bootcampId}/courses/${courseId}`);

    return { ok: true, message: result.message };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}
