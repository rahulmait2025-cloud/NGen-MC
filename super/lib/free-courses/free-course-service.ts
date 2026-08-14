import 'server-only';

import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createModule } from '@/lib/services/master-course-structure';
import type {
  MasterCoursesRow,
  MasterCourseModulesRow,
  MasterCourseItemsRow,
  MasterCoursePublishStatus,
  MasterCourseKind,
  VideoAssetsRow,
} from '@/types/database';
import type {
  CreateFreeCourseInput,
  UpdateFreeCourseBasicsInput,
} from '@/lib/validation/free-course';

// --- Types --------------------------------------------------------------------

export interface FreeCourseListItem {
  id: string;
  code: string;
  title: string;
  slug: string | null;
  publish_status: MasterCoursePublishStatus;
  visible_to_college_admins: boolean;
  visible_to_college_students: boolean;
  visible_to_global_students: boolean;
  module_count: number;
  lesson_count: number;
  youtube_lesson_count: number;
  tpstreams_lesson_count: number;
  updated_at: string;
  thumbnail_url: string | null;
}

export interface FreeCourseBuilderData {
  course: MasterCoursesRow;
  modules: MasterCourseModulesRow[];
  items: MasterCourseItemsRow[];
  videoAssetsByItemId: Record<string, VideoAssetsRow>;
  stats: {
    module_count: number;
    lesson_count: number;
    youtube_lesson_count: number;
    tpstreams_lesson_count: number;
  };
}

// --- Helpers ------------------------------------------------------------------

function deriveCourseCodeFromTitle(title: string): string {
  const compact = title.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const base = compact.length >= 2 ? compact.slice(0, 40) : 'FREE';
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FREE-${base}-${suffix}`;
}

function deriveSlugFromTitle(title: string): string {
  const safe = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (safe.length >= 2) return safe.slice(0, 100);
  if (safe.length === 1) return `${safe}${safe}`;
  return 'free-course';
}

async function assertFreeCourse(courseId: string): Promise<MasterCoursesRow> {
  const course = await ensureFreeCourse(courseId);
  return course;
}

/** Verifies course exists and is a free course (for server actions). */
export async function ensureFreeCourse(courseId: string): Promise<MasterCoursesRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('master_courses')
    .select('*')
    .eq('id', courseId)
    .eq('course_kind', 'free_course' satisfies MasterCourseKind)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch free course: ${error.message}`);
  }
  if (!data) {
    throw new Error('Free course not found');
  }
  return data;
}

async function assertFreeCoursePage(courseId: string): Promise<MasterCoursesRow> {
  const course = await ensureFreeCourse(courseId).catch(() => null);
  if (!course) notFound();
  return course;
}

function countItemsBySource(items: { video_source?: string | null }[]) {
  let youtube = 0;
  let tpstreams = 0;
  for (const item of items) {
    if (item.video_source === 'youtube') youtube += 1;
    else tpstreams += 1;
  }
  return { youtube, tpstreams };
}

// --- Service ------------------------------------------------------------------

export async function listFreeCourses(): Promise<FreeCourseListItem[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('master_courses')
    .select(`
      id,
      code,
      title,
      slug,
      publish_status,
      visible_to_college_admins,
      visible_to_college_students,
      visible_to_global_students,
      updated_at,
      metadata,
      master_course_modules (
        id,
        master_course_items (
          id,
          video_source,
          youtube_thumbnail_url,
          youtube_position,
          sort_order
        )
      )
    `)
    .eq('course_kind', 'free_course')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list free courses: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const modules = (row.master_course_modules ?? []) as {
      id: string;
      master_course_items?: {
        id: string;
        video_source?: string | null;
        youtube_thumbnail_url?: string | null;
        youtube_position?: number | null;
        sort_order?: number | null;
      }[];
    }[];
    const items = modules.flatMap((m) => m.master_course_items ?? []);
    const { youtube, tpstreams } = countItemsBySource(items);
    const thumbnail_url = getFreeCourseThumbnailUrl(
      { metadata: row.metadata } as MasterCoursesRow,
      items as ThumbnailItemRef[],
    );
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      slug: row.slug,
      publish_status: row.publish_status,
      visible_to_college_admins: row.visible_to_college_admins,
      visible_to_college_students: row.visible_to_college_students,
      visible_to_global_students: row.visible_to_global_students,
      module_count: modules.length,
      lesson_count: items.length,
      youtube_lesson_count: youtube,
      tpstreams_lesson_count: tpstreams,
      updated_at: row.updated_at,
      thumbnail_url,
    };
  });
}

