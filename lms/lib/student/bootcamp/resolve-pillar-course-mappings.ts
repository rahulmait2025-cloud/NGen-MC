import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { JOB_READY_BOOTCAMP_SLUG } from '@/lib/student/bootcamp-routes';
import { normUuid } from '@/lib/utils';

export type BootcampPillarCourseMapping = {
  pillarId: string;
  courseId: string;
  sortOrder: number;
};

type MappingRow = {
  pillar_id: string;
  course_id: string;
  sort_order: number | null;
  is_active?: boolean | null;
};

function parseIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object') {
        const obj = entry as Record<string, unknown>;
        if (typeof obj.course_id === 'string') return obj.course_id;
        if (typeof obj.id === 'string') return obj.id;
      }
      return null;
    })
    .filter((id): id is string => !!id);
}

function parseMetadataMappings(metadata: Record<string, unknown>): BootcampPillarCourseMapping[] {
  const results: BootcampPillarCourseMapping[] = [];
  const arrayKeys = [
    'pillar_course_mappings',
    'pillar_courses',
    'connected_courses',
    'course_mappings',
    'courses',
  ] as const;

  for (const key of arrayKeys) {
    const raw = metadata[key];
    if (!Array.isArray(raw)) continue;

    raw.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return;
      const row = entry as Record<string, unknown>;
      const pillarId =
        (typeof row.pillar_id === 'string' && row.pillar_id) ||
        (typeof row.pillarId === 'string' && row.pillarId) ||
        null;
      const courseId =
        (typeof row.course_id === 'string' && row.course_id) ||
        (typeof row.courseId === 'string' && row.courseId) ||
        (typeof row.id === 'string' && row.id) ||
        null;
      if (!pillarId || !courseId) return;
      const sortOrder = Number(row.sort_order ?? row.sortOrder ?? index);
      results.push({
        pillarId,
        courseId,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : index,
      });
    });
  }

  return results;
}

function dedupeMappings(mappings: BootcampPillarCourseMapping[]): BootcampPillarCourseMapping[] {
  const byKey = new Map<string, BootcampPillarCourseMapping>();
  for (const mapping of mappings) {
    const key = `${normUuid(mapping.pillarId)}:${normUuid(mapping.courseId)}`;
    const existing = byKey.get(key);
    if (!existing || mapping.sortOrder < existing.sortOrder) {
      byKey.set(key, mapping);
    }
  }
  return [...byKey.values()];
}

async function loadMappingsFromTable(
  sb: ReturnType<typeof createAdminClient>,
  bootcampId: string,
  pillarIds: string[],
): Promise<BootcampPillarCourseMapping[] | null> {
  if (pillarIds.length === 0) return [];

  const { data, error } = await sb
    .from('bootcamp_pillar_courses')
    .select('pillar_id, course_id, sort_order, is_active')
    .eq('bootcamp_id', bootcampId)
    .in('pillar_id', pillarIds)
    .order('sort_order', { ascending: true });

  if (error) {
    if (error.code === '42P01' || error.message.includes('schema cache')) return null;
    console.warn(`[bootcamp-mappings] bootcamp_pillar_courses query failed: ${error.message}`);
    return null;
  }

  return (data ?? [])
    .filter((row) => row.is_active !== false)
    .map((row: MappingRow) => ({
      pillarId: row.pillar_id,
      courseId: row.course_id,
      sortOrder: row.sort_order ?? 0,
    }));
}

