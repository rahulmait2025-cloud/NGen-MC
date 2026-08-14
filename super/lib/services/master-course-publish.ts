import 'server-only';

/**
 * Master Course Publish Service (Phase 2).
 *
 * Handles validation, publish/unpublish, and college assignment
 * for Master Courses. Uses only canonical tables:
 *   master_courses, master_course_modules, master_course_items,
 *   video_assets, content_assignments, student_entitlements, students, colleges.
 *
 * TPStreams upload flow is NEVER touched here.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateCourseStructure } from '@/lib/cache/invalidate-course';
import { grantEntitlement } from './student-entitlements';
import { syncModuleVideosToCourseLessons } from './master-course-structure';
import type { MasterCoursesRow, MasterCoursePublishStatus } from '@/types/database';

// --- Validation Types ---------------------------------------------------------

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
}

export interface CoursePublishValidationResult {
  valid: boolean; // true only if no errors (warnings are OK)
  issues: ValidationIssue[];
  course: MasterCoursesRow;
  stats: {
    moduleCount: number;
    itemCount: number;
    videoItemCount: number;
    linkedVideoCount: number;
    processingVideoCount: number;
    unlinkedVideoItemCount: number;
    /** Videos on modules turned into lesson rows during this validation run */
    videosAutoLinkedAsLessons: number;
  };
}

// --- Assignment Types ---------------------------------------------------------

export interface CourseAssignment {
  id: string;
  assignment_type: string;
  target_id: string;
  assigned_entity_type: string;
  assigned_entity_id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  college?: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
}

export interface AssignableCollege {
  id: string;
  name: string;
  slug: string;
  status: string;
  isAssigned: boolean;
}

export interface AssignableCourseForCollege {
  id: string;
  title: string;
  code: string;
  isAssigned: boolean;
}

// --- 1. Publish Validation -----------------------------------------------------

/**
 * Validates a Master Course against all publish requirements.
 * Returns a structured result with errors and warnings.
 * Does NOT throw - callers decide what to do with the result.
 */