export async function createFreeCourse(
  input: CreateFreeCourseInput,
  createdBy?: string | null,
): Promise<MasterCoursesRow> {
  const admin = createAdminClient();
  const code = deriveCourseCodeFromTitle(input.title);
  const slug = deriveSlugFromTitle(input.title);

  const metadata: Record<string, unknown> = {};
  const thumbnailUrl = input.thumbnail_url?.trim();
  if (thumbnailUrl) {
    metadata.thumbnail_url = thumbnailUrl;
  }

  const { data: course, error: insertError } = await admin
    .from('master_courses')
    .insert({
      pillar_id: null,
      code,
      title: input.title,
      slug,
      description: input.description?.trim() || null,
      short_description: input.short_description?.trim() || null,
      course_kind: 'free_course',
      publish_status: 'draft',
      pricing_model: 'free',
      is_free: true,
      is_invite_only: false,
      visible_to_college_admins: input.visible_to_college_admins ?? false,
      visible_to_college_students: input.visible_to_college_students ?? true,
      visible_to_global_students: input.visible_to_global_students ?? true,
      modules: [],
      tp_folder_status: 'pending',
      metadata: metadata as MasterCoursesRow['metadata'],
      created_by: createdBy ?? null,
    })
    .select('*')
    .single();

  if (insertError || !course) {
    throw new Error(`Failed to create free course: ${insertError?.message ?? 'No data returned'}`);
  }

  await createModule({
    master_course_id: course.id,
    title: 'Lessons',
    sort_order: 1,
    publish_status: 'draft',
  });

  return course;
}

export async function getFreeCourseBuilder(courseId: string): Promise<FreeCourseBuilderData> {
  const course = await assertFreeCoursePage(courseId);
  const admin = createAdminClient();

  const [modulesResult, itemsResult] = await Promise.all([
    admin
      .from('master_course_modules')
      .select('*')
      .eq('master_course_id', courseId)
      .order('sort_order', { ascending: true }),
    admin
      .from('master_course_items')
      .select('*')
      .eq('master_course_id', courseId)
      .order('sort_order', { ascending: true }),
  ]);

  if (modulesResult.error) {
    throw new Error(`Failed to load modules: ${modulesResult.error.message}`);
  }
  if (itemsResult.error) {
    throw new Error(`Failed to load items: ${itemsResult.error.message}`);
  }

  const modules = modulesResult.data ?? [];
  const items = itemsResult.data ?? [];
  const { youtube, tpstreams } = countItemsBySource(items);

  const assetIds = items
    .map((item) => item.video_asset_id)
    .filter((id): id is string => Boolean(id));

  const videoAssetsByItemId: Record<string, VideoAssetsRow> = {};
  if (assetIds.length > 0) {
    const { data: assets, error: assetsError } = await admin
      .from('video_assets')
      .select('*')
      .in('id', assetIds);

    if (assetsError) {
      throw new Error(`Failed to load video assets: ${assetsError.message}`);
    }

    const assetById = new Map((assets ?? []).map((a) => [a.id, a as VideoAssetsRow]));
    for (const item of items) {
      if (item.video_asset_id) {
        const asset = assetById.get(item.video_asset_id);
        if (asset) {
          videoAssetsByItemId[item.id] = asset;
        }
      }
    }
  }

  return {
    course,
    modules,
    items,
    videoAssetsByItemId,
    stats: {
      module_count: modules.length,
      lesson_count: items.length,
      youtube_lesson_count: youtube,
      tpstreams_lesson_count: tpstreams,
    },
  };
}

export async function updateFreeCourseBasics(
  courseId: string,
  input: UpdateFreeCourseBasicsInput,
): Promise<MasterCoursesRow> {
  await assertFreeCourse(courseId);
  const admin = createAdminClient();

  const existing = await admin
    .from('master_courses')
    .select('metadata')
    .eq('id', courseId)
    .single();

  const metadata = {
    ...((existing.data?.metadata as Record<string, unknown>) ?? {}),
  };

  if (input.thumbnail_url !== undefined) {
    const url = input.thumbnail_url?.trim();
    if (url) {
      metadata.thumbnail_url = url;
    } else {
      delete metadata.thumbnail_url;
    }
  }

  const updatePayload: Record<string, unknown> = {
    metadata,
  };

  if (input.title !== undefined) updatePayload.title = input.title;
  if (input.short_description !== undefined) {
    updatePayload.short_description = input.short_description?.trim() || null;
  }
  if (input.description !== undefined) {
    updatePayload.description = input.description?.trim() || null;
  }
  if (input.visible_to_college_admins !== undefined) {
    updatePayload.visible_to_college_admins = input.visible_to_college_admins;
  }
  if (input.visible_to_college_students !== undefined) {
    updatePayload.visible_to_college_students = input.visible_to_college_students;
  }
  if (input.visible_to_global_students !== undefined) {
    updatePayload.visible_to_global_students = input.visible_to_global_students;
  }

  const { data, error } = await admin
    .from('master_courses')
    .update(updatePayload)
    .eq('id', courseId)
    .eq('course_kind', 'free_course')
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update free course: ${error?.message ?? 'No data returned'}`);
  }

  return data;
}

export async function updateFreeCourseStatus(
  courseId: string,
  status: MasterCoursePublishStatus,
): Promise<MasterCoursesRow> {
  await assertFreeCourse(courseId);
  const admin = createAdminClient();

  if (status === 'published') {
    // Publish all curriculum first. The course is marked published only after
    // every module and video update succeeds, preventing a partially published course.
    const [{ error: modulesError }, { error: itemsError }] = await Promise.all([
      admin
        .from('master_course_modules')
        .update({ publish_status: 'published' })
        .eq('master_course_id', courseId)
        .neq('publish_status', 'published'),
      admin
        .from('master_course_items')
        .update({ publish_status: 'published' })
        .eq('master_course_id', courseId)
        .neq('publish_status', 'published'),
    ]);

    if (modulesError) {
      throw new Error(`Failed to publish free course modules: ${modulesError.message}`);
    }
    if (itemsError) {
      throw new Error(`Failed to publish free course lessons: ${itemsError.message}`);
    }
  }

  const { data, error } = await admin
    .from('master_courses')
    .update({ publish_status: status })
    .eq('id', courseId)
    .eq('course_kind', 'free_course')
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update free course status: ${error?.message ?? 'No data returned'}`);
  }

  return data;
}

