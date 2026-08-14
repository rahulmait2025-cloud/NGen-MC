import 'server-only';

import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { batchCourseProgress } from '@/lib/services/batch-course-progress';
import { getStudentAccessibleCourses } from '@/lib/services/course-access-manager';
import { getStudentLearningContext, type StudentLearningContext } from '@/lib/services/student-courses';
import { isEntitlementActive } from '@/lib/services/access-helpers';
import {
  resolveBootcampPillarCourseMappings,
  resolveJobReadyBootcampId,
  type BootcampPillarCourseMapping,
} from '@/lib/student/bootcamp/resolve-pillar-course-mappings';
import { normUuid } from '@/lib/utils';
import { JOB_READY_BOOTCAMP_SLUG } from '@/lib/student/bootcamp-routes';
import type { MasterCoursePillarsRow } from '@/types/database';

const UNCATEGORIZED_SLUGS = new Set(['uncategorized']);

export type BootcampCatalogCourse = {
  id: string;
  code: string;
  title: string;
  slug: string | null;
  description: string | null;
  short_description: string | null;
  thumbnail_url: string | null;
  module_count: number;
  video_count: number;
  is_free: boolean;
  pricing_model: string | null;
  course_kind: string | null;
  status: string;
  isPublished: boolean;
  visibleToStudents: boolean;
  visibleToCollegeStudents: boolean;
  sort_order: number | null;
  isEnrolled: boolean;
  entitled: boolean;
  progress_percentage: number | null;
};

export type BootcampCatalogPillar = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  sortOrder: number | null;
  courseCount: number;
  courses: BootcampCatalogCourse[];
};

export type BootcampCatalog = {
  pillars: BootcampCatalogPillar[];
  totalPillars: number;
  totalCourses: number;
};

export type BootcampViewerOverlay = {
  entitledIds: Set<string>;
  bootcampEnrolled: boolean;
  progressMap: Map<string, { percentage: number }>;
};

const EMPTY_BOOTCAMP_VIEWER_OVERLAY: BootcampViewerOverlay = {
  entitledIds: new Set(),
  bootcampEnrolled: false,
  progressMap: new Map(),
};

function isDirectLearnerSlug(collegeSlug: string): boolean {
  return ['direct-learners', 'direct-learner', 'unknown'].includes(collegeSlug.toLowerCase());
}

function isUncategorizedPillar(pillar: Pick<MasterCoursePillarsRow, 'slug' | 'code' | 'title'>): boolean {
  const slug = pillar.slug?.toLowerCase() ?? '';
  const code = pillar.code?.toLowerCase() ?? '';
  return UNCATEGORIZED_SLUGS.has(slug) || UNCATEGORIZED_SLUGS.has(code) || pillar.title === 'Uncategorized';
}

async function resolveConfiguredBootcampPillarIds(sb: ReturnType<typeof createAdminClient>): Promise<string[]> {
  const { data: bootcamp } = await sb
    .from('bootcamps')
    .select('metadata')
    .eq('slug', JOB_READY_BOOTCAMP_SLUG)
    .maybeSingle();

  const metadata = (bootcamp?.metadata ?? {}) as Record<string, unknown>;
  if (Array.isArray(metadata.pillar_ids) && metadata.pillar_ids.length > 0) {
    return metadata.pillar_ids.map((id) => String(id));
  }

  const { data: pillars } = await sb
    .from('master_course_pillars')
    .select('id, slug, code, title, sort_order')
    .eq('publish_status', 'published')
    .order('sort_order', { ascending: true });

  return (pillars ?? []).reduce((acc, pillar) => {
    if (!isUncategorizedPillar(pillar)) acc.push(pillar.id);
    return acc;
  }, [] as string[]);
}

async function loadBootcampPillarRows(
  sb: ReturnType<typeof createAdminClient>,
  configuredPillarIds: string[],
): Promise<MasterCoursePillarsRow[]> {
  if (configuredPillarIds.length === 0) return [];

  const { data: rows } = await sb
    .from('master_course_pillars')
    .select('id, code, title, slug, description, short_description, sort_order, publish_status, visible_to_college_admins, visible_to_college_students, visible_to_global_students, tp_folder_status, tp_folder_uuid, tp_folder_title, tp_last_synced_at, tp_last_error, metadata, created_by, created_at, updated_at')
    .in('id', configuredPillarIds)
    .eq('publish_status', 'published');

  const byId = new Map((rows ?? []).map((row) => [row.id, row as MasterCoursePillarsRow]));
  return configuredPillarIds
    .map((id) => byId.get(id))
    .filter((pillar): pillar is MasterCoursePillarsRow => !!pillar && !isUncategorizedPillar(pillar));
}

function isCourseVisibleInBootcampCatalog(
  course: { visible_to_college_students: boolean | null; visible_to_global_students: boolean | null },
  isGlobal: boolean,
): boolean {
  if (isGlobal) return course.visible_to_global_students !== false;
  return course.visible_to_global_students !== false || course.visible_to_college_students !== false;
}