async function loadMappingsFromMasterCourses(
  sb: ReturnType<typeof createAdminClient>,
  pillarIds: string[],
  bootcampId: string,
): Promise<BootcampPillarCourseMapping[]> {
  const pillarIdSet = new Set(pillarIds.map(normUuid));
  const mappings: BootcampPillarCourseMapping[] = [];

  const { data: pillarCourses, error: pillarCoursesError } = await sb
    .from('master_courses')
    .select('id, pillar_id, created_at')
    .in('pillar_id', pillarIds)
    .eq('publish_status', 'published')
    .order('created_at', { ascending: true });

  if (pillarCoursesError) {
    console.warn(`[bootcamp-mappings] pillar courses failed: ${pillarCoursesError.message}`);
  }

  for (const [index, course] of (pillarCourses ?? []).entries()) {
    if (!course.pillar_id || !pillarIdSet.has(normUuid(course.pillar_id))) continue;
    mappings.push({
      pillarId: course.pillar_id,
      courseId: course.id,
      sortOrder: index,
    });
  }

  const { data: bootcampCourses, error: bootcampCoursesError } = await sb
    .from('master_courses')
    .select('id, pillar_id, bootcamp_id, metadata, created_at')
    .eq('bootcamp_id', bootcampId)
    .eq('publish_status', 'published')
    .order('created_at', { ascending: true });

  if (bootcampCoursesError) {
    console.warn(`[bootcamp-mappings] bootcamp courses failed: ${bootcampCoursesError.message}`);
  }

  for (const [index, course] of (bootcampCourses ?? []).entries()) {
    const metadata = (course.metadata ?? {}) as Record<string, unknown>;
    const metadataPillarId =
      (typeof metadata.bootcamp_pillar_id === 'string' && metadata.bootcamp_pillar_id) ||
      (typeof metadata.pillar_id === 'string' && metadata.pillar_id) ||
      (course.pillar_id && pillarIdSet.has(normUuid(course.pillar_id)) ? course.pillar_id : null);

    if (!metadataPillarId || !pillarIdSet.has(normUuid(metadataPillarId))) continue;

    mappings.push({
      pillarId: metadataPillarId,
      courseId: course.id,
      sortOrder: index,
    });
  }

  return mappings;
}

async function loadMappingsFromPillarMetadata(
  sb: ReturnType<typeof createAdminClient>,
  pillarIds: string[],
): Promise<BootcampPillarCourseMapping[]> {
  if (pillarIds.length === 0) return [];

  const { data: pillars } = await sb
    .from('master_course_pillars')
    .select('id, metadata')
    .in('id', pillarIds);

  const mappings: BootcampPillarCourseMapping[] = [];
  for (const pillar of pillars ?? []) {
    const metadata = (pillar.metadata ?? {}) as Record<string, unknown>;
    const courseIds = [
      ...parseIdList(metadata.connectedCourses),
      ...parseIdList(metadata.connected_courses),
      ...parseIdList(metadata.courseIds),
      ...parseIdList(metadata.course_ids),
      ...parseIdList(metadata.courses),
    ];

    courseIds.forEach((courseId, index) => {
      mappings.push({
        pillarId: pillar.id,
        courseId,
        sortOrder: index,
      });
    });
  }

  return mappings;
}

async function resolveBootcampPillarCourseMappingsInner(
  bootcampId: string,
  pillarIds: string[],
  bootcampMetadata: Record<string, unknown>,
): Promise<BootcampPillarCourseMapping[]> {
  const sb = createAdminClient();
  const configuredPillarIds = new Set(pillarIds.map(normUuid));

  const tableMappings = await loadMappingsFromTable(sb, bootcampId, pillarIds);
  if (tableMappings !== null && tableMappings.length > 0) {
    return dedupeMappings(
      tableMappings.filter((m) => configuredPillarIds.has(normUuid(m.pillarId))),
    );
  }

  const merged = dedupeMappings([
    ...parseMetadataMappings(bootcampMetadata),
    ...(await loadMappingsFromPillarMetadata(sb, pillarIds)),
    ...(await loadMappingsFromMasterCourses(sb, pillarIds, bootcampId)),
  ]);

  return merged.filter((m) => configuredPillarIds.has(normUuid(m.pillarId)));
}

async function loadJobReadyBootcampRow() {
  const sb = createAdminClient();
  const { data } = await sb
    .from('bootcamps')
    .select('id, metadata')
    .eq('slug', JOB_READY_BOOTCAMP_SLUG)
    .maybeSingle();
  return data ?? null;
}

export async function resolveBootcampPillarCourseMappings(
  pillarIds: string[],
): Promise<{ bootcampId: string | null; mappings: BootcampPillarCourseMapping[] }> {
  const bootcamp = await loadJobReadyBootcampRow();
  if (!bootcamp?.id || pillarIds.length === 0) {
    return { bootcampId: bootcamp?.id ?? null, mappings: [] };
  }

  const metadata = (bootcamp.metadata ?? {}) as Record<string, unknown>;
  const mappings = await resolveBootcampPillarCourseMappingsInner(
    bootcamp.id,
    pillarIds,
    metadata,
  );

  return { bootcampId: bootcamp.id, mappings };
}

export async function resolveJobReadyBootcampId(): Promise<string | null> {
  const bootcamp = await loadJobReadyBootcampRow();
  return bootcamp?.id ?? null;
}
