import 'server-only';



import { createAdminClient } from '@/lib/supabase/admin';
import type {
  ContentAssignmentsRow,
  EntitlementSourceType,
} from '@/types/database';
import { grantEntitlement } from './student-entitlements';
import { grantContentEntitlement } from './student-content-entitlements';
import { isAssignmentActive } from '@/lib/services/access-helpers';

// --- Types --------------------------------------------------------------------

export interface CreateAssignmentInput {
  assignment_type: 'college' | 'student'; // Phase 5: only college and student supported
  target_id: string; // college_id or student_id
  assigned_entity_type: 'variant' | 'bundle' | 'master_course';
  assigned_entity_id: string;
  start_date?: string;
  end_date: string;
  created_by?: string;
}

export interface UpdateAssignmentInput {
  start_date?: string;
  end_date?: string;
  status?: 'active' | 'scheduled' | 'expired' | 'revoked';
}

export interface AssignmentWithDetails extends ContentAssignmentsRow {
  creator?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
  // Entity details based on assigned_entity_type
  variant?: {
    id: string;
    title: string;
    code: string;
    master_course_id: string;
    master_course?: {
      id: string;
      title: string;
      code: string;
    };
  };
  bundle?: {
    id: string;
    title: string;
    code: string;
  };
  master_course?: {
    id: string;
    title: string;
    code: string;
  };
  // Target details
  college?: {
    id: string;
    name: string;
    slug: string;
  };
  student?: {
    id: string;
    student_code: string | null;
    user_id: string;
    college_id: string;
  };
}

function isAssignmentActiveNow(assignment: ContentAssignmentsRow): boolean {
  return isAssignmentActive(assignment);
}

// --- CRUD ---------------------------------------------------------------------

/**
 * Create a content assignment and auto-generate entitlements.
 * Returns the assignment record and counts of entitlements created/existed.
 */
