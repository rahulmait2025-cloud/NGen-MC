import 'server-only';

/**
 * Master Course Pillars Service.
 * 
 * Manages top-level content groupings called Pillars.
 */

import { cacheTag, cacheLife } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensurePillarFolder, retryPillarFolderSync } from './tpstreams-hierarchy';
import type { 
  MasterCoursePillarsRow,
  MasterCoursePillarStatsRow,
  MasterCoursePublishStatus,
  MasterCoursesRow,
} from '@/types/database';

export interface CreatePillarInput {
  code: string;
  title: string;
  slug: string;
  description?: string;
  short_description?: string;
  sort_order?: number;
  publish_status?: MasterCoursePublishStatus;
  visible_to_college_admins?: boolean;
  visible_to_college_students?: boolean;
  visible_to_global_students?: boolean;
  created_by?: string;
  tp_folder_uuid?: string;
}

export interface UpdatePillarInput {
  title?: string;
  slug?: string;
  description?: string;
  short_description?: string;
  sort_order?: number;
  publish_status?: MasterCoursePublishStatus;
  visible_to_college_admins?: boolean;
  visible_to_college_students?: boolean;
  visible_to_global_students?: boolean;
}

export interface PillarVisibilityInput {
  visible_to_college_admins?: boolean;
  visible_to_college_students?: boolean;
  visible_to_global_students?: boolean;
}

/**
 * List all Pillars with stats.
 *
 * Cached via the `use cache` directive (Next.js 16 Cache Components).
 * Revalidate after 60s; tag for on-demand invalidation from mutations.
 */
export async function listMasterCoursePillars(): Promise<MasterCoursePillarStatsRow[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag('master-course-pillars');

  const admin = createAdminClient();

  // Try querying the optimized stats view first
  const { data, error } = await admin
    .from('master_course_pillar_stats')
    .select('*')
    .order('title', { ascending: true });

  if (error) {
    // Fallback: If the view is missing or cache is stale, try fetching from the table directly
    // This prevents a hard crash if the migration is partially applied or cache hasn't refreshed.
    if (error.message.includes('not found') || error.code === 'PGRST204') {
      const { data: pillars, error: tableError } = await admin
        .from('master_course_pillars')
        .select('*')
        .order('title', { ascending: true });

      if (tableError) {
        throw new Error(`Failed to list Pillars (Table fallback failed): ${tableError.message}`);
      }

      return (pillars ?? []).map(p => ({
        pillar_id: p.id,
        title: p.title,
        code: p.code,
        slug: p.slug,
        description: p.description,
        short_description: p.short_description,
        publish_status: p.publish_status,
        visible_to_college_admins: p.visible_to_college_admins,
        visible_to_college_students: p.visible_to_college_students,
        visible_to_global_students: p.visible_to_global_students,
        tp_folder_status: p.tp_folder_status,
        tp_folder_uuid: p.tp_folder_uuid,
        tp_last_synced_at: p.tp_last_synced_at,
        tp_last_error: p.tp_last_error,
        course_count: 0,
        module_count: 0,
        video_count: 0
      }));
    }
    
    throw new Error(`Failed to list Pillars: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Get a single Pillar by ID.
 */
export async function getMasterCoursePillarById(id: string): Promise<MasterCoursePillarsRow | null> {
  // Validate UUID format to prevent DB syntax errors from "undefined" or malformed strings
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) {
    return null;
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('master_course_pillars')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch Pillar: ${error.message}`);
  }

  return data;
}

/**
 * Create a new Pillar and its TPStreams folder.
 */
export async function createMasterCoursePillar(input: CreatePillarInput): Promise<MasterCoursePillarsRow> {
  const admin = createAdminClient();

  const { data: pillar, error: insertError } = await admin
    .from('master_course_pillars')
    .insert({
      code: input.code,
      title: input.title,
      slug: input.slug,
      description: input.description ?? null,
      short_description: input.short_description ?? null,
      sort_order: input.sort_order ?? 0,
      publish_status: input.publish_status ?? 'draft',
      visible_to_college_admins: input.visible_to_college_admins ?? false,
      visible_to_college_students: input.visible_to_college_students ?? false,
      visible_to_global_students: input.visible_to_global_students ?? true,
      created_by: input.created_by ?? null,
      tp_folder_uuid: input.tp_folder_uuid ?? null,
      tp_folder_status: input.tp_folder_uuid ? 'created' : ('pending' as const),
    })
    .select('*')
    .single();

  if (insertError || !pillar) {
    throw new Error(`Failed to create Pillar record: ${insertError?.message ?? 'No data'}`);
  }

  // If we already have a folder UUID, we are done
  if (input.tp_folder_uuid) {
    return pillar;
  }

  // Ensure TPStreams folder
  try {
    return await ensurePillarFolder(pillar.id);
  } catch {
    // ensurePillarFolder already logs and updates DB status to 'failed'
    return pillar;
  }
}

