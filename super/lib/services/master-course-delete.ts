import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { revokeAssignment } from '@/lib/services/content-assignments';
import { deletePillarFolderCascade } from '@/lib/services/tpstreams-hierarchy';
import { TpStreamsApiError } from '@/lib/tpstreams/client';
import { revalidateCourseStructures } from '@/lib/cache/invalidate-course';
import type {
  ContentAssignmentsRow,
  CourseVariantsRow,
  MasterCourseModulesRow,
  MasterCoursePillarsRow,
  MasterCoursesRow,
  OrdersRow,
  VideoAssetsRow,
} from '@/types/database';

export interface DeleteImpactSummary {
  assignmentCount: number;
  activeB2bEntitlementCount: number;
  activeB2cEntitlementCount: number;
  activeFreeCourseEntitlementCount: number;
  paidOrderCount: number;
  bundleRefCount: number;
  variantCount: number;
  studentProgressCount: number;
}

export interface PillarDeleteImpact extends DeleteImpactSummary {
  pillar: MasterCoursePillarsRow;
  courseCount: number;
  moduleCount: number;
  videoCount: number;
  archiveOnly: boolean;
}

export interface CourseDeleteImpact extends DeleteImpactSummary {
  course: MasterCoursesRow;
  moduleCount: number;
  videoCount: number;
  archiveOnly: boolean;
}



export interface ModuleDeleteImpact {
  module: MasterCourseModulesRow;
  videoCount: number;
}

export interface VideoDeleteImpact {
  video: VideoAssetsRow;
  isReferenced: boolean;
}

export interface SafeDeleteResult {
  ok: true;
  mode: 'archived' | 'deleted';
  message: string;
}

function nowIso() {
  return new Date().toISOString();
}

async function getCoursesForPillar(pillarId: string): Promise<MasterCoursesRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('master_courses')
    .select('*')
    .eq('pillar_id', pillarId);

  if (error) {
    throw new Error(`Failed to load pillar courses: ${error.message}`);
  }

  return data ?? [];
}

async function getModulesForCourses(courseIds: string[]): Promise<MasterCourseModulesRow[]> {
  if (courseIds.length === 0) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('master_course_modules')
    .select('*')
    .in('master_course_id', courseIds);

  if (error) {
    throw new Error(`Failed to load course modules: ${error.message}`);
  }

  return data ?? [];
}

async function getVideosForCourses(courseIds: string[]): Promise<VideoAssetsRow[]> {
  if (courseIds.length === 0) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('video_assets')
    .select('*')
    .in('master_course_id', courseIds)
    .eq('sync_status', 'active');

  if (error) {
    throw new Error(`Failed to load course videos: ${error.message}`);
  }

  return data ?? [];
}

async function getAssignmentsForCourses(courseIds: string[]): Promise<ContentAssignmentsRow[]> {
  if (courseIds.length === 0) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('content_assignments')
    .select('*')
    .eq('assigned_entity_type', 'master_course')
    .in('assigned_entity_id', courseIds)
    .eq('status', 'active');

  if (error) {
    throw new Error(`Failed to load course assignments: ${error.message}`);
  }

  return data ?? [];
}

async function getVariantsForCourses(courseIds: string[]): Promise<CourseVariantsRow[]> {
  if (courseIds.length === 0) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('course_variants')
    .select('*')
    .in('master_course_id', courseIds);

  if (error) {
    throw new Error(`Failed to load course variants: ${error.message}`);
  }

  return data ?? [];
}

async function getPaidOrdersForVariants(variantIds: string[]): Promise<OrdersRow[]> {
  if (variantIds.length === 0) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('orders')
    .select('*')
    .eq('entity_type', 'course_variant')
    .in('entity_id', variantIds)
    .eq('status', 'paid');

  if (error) {
    throw new Error(`Failed to load paid orders: ${error.message}`);
  }

  return data ?? [];
}

async function countActiveEntitlementsForAssignments(assignmentIds: string[]): Promise<number> {
  if (assignmentIds.length === 0) return 0;

  const admin = createAdminClient();
  const { count, error } = await admin
    .from('student_entitlements')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'b2b_college')
    .eq('status', 'active')
    .in('metadata->>assignment_id', assignmentIds);

  if (error) {
    throw new Error(`Failed to count B2B entitlements: ${error.message}`);
  }

  return count ?? 0;
}

async function countActiveB2cEntitlementsForCourses(courseIds: string[]): Promise<number> {
  if (courseIds.length === 0) return 0;

  const admin = createAdminClient();
  const { count, error } = await admin
    .from('student_entitlements')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'b2c_direct')
    .eq('status', 'active')
    .in('master_course_id', courseIds);

  if (error) {
    throw new Error(`Failed to count B2C entitlements: ${error.message}`);
  }

  return count ?? 0;
}

async function summarizeCourseImpacts(courseIds: string[]) {
  const [modules, videos, assignments, variants] = await Promise.all([
    getModulesForCourses(courseIds),
    getVideosForCourses(courseIds),
    getAssignmentsForCourses(courseIds),
    getVariantsForCourses(courseIds),
  ]);

  const assignmentIds = assignments.map((assignment) => assignment.id);
  const variantIds = variants.map((variant) => variant.id);
  const [activeB2bEntitlementCount, activeB2cEntitlementCount, activeFreeCourseEntitlementCount, paidOrders, bundleRefs] =
    await Promise.all([
      countActiveEntitlementsForAssignments(assignmentIds),
      countActiveB2cEntitlementsForCourses(courseIds),
      countActiveFreeCourseEntitlementsForCourses(courseIds),
      getPaidOrdersForVariants(variantIds),
      getBundleRefsForCourses(courseIds),
    ]);

  const admin = createAdminClient();
  let studentProgressCount = 0;
  if (courseIds.length > 0) {
    const { count: spCount } = await admin
      .from('student_video_progress')
      .select('*', { count: 'exact', head: true })
      .in('course_id', courseIds);
    studentProgressCount = spCount ?? 0;
  }

  return {
    modules,
    videos,
    assignments,
    variants,
    activeB2bEntitlementCount,
    activeB2cEntitlementCount,
    activeFreeCourseEntitlementCount,
    paidOrders,
    bundleRefCount: bundleRefs.length,
    studentProgressCount,
  };
}