export async function createAssignment(
  input: CreateAssignmentInput,
): Promise<{ assignment: ContentAssignmentsRow; entitlementsCreated: number; entitlementsExisted: number }> {
  const sb = createAdminClient();
  let targetCollegeId: string | null = null;

  // Target existence validation
  if (input.assignment_type === 'college') {
    const { data: college } = await sb.from('colleges').select('id').eq('id', input.target_id).single();
    if (!college) throw new Error('Target college does not exist.');
    targetCollegeId = input.target_id;
  } else if (input.assignment_type === 'student') {
    const { data: student } = await sb.from('students').select('id, college_id').eq('id', input.target_id).single();
    if (!student) throw new Error('Target student does not exist.');
    targetCollegeId = student.college_id ?? null;
  }

  // Duplicate assignment check
  const { data: existing } = await sb
    .from('content_assignments')
    .select('id')
    .eq('assignment_type', input.assignment_type)
    .eq('target_id', input.target_id)
    .eq('assigned_entity_type', input.assigned_entity_type)
    .eq('assigned_entity_id', input.assigned_entity_id)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) {
    throw new Error('An active assignment for this target and content already exists.');
  }

  // Content readiness validation
  if (input.assigned_entity_type === 'master_course') {
    const { data: course, error } = await sb
      .from('master_courses')
      .select('id, publish_status')
      .eq('id', input.assigned_entity_id)
      .maybeSingle();

    if (error) throw new Error(`Failed to load master course: ${error.message}`);
    if (!course) throw new Error('Master course not found.');

    if (course.publish_status && course.publish_status !== 'published') {
      throw new Error('Draft content cannot be assigned.');
    }
  }

  if (input.assigned_entity_type === 'variant') {
    const { data: variant, error } = await sb
      .from('course_variants')
      .select('id, publish_status, visibility_scope')
      .eq('id', input.assigned_entity_id)
      .maybeSingle();

    if (error) throw new Error(`Failed to load variant: ${error.message}`);
    if (!variant) throw new Error('Variant not found.');

    if (variant.publish_status !== 'published') {
      throw new Error('Draft content cannot be assigned.');
    }

    const scope = variant.visibility_scope ?? 'global';
    if (scope === 'private') {
      throw new Error('This variant is private and cannot be assigned. Change visibility first.');
    }

    if (scope === 'selected_colleges') {
      if (!targetCollegeId) {
        throw new Error('This variant is not visible to the selected college.');
      }

      const { data: mapping, error: mappingError } = await sb
        .from('course_variant_visibility_colleges')
        .select('id')
        .eq('variant_id', input.assigned_entity_id)
        .eq('college_id', targetCollegeId)
        .maybeSingle();

      if (mappingError) {
        throw new Error(`Failed to load variant visibility: ${mappingError.message}`);
      }

      if (!mapping) {
        throw new Error('This variant is not visible to the selected college.');
      }
    }
  }

  if (input.assigned_entity_type === 'bundle') {
    const { data: bundle, error } = await sb
      .from('course_bundles')
      .select('id, publish_status, lifecycle_status, visibility_scope')
      .eq('id', input.assigned_entity_id)
      .maybeSingle();

    if (error) throw new Error(`Failed to load bundle: ${error.message}`);
    if (!bundle) throw new Error('Bundle not found.');

    if (bundle.publish_status !== 'published' || bundle.lifecycle_status !== 'active') {
      throw new Error('Draft content cannot be assigned.');
    }

    const scope = bundle.visibility_scope ?? 'global';
    if (scope === 'private') {
      throw new Error('This bundle is private and cannot be assigned. Change visibility first.');
    }

    if (scope === 'selected_colleges') {
      if (!targetCollegeId) {
        throw new Error('This bundle is not visible to the selected college.');
      }

      const { data: mapping, error: mappingError } = await sb
        .from('course_bundle_visibility_colleges')
        .select('id')
        .eq('bundle_id', input.assigned_entity_id)
        .eq('college_id', targetCollegeId)
        .maybeSingle();

      if (mappingError) {
        throw new Error(`Failed to load bundle visibility: ${mappingError.message}`);
      }

      if (!mapping) {
        throw new Error('This bundle is not visible to the selected college.');
      }
    }
  }

  // Step 1: Create the assignment record
  const { data: assignment, error: assignError } = await sb
    .from('content_assignments')
    .insert({
      assignment_type: input.assignment_type,
      target_id: input.target_id,
      assigned_entity_type: input.assigned_entity_type,
      assigned_entity_id: input.assigned_entity_id,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      status: 'active',
      created_by: input.created_by ?? null,
    })
    .select('*')
    .single();

  if (assignError || !assignment) throw new Error(`Failed to create assignment: ${assignError?.message ?? 'No data'}`);

  // Step 2: Auto-generate entitlements for target students
  let entitlementsCreated = 0;
  let entitlementsExisted = 0;

  try {
    const stats = await autoGenerateEntitlements(
      assignment.id,
      input.assignment_type,
      input.target_id,
      input.assigned_entity_type,
      input.assigned_entity_id,
      input.start_date,
      input.end_date,
      input.created_by,
    );
    entitlementsCreated = stats.created;
    entitlementsExisted = stats.existed;
  } catch (error) {
    console.error(`[Assignment] Entitlement generation failed: ${error}`);
  }

  return { assignment, entitlementsCreated, entitlementsExisted };
}

/**
 * Update an assignment.
 */