/**
 * Update Pillar metadata.
 */
export async function updateMasterCoursePillar(id: string, input: UpdatePillarInput): Promise<MasterCoursePillarsRow> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('master_course_pillars')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update Pillar: ${error?.message ?? 'No data'}`);
  }

  return data;
}

/**
 * Update Pillar visibility.
 */
async function _updateMasterCoursePillarVisibility(id: string, input: PillarVisibilityInput): Promise<MasterCoursePillarsRow> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('master_course_pillars')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update Pillar visibility: ${error?.message ?? 'No data'}`);
  }

  return data;
}

/**
 * Retry TPStreams folder sync for a Pillar.
 */
async function _retryMasterCoursePillarFolderSync(pillarId: string): Promise<MasterCoursePillarsRow> {
  return retryPillarFolderSync(pillarId);
}

const CORE_PILLARS = [
  { title: 'Technical Bootcamp', code: 'technical-bootcamp', slug: 'technical-bootcamp' },
  { title: 'AI & Modern Development', code: 'ai-modern-development', slug: 'ai-modern-development' },
  { title: 'GitHub Monitoring', code: 'github-monitoring', slug: 'github-monitoring' },
  { title: 'LinkedIn Optimization', code: 'linkedin-optimization', slug: 'linkedin-optimization' },
  { title: 'Resume & Interview', code: 'resume-interview', slug: 'resume-interview' },
  { title: 'Behavioral Skills', code: 'behavioral-skills', slug: 'behavioral-skills' },
];

/**
 * Safely ensure the six core pillars exist in the database.
 * Does not duplicate if they already exist by code/slug.
 */
export async function ensureCorePillars(createdBy?: string): Promise<{ created: number; existed: number; failedSync: number }> {
  const admin = createAdminClient();
  const pillarResults = await Promise.all(CORE_PILLARS.map(async (def, i) => {
    const { data: existing } = await admin
      .from('master_course_pillars')
      .select('id')
      .or(`code.eq.${def.code},slug.eq.${def.slug}`)
      .maybeSingle();

    if (!existing) {
      const result = await createMasterCoursePillar({
        title: def.title,
        code: def.code,
        slug: def.slug,
        description: `Core pillar for ${def.title}`,
        short_description: def.title,
        sort_order: i + 1,
        publish_status: 'draft',
        visible_to_college_admins: false,
        visible_to_college_students: false,
        visible_to_global_students: false,
        created_by: createdBy,
      });
      return { created: true, failedSync: result.tp_folder_status === 'failed' };
    }
    return { created: false, existed: true };
  }));

  const created = pillarResults.filter(r => r.created).length;
  const existedCount = pillarResults.filter(r => 'existed' in r && r.existed).length;
  const failedSync = pillarResults.filter(r => r.failedSync).length;

  return { created, existed: existedCount, failedSync };
}

const UNCATEGORIZED_PILLAR_CODE = 'uncategorized';

/**
 * Get the Uncategorized pillar if it exists, or create it if missing.
 * Returns null only if it doesn't exist and should not be auto-created.
 */
async function getOrCreateUncategorizedPillar(): Promise<MasterCoursePillarsRow> {
  const admin = createAdminClient();

  // Try to find existing Uncategorized pillar
  const { data: existing } = await admin
    .from('master_course_pillars')
    .select('*')
    .or(`code.eq.${UNCATEGORIZED_PILLAR_CODE},slug.eq.${UNCATEGORIZED_PILLAR_CODE},title.eq.Uncategorized`)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  // Create the Uncategorized pillar if it doesn't exist
  const { data: pillar, error: insertError } = await admin
    .from('master_course_pillars')
    .insert({
      code: UNCATEGORIZED_PILLAR_CODE,
      title: 'Uncategorized',
      slug: UNCATEGORIZED_PILLAR_CODE,
      description: 'Legacy courses without a specific pillar.',
      short_description: 'Legacy courses without a pillar',
      sort_order: 0,
      publish_status: 'draft',
      visible_to_college_admins: false,
      visible_to_college_students: false,
      visible_to_global_students: false,
      tp_folder_status: 'pending' as const,
    })
    .select('*')
    .single();

  if (insertError || !pillar) {
    throw new Error(`Failed to create Uncategorized pillar: ${insertError?.message ?? 'No data'}`);
  }

  // Try to ensure TPStreams folder but don't fail if it doesn't work
  try {
    return await ensurePillarFolder(pillar.id);
  } catch {
    return pillar;
  }
}