async function loadCourseStats(courseIds: string[]): Promise<Map<string, { module_count: number; video_count: number }>> {
  if (courseIds.length === 0) return new Map();
  const sb = createAdminClient();
  const { data: stats, error } = await sb
    .from('master_course_delivery_stats')
    .select('master_course_id, module_count, video_count')
    .in('master_course_id', courseIds);

  if (error) {
    console.warn(`[bootcamp-catalog] master_course_delivery_stats failed: ${error.message}`);
    return new Map();
  }

  return new Map(
    (stats ?? []).map((row) => [
      normUuid(row.master_course_id),
      {
        module_count: Number(row.module_count ?? 0),
        video_count: Number(row.video_count ?? 0),
      },
    ]),
  );
}

async function isBootcampEnrolled(studentId: string, collegeId?: string | null): Promise<boolean> {
  const sb = createAdminClient();
  let query = sb
    .from('job_ready_bootcamp_enrollments')
    .select('status, valid_from, valid_until')
    .eq('student_id', studentId)
    .eq('status', 'active');

  if (collegeId) {
    query = query.or(`college_id.is.null,college_id.eq.${collegeId}`);
  }

  const { data } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!data) return false;
  return isEntitlementActive({ status: data.status, valid_from: data.valid_from, valid_until: data.valid_until });
}

function mapCatalogCourse(
  course: Record<string, unknown>,
  mapping: BootcampPillarCourseMapping,
  statsMap: Map<string, { module_count: number; video_count: number }>,
  entitledIds: Set<string>,
  bootcampEnrolled: boolean,
  progressMap: Map<string, { percentage: number }>,
): BootcampCatalogCourse {
  const courseId = normUuid(course.id as string);
  const stats = statsMap.get(courseId) ?? { module_count: 0, video_count: 0 };
  const hasDirectEntitlement = entitledIds.has(courseId);
  const entitled = hasDirectEntitlement || bootcampEnrolled;
  const metadata = (course.metadata ?? {}) as Record<string, unknown>;

  return {
    id: course.id as string,
    code: course.code as string,
    title: course.title as string,
    slug: (course.slug as string | null) ?? null,
    description: course.description as string | null,
    short_description: course.short_description as string | null,
    thumbnail_url: (metadata.thumbnail_url as string | undefined) ?? null,
    module_count: stats.module_count,
    video_count: stats.video_count,
    is_free: !!course.is_free || course.pricing_model === 'free',
    pricing_model: (course.pricing_model as string | null) ?? null,
    course_kind: (course.course_kind as string | null) ?? null,
    status: (course.publish_status as string) ?? 'published',
    isPublished: course.publish_status === 'published',
    visibleToStudents: course.visible_to_global_students !== false,
    visibleToCollegeStudents: course.visible_to_college_students !== false,
    sort_order: mapping.sortOrder,
    isEnrolled: hasDirectEntitlement,
    entitled,
    progress_percentage: entitled ? (progressMap.get(course.id as string)?.percentage ?? 0) : null,
  };
}

function groupMappingsByPillar(mappings: BootcampPillarCourseMapping[]): Map<string, BootcampPillarCourseMapping[]> {
  const grouped = new Map<string, BootcampPillarCourseMapping[]>();
  for (const mapping of mappings) {
    const list = grouped.get(mapping.pillarId) ?? [];
    list.push(mapping);
    grouped.set(mapping.pillarId, list);
  }
  for (const [pillarId, list] of grouped) {
    grouped.set(
      pillarId,
      [...list].sort(
        (a, b) => a.sortOrder - b.sortOrder || normUuid(a.courseId).localeCompare(normUuid(b.courseId)),
      ),
    );
  }
  return grouped;
}

export async function getBootcampViewerOverlay(
  _collegeSlug: string,
  studentContext: StudentLearningContext,
  visibleCourseIds: string[],
): Promise<BootcampViewerOverlay> {
  const entitledAccess = await getStudentAccessibleCourses(studentContext.studentId, {
    isGlobal: studentContext.isGlobal,
    collegeId: studentContext.collegeId,
  });
  const entitledIds = new Set(entitledAccess.map((a) => normUuid(a.master_course_id)));
  const bootcampEnrolled = await isBootcampEnrolled(studentContext.studentId, studentContext.collegeId);
  const progressMap = await batchCourseProgress(
    studentContext.studentId,
    visibleCourseIds.filter((id) => entitledIds.has(normUuid(id)) || bootcampEnrolled),
  );

  return { entitledIds, bootcampEnrolled, progressMap };
}