async function _updateAssignment(
  assignmentId: string,
  input: UpdateAssignmentInput,
): Promise<ContentAssignmentsRow> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('content_assignments')
    .update(input)
    .eq('id', assignmentId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to update assignment: ${error.message}`);
  return data as ContentAssignmentsRow;
}

/**
 * Revoke an assignment and associated entitlements.
 * Revokes both student_entitlements (for master_course assignments)
 * and student_content_entitlements (for variant/bundle assignments).
 */
export async function revokeAssignment(
  assignmentId: string,
  revokedBy?: string,
): Promise<{ entitlementsRevoked: number; contentEntitlementsRevoked: number }> {
  const sb = createAdminClient();

  // Step 1: Update assignment status
  const { error: updateError } = await sb
    .from('content_assignments')
    .update({
      status: 'revoked',
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignmentId);

  if (updateError) throw new Error(`Failed to revoke assignment: ${updateError.message}`);

  // Step 2: Revoke associated student_entitlements (master_course grants)
  const { data: revokedEntitlements, error: entitlementError } = await sb
    .from('student_entitlements')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy ?? null,
      revoke_reason: 'Assignment revoked',
    })
    .eq('metadata->>assignment_id', assignmentId)
    .eq('status', 'active')
    .select('id');

  if (entitlementError) {
    console.error(`[Assignment] Failed to revoke entitlements: ${entitlementError.message}`);
  }

  // Step 3: Revoke associated student_content_entitlements (variant/bundle grants)
  const { data: revokedContentEntitlements, error: contentEntitlementError } = await sb
    .from('student_content_entitlements')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy ?? null,
      revoke_reason: 'Assignment revoked',
    })
    .eq('metadata->>assignment_id', assignmentId)
    .eq('status', 'active')
    .select('id');

  if (contentEntitlementError) {
    console.error(`[Assignment] Failed to revoke content entitlements: ${contentEntitlementError.message}`);
  }

  return {
    entitlementsRevoked: (revokedEntitlements ?? []).length,
    contentEntitlementsRevoked: (revokedContentEntitlements ?? []).length,
  };
}

// --- Entitlement Generation ---------------------------------------------------

/**
 * Auto-generate entitlements when an assignment is created.
 *
 * Resolution logic:
 * - master_course: grant direct entitlement to master_course
 * - variant: resolve variant → master_course_id → grant entitlement
 * - bundle: resolve bundle items → grant entitlements for each unique master_course
 */
async function autoGenerateEntitlements(
  assignmentId: string,
  assignmentType: 'college' | 'student',
  targetId: string,
  assignedEntityType: 'variant' | 'bundle' | 'master_course',
  assignedEntityId: string,
  startDate?: string,
  endDate?: string,
  createdBy?: string,
): Promise<{ created: number; existed: number }> {
  const sb = createAdminClient();
  let createdCount = 0;
  let existedCount = 0;

  // Step 1: Resolve target student IDs
  let studentIds: string[] = [];

  if (assignmentType === 'student') {
    studentIds = [targetId];
  } else if (assignmentType === 'college') {
    // Get all students for this college
    const { data: students } = await sb
      .from('students')
      .select('id')
      .eq('college_id', targetId);

    studentIds = (students ?? []).map((s) => s.id);
  }

  if (studentIds.length === 0) return { created: 0, existed: 0 };

  // For master_course assignments: create student_entitlements with master_course_id (full access)
  if (assignedEntityType === 'master_course') {
    const sourceType: EntitlementSourceType = 'b2b_college';
    const grantSettled = await Promise.allSettled(
      studentIds.map((studentId) =>
        grantEntitlement({
          student_id: studentId,
          master_course_id: assignedEntityId,
          source_type: sourceType,
          college_id: assignmentType === 'college' ? targetId : undefined,
          valid_from: startDate ?? new Date().toISOString(),
          valid_until: endDate ?? undefined,
          granted_by: createdBy ?? undefined,
          metadata: {
            assignment_id: assignmentId,
            assigned_entity_type: assignedEntityType,
            assigned_entity_id: assignedEntityId,
          },
        }),
      ),
    );

    for (const r of grantSettled) {
      if (r.status === 'fulfilled') {
        createdCount++;
      } else {
        const error = r.reason;
        if (
          error instanceof Error &&
          (error.message.includes('already exists') || (error as { code?: string }).code === '23505')
        ) {
          existedCount++;
        } else {
          console.error(`[Assignment] Failed to grant entitlement: ${error}`);
        }
      }
    }
    return { created: createdCount, existed: existedCount };
  }

  // Step 2: For variant/bundle assignments, create scoped student_content_entitlements
  // This ensures students only get access to the specific variant/bundle items, not full master_course access
  const contentGrantSettled = await Promise.allSettled(
    studentIds.map((studentId) =>
      grantContentEntitlement({
        student_id: studentId,
        assigned_entity_type: assignedEntityType,
        assigned_entity_id: assignedEntityId,
        source_type: 'college_assignment',
        valid_from: startDate ?? new Date().toISOString(),
        valid_until: endDate ?? undefined,
        created_by: createdBy ?? undefined,
        metadata: {
          assignment_id: assignmentId,
          college_id: assignmentType === 'college' ? targetId : undefined,
        },
      }),
    ),
  );

  for (const r of contentGrantSettled) {
    if (r.status === 'fulfilled') {
      createdCount++;
    } else {
      const error = r.reason;
      if (
        error instanceof Error &&
        (error.message.includes('already exists') || (error as { code?: string }).code === '23505')
      ) {
        existedCount++;
      } else {
        console.error(`[Assignment] Failed to grant content entitlement: ${error}`);
      }
    }
  }

return { created: createdCount, existed: existedCount };
}

/**
 * Grant student_content_entitlements to a new student based on their college's
 * active variant/bundle assignments. This ensures new students get access
 * to assigned content immediately upon joining.
 *
 * Call this when a new student is created/joined to a college.
 */
export async function grantEntitlementsForNewStudent(
  studentId: string,
  collegeId: string,
): Promise<{ created: number; existed: number }> {
  const sb = createAdminClient();
  let createdCount = 0;
  let existedCount = 0;

  const { data: assignments, error } = await sb
    .from('content_assignments')
    .select('id, assigned_entity_type, assigned_entity_id, start_date, end_date')
    .eq('assignment_type', 'college')
    .eq('target_id', collegeId)
    .eq('status', 'active');

  if (error || !assignments || assignments.length === 0) {
    return { created: 0, existed: 0 };
  }

  const activeAssignments = assignments.filter(isAssignmentActive);

  const newStudentGrantSettled = await Promise.allSettled(
    activeAssignments
      .filter((a) => a.assigned_entity_type !== 'master_course')
      .map((assignment) =>
        grantContentEntitlement({
          student_id: studentId,
          assigned_entity_type: assignment.assigned_entity_type as 'variant' | 'bundle',
          assigned_entity_id: assignment.assigned_entity_id,
          source_type: 'college_assignment',
          valid_from: assignment.start_date ?? new Date().toISOString(),
          valid_until: assignment.end_date ?? null,
          metadata: {
            assignment_id: assignment.id,
            college_id: collegeId,
          },
        }),
      ),
  );

  for (const r of newStudentGrantSettled) {
    if (r.status === 'fulfilled') {
      createdCount++;
    } else {
      const error = r.reason;
      if (
        error instanceof Error &&
        (error.message.includes('already exists') || (error as { code?: string }).code === '23505')
      ) {
        existedCount++;
      } else {
        console.error(`[Assignment] Failed to grant content entitlement for new student: ${error}`);
      }
    }
  }

  return { created: createdCount, existed: existedCount };
}

// ─── Queries ────────────────────────────────────────────────────────────────────────

/**
 * Get an assignment with details.
 */
// TODO: This function performs sequential JOINs (variant/bundle/master_course + college/student),
// creating an N+1 pattern when called in a loop. Consider replacing with a single embedded
// relation query using Supabase's nested select:
//   .select('*, course_variants(id, title, code, master_course_id, master_courses(id, title, code)), ...')
// or batch all detail fetches in parallel via Promise.all to reduce round-trips.
async function _getAssignmentWithDetails(
  assignmentId: string,
): Promise<AssignmentWithDetails | null> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('content_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (error) return null;

  const assignment = data as ContentAssignmentsRow;
  const result: AssignmentWithDetails = { ...assignment };

  // Load entity details based on assigned_entity_type
  if (assignment.assigned_entity_type === 'variant') {
    const { data: variant } = await sb
      .from('course_variants')
      .select(`
        id, title, code, master_course_id,
        master_courses (id, title, code)
      `)
      .eq('id', assignment.assigned_entity_id)
      .single();

    if (variant) {
      result.variant = variant as unknown as AssignmentWithDetails['variant'];
    }
  } else if (assignment.assigned_entity_type === 'bundle') {
    const { data: bundle } = await sb
      .from('course_bundles')
      .select('id, title, code')
      .eq('id', assignment.assigned_entity_id)
      .single();

    if (bundle) {
      result.bundle = bundle as unknown as AssignmentWithDetails['bundle'];
    }
  } else if (assignment.assigned_entity_type === 'master_course') {
    const { data: course } = await sb
      .from('master_courses')
      .select('id, title, code')
      .eq('id', assignment.assigned_entity_id)
      .single();

    if (course) {
      result.master_course = course as unknown as AssignmentWithDetails['master_course'];
    }
  }

  // Load college details if assignment_type is college
  if (assignment.assignment_type === 'college') {
    const { data: college } = await sb
      .from('colleges')
      .select('id, name, slug')
      .eq('id', assignment.target_id)
      .single();

    if (college) {
      result.college = college as unknown as AssignmentWithDetails['college'];
    }
  }

  if (assignment.assignment_type === 'student') {
    const { data: student } = await sb
      .from('students')
      .select('id, student_code, user_id, college_id')
      .eq('id', assignment.target_id)
      .single();

    if (student) {
      result.student = student as unknown as AssignmentWithDetails['student'];
    }
  }

  return result;
}

/**
 * List all assignments with optional filtering.
 */
export async function listAssignments(filters?: {
  assignment_type?: string;
  assigned_entity_type?: string;
  status?: string;
  target_id?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: AssignmentWithDetails[]; total: number }> {
  const sb = createAdminClient();
  const page = filters?.page ?? 1;
  const limit = Math.min(filters?.limit ?? 100, 100);
  const offset = (page - 1) * limit;

  const [countResult, dataResult] = await Promise.all([
    (() => {
      let countQuery = sb
        .from('content_assignments')
        .select('id', { count: 'exact', head: true });
      if (filters?.assignment_type) countQuery = countQuery.eq('assignment_type', filters.assignment_type);
      if (filters?.assigned_entity_type) countQuery = countQuery.eq('assigned_entity_type', filters.assigned_entity_type);
      if (filters?.status) countQuery = countQuery.eq('status', filters.status);
      if (filters?.target_id) countQuery = countQuery.eq('target_id', filters.target_id);
      return countQuery;
    })(),
    (() => {
      let query = sb
        .from('content_assignments')
        .select('id, assignment_type, assigned_entity_type, assigned_entity_id, target_id, status, start_date, end_date, created_at, updated_at')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (filters?.assignment_type) query = query.eq('assignment_type', filters.assignment_type);
      if (filters?.assigned_entity_type) query = query.eq('assigned_entity_type', filters.assigned_entity_type);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.target_id) query = query.eq('target_id', filters.target_id);
      return query;
    })(),
  ]);

  if (countResult.error) throw new Error(`Failed to count assignments: ${countResult.error.message}`);
  if (dataResult.error) throw new Error(`Failed to list assignments: ${dataResult.error.message}`);

  const total = countResult.count ?? 0;
  const assignments = (dataResult.data ?? []) as ContentAssignmentsRow[];

  const courseIds = new Set<string>();
  const variantIds = new Set<string>();
  const bundleIds = new Set<string>();
  const collegeIds = new Set<string>();
  const studentIds = new Set<string>();

  for (const assignment of assignments) {
    if (assignment.assigned_entity_type === 'master_course') courseIds.add(assignment.assigned_entity_id);
    if (assignment.assigned_entity_type === 'variant') variantIds.add(assignment.assigned_entity_id);
    if (assignment.assigned_entity_type === 'bundle') bundleIds.add(assignment.assigned_entity_id);
    if (assignment.assignment_type === 'college') collegeIds.add(assignment.target_id);
    if (assignment.assignment_type === 'student') studentIds.add(assignment.target_id);
  }

  const [courses, variants, bundles, colleges, students] = await Promise.all([
    courseIds.size > 0
      ? sb.from('master_courses').select('id, title, code').in('id', Array.from(courseIds))
      : Promise.resolve({ data: [], error: null }),
    variantIds.size > 0
      ? sb.from('course_variants').select('id, title, code, master_course_id').in('id', Array.from(variantIds))
      : Promise.resolve({ data: [], error: null }),
    bundleIds.size > 0
      ? sb.from('course_bundles').select('id, title, code').in('id', Array.from(bundleIds))
      : Promise.resolve({ data: [], error: null }),
    collegeIds.size > 0
      ? sb.from('colleges').select('id, name, slug').in('id', Array.from(collegeIds))
      : Promise.resolve({ data: [], error: null }),
    studentIds.size > 0
      ? sb.from('students').select('id, student_code, user_id, college_id').in('id', Array.from(studentIds))
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (courses.error) throw new Error(`Failed to load master courses: ${courses.error.message}`);
  if (variants.error) throw new Error(`Failed to load variants: ${variants.error.message}`);
  if (bundles.error) throw new Error(`Failed to load bundles: ${bundles.error.message}`);
  if (colleges.error) throw new Error(`Failed to load colleges: ${colleges.error.message}`);
  if (students.error) throw new Error(`Failed to load students: ${students.error.message}`);

  const courseMap = new Map((courses.data ?? []).map((c) => [c.id, c]));
  const variantMap = new Map((variants.data ?? []).map((v) => [v.id, v]));
  const bundleMap = new Map((bundles.data ?? []).map((b) => [b.id, b]));
  const collegeMap = new Map((colleges.data ?? []).map((c) => [c.id, c]));
  const studentMap = new Map((students.data ?? []).map((s) => [s.id, s]));

  const enriched = assignments.map((assignment) => {
    const result: AssignmentWithDetails = { ...assignment } as AssignmentWithDetails;

    if (assignment.assigned_entity_type === 'master_course') {
      const course = courseMap.get(assignment.assigned_entity_id);
      if (course) result.master_course = course as AssignmentWithDetails['master_course'];
    }

    if (assignment.assigned_entity_type === 'variant') {
      const variant = variantMap.get(assignment.assigned_entity_id);
      if (variant) result.variant = variant as AssignmentWithDetails['variant'];
    }

    if (assignment.assigned_entity_type === 'bundle') {
      const bundle = bundleMap.get(assignment.assigned_entity_id);
      if (bundle) result.bundle = bundle as AssignmentWithDetails['bundle'];
    }

    if (assignment.assignment_type === 'college') {
      const college = collegeMap.get(assignment.target_id);
      if (college) result.college = college as AssignmentWithDetails['college'];
    }

    if (assignment.assignment_type === 'student') {
      const student = studentMap.get(assignment.target_id);
      if (student) result.student = student as AssignmentWithDetails['student'];
    }

    return result;
  });

  return { data: enriched, total };
}

/**
 * List the currently active assignments for a college, including entity details.
 */
export async function listActiveCollegeAssignments(
  collegeId: string,
): Promise<AssignmentWithDetails[]> {
  const { data } = await listAssignments({
    assignment_type: 'college',
    target_id: collegeId,
    status: 'active',
  });

  return data.filter(isAssignmentActiveNow);
}

/**
 * Get all assignments for a specific college.
 */
async function _getAssignmentsForCollege(
  collegeId: string,
): Promise<AssignmentWithDetails[]> {
  const { data } = await listAssignments({
    assignment_type: 'college',
    target_id: collegeId,
    limit: 500,
  });
  return data;
}
