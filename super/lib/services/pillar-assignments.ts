import 'server-only';

import { getPillarDiagnosticInfo } from '@/lib/services/master-course-pillars';
import { assignMasterCourseToCollege } from '@/lib/services/master-course-publish';
import { createAdminClient } from '@/lib/supabase/admin';

export interface PillarAssignmentResult {
  collegesProcessed: number;
  coursesEligible: number;
  assignmentsCreated: number;
  alreadyExisting: number;
  skippedCourses: { id: string; title: string; reason?: string }[];
  failedColleges: string[];
}

/**
 * For each selected college, create course assignments for every course in the pillar
 * that is published and renderable (same rules as the assign-pillar dialog preview).
 */
export async function assignPillarToColleges(
  pillarId: string,
  collegeIds: string[],
  grantedBy?: string,
): Promise<PillarAssignmentResult> {
  const diagnostic = await getPillarDiagnosticInfo(pillarId);

  const eligible: typeof diagnostic.courses = [];
  const skippedCourses: Array<{ id: string; title: string; reason?: string }> = [];
  for (const c of diagnostic.courses) {
    if (c.renderable_in_college_admin && c.renderable_in_student) {
      eligible.push(c);
    } else {
      skippedCourses.push({ id: c.id, title: c.title, reason: c.reason ?? undefined });
    }
  }
  const _eligibleIds = new Set(eligible.map((c) => c.id));

  let assignmentsCreated = 0;
  let alreadyExisting = 0;
  const failedColleges: string[] = [];
  const admin = createAdminClient();

  const assignments = await Promise.allSettled(
    collegeIds.flatMap((collegeId) =>
      eligible.map(async (course) => {
        const { data: existing } = await admin
          .from('content_assignments')
          .select('id')
          .eq('assignment_type', 'college')
          .eq('target_id', collegeId)
          .eq('assigned_entity_type', 'master_course')
          .eq('assigned_entity_id', course.id)
          .eq('status', 'active')
          .maybeSingle();

        if (existing) {
          return { type: 'existing' as const };
        }

        await assignMasterCourseToCollege(course.id, collegeId, grantedBy);
        return { type: 'created' as const, collegeId };
      }),
    ),
  );

  for (const r of assignments) {
    if (r.status === 'fulfilled') {
      if (r.value.type === 'existing') {
        alreadyExisting++;
      } else if (r.value.type === 'created') {
        assignmentsCreated++;
      }
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      if (/already (actively )?assigned/.test(msg)) {
        alreadyExisting++;
      } else {
        console.error(`[assignPillarToColleges]:`, r.reason);
      }
    }
  }

  return {
    collegesProcessed: collegeIds.length,
    coursesEligible: eligible.length,
    assignmentsCreated,
    alreadyExisting,
    skippedCourses,
    failedColleges,
  };
}