export async function validateMasterCourseForPublish(
  courseId: string,
): Promise<CoursePublishValidationResult> {
  const admin = createAdminClient();
  const issues: ValidationIssue[] = [];

  // -- Fetch course ----------------------------------------------------------
  const { data: course, error: courseError } = await admin
    .from('master_courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    throw new Error(`Course not found: ${courseError?.message}`);
  }

  if (!course.title || course.title.trim() === '') {
    issues.push({ severity: 'error', code: 'MISSING_TITLE', message: 'Course must have a title.' });
  }

  let videosAutoLinkedAsLessons = 0;
  try {
    const syncResult = await syncModuleVideosToCourseLessons(courseId);
    videosAutoLinkedAsLessons = syncResult.createdCount;
  } catch (syncErr) {
    throw new Error(
      `Could not sync module videos into lessons: ${syncErr instanceof Error ? syncErr.message : String(syncErr)}`,
    );
  }

  // -- Fetch modules ---------------------------------------------------------
  const { data: modules } = await admin
    .from('master_course_modules')
    .select('id, title, sort_order, publish_status')
    .eq('master_course_id', courseId)
    .order('sort_order', { ascending: true });

  const moduleList = modules ?? [];

  if (moduleList.length === 0) {
    issues.push({
      severity: 'error',
      code: 'NO_MODULES',
      message: 'Course must have at least one module.',
    });
  }

  // Validate sort_order uniqueness on modules
  const moduleSortOrders = moduleList.map((m) => m.sort_order);
  if (new Set(moduleSortOrders).size !== moduleSortOrders.length) {
    issues.push({
      severity: 'info',
      code: 'DUPLICATE_MODULE_SORT_ORDER',
      message: 'Some modules share the same display order - fix in Builder if sequencing looks wrong.',
    });
  }

  // -- Fetch items -----------------------------------------------------------
  const { data: items } = await admin
    .from('master_course_items')
    .select('id, module_id, title, item_type, video_asset_id, sort_order, publish_status')
    .eq('master_course_id', courseId)
    .order('sort_order', { ascending: true });

  const itemList = items ?? [];

  if (itemList.length === 0) {
    issues.push({
      severity: 'error',
      code: 'NO_ITEMS',
      message: 'Course must have at least one lesson.',
    });
  }

  // Check modules with no items
  for (const mod of moduleList) {
    const moduleItems = itemList.filter((i) => i.module_id === mod.id);
    if (moduleItems.length === 0) {
      issues.push({
        severity: 'warning',
        code: 'EMPTY_MODULE',
        message: `Module "${mod.title}" has no lessons.`,
      });
    }
  }

  // -- Validate video items --------------------------------------------------
  const videoItems = itemList.filter((i) => i.item_type === 'video');
  const unlinkedVideoItems = videoItems.filter((i) => !i.video_asset_id);

  if (unlinkedVideoItems.length > 0) {
    issues.push({
      severity: 'error',
      code: 'UNLINKED_VIDEO_ITEMS',
      message: `${unlinkedVideoItems.length} video lesson(s) have no video asset linked.`,
    });
  }

  // -- Validate linked video assets ------------------------------------------
  const linkedVideoIds = videoItems
    .map((i) => i.video_asset_id)
    .filter((id): id is string => !!id);

  let processingVideoCount = 0;

  if (linkedVideoIds.length > 0) {
    const { data: videoAssets } = await admin
      .from('video_assets')
      .select('id, master_course_id, processing_status, sync_status')
      .in('id', linkedVideoIds);

    for (const vid of videoAssets ?? []) {
      // Wrong course
      if (vid.master_course_id !== courseId) {
        issues.push({
          severity: 'error',
          code: 'VIDEO_WRONG_COURSE',
          message: `Video asset ${vid.id} belongs to a different course.`,
        });
      }
      // Removed/failed
      if (vid.sync_status === 'removed') {
        issues.push({
          severity: 'error',
          code: 'VIDEO_REMOVED',
          message: `Video asset ${vid.id} has been removed from TPStreams.`,
        });
      }
      if (vid.processing_status === 'error') {
        issues.push({
          severity: 'error',
          code: 'VIDEO_PROCESSING_ERROR',
          message: `Video asset ${vid.id} has a processing error in TPStreams.`,
        });
      }
      // Still processing
      if (vid.processing_status !== 'completed' && vid.sync_status !== 'removed') {
        processingVideoCount++;
      }
    }

    if (processingVideoCount > 0) {
      issues.push({
        severity: 'warning',
        code: 'VIDEOS_PROCESSING',
        message: `${processingVideoCount} video(s) are still processing. They may not be playable yet.`,
      });
    }
  }

  // -- Validate pricing configuration --------------------------------------
  const { count: activePlanCount, error: planError } = await admin
    .from('course_price_plans')
    .select('*', { count: 'exact', head: true })
    .eq('master_course_id', courseId)
    .eq('is_active', true);

  const hasActivePlans = !planError && (activePlanCount ?? 0) > 0;

  if (!hasActivePlans && !course.pricing_model) {
    issues.push({
      severity: 'error',
      code: 'MISSING_PRICING_MODEL',
      message: 'Course pricing has not been configured. Please set a pricing model (Free, One-time, etc.) before publishing.',
    });
  } else if (!hasActivePlans && course.pricing_model && ['one_time', 'subscription_ready', 'per_seat'].includes(course.pricing_model)) {
    issues.push({
      severity: 'error',
      code: 'NO_ACTIVE_PRICE_PLANS',
      message: `Course pricing model is set to "${course.pricing_model}" but has no active price plans. Add at least one active price plan before publishing.`,
    });
  }

  const errors = issues.filter((i) => i.severity === 'error');

  return {
    valid: errors.length === 0,
    issues,
    course: course as MasterCoursesRow,
    stats: {
      moduleCount: moduleList.length,
      itemCount: itemList.length,
      videoItemCount: videoItems.length,
      linkedVideoCount: linkedVideoIds.length,
      processingVideoCount,
      unlinkedVideoItemCount: unlinkedVideoItems.length,
      videosAutoLinkedAsLessons,
    },
  };
}

// --- 2. Publish / Unpublish ---------------------------------------------------