async function loadBootcampCatalogBase(options: {
  collegeSlug: string;
  isGlobal: boolean;
  viewerContext?: StudentLearningContext;
}): Promise<BootcampCatalog> {
  const sb = createAdminClient();

  const configuredPillarIds = await resolveConfiguredBootcampPillarIds(sb);
  const pillars = await loadBootcampPillarRows(sb, configuredPillarIds);
  if (pillars.length === 0) {
    return { pillars: [], totalPillars: 0, totalCourses: 0 };
  }

  const { mappings } = await resolveBootcampPillarCourseMappings(pillars.map((p) => p.id));
  const mappingsByPillar = groupMappingsByPillar(mappings);
  const uniqueCourseIds = [...new Set(mappings.map((m) => m.courseId))];

  if (uniqueCourseIds.length === 0) {
    return {
      pillars: pillars.map((pillar) => ({
        id: pillar.id,
        title: pillar.title,
        slug: pillar.slug,
        description: pillar.description,
        short_description: pillar.short_description,
        sortOrder: pillar.sort_order ?? null,
        courseCount: 0,
        courses: [],
      })),
      totalPillars: pillars.length,
      totalCourses: 0,
    };
  }

  const { data: courses } = await sb
    .from('master_courses')
    .select(
      'id, pillar_id, code, title, description, short_description, slug, is_free, pricing_model, course_kind, metadata, publish_status, visible_to_college_students, visible_to_global_students, created_at',
    )
    .in('id', uniqueCourseIds)
    .eq('publish_status', 'published');

  const courseById = new Map((courses ?? []).map((course) => [normUuid(course.id), course]));
  const visibleCourseIds = new Set(
    (courses ?? [])
      .filter((course) => isCourseVisibleInBootcampCatalog(course, options.isGlobal))
      .map((course) => normUuid(course.id)),
  );

  const visibleIds = uniqueCourseIds.filter((id) => visibleCourseIds.has(normUuid(id)));
  const [statsMap, viewerOverlay] = await Promise.all([
    loadCourseStats(visibleIds),
    options.viewerContext
      ? getBootcampViewerOverlay(options.collegeSlug, options.viewerContext, visibleIds)
      : Promise.resolve(EMPTY_BOOTCAMP_VIEWER_OVERLAY),
  ]);

  const catalogPillars: BootcampCatalogPillar[] = pillars.map((pillar) => {
    const pillarMappings = (mappingsByPillar.get(pillar.id) ?? []).filter((mapping) =>
      visibleCourseIds.has(normUuid(mapping.courseId)),
    );
    const seenInPillar = new Set<string>();
    const pillarCourses: BootcampCatalogCourse[] = [];

    for (const mapping of pillarMappings) {
      const courseId = normUuid(mapping.courseId);
      if (seenInPillar.has(courseId)) continue;
      const course = courseById.get(courseId);
      if (!course) continue;
      seenInPillar.add(courseId);
      pillarCourses.push(
        mapCatalogCourse(
          course,
          mapping,
          statsMap,
          viewerOverlay.entitledIds,
          viewerOverlay.bootcampEnrolled,
          viewerOverlay.progressMap,
        ),
      );
    }

    return {
      id: pillar.id,
      title: pillar.title,
      slug: pillar.slug,
      description: pillar.description,
      short_description: pillar.short_description,
      sortOrder: pillar.sort_order ?? null,
      courseCount: pillarCourses.length,
      courses: pillarCourses,
    };
  });

  const totalCourses = catalogPillars.reduce((sum, pillar) => sum + pillar.courseCount, 0);

  return {
    pillars: catalogPillars,
    totalPillars: catalogPillars.length,
    totalCourses,
  };
}

/** Public Job Ready Bootcamp catalog without auth, enrollment, or progress dependencies. */
export const getPublicBootcampCatalog = cache(async function getPublicBootcampCatalog(
  collegeSlug: string,
): Promise<BootcampCatalog> {
  return loadBootcampCatalogBase({
    collegeSlug,
    isGlobal: isDirectLearnerSlug(collegeSlug),
  });
});

/**
 * Canonical Job Ready Bootcamp catalog with authenticated viewer overlay.
 * Course counts come from mapping rows (bootcamp_pillar_courses or derived mappings), never pillar metadata counts.
 */
export const getBootcampCatalog = cache(async function getBootcampCatalog(
  collegeSlug: string,
): Promise<BootcampCatalog> {
  const ctx = await getStudentLearningContext(collegeSlug);
  return loadBootcampCatalogBase({
    collegeSlug,
    isGlobal: ctx.isGlobal,
    viewerContext: ctx,
  });
});

/** Published master_course ids from bootcamp pillar-course mappings (for access checks). */
export const getBootcampPillarCourseIdSet = cache(async function getBootcampPillarCourseIdSet(): Promise<Set<string>> {
  const sb = createAdminClient();
  const configuredPillarIds = await resolveConfiguredBootcampPillarIds(sb);
  if (configuredPillarIds.length === 0) return new Set();

  const { mappings } = await resolveBootcampPillarCourseMappings(configuredPillarIds);
  if (mappings.length === 0) return new Set();

  const courseIds = [...new Set(mappings.map((m) => m.courseId))];
  const { data: courses } = await sb
    .from('master_courses')
    .select('id')
    .in('id', courseIds)
    .eq('publish_status', 'published');

  return new Set((courses ?? []).map((c) => normUuid(c.id)));
});

export { resolveJobReadyBootcampId };