async function hidePillarAndChildren(pillarId: string, courseIds: string[], moduleIds: string[]) {
  const admin = createAdminClient();
  const timestamp = nowIso();

  const { error: pillarError } = await admin
    .from('master_course_pillars')
    .update({
      publish_status: 'unpublished',
      visible_to_college_admins: false,
      visible_to_college_students: false,
      visible_to_global_students: false,
      updated_at: timestamp,
    })
    .eq('id', pillarId);

  if (pillarError) {
    throw new Error(`Failed to hide pillar: ${pillarError.message}`);
  }

  if (courseIds.length > 0) {
    const { error: courseError } = await admin
      .from('master_courses')
      .update({
        publish_status: 'unpublished',
        visible_to_college_admins: false,
        visible_to_college_students: false,
        visible_to_global_students: false,
        updated_at: timestamp,
      })
      .in('id', courseIds);

    if (courseError) {
      throw new Error(`Failed to hide pillar courses: ${courseError.message}`);
    }

    const { error: itemError } = await admin
      .from('master_course_items')
      .update({
        publish_status: 'unpublished',
        updated_at: timestamp,
      })
      .in('master_course_id', courseIds);

    if (itemError) {
      throw new Error(`Failed to hide pillar items: ${itemError.message}`);
    }

    const { error: variantError } = await admin
      .from('course_variants')
      .update({
        publish_status: 'unpublished',
        updated_at: timestamp,
      })
      .in('master_course_id', courseIds);

    if (variantError) {
      throw new Error(`Failed to unpublish pillar variants: ${variantError.message}`);
    }
  }

  if (moduleIds.length > 0) {
    const { error: moduleError } = await admin
      .from('master_course_modules')
      .update({
        publish_status: 'unpublished',
        visible_to_students: false,
        updated_at: timestamp,
      })
      .in('id', moduleIds);

    if (moduleError) {
      throw new Error(`Failed to hide pillar modules: ${moduleError.message}`);
    }
  }
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

  if (courseError) {
    throw new Error(`Failed to hide course: ${courseError.message}`);
  }

  const { error: itemError } = await admin
    .from('master_course_items')
    .update({
      publish_status: 'unpublished',
      updated_at: timestamp,
    })
    .eq('master_course_id', courseId);

  if (itemError) {
    throw new Error(`Failed to hide course items: ${itemError.message}`);
  }

  const { error: variantError } = await admin
    .from('course_variants')
    .update({
      publish_status: 'unpublished',
      updated_at: timestamp,
    })
    .eq('master_course_id', courseId);

  if (variantError) {
    throw new Error(`Failed to unpublish course variants: ${variantError.message}`);
  }

  if (moduleIds.length > 0) {
    const { error: moduleError } = await admin
      .from('master_course_modules')
      .update({
        publish_status: 'unpublished',
        visible_to_students: false,
        updated_at: timestamp,
      })
      .in('id', moduleIds);

    if (moduleError) {
      throw new Error(`Failed to hide course modules: ${moduleError.message}`);
    }
  }
}

async function _hideModule(moduleId: string) {
  const admin = createAdminClient();
  const timestamp = nowIso();

  const { error: moduleError } = await admin
    .from('master_course_modules')
    .update({
      publish_status: 'unpublished',
      visible_to_students: false,
      updated_at: timestamp,
    })
    .eq('id', moduleId);

  if (moduleError) {
    throw new Error(`Failed to hide module: ${moduleError.message}`);
  }

  const { error: itemError } = await admin
    .from('master_course_items')
    .update({
      publish_status: 'unpublished',
      updated_at: timestamp,
    })
    .eq('module_id', moduleId);

  if (itemError) {
    throw new Error(`Failed to hide module items: ${itemError.message}`);
  }
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

  if (error) {
    throw new Error(`Failed to archive videos: ${error.message}`);
  }
}

async function revokeAssignments(assignmentIds: string[], actorId: string) {
  await Promise.all(assignmentIds.map((assignmentId) => revokeAssignment(assignmentId, actorId)));
}

// ─── Phase 1: Critical Orphan Cleanup ────────────────────────────────────────
// NOTE: student_video_progress rows are INTENTIONALLY PRESERVED on content
// deletion. Watch time is permanent — it represents learning activity that
// actually happened. The FK constraints use ON DELETE SET NULL so the
// course_id/module_id/lesson_id columns become NULL while the watch time
// data (total_video_seconds_watched, unique_watched_seconds, etc.) survives.

async function deleteStudentProgressForCourses(courseIds: string[]): Promise<number> {
  if (courseIds.length === 0) return 0;
  const admin = createAdminClient();

  // Clean up legacy student_progress table (not used for analytics)
  const { count: progressCount, error: progressErr } = await admin
    .from('student_progress')
    .delete({ count: 'exact' })
    .in('item_id', courseIds);

  if (progressErr) {
    console.error(`[deletion] Failed to delete student_progress for courses: ${progressErr.message}`);
  }

  // student_video_progress rows are preserved — FK SET NULL handles orphaning
  console.log(`[deletion] Preserving student_video_progress rows for ${courseIds.length} courses (watch time is permanent)`);

  return progressCount ?? 0;
}

