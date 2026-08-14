import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { isAssignmentActive } from '@/lib/services/access-helpers';
import { DirectLearnerAccessManager } from './direct-learner-access-manager';

export interface DirectLearnerCatalogCourse {
  id: string;
  pillar_id: string | null;
  title: string;
  code: string;
  short_description: string | null;
}

export interface DirectLearnerCatalogPillar {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  sort_order?: number | null;
  courses: DirectLearnerCatalogCourse[];
}

export interface DirectLearnerCatalogVariant {
  id: string;
  title: string;
  code: string;
  master_course_id: string;
  master_course_title: string | null;
  master_course_code: string | null;
}

export interface DirectLearnerCatalogBundle {
  id: string;
  title: string;
  code: string;
}

export interface DirectLearnerCatalogData {
  master_courses: DirectLearnerCatalogPillar[];
  variants: DirectLearnerCatalogVariant[];
  bundles: DirectLearnerCatalogBundle[];
}

function isAssignmentActiveNow(assignment: { status?: string | null; start_date?: string | null; end_date?: string | null }) {
  return isAssignmentActive(assignment);
}

async function loadDirectLearnerCatalog(collegeId: string): Promise<DirectLearnerCatalogData> {
  const admin = createAdminClient();

  const [pillarsRes, coursesRes, assignmentsRes] = await Promise.all([
    admin
      .from('master_course_pillars')
      .select('id, title, slug, description, short_description, sort_order')
      .eq('publish_status', 'published')
      .eq('visible_to_global_students', true)
      .order('sort_order', { ascending: true }),
    admin
      .from('master_courses')
      .select('id, pillar_id, title, code, short_description')
      .eq('publish_status', 'published')
      .eq('visible_to_global_students', true)
      .order('title', { ascending: true }),
    admin
      .from('content_assignments')
      .select('id, assigned_entity_type, assigned_entity_id, status, start_date, end_date')
      .eq('assignment_type', 'college')
      .eq('target_id', collegeId)
      .eq('status', 'active')
      .in('assigned_entity_type', ['master_course', 'variant', 'bundle']),
  ]);

  if (pillarsRes.error || coursesRes.error || assignmentsRes.error) {
    return { master_courses: [], variants: [], bundles: [] };
  }

  const pillars = pillarsRes.data ?? [];
  const courses = coursesRes.data ?? [];
  const assignments = (assignmentsRes.data ?? []).filter(isAssignmentActiveNow);

  const assignedMasterCourseIds = new Set<string>();
  const assignedVariantIds = new Set<string>();
  const assignedBundleIds = new Set<string>();
  for (const assignment of assignments) {
    if (assignment.assigned_entity_type === 'master_course') {
      assignedMasterCourseIds.add(assignment.assigned_entity_id);
    } else if (assignment.assigned_entity_type === 'variant') {
      assignedVariantIds.add(assignment.assigned_entity_id);
    } else if (assignment.assigned_entity_type === 'bundle') {
      assignedBundleIds.add(assignment.assigned_entity_id);
    }
  }

  const [assignedCoursesRes, assignedVariantsRes, assignedBundlesRes] = await Promise.all([
    assignedMasterCourseIds.size > 0
      ? admin
          .from('master_courses')
          .select('id, pillar_id, title, code, short_description')
          .in('id', Array.from(assignedMasterCourseIds))
          .eq('publish_status', 'published')
      : Promise.resolve({ data: [], error: null }),
    assignedVariantIds.size > 0
      ? admin
          .from('course_variants')
          .select('id, title, code, master_course_id, master_courses (id, title, code)')
          .in('id', Array.from(assignedVariantIds))
          .eq('publish_status', 'published')
      : Promise.resolve({ data: [], error: null }),
    assignedBundleIds.size > 0
      ? admin
          .from('course_bundles')
          .select('id, title, code, lifecycle_status')
          .in('id', Array.from(assignedBundleIds))
          .eq('publish_status', 'published')
          .eq('lifecycle_status', 'active')
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (assignedCoursesRes.error || assignedVariantsRes.error || assignedBundlesRes.error) {
    return { master_courses: [], variants: [], bundles: [] };
  }

  const assignedCourses = (assignedCoursesRes.data ?? []) as DirectLearnerCatalogCourse[];
  const assignedVariants = (assignedVariantsRes.data ?? []) as Array<{
    id: string;
    title: string;
    code: string;
    master_course_id: string;
    master_courses?: { id: string; title: string; code: string } | null;
  }>;
  const assignedBundles = (assignedBundlesRes.data ?? []) as DirectLearnerCatalogBundle[];

  const courseMap = new Map<string, DirectLearnerCatalogCourse>();
  courses.forEach((course) => courseMap.set(course.id, course as DirectLearnerCatalogCourse));
  assignedCourses.forEach((course) => courseMap.set(course.id, course));
  const allCourses = Array.from(courseMap.values());

  const assignedPillarIds = new Set<string>();
  for (const course of allCourses) {
    if (course.pillar_id) assignedPillarIds.add(course.pillar_id);
  }

  const globalPillarIds = new Set(pillars.map((pillar) => pillar.id));
  const missingPillarIds = Array.from(assignedPillarIds).filter((pillarId) => !globalPillarIds.has(pillarId));

  const { data: assignedPillars, error: assignedPillarsError } =
    missingPillarIds.length > 0
      ? await admin
          .from('master_course_pillars')
          .select('id, title, slug, description, short_description, sort_order')
          .in('id', missingPillarIds)
      : { data: [], error: null };

  if (assignedPillarsError) {
    return { master_courses: [], variants: [], bundles: [] };
  }

  const allPillars = [...pillars, ...(assignedPillars ?? [])];
  const pillarMap = new Map(allPillars.map((pillar) => [pillar.id, pillar]));
  const grouped = new Map<string, DirectLearnerCatalogCourse[]>();

  allCourses.forEach((course) => {
    if (!course.pillar_id || !pillarMap.has(course.pillar_id)) return;
    const existing = grouped.get(course.pillar_id) ?? [];
    existing.push(course as DirectLearnerCatalogCourse);
    grouped.set(course.pillar_id, existing);
  });

  const masterCourses = allPillars
    .reduce<DirectLearnerCatalogPillar[]>((acc, pillar) => {
      const courses = (grouped.get(pillar.id) ?? []).sort((a, b) => a.title.localeCompare(b.title));
      if (courses.length > 0) {
        acc.push({ ...pillar, courses });
      }
      return acc;
    }, [])
    .sort((a, b) => {
      const orderA = a.sort_order ?? 9999;
      const orderB = b.sort_order ?? 9999;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title);
    }) as DirectLearnerCatalogPillar[];

  const variants = assignedVariants
    .map((variant) => ({
      id: variant.id,
      title: variant.title,
      code: variant.code,
      master_course_id: variant.master_course_id,
      master_course_title: variant.master_courses?.title ?? null,
      master_course_code: variant.master_courses?.code ?? null,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const bundles = assignedBundles
    .map((bundle) => ({
      id: bundle.id,
      title: bundle.title,
      code: bundle.code,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return {
    master_courses: masterCourses,
    variants,
    bundles,
  };
}

export async function DirectLearnerAccessSection({ collegeId }: { collegeId: string }) {
  const catalog = await loadDirectLearnerCatalog(collegeId);

  return (
    <DirectLearnerAccessManager
      collegeId={collegeId}
      catalog={catalog}
    />
  );
}