async function applyMasterCoursePublishedUpdate(courseId: string): Promise<MasterCoursesRow> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: current, error: loadError } = await admin
    .from('master_courses')
    .select('metadata, pillar_id, pricing_model')
    .eq('id', courseId)
    .single();

  if (loadError || !current) {
    throw new Error(`Failed to load course before publish: ${loadError?.message ?? 'not found'}`);
  }

  const existingMetadata = (current.metadata as Record<string, unknown>) ?? {};

  let updatedPricingModel = current.pricing_model;
  if (!updatedPricingModel) {
    const { count: activePlanCount } = await admin
      .from('course_price_plans')
      .select('*', { count: 'exact', head: true })
      .eq('master_course_id', courseId)
      .eq('is_active', true);
    if ((activePlanCount ?? 0) > 0) {
      updatedPricingModel = 'subscription_ready';
    }
  }

  const { data, error } = await admin
    .from('master_courses')
    .update({
      publish_status: 'published' as MasterCoursePublishStatus,
      visible_to_college_admins: true,
      pricing_model: updatedPricingModel,
      metadata: {
        ...existingMetadata,
        published_at: now,
      },
    })
    .eq('id', courseId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to publish course: ${error?.message}`);
  }

  const pillarId = current.pillar_id;
  if (pillarId) {
    const { error: pillarPublishError } = await admin
      .from('master_course_pillars')
      .update({
        publish_status: 'published' as MasterCoursePublishStatus,
        visible_to_college_admins: true,
      })
      .eq('id', pillarId);

    if (pillarPublishError) {
      throw new Error(
        `Published course but could not activate linked pillar for college admins: ${pillarPublishError.message}`,
      );
    }
  }

  // Publish all modules for this course
  const { error: modulesPublishError } = await admin
    .from('master_course_modules')
    .update({
      publish_status: 'published' as MasterCoursePublishStatus,
      visible_to_students: true,
    })
    .eq('master_course_id', courseId);

  if (modulesPublishError) {
    throw new Error(
      `Published course but could not publish modules: ${modulesPublishError.message}`,
    );
  }

  // Publish all items (lessons) for this course
  const { error: itemsPublishError } = await admin
    .from('master_course_items')
    .update({
      publish_status: 'published' as MasterCoursePublishStatus,
    })
    .eq('master_course_id', courseId);

  if (itemsPublishError) {
    throw new Error(
      `Published course but could not publish items: ${itemsPublishError.message}`,
    );
  }

  revalidateCourseStructure(courseId);

  return data as MasterCoursesRow;
}

/**
 * Publish a Master Course.
 * Validates first - throws if there are blocking errors.
 */
async function _publishMasterCourse(courseId: string): Promise<MasterCoursesRow> {
  const validation = await validateMasterCourseForPublish(courseId);

  if (!validation.valid) {
    const errorMessages = validation.issues.reduce((acc, i) => {
      if (i.severity === 'error') acc.push(i.message);
      return acc;
    }, [] as string[]).join('; ');
    throw new Error(`Cannot publish: ${errorMessages}`);
  }

  return applyMasterCoursePublishedUpdate(courseId);
}

/**
 * Single round-trip used by UI: validate (includes video→lesson sync) then publish if valid.
 * Avoids validating twice when the caller needs both snapshots.
 */
export async function validateThenPublishMasterCourse(courseId: string): Promise<{
  validation: CoursePublishValidationResult;
  course?: MasterCoursesRow;
}> {
  const validation = await validateMasterCourseForPublish(courseId);
  if (!validation.valid) {
    return { validation };
  }
  const course = await applyMasterCoursePublishedUpdate(courseId);
  return { validation, course };
}

/**
 * Unpublish a Master Course.
 * Sets status to 'unpublished' (within the allowed enum).
 * Does NOT revoke existing entitlements - that is a separate action.
 */
export async function unpublishMasterCourse(courseId: string): Promise<MasterCoursesRow> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('master_courses')
    .update({
      publish_status: 'unpublished' as MasterCoursePublishStatus,
    })
    .eq('id', courseId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to unpublish course: ${error?.message}`);
  }

  // Unpublish all modules for this course
  await admin
    .from('master_course_modules')
    .update({
      publish_status: 'unpublished' as MasterCoursePublishStatus,
    })
    .eq('master_course_id', courseId);

  // Unpublish all items (lessons) for this course
  await admin
    .from('master_course_items')
    .update({
      publish_status: 'unpublished' as MasterCoursePublishStatus,
    })
    .eq('master_course_id', courseId);

  revalidateCourseStructure(courseId);

  return data as MasterCoursesRow;
}