async function deleteStudentProgressForModules(_moduleIds: string[]): Promise<number> {
  // student_video_progress rows are preserved — FK SET NULL handles orphaning
  console.log(`[deletion] Preserving student_video_progress rows for ${_moduleIds.length} modules (watch time is permanent)`);
  return 0;
}

async function deleteStudentProgressForVideos(_videoIds: string[]): Promise<number> {
  // student_video_progress rows are preserved — FK SET NULL handles orphaning
  console.log(`[deletion] Preserving student_video_progress rows for ${_videoIds.length} videos (watch time is permanent)`);
  return 0;
}

// ─── Phase 2: Entitlement Revocation ─────────────────────────────────────────

async function revokeB2bEntitlementsForAssignments(assignmentIds: string[]): Promise<number> {
  if (assignmentIds.length === 0) return 0;
  const admin = createAdminClient();
  const now = nowIso();

  const { data, error } = await admin
    .from('student_entitlements')
    .update({
      status: 'revoked',
      revoked_at: now,
      revoke_reason: 'source_content_deleted',
    })
    .eq('source_type', 'b2b_college')
    .eq('status', 'active')
    .in('metadata->>assignment_id', assignmentIds)
    .select('id');

  if (error) {
    console.error(`[deletion] Failed to revoke B2B entitlements: ${error.message}`);
  }

  return data?.length ?? 0;
}

async function revokeB2cEntitlementsForCourses(courseIds: string[]): Promise<number> {
  if (courseIds.length === 0) return 0;
  const admin = createAdminClient();
  const now = nowIso();

  const { data, error } = await admin
    .from('student_entitlements')
    .update({
      status: 'revoked',
      revoked_at: now,
      revoke_reason: 'source_content_deleted',
    })
    .eq('source_type', 'b2c_direct')
    .eq('status', 'active')
    .in('master_course_id', courseIds)
    .select('id');

  if (error) {
    console.error(`[deletion] Failed to revoke B2C entitlements: ${error.message}`);
  }

  return data?.length ?? 0;
}

async function revokeContentEntitlementsForCourses(courseIds: string[]): Promise<number> {
  if (courseIds.length === 0) return 0;
  const admin = createAdminClient();
  const now = nowIso();

  const { data, error } = await admin
    .from('student_content_entitlements')
    .update({
      status: 'revoked',
      revoked_at: now,
      revoke_reason: 'source_content_deleted',
    })
    .eq('source_type', 'master_course')
    .eq('status', 'active')
    .in('master_course_id', courseIds)
    .select('id');

  if (error) {
    console.error(`[deletion] Failed to revoke content entitlements: ${error.message}`);
  }

  return data?.length ?? 0;
}

async function revokeFreeCourseEntitlementsForCourses(courseIds: string[]): Promise<number> {
  if (courseIds.length === 0) return 0;
  const admin = createAdminClient();
  const now = nowIso();

  const { data, error } = await admin
    .from('student_entitlements')
    .update({
      status: 'revoked',
      revoked_at: now,
      revoke_reason: 'source_content_deleted',
    })
    .eq('source_type', 'free_course')
    .eq('status', 'active')
    .in('master_course_id', courseIds)
    .select('id');

  if (error) {
    console.error(`[deletion] Failed to revoke free course entitlements: ${error.message}`);
  }

  return data?.length ?? 0;
}

async function countActiveFreeCourseEntitlementsForCourses(courseIds: string[]): Promise<number> {
  if (courseIds.length === 0) return 0;

  const admin = createAdminClient();
  const { count, error } = await admin
    .from('student_entitlements')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'free_course')
    .eq('status', 'active')
    .in('master_course_id', courseIds);

  if (error) {
    throw new Error(`Failed to count free course entitlements: ${error.message}`);
  }

  return count ?? 0;
}

// ─── Phase 3: Bundle Reference Cleanup ───────────────────────────────────────

async function getBundleRefsForCourses(courseIds: string[]): Promise<{ bundleId: string; bundleItemId: string }[]> {
  if (courseIds.length === 0) return [];
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('bundle_items')
    .select('id, bundle_id')
    .eq('item_type', 'master_course')
    .in('reference_id', courseIds);

  if (error) {
    console.error(`[deletion] Failed to fetch bundle refs for courses: ${error.message}`);
    return [];
  }

  return (data ?? []).map((row) => ({ bundleId: row.bundle_id, bundleItemId: row.id }));
}

async function getBundleRefsForVariants(variantIds: string[]): Promise<{ bundleId: string; bundleItemId: string }[]> {
  if (variantIds.length === 0) return [];
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('bundle_items')
    .select('id, bundle_id')
    .eq('item_type', 'variant')
    .in('reference_id', variantIds);

  if (error) {
    console.error(`[deletion] Failed to fetch bundle refs for variants: ${error.message}`);
    return [];
  }

  return (data ?? []).map((row) => ({ bundleId: row.bundle_id, bundleItemId: row.id }));
}

async function removeCourseFromBundles(courseIds: string[]): Promise<number> {
  if (courseIds.length === 0) return 0;
  const admin = createAdminClient();

  const { count, error } = await admin
    .from('bundle_items')
    .delete({ count: 'exact' })
    .eq('item_type', 'master_course')
    .in('reference_id', courseIds);

  if (error) {
    console.error(`[deletion] Failed to remove courses from bundles: ${error.message}`);
    return 0;
  }

  return count ?? 0;
}