/** Publish every draft/unpublished lesson (and its module) for a free course. */
export async function publishAllFreeCourseLessons(
  courseId: string,
): Promise<{ modulesUpdated: number; lessonsUpdated: number }> {
  await assertFreeCourse(courseId);
  const admin = createAdminClient();

  const { data: modules, error: modulesError } = await admin
    .from('master_course_modules')
    .update({ publish_status: 'published' })
    .eq('master_course_id', courseId)
    .neq('publish_status', 'published')
    .select('id');

  if (modulesError) {
    throw new Error(`Failed to publish modules: ${modulesError.message}`);
  }

  const { data: lessons, error: lessonsError } = await admin
    .from('master_course_items')
    .update({ publish_status: 'published' })
    .eq('master_course_id', courseId)
    .neq('publish_status', 'published')
    .select('id');

  if (lessonsError) {
    throw new Error(`Failed to publish lessons: ${lessonsError.message}`);
  }

  await admin
    .from('master_courses')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', courseId);

  return {
    modulesUpdated: modules?.length ?? 0,
    lessonsUpdated: lessons?.length ?? 0,
  };
}

/**
 * Permanently delete a free course and clean up related access/content.
 * Revokes enrollments, soft-removes TPStreams video assets, then deletes the course row
 * (modules/lessons cascade with the course).
 */
export async function deleteFreeCourse(
  courseId: string,
  actorId: string,
): Promise<{ mode: 'archived' | 'deleted'; message: string }> {
  await ensureFreeCourse(courseId);
  const { deleteCourseSafely } = await import('@/lib/services/master-course-delete');
  const result = await deleteCourseSafely(courseId, actorId);
  return { mode: result.mode, message: result.message };
}

export type ThumbnailItemRef = Pick<
  MasterCourseItemsRow,
  'video_source' | 'youtube_thumbnail_url' | 'youtube_position' | 'sort_order'
>;

/** Super Admin thumbnail: manual URL, then playlist import default, then first YouTube lesson thumb. */
function resolveFreeCourseThumbnailUrl(
  course: MasterCoursesRow,
  items: ThumbnailItemRef[] = [],
): string | null {
  const meta = course.metadata as Record<string, unknown>;
  const manual = meta?.thumbnail_url;
  if (typeof manual === 'string' && manual.trim().length > 0) {
    return manual.trim();
  }

  const playlistThumb = meta?.youtube_playlist_thumbnail_url;
  if (typeof playlistThumb === 'string' && playlistThumb.trim().length > 0) {
    return playlistThumb.trim();
  }

  const youtubeItems = items
    .filter((i) => i.video_source === 'youtube' && i.youtube_thumbnail_url)
    .sort((a, b) => {
      const posA = a.youtube_position ?? a.sort_order ?? 0;
      const posB = b.youtube_position ?? b.sort_order ?? 0;
      return posA - posB;
    });

  const first = youtubeItems[0]?.youtube_thumbnail_url;
  return typeof first === 'string' && first.trim().length > 0 ? first.trim() : null;
}

export function getFreeCourseThumbnailUrl(
  course: MasterCoursesRow,
  items?: ThumbnailItemRef[],
): string | null {
  return resolveFreeCourseThumbnailUrl(course, items ?? []);
}

/** Persist YouTube playlist cover on course when Super Admin has not set a custom thumbnail. */
export async function applyYouTubePlaylistThumbnailIfMissing(
  courseId: string,
  playlistThumbnailUrl: string | null | undefined,
): Promise<void> {
  const url = playlistThumbnailUrl?.trim();
  if (!url) return;

  const admin = createAdminClient();
  const { data: course, error } = await admin
    .from('master_courses')
    .select('metadata')
    .eq('id', courseId)
    .eq('course_kind', 'free_course')
    .maybeSingle();

  if (error || !course) return;

  const metadata = { ...((course.metadata as Record<string, unknown>) ?? {}) };
  const manual = metadata.thumbnail_url;
  if (typeof manual === 'string' && manual.trim().length > 0) return;

  metadata.youtube_playlist_thumbnail_url = url;

  await admin
    .from('master_courses')
    .update({ metadata })
    .eq('id', courseId);
}