// --- 3. Assignment Service -----------------------------------------------------

/**
 * List all colleges, with a flag indicating whether this course is already assigned.
 */
async function listAssignableColleges(courseId: string): Promise<AssignableCollege[]> {
  const admin = createAdminClient();

  const [{ data: colleges }, { data: assignments }] = await Promise.all([
    admin
      .from('colleges')
      .select('id, name, slug, status')
      .order('name', { ascending: true }),
    admin
      .from('content_assignments')
      .select('target_id')
      .eq('assigned_entity_type', 'master_course')
      .eq('assigned_entity_id', courseId)
      .eq('assignment_type', 'college')
      .eq('status', 'active'),
  ]);

  const assignedCollegeIds = new Set((assignments ?? []).map((a) => a.target_id));

  return (colleges ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    status: c.status,
    isAssigned: assignedCollegeIds.has(c.id),
  }));
}

/**
 * List all active college assignments for this course, with college details.
 */
async function _listCourseAssignments(courseId: string): Promise<CourseAssignment[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('content_assignments')
    .select('*')
    .eq('assigned_entity_type', 'master_course')
    .eq('assigned_entity_id', courseId)
    .eq('assignment_type', 'college')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list assignments: ${error.message}`);

  const assignments = data ?? [];
  if (assignments.length === 0) return [];

  // Load college details in one query
  const collegeIds = [...new Set(assignments.map((a) => a.target_id))];
  const { data: colleges } = await admin
    .from('colleges')
    .select('id, name, slug, status')
    .in('id', collegeIds);

  const collegeMap = new Map((colleges ?? []).map((c) => [c.id, c]));

  return assignments.map((a) => ({
    ...a,
    college: collegeMap.get(a.target_id),
  }));
}

/**
 * Assign a Master Course to a college.
 * - Course must be published.
 * - Prevents duplicate active assignment.
 * - Auto-generates entitlements for existing active students.
 */
export async function assignMasterCourseToCollege(
  courseId: string,
  collegeId: string,
  grantedBy?: string,
): Promise<CourseAssignment> {
  const admin = createAdminClient();

  // Guard: course must be published
  const { data: course, error: courseError } = await admin
    .from('master_courses')
    .select('id, title, publish_status')
    .eq('id', courseId)
    .single();

  if (courseError || !course) throw new Error('Course not found.');
  if (course.publish_status !== 'published') {
    throw new Error(`Course must be published before assigning. Current status: ${course.publish_status}`);
  }

  // Guard: college must be active
  const { data: college, error: collegeError } = await admin
    .from('colleges')
    .select('id, name, slug, status')
    .eq('id', collegeId)
    .single();

  if (collegeError || !college) throw new Error('College not found.');
  if (college.status !== 'active') {
    throw new Error(`College "${college.name}" is not active (status: ${college.status}).`);
  }

  // Guard: no duplicate active assignment
  const { data: existing } = await admin
    .from('content_assignments')
    .select('id')
    .eq('assignment_type', 'college')
    .eq('target_id', collegeId)
    .eq('assigned_entity_type', 'master_course')
    .eq('assigned_entity_id', courseId)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) {
    throw new Error('This course is already actively assigned to this college.');
  }

  // Create the assignment
  const { data: assignment, error: assignError } = await admin
    .from('content_assignments')
    .insert({
      assignment_type: 'college',
      target_id: collegeId,
      assigned_entity_type: 'master_course',
      assigned_entity_id: courseId,
      status: 'active',
      created_by: grantedBy ?? null,
    })
    .select('*')
    .single();

  if (assignError || !assignment) {
    throw new Error(`Failed to create assignment: ${assignError?.message}`);
  }

  // Auto-generate entitlements for existing students (non-blocking)
  try {
    await _bulkGrantEntitlementsForCollege(courseId, collegeId, assignment.id, grantedBy);
  } catch (err) {
    console.error(`[Assign] Entitlement generation failed (non-fatal): ${err}`);
  }

  return {
    ...assignment,
    college: { id: college.id, name: college.name, slug: college.slug, status: college.status },
  };
}

/**
 * Revoke a college assignment and all associated entitlements.
 * Revokes both student_entitlements and student_content_entitlements.
 */
async function unassignMasterCourseFromCollege(
  assignmentId: string,
  revokedBy?: string,
): Promise<void> {
  const admin = createAdminClient();

  // Revoke the assignment
  const { error: assignError } = await admin
    .from('content_assignments')
    .update({ status: 'revoked' })
    .eq('id', assignmentId)
    .eq('status', 'active');

  if (assignError) throw new Error(`Failed to revoke assignment: ${assignError.message}`);

  // Revoke associated student entitlements (best-effort)
  const { error: entitlementError } = await admin
    .from('student_entitlements')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy ?? null,
      revoke_reason: 'College assignment revoked',
    })
    .eq('status', 'active')
    .filter('metadata->>assignment_id', 'eq', assignmentId);

  if (entitlementError) {
    console.error(`[Unassign] Entitlement revocation failed: ${entitlementError.message}`);
  }

  // Revoke associated student content entitlements (variant/bundle grants)
  const { error: contentEntitlementError } = await admin
    .from('student_content_entitlements')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy ?? null,
      revoke_reason: 'College assignment revoked',
    })
    .eq('status', 'active')
    .filter('metadata->>assignment_id', 'eq', assignmentId);

  if (contentEntitlementError) {
    console.error(`[Unassign] Content entitlement revocation failed: ${contentEntitlementError.message}`);
  }
}

// --- Internal: Bulk Entitlement Generation ------------------------------------

export interface BulkGrantEntitlementsStats {
  created: number;
  alreadyHadEntitlement: number;
  duplicateOrError: number;
}

async function _bulkGrantEntitlementsForCollege(
  courseId: string,
  collegeId: string,
  assignmentId: string,
  grantedBy?: string,
): Promise<BulkGrantEntitlementsStats> {
  const admin = createAdminClient();

  // Fetch all active students for this college
  const { data: students } = await admin
    .from('students')
    .select('id')
    .eq('college_id', collegeId);

  if (!students || students.length === 0) {
    return { created: 0, alreadyHadEntitlement: 0, duplicateOrError: 0 };
  }

  // Check existing active entitlements for this course in this college
  const { data: existingEntitlements } = await admin
    .from('student_entitlements')
    .select('student_id')
    .eq('master_course_id', courseId)
    .eq('college_id', collegeId)
    .eq('status', 'active');

  const alreadyGranted = new Set(
    (existingEntitlements ?? []).map((e) => e.student_id),
  );

  const now = new Date().toISOString();
  let created = 0;
  let alreadyHadEntitlement = 0;
  let duplicateOrError = 0;

  const studentsToGrant = students.filter((s) => !alreadyGranted.has(s.id));
  alreadyHadEntitlement = students.length - studentsToGrant.length;

  const grantSettled = await Promise.allSettled(
    studentsToGrant.map((student) =>
      grantEntitlement({
        student_id: student.id,
        master_course_id: courseId,
        source_type: 'b2b_college',
        college_id: collegeId,
        valid_from: now,
        granted_by: grantedBy,
        metadata: {
          assignment_id: assignmentId,
          assigned_entity_type: 'master_course',
          assigned_entity_id: courseId,
        },
      }),
    ),
  );

  for (let i = 0; i < grantSettled.length; i++) {
    const r = grantSettled[i];
    if (r.status === 'fulfilled') {
      created++;
    } else {
      const err = r.reason;
      if (
        err instanceof Error &&
        (err.message.includes('already exists') || (err as { code?: string }).code === '23505')
      ) {
        duplicateOrError++;
      } else {
        console.error(`[Entitlement] Failed for student ${studentsToGrant[i].id}: ${err}`);
        duplicateOrError++;
      }
    }
  }

  return { created, alreadyHadEntitlement, duplicateOrError };
}

/**
 * Published master courses with a flag indicating assignment to this college.
 */
async function _listAssignableCoursesForCollege(
  collegeId: string,
): Promise<AssignableCourseForCollege[]> {
  const admin = createAdminClient();

  const [{ data: courses }, { data: assigns }] = await Promise.all([
    admin
      .from('master_courses')
      .select('id, title, code')
      .eq('publish_status', 'published')
      .order('title', { ascending: true }),
    admin
      .from('content_assignments')
      .select('assigned_entity_id')
      .eq('assignment_type', 'college')
      .eq('target_id', collegeId)
      .eq('assigned_entity_type', 'master_course')
      .eq('status', 'active'),
  ]);

  const assignedCourseIds = new Set((assigns ?? []).map((a) => a.assigned_entity_id));

  return (courses ?? []).map((c) => ({
    id: c.id,
    title: c.title ?? '',
    code: c.code ?? '',
    isAssigned: assignedCourseIds.has(c.id),
  }));
}

async function grantMissingEntitlementsForAssignment(
  assignmentId: string,
  grantedBy?: string,
): Promise<BulkGrantEntitlementsStats> {
  const admin = createAdminClient();

  const { data: assignment, error } = await admin
    .from('content_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (error || !assignment) {
    throw new Error('Assignment not found.');
  }
  if (assignment.status !== 'active') {
    throw new Error('Assignment is not active.');
  }
  if (
    assignment.assignment_type !== 'college' ||
    assignment.assigned_entity_type !== 'master_course'
  ) {
    throw new Error('Only college ↔ master_course assignments support bulk entitlements.');
  }

  return _bulkGrantEntitlementsForCollege(
    assignment.assigned_entity_id,
    assignment.target_id,
    assignmentId,
    grantedBy,
  );
}

export interface RepairEntitlementsResult {
  rpcUnavailable?: boolean;
  rpcMessage?: string;
  assignmentsScanned: number;
  entitlementsCreated: number;
  entitlementsAlreadyExisting: number;
}

export async function repairCollegeCourseEntitlements(
  collegeId: string,
): Promise<RepairEntitlementsResult> {
  const admin = createAdminClient();

  const { data: assigns, error } = await admin
    .from('content_assignments')
    .select('id')
    .eq('assignment_type', 'college')
    .eq('target_id', collegeId)
    .eq('assigned_entity_type', 'master_course')
    .eq('status', 'active');

  if (error) {
    throw new Error(`Failed to list assignments: ${error.message}`);
  }

  let entitlementsCreated = 0;
  let entitlementsAlreadyExisting = 0;

  const assignResults = await Promise.allSettled(
    (assigns ?? []).map((a) => grantMissingEntitlementsForAssignment(a.id)),
  );

  for (const r of assignResults) {
    if (r.status === 'fulfilled') {
      entitlementsCreated += r.value.created;
      entitlementsAlreadyExisting += r.value.alreadyHadEntitlement + r.value.duplicateOrError;
    }
  }

  return {
    rpcUnavailable: false,
    assignmentsScanned: assigns?.length ?? 0,
    entitlementsCreated,
    entitlementsAlreadyExisting,
  };
}

/**
 * Resolve active assignment and revoke it (same as unassignMasterCourseFromCollege by ids).
 */
async function _unassignCourseFromCollege(
  courseId: string,
  collegeId: string,
  revokedBy?: string,
): Promise<{ assignmentId: string }> {
  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from('content_assignments')
    .select('id')
    .eq('assignment_type', 'college')
    .eq('target_id', collegeId)
    .eq('assigned_entity_type', 'master_course')
    .eq('assigned_entity_id', courseId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up assignment: ${error.message}`);
  }
  if (!row) {
    throw new Error('No active assignment found for this course and college.');
  }

  await unassignMasterCourseFromCollege(row.id, revokedBy);
  return { assignmentId: row.id };
}

const _assignCourseToCollege = assignMasterCourseToCollege;

async function _listAssignableCollegesForCourse(
  courseId: string,
): Promise<AssignableCollege[]> {
  return listAssignableColleges(courseId);
}