async function removeVariantsFromBundles(variantIds: string[]): Promise<number> {
  if (variantIds.length === 0) return 0;
  const admin = createAdminClient();

  const { count, error } = await admin
    .from('bundle_items')
    .delete({ count: 'exact' })
    .eq('item_type', 'variant')
    .in('reference_id', variantIds);

  if (error) {
    console.error(`[deletion] Failed to remove variants from bundles: ${error.message}`);
    return 0;
  }

  return count ?? 0;
}

async function rebuildAffectedBundles(bundleIds: string[]): Promise<void> {
  if (bundleIds.length === 0) return;

  const { rebuildBundleResolvedItems } = await import('@/lib/services/catalog-effective-access');
  await Promise.allSettled(
    bundleIds.map((bundleId) =>
      rebuildBundleResolvedItems(bundleId).catch((err) => {
        console.error(`[deletion] Failed to rebuild resolved items for bundle ${bundleId}: ${err}`);
      }),
    ),
  );
}

async function archiveEmptyBundles(bundleIds: string[]): Promise<string[]> {
  if (bundleIds.length === 0) return [];
  const admin = createAdminClient();

  const results = await Promise.allSettled(
    bundleIds.map(async (bundleId) => {
      const { count, error } = await admin
        .from('bundle_items')
        .select('*', { count: 'exact', head: true })
        .eq('bundle_id', bundleId);

      if (error) {
        console.error(`[deletion] Failed to check bundle ${bundleId} item count: ${error.message}`);
        return null;
      }

      if ((count ?? 0) === 0) {
        const { error: archiveErr } = await admin
          .from('course_bundles')
          .update({
            publish_status: 'unpublished',
            lifecycle_status: 'archived',
            updated_at: nowIso(),
          })
          .eq('id', bundleId);

        if (archiveErr) {
          console.error(`[deletion] Failed to archive empty bundle ${bundleId}: ${archiveErr.message}`);
          return null;
        }
        return bundleId;
      }
      return null;
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<string | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((id): id is string => id !== null);
}

// ─── Phase 4: Variant Cleanup ────────────────────────────────────────────────

async function getVariantsForPillarCourses(courseIds: string[]): Promise<CourseVariantsRow[]> {
  if (courseIds.length === 0) return [];
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('course_variants')
    .select('*')
    .in('master_course_id', courseIds);

  if (error) {
    throw new Error(`Failed to load variants: ${error.message}`);
  }

  return data ?? [];
}

async function revokeVariantAssignments(variantIds: string[], actorId: string): Promise<void> {
  if (variantIds.length === 0) return;
  const admin = createAdminClient();

  const { data: assignments, error } = await admin
    .from('content_assignments')
    .select('id')
    .eq('assigned_entity_type', 'variant')
    .in('assigned_entity_id', variantIds)
    .eq('status', 'active');

  if (error) {
    console.error(`[deletion] Failed to fetch variant assignments: ${error.message}`);
    return;
  }

  if (assignments && assignments.length > 0) {
    await revokeAssignments(assignments.map((a) => a.id), actorId);
  }
}

async function revokeEntitlementsForVariants(variantIds: string[]): Promise<number> {
  if (variantIds.length === 0) return 0;
  const admin = createAdminClient();
  const now = nowIso();

  const { data: seData, error: seErr } = await admin
    .from('student_entitlements')
    .update({
      status: 'revoked',
      revoked_at: now,
      revoke_reason: 'source_content_deleted',
    })
    .eq('source_type', 'variant')
    .eq('status', 'active')
    .in('metadata->>assigned_entity_id', variantIds)
    .select('id');

  if (seErr) {
    console.error(`[deletion] Failed to revoke variant entitlements: ${seErr.message}`);
  }

  const { data: sceData, error: sceErr } = await admin
    .from('student_content_entitlements')
    .update({
      status: 'revoked',
      revoked_at: now,
      revoke_reason: 'source_content_deleted',
    })
    .eq('source_type', 'variant')
    .eq('status', 'active')
    .in('assigned_entity_id', variantIds)
    .select('id');

  if (sceErr) {
    console.error(`[deletion] Failed to revoke variant content entitlements: ${sceErr.message}`);
  }

  return (seData?.length ?? 0) + (sceData?.length ?? 0);
}

async function deleteVariantsForCourses(courseIds: string[]): Promise<number> {
  if (courseIds.length === 0) return 0;
  const admin = createAdminClient();

  const { count, error } = await admin
    .from('course_variants')
    .delete({ count: 'exact' })
    .in('master_course_id', courseIds);

  if (error) {
    console.error(`[deletion] Failed to delete variants: ${error.message}`);
  }

  return count ?? 0;
}

// ─── Phase 5: TPStreams Safe Delete ──────────────────────────────────────────

async function safeDeleteTpAsset(assetId: string | null | undefined): Promise<{ ok: boolean; error?: string }> {
  if (!assetId) return { ok: true };

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { deleteAsset } = await import('@/lib/tpstreams/assets');
      await deleteAsset(assetId);
      return { ok: true };
    } catch (err) {
      if (err instanceof TpStreamsApiError && err.status === 404) {
        return { ok: true };
      }

      if (attempt === maxRetries) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[deletion] TPStreams delete failed after ${maxRetries} attempts for ${assetId}: ${msg}`);
        return { ok: false, error: msg };
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  return { ok: false, error: 'Unreachable' };
}

async function safeDeleteModuleFolder(moduleId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('master_course_modules')
    .select('tp_folder_uuid')
    .eq('id', moduleId)
    .single();

  if (!data?.tp_folder_uuid) return { ok: true };

  const result = await safeDeleteTpAsset(data.tp_folder_uuid);

  await admin
    .from('master_course_modules')
    .update({
      tp_folder_status: result.ok ? 'pending' : 'failed',
      tp_folder_uuid: result.ok ? null : data.tp_folder_uuid,
      tp_folder_title: result.ok ? null : undefined,
    })
    .eq('id', moduleId);

  return result;
}



export async function getPillarDeleteImpact(pillarId: string): Promise<PillarDeleteImpact> {
  const admin = createAdminClient();
  const { data: pillar, error } = await admin
    .from('master_course_pillars')
    .select('*')
    .eq('id', pillarId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load pillar: ${error.message}`);
  }
  if (!pillar) {
    throw new Error('Pillar not found.');
  }

  const courses = await getCoursesForPillar(pillarId);
  const courseIds = courses.map((course) => course.id);
  const summary = await summarizeCourseImpacts(courseIds);

  return {
    pillar,
    courseCount: courses.length,
    moduleCount: summary.modules.length,
    videoCount: summary.videos.length,
    assignmentCount: summary.assignments.length,
    activeB2bEntitlementCount: summary.activeB2bEntitlementCount,
    activeB2cEntitlementCount: summary.activeB2cEntitlementCount,
    activeFreeCourseEntitlementCount: summary.activeFreeCourseEntitlementCount,
    paidOrderCount: summary.paidOrders.length,
    bundleRefCount: summary.bundleRefCount,
    variantCount: summary.variants.length,
    studentProgressCount: summary.studentProgressCount,
    archiveOnly: summary.paidOrders.length > 0,
  };
}

export async function getCourseDeleteImpact(courseId: string): Promise<CourseDeleteImpact> {
  const admin = createAdminClient();
  const { data: course, error } = await admin
    .from('master_courses')
    .select('*')
    .eq('id', courseId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load course: ${error.message}`);
  }
  if (!course) {
    throw new Error('Course not found.');
  }

  const summary = await summarizeCourseImpacts([courseId]);

  return {
    course,
    moduleCount: summary.modules.length,
    videoCount: summary.videos.length,
    assignmentCount: summary.assignments.length,
    activeB2bEntitlementCount: summary.activeB2bEntitlementCount,
    activeB2cEntitlementCount: summary.activeB2cEntitlementCount,
    activeFreeCourseEntitlementCount: summary.activeFreeCourseEntitlementCount,
    paidOrderCount: summary.paidOrders.length,
    bundleRefCount: summary.bundleRefCount,
    variantCount: summary.variants.length,
    studentProgressCount: summary.studentProgressCount,
    archiveOnly: summary.paidOrders.length > 0,
  };
}

export async function getModuleDeleteImpact(moduleId: string): Promise<ModuleDeleteImpact> {
  const admin = createAdminClient();
  const { data: module, error } = await admin
    .from('master_course_modules')
    .select('*')
    .eq('id', moduleId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load module: ${error.message}`);
  }
  if (!module) {
    throw new Error('Module not found.');
  }

  const { count, error: videoError } = await admin
    .from('video_assets')
    .select('*', { count: 'exact', head: true })
    .eq('master_course_module_id', moduleId)
    .eq('sync_status', 'active');

  if (videoError) {
    throw new Error(`Failed to count module videos: ${videoError.message}`);
  }

  return {
    module,
    videoCount: count ?? 0,
  };
}