/**
 * Get the Uncategorized pillar if it exists, without creating it.
 */
export async function getUncategorizedPillar(): Promise<MasterCoursePillarsRow | null> {
  const admin = createAdminClient();

  const { data: pillar } = await admin
    .from('master_course_pillars')
    .select('*')
    .or(`code.eq.${UNCATEGORIZED_PILLAR_CODE},slug.eq.${UNCATEGORIZED_PILLAR_CODE},title.eq.Uncategorized`)
    .maybeSingle();

  return pillar;
}

/**
 * Ensure the Uncategorized pillar exists (create if missing).
 * This is idempotent and safe to call.
 */
async function _ensureUncategorizedPillar(): Promise<MasterCoursePillarsRow> {
  return getOrCreateUncategorizedPillar();
}

/**
 * Update a course's pillar_id.
 */
export async function moveCourseToPillar(
  courseId: string,
  targetPillarId: string
): Promise<MasterCoursesRow> {
  const admin = createAdminClient();

  // Get the course to validate it exists and get its current pillar
  const { data: course, error: courseError } = await admin
    .from('master_courses')
    .select('*, master_course_pillars!inner(id)')
    .eq('id', courseId)
    .maybeSingle();

  if (courseError || !course) {
    throw new Error(`Course not found: ${courseId}`);
  }

  // Get the target pillar to validate it exists
  const { data: targetPillar, error: pillarError } = await admin
    .from('master_course_pillars')
    .select('id')
    .eq('id', targetPillarId)
    .maybeSingle();

  if (pillarError || !targetPillar) {
    throw new Error(`Target pillar not found: ${targetPillarId}`);
  }

  // Prevent moving to the same pillar
  if (course.pillar_id === targetPillarId) {
    throw new Error('Course is already in the target pillar');
  }

  // Update the course's pillar_id
  const { data: updatedCourse, error: updateError } = await admin
    .from('master_courses')
    .update({
      pillar_id: targetPillarId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)
    .select('*')
    .single();

  if (updateError || !updatedCourse) {
    throw new Error(`Failed to move course to pillar: ${updateError?.message ?? 'No data'}`);
  }

  return updatedCourse;
}

export interface CourseDiagnosticInfo {
  id: string;
  title: string;
  publish_status: MasterCoursePublishStatus;
  visible_to_college_admins: boolean;
  visible_to_college_students: boolean;
  visible_to_global_students: boolean;
  module_count: number;
  video_count: number;
  assigned_colleges_count: number;
  entitled_students_count: number;
  renderable_in_college_admin: boolean;
  renderable_in_student: boolean;
  reason?: string;
}

export interface PillarDiagnosticInfo {
  publish_status: MasterCoursePublishStatus;
  visible_to_college_admins: boolean;
  visible_to_college_students: boolean;
  visible_to_global_students: boolean;
  courses_count: number;
  published_courses_count: number;
  assigned_colleges_count: number;
  active_assignments_count: number;
  entitled_students_count: number;
  tp_folder_uuid: string | null;
  renderable_in_college_admin: boolean;
  renderable_in_student: boolean;
  reason?: string;
  courses: CourseDiagnosticInfo[];
}

/**
 * Get comprehensive diagnostic info for a pillar and all its courses.
 */
export async function getPillarDiagnosticInfo(pillarId: string): Promise<PillarDiagnosticInfo> {
  const admin = createAdminClient();

  // 1. Fetch Pillar details
  const pillar = await getMasterCoursePillarById(pillarId);
  if (!pillar) {
    throw new Error(`Pillar not found: ${pillarId}`);
  }

  // 2. Fetch courses under pillar with stats
  const { data: courses, error: coursesError } = await admin
    .from('master_courses')
    .select(`
      id, 
      title, 
      publish_status, 
      visible_to_college_admins, 
      visible_to_college_students, 
      visible_to_global_students,
      master_course_modules (id),
      video_assets (id, sync_status)
    `)
    .eq('pillar_id', pillarId);

  if (coursesError) throw new Error(`Failed to fetch courses: ${coursesError.message}`);

  const courseIds = (courses ?? []).map(c => c.id);
  const publishedCourses = (courses ?? []).filter(c => c.publish_status === 'published');

  // 3. Fetch assignments and entitlements for ALL courses in bulk
  const assignmentsByCourse: Record<string, string[]> = {};
  const entitlementCountByCourse: Record<string, number> = {};

  if (courseIds.length > 0) {
    const { data: assignments } = await admin
      .from('content_assignments')
      .select('target_id, assigned_entity_id')
      .eq('assignment_type', 'college')
      .eq('assigned_entity_type', 'master_course')
      .in('assigned_entity_id', courseIds)
      .eq('status', 'active');

    (assignments ?? []).forEach(a => {
      if (!assignmentsByCourse[a.assigned_entity_id]) assignmentsByCourse[a.assigned_entity_id] = [];
      assignmentsByCourse[a.assigned_entity_id].push(a.target_id);
    });

    const { data: entitlements } = await admin
      .from('student_entitlements')
      .select('master_course_id')
      .in('master_course_id', courseIds)
      .eq('status', 'active');

    (entitlements ?? []).forEach(e => {
      entitlementCountByCourse[e.master_course_id] = (entitlementCountByCourse[e.master_course_id] || 0) + 1;
    });
  }

  // 4. Map course diagnostics
  const courseDiagnostics: CourseDiagnosticInfo[] = (courses ?? []).map(c => {
    const moduleCount = (c.master_course_modules as { id: string }[])?.length ?? 0;
    const videoCount = ((c.video_assets as { id: string, sync_status: string }[]) ?? []).filter(v => v.sync_status === 'active').length;
    const assignedColleges = new Set(assignmentsByCourse[c.id] ?? []).size;
    const entitledStudents = entitlementCountByCourse[c.id] ?? 0;

    const isPublished = c.publish_status === 'published';
    const pillarPublished = pillar.publish_status === 'published';

    const renderableInCollegeAdmin = pillarPublished && isPublished;
    const renderableInStudent = pillarPublished && isPublished;

    let courseReason = undefined;
    if (pillar.publish_status !== 'published') courseReason = 'Parent pillar not published';
    else if (c.publish_status !== 'published') courseReason = 'Course not published';

    return {
      id: c.id,
      title: c.title,
      publish_status: c.publish_status,
      visible_to_college_admins: c.visible_to_college_admins,
      visible_to_college_students: c.visible_to_college_students,
      visible_to_global_students: c.visible_to_global_students,
      module_count: moduleCount,
      video_count: videoCount,
      assigned_colleges_count: assignedColleges,
      entitled_students_count: entitledStudents,
      renderable_in_college_admin: renderableInCollegeAdmin,
      renderable_in_student: renderableInStudent,
      reason: courseReason
    };
  });

  // 5. Aggregate Pillar Diagnostics
  const isPublished = pillar.publish_status === 'published';
  const hasPublishedCourses = publishedCourses.length > 0;
  
  const allAssignedColleges = new Set(Object.values(assignmentsByCourse).flat()).size;
  const totalActiveAssignments = Object.values(assignmentsByCourse).flat().length;
  const totalEntitlements = Object.values(entitlementCountByCourse).reduce((a, b) => a + b, 0);

  const renderableInCollegeAdmin = isPublished && 
                                  courseDiagnostics.some(c => c.renderable_in_college_admin);

  const renderableInStudent = isPublished && 
                             courseDiagnostics.some(c => c.renderable_in_student);

  let reason = undefined;
  if (!isPublished) reason = 'Pillar is not published';
  else if (!hasPublishedCourses) reason = 'No published courses in this pillar';

  return {
    publish_status: pillar.publish_status,
    visible_to_college_admins: pillar.visible_to_college_admins,
    visible_to_college_students: pillar.visible_to_college_students,
    visible_to_global_students: pillar.visible_to_global_students,
    courses_count: courses?.length ?? 0,
    published_courses_count: publishedCourses.length,
    assigned_colleges_count: allAssignedColleges,
    active_assignments_count: totalActiveAssignments,
    entitled_students_count: totalEntitlements,
    tp_folder_uuid: pillar.tp_folder_uuid,
    renderable_in_college_admin: renderableInCollegeAdmin,
    renderable_in_student: renderableInStudent,
    reason,
    courses: courseDiagnostics
  };
}