export async function getVideoDeleteImpact(videoAssetId: string): Promise<VideoDeleteImpact> {
  const admin = createAdminClient();
  const { data: video, error } = await admin
    .from('video_assets')
    .select('*')
    .eq('id', videoAssetId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load video: ${error.message}`);
  }
  if (!video) {
    throw new Error('Video not found.');
  }

  const { count, error: referenceError } = await admin
    .from('master_course_items')
    .select('*', { count: 'exact', head: true })
    .eq('video_asset_id', videoAssetId);

  if (referenceError) {
    throw new Error(`Failed to inspect video references: ${referenceError.message}`);
  }

  return {
    video,
    isReferenced: (count ?? 0) > 0,
  };
}

export async function deletePillarSafely(pillarId: string, actorId: string): Promise<SafeDeleteResult> {
  const admin = createAdminClient();
  const errors: string[] = [];
  const affectedCounts: Record<string, number> = {};

  const courses = await getCoursesForPillar(pillarId);
  const courseIds = courses.map((course) => course.id);
  const [modules, assignments, variants] = await Promise.all([
    getModulesForCourses(courseIds),
    getAssignmentsForCourses(courseIds),
    getVariantsForPillarCourses(courseIds),
  ]);
  const moduleIds = modules.map((module) => module.id);
  const variantIds = variants.map((v) => v.id);
  const [videos, paidOrders] = await Promise.all([
    getVideosForCourses(courseIds),
    getPaidOrdersForVariants(variantIds),
  ]);

  const hasPaidHistory = paidOrders.length > 0;

  if (hasPaidHistory) {
    // Archive mode: hide content, revoke access, but keep DB rows
    await Promise.all([
      revokeAssignments(assignments.map((a) => a.id), actorId),
      revokeVariantAssignments(variantIds, actorId),
      hidePillarAndChildren(pillarId, courseIds, moduleIds),
    ]);

    const [b2bRevoked, b2cRevoked, freeCourseEntRevoked, contentEntRevoked, variantEntRevoked] = await Promise.all([
      revokeB2bEntitlementsForAssignments(assignments.map((a) => a.id)),
      revokeB2cEntitlementsForCourses(courseIds),
      revokeFreeCourseEntitlementsForCourses(courseIds),
      revokeContentEntitlementsForCourses(courseIds),
      revokeEntitlementsForVariants(variantIds),
    ]);

    affectedCounts.assignments_revoked = assignments.length;
    affectedCounts.b2b_entitlements_revoked = b2bRevoked;
    affectedCounts.b2c_entitlements_revoked = b2cRevoked;
    affectedCounts.free_course_entitlements_revoked = freeCourseEntRevoked;
    affectedCounts.content_entitlements_revoked = contentEntRevoked;
    affectedCounts.variant_entitlements_revoked = variantEntRevoked;

    // Remove from bundles but don't delete bundles
    const removedFromBundles = await removeCourseFromBundles(courseIds);
    const removedVariantBundles = await removeVariantsFromBundles(variantIds);
    affectedCounts.bundle_items_removed = removedFromBundles + removedVariantBundles;

    // Unlink courses from pillar
    if (courseIds.length > 0) {
      const { error } = await admin
        .from('master_courses')
        .update({ pillar_id: null, updated_at: nowIso() })
        .in('id', courseIds);
      if (error) errors.push(`Failed to unlink courses from pillar: ${error.message}`);
    }

    // Delete pillar row
    const { error: pillarDelErr } = await admin.from('master_course_pillars').delete().eq('id', pillarId);
    if (pillarDelErr) errors.push(`Failed to delete pillar: ${pillarDelErr.message}`);

    // TPStreams cleanup (best-effort)
    try {
      await deletePillarFolderCascade(pillarId);
    } catch (tpErr) {
      const msg = tpErr instanceof Error ? tpErr.message : String(tpErr);
      errors.push(`TPStreams pillar folder delete failed: ${msg}`);
    }

    await revalidateCourseStructures(courseIds);

    return {
      ok: true,
      mode: 'archived',
      message: `Pillar archived. ${affectedCounts.b2b_entitlements_revoked ?? 0} B2B + ${affectedCounts.b2c_entitlements_revoked ?? 0} B2C entitlements revoked.`,
    };
  }

  // Hard-delete mode: remove everything
  await Promise.all([
    revokeAssignments(assignments.map((a) => a.id), actorId),
    revokeVariantAssignments(variantIds, actorId),
    hidePillarAndChildren(pillarId, courseIds, moduleIds),
  ]);

  const [b2bRevoked, b2cRevoked, freeCourseEntRevoked, contentEntRevoked, variantEntRevoked] = await Promise.all([
    revokeB2bEntitlementsForAssignments(assignments.map((a) => a.id)),
    revokeB2cEntitlementsForCourses(courseIds),
    revokeFreeCourseEntitlementsForCourses(courseIds),
    revokeContentEntitlementsForCourses(courseIds),
    revokeEntitlementsForVariants(variantIds),
  ]);

  affectedCounts.assignments_revoked = assignments.length;
  affectedCounts.b2b_entitlements_revoked = b2bRevoked;
  affectedCounts.b2c_entitlements_revoked = b2cRevoked;
  affectedCounts.free_course_entitlements_revoked = freeCourseEntRevoked;
  affectedCounts.content_entitlements_revoked = contentEntRevoked;
  affectedCounts.variant_entitlements_revoked = variantEntRevoked;

  // Remove from bundles
  const [removedFromBundles, removedVariantBundles] = await Promise.all([
    removeCourseFromBundles(courseIds),
    removeVariantsFromBundles(variantIds),
  ]);
  affectedCounts.bundle_items_removed = removedFromBundles + removedVariantBundles;

  // Archive empty bundles
  const [courseBundleRefs, variantBundleRefs] = await Promise.all([
    getBundleRefsForCourses(courseIds),
    getBundleRefsForVariants(variantIds),
  ]);
  const affectedBundleIds = [
    ...new Set([
      ...courseBundleRefs.map((r) => r.bundleId),
      ...variantBundleRefs.map((r) => r.bundleId),
    ]),
  ];
  const archivedBundles = await archiveEmptyBundles(affectedBundleIds);
  affectedCounts.bundles_archived = archivedBundles.length;

  // Rebuild affected bundles that weren't archived
  const bundlesToRebuild = affectedBundleIds.filter((id) => !archivedBundles.includes(id));
  await rebuildAffectedBundles(bundlesToRebuild);

  // Delete student progress
  const progressDeleted = await deleteStudentProgressForCourses(courseIds);
  affectedCounts.student_progress_deleted = progressDeleted;

  // Delete variants
  const variantsDeleted = await deleteVariantsForCourses(courseIds);
  affectedCounts.variants_deleted = variantsDeleted;

  // Archive videos locally
  if (videos.length > 0) {
    await softRemoveVideos(videos.map((video) => video.id));
  }

  // TPStreams cleanup (best-effort)
  try {
    await deletePillarFolderCascade(pillarId);
  } catch (tpErr) {
    const msg = tpErr instanceof Error ? tpErr.message : String(tpErr);
    errors.push(`TPStreams pillar folder delete failed: ${msg}`);
  }

  // Unlink courses from pillar before deleting pillar
  if (courseIds.length > 0) {
    const { error } = await admin
      .from('master_courses')
      .update({ pillar_id: null, updated_at: nowIso() })
      .in('id', courseIds);
    if (error) errors.push(`Failed to unlink courses from pillar: ${error.message}`);
  }

  // Delete pillar row
  const { error: pillarDelErr } = await admin.from('master_course_pillars').delete().eq('id', pillarId);
  if (pillarDelErr) errors.push(`Failed to delete pillar: ${pillarDelErr.message}`);

  await revalidateCourseStructures(courseIds);

  return {
    ok: true,
    mode: 'deleted',
    message: `Pillar deleted. ${variantsDeleted} variants, ${progressDeleted} progress records cleaned.`,
  };
}

export async function deleteCourseSafely(courseId: string, actorId: string): Promise<SafeDeleteResult> {
  const admin = createAdminClient();
  const errors: string[] = [];
  const affectedCounts: Record<string, number> = {};

  const { data: course, error: courseError } = await admin
    .from('master_courses')
    .select('*')
    .eq('id', courseId)
    .maybeSingle();

  if (courseError) {
    throw new Error(`Failed to load course: ${courseError.message}`);
  }
  if (!course) {
    throw new Error('Course not found.');
  }

  // Free courses can be deleted even when published (list UI offers hard delete).
  // Platform/bootcamp master courses must be unpublished/archived first.
  if (course.publish_status === 'published' && course.course_kind !== 'free_course') {
    throw new Error('Published master courses cannot be deleted. You can edit them or archive them.');
  }

  const [summary, modules] = await Promise.all([
    summarizeCourseImpacts([courseId]),
    getModulesForCourses([courseId]),
  ]);
  const moduleIds = modules.map((module) => module.id);
  const assignments = summary.assignments;
  const assignmentIds = assignments.map((a) => a.id);

  // Check paid orders
  const hasPaidHistory = (summary.paidOrders ?? []).length > 0;

  // Check for variants - clean them up instead of blocking
  const variants = summary.variants ?? [];
  const variantIds = variants.map((v) => v.id);

  if (hasPaidHistory) {
    // Archive mode: hide, revoke access, keep DB rows
    await Promise.all([
      revokeAssignments(assignmentIds, actorId),
      revokeVariantAssignments(variantIds, actorId),
      hideCourseAndChildren(courseId, moduleIds),
    ]);

    const [b2bRevoked, b2cRevoked, freeCourseEntRevoked, contentEntRevoked, variantEntRevoked] = await Promise.all([
      revokeB2bEntitlementsForAssignments(assignmentIds),
      revokeB2cEntitlementsForCourses([courseId]),
      revokeFreeCourseEntitlementsForCourses([courseId]),
      revokeContentEntitlementsForCourses([courseId]),
      revokeEntitlementsForVariants(variantIds),
    ]);

    affectedCounts.assignments_revoked = assignments.length;
    affectedCounts.b2b_entitlements_revoked = b2bRevoked;
    affectedCounts.b2c_entitlements_revoked = b2cRevoked;
    affectedCounts.free_course_entitlements_revoked = freeCourseEntRevoked;
    affectedCounts.content_entitlements_revoked = contentEntRevoked;
    affectedCounts.variant_entitlements_revoked = variantEntRevoked;

    // Remove from bundles
    const removedFromBundles = await removeCourseFromBundles([courseId]);
    const removedVariantBundles = await removeVariantsFromBundles(variantIds);
    affectedCounts.bundle_items_removed = removedFromBundles + removedVariantBundles;

    // Archive empty bundles
    const affectedBundleIds = [
      ...new Set([
        ...(await getBundleRefsForCourses([courseId])).map((r) => r.bundleId),
        ...(await getBundleRefsForVariants(variantIds)).map((r) => r.bundleId),
      ]),
    ];
    const archivedBundles = await archiveEmptyBundles(affectedBundleIds);
    affectedCounts.bundles_archived = archivedBundles.length;

    // Rebuild affected bundles
    const bundlesToRebuild = affectedBundleIds.filter((id) => !archivedBundles.includes(id));
    await rebuildAffectedBundles(bundlesToRebuild);

    // Soft-remove videos
    const videos = await getVideosForCourses([courseId]);
    if (videos.length > 0) {
      await softRemoveVideos(videos.map((video) => video.id));
    }

    await revalidateCourseStructures([courseId]);

    return {
      ok: true,
      mode: 'archived',
      message: `Course archived. ${affectedCounts.b2b_entitlements_revoked ?? 0} B2B + ${affectedCounts.b2c_entitlements_revoked ?? 0} B2C entitlements revoked.`,
    };
  }

  // Hard-delete mode
  await Promise.all([
    revokeAssignments(assignmentIds, actorId),
    revokeVariantAssignments(variantIds, actorId),
    hideCourseAndChildren(courseId, moduleIds),
  ]);

  const [b2bRevoked, b2cRevoked, freeCourseEntRevoked, contentEntRevoked, variantEntRevoked] = await Promise.all([
    revokeB2bEntitlementsForAssignments(assignmentIds),
    revokeB2cEntitlementsForCourses([courseId]),
    revokeFreeCourseEntitlementsForCourses([courseId]),
    revokeContentEntitlementsForCourses([courseId]),
    revokeEntitlementsForVariants(variantIds),
  ]);

  affectedCounts.assignments_revoked = assignments.length;
  affectedCounts.b2b_entitlements_revoked = b2bRevoked;
  affectedCounts.b2c_entitlements_revoked = b2cRevoked;
  affectedCounts.free_course_entitlements_revoked = freeCourseEntRevoked;
  affectedCounts.content_entitlements_revoked = contentEntRevoked;
  affectedCounts.variant_entitlements_revoked = variantEntRevoked;

  // Remove from bundles
  const [removedFromBundles, removedVariantBundles] = await Promise.all([
    removeCourseFromBundles([courseId]),
    removeVariantsFromBundles(variantIds),
  ]);
  affectedCounts.bundle_items_removed = removedFromBundles + removedVariantBundles;

  // Archive empty bundles and rebuild affected ones
  const [courseBundleRefs, variantBundleRefs] = await Promise.all([
    getBundleRefsForCourses([courseId]),
    getBundleRefsForVariants(variantIds),
  ]);
  const affectedBundleIds = [
    ...new Set([
      ...courseBundleRefs.map((r) => r.bundleId),
      ...variantBundleRefs.map((r) => r.bundleId),
    ]),
  ];
  const archivedBundles = await archiveEmptyBundles(affectedBundleIds);
  affectedCounts.bundles_archived = archivedBundles.length;

  const bundlesToRebuild = affectedBundleIds.filter((id) => !archivedBundles.includes(id));
  await rebuildAffectedBundles(bundlesToRebuild);

  // Delete student progress
  const progressDeleted = await deleteStudentProgressForCourses([courseId]);
  affectedCounts.student_progress_deleted = progressDeleted;

  // Delete variants
  const variantsDeleted = await deleteVariantsForCourses([courseId]);
  affectedCounts.variants_deleted = variantsDeleted;

  // Archive videos locally
  const videos = await getVideosForCourses([courseId]);
  if (videos.length > 0) {
    await softRemoveVideos(videos.map((video) => video.id));
  }

  // TPStreams cleanup (best-effort)
  try {
    if (course.tp_folder_uuid) {
      const tpResult = await safeDeleteTpAsset(course.tp_folder_uuid);
      if (!tpResult.ok) errors.push(`TPStreams course folder delete failed: ${tpResult.error}`);
    }
  } catch (tpErr) {
    const msg = tpErr instanceof Error ? tpErr.message : String(tpErr);
    errors.push(`TPStreams course folder delete failed: ${msg}`);
  }

  // Delete course from database
  const { error: delErr } = await admin.from('master_courses').delete().eq('id', courseId);
  if (delErr) errors.push(`Failed to delete course from database: ${delErr.message}`);

  await revalidateCourseStructures([courseId]);

  if (errors.length > 0) {
    return {
      ok: true,
      mode: 'deleted',
      message: `Course deleted with warnings: ${errors.join('; ')}`,
    };
  }

  return {
    ok: true,
    mode: 'deleted',
    message: `Course deleted. ${variantsDeleted} variants, ${progressDeleted} progress records cleaned.`,
  };
}

export async function deleteModuleSafely(moduleId: string): Promise<SafeDeleteResult> {
  const admin = createAdminClient();
  const errors: string[] = [];

  const [impact, { data: videos, error: videoError }, { data: moduleRow }] = await Promise.all([
    getModuleDeleteImpact(moduleId),
    admin
      .from('video_assets')
      .select('id')
      .eq('master_course_module_id', moduleId)
      .eq('sync_status', 'active'),
    admin
      .from('master_course_modules')
      .select('master_course_id')
      .eq('id', moduleId)
      .maybeSingle(),
  ]);

  if (videoError) {
    throw new Error(`Failed to load module videos: ${videoError.message}`);
  }

  const affectedCourseId = moduleRow?.master_course_id;

  // Delete student progress for this module
  const [progressDeleted, tpResult] = await Promise.all([
    deleteStudentProgressForModules([moduleId]),
    safeDeleteModuleFolder(moduleId),
  ]);
  if (!tpResult.ok) errors.push(`TPStreams module folder delete failed: ${tpResult.error}`);

  // Delete module from database
  const { error: deleteError } = await admin.from('master_course_modules').delete().eq('id', moduleId);
  if (deleteError) {
    throw new Error(`Failed to delete module from database: ${deleteError.message}`);
  }

  // Archive videos locally
  await softRemoveVideos((videos ?? []).map((video) => video.id));

  if (affectedCourseId) {
    await revalidateCourseStructures([affectedCourseId]);
  }

  const msg = errors.length > 0
    ? `Module deleted with warnings: ${errors.join('; ')}`
    : impact.videoCount > 0
      ? 'Module permanently deleted with videos and progress records.'
      : 'Module permanently deleted with progress records.';

  return {
    ok: true,
    mode: 'deleted',
    message: `${msg} ${progressDeleted} student progress records cleaned.`,
  };
}

export async function deleteVideoAssetSafely(videoAssetId: string): Promise<SafeDeleteResult> {
  const admin = createAdminClient();
  const errors: string[] = [];

  const impact = await getVideoDeleteImpact(videoAssetId);

  // Delete student progress for this video
  const [progressDeleted, tpResult] = await Promise.all([
    deleteStudentProgressForVideos([videoAssetId]),
    safeDeleteTpAsset(impact.video.tp_asset_id),
  ]);
  if (!tpResult.ok) errors.push(`TPStreams video delete failed: ${tpResult.error}`);

  // Archive video locally
  const { error } = await admin
    .from('video_assets')
    .update({
      processing_status: 'error',
      sync_status: 'removed',
      removed_at: nowIso(),
    })
    .eq('id', videoAssetId);

  if (error) {
    throw new Error(`Failed to archive video asset locally: ${error.message}`);
  }

  if (impact.video.master_course_id) {
    await revalidateCourseStructures([impact.video.master_course_id]);
  }

  return {
    ok: true,
    mode: 'deleted',
    message: errors.length > 0
      ? `Video archived with warnings: ${errors.join('; ')}. ${progressDeleted} progress records cleaned.`
      : impact.isReferenced
        ? `Video deleted from TPStreams and archived locally. ${progressDeleted} progress records cleaned.`
        : `Video deleted from TPStreams and archived locally. ${progressDeleted} progress records cleaned.`,
  };
}
