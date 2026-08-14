import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { PaidCourseSourceType } from '@/lib/services/paid-course-catalog';
import { resolvePaidCourseSourceType } from '@/lib/services/paid-course-catalog';
import type { MasterCoursesRow, CourseVariantsRow } from '@/types/database';

export interface PaidCourseLandingFaqInput {
  question: string;
  answer: string;
}

export interface PaidCourseLandingMetadataRow {
  id: string;
  source_type: PaidCourseSourceType;
  source_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  short_description: string | null;
  description: string | null;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  preview_video_url: string | null;
  level: string | null;
  language: string | null;
  category: string | null;
  tags: string[];
  best_for: string[];
  outcomes: string[];
  what_you_will_learn: string[];
  included_features: string[];
  prerequisites: string[];
  faqs: PaidCourseLandingFaqInput[];
  is_published: boolean;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export type UpsertPaidCourseLandingInput = {
  slug?: string;
  title?: string;
  subtitle?: string | null;
  short_description?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  thumbnail_url?: string | null;
  preview_video_url?: string | null;
  level?: string | null;
  language?: string | null;
  category?: string | null;
  tags?: string[];
  best_for?: string[];
  outcomes?: string[];
  what_you_will_learn?: string[];
  included_features?: string[];
  prerequisites?: string[];
  faqs?: PaidCourseLandingFaqInput[];
  is_published?: boolean;
  is_visible?: boolean;
};

function parseJsonArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function parseFaqs(value: unknown): PaidCourseLandingFaqInput[] {
  if (!Array.isArray(value)) return [];
  return value.reduce((acc, item) => {
    const row = item as Record<string, string>;
    const faq = {
      question: row.question ?? row.q ?? '',
      answer: row.answer ?? row.a ?? '',
    };
    if (faq.question.trim() && faq.answer.trim()) acc.push(faq);
    return acc;
  }, [] as PaidCourseLandingFaqInput[]);
}

function mapRow(row: Record<string, unknown>): PaidCourseLandingMetadataRow {
  return {
    id: row.id as string,
    source_type: row.source_type as PaidCourseSourceType,
    source_id: row.source_id as string,
    slug: row.slug as string,
    title: row.title as string,
    subtitle: (row.subtitle as string | null) ?? null,
    short_description: (row.short_description as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    cover_image_url: (row.cover_image_url as string | null) ?? null,
    thumbnail_url: (row.thumbnail_url as string | null) ?? null,
    preview_video_url: (row.preview_video_url as string | null) ?? null,
    level: (row.level as string | null) ?? null,
    language: (row.language as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    tags: parseJsonArray(row.tags),
    best_for: parseJsonArray(row.best_for),
    outcomes: parseJsonArray(row.outcomes),
    what_you_will_learn: parseJsonArray(row.what_you_will_learn),
    included_features: parseJsonArray(row.included_features),
    prerequisites: parseJsonArray(row.prerequisites),
    faqs: parseFaqs(row.faqs),
    is_published: !!row.is_published,
    is_visible: row.is_visible !== false,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function buildLandingDefaultsFromCourse(course: MasterCoursesRow): UpsertPaidCourseLandingInput {
  const metadata = (course.metadata ?? {}) as Record<string, unknown>;
  const landingPage = (metadata.landing_page ?? {}) as Record<string, unknown>;
  const hero = (landingPage.hero ?? {}) as Record<string, string>;

  return {
    slug: course.slug ?? course.id,
    title: course.title,
    subtitle: hero.subtitle ?? null,
    short_description: course.short_description,
    description: course.description,
    cover_image_url: hero.image_url ?? (metadata.cover_image_url as string | undefined) ?? null,
    thumbnail_url: (metadata.thumbnail_url as string | undefined) ?? hero.image_url ?? null,
    preview_video_url: hero.video_url ?? null,
    level: 'Beginner+',
    language: 'Hinglish',
    outcomes: parseJsonArray(landingPage.learning_outcomes),
    what_you_will_learn: parseJsonArray(landingPage.learning_outcomes),
    included_features: [],
    best_for: [],
    prerequisites: [],
    faqs: parseFaqs(landingPage.faq),
    is_published: course.publish_status === 'published',
    is_visible:
      course.catalog_type === 'bootcamp'
      || !!course.bootcamp_id
      || !!course.show_as_paid_course,
  };
}

export async function getPaidCourseLandingMetadata(
  sourceId: string,
  sourceType?: PaidCourseSourceType,
): Promise<PaidCourseLandingMetadataRow | null> {
  const admin = createAdminClient();
  let query = admin
    .from('paid_course_landing_metadata')
    .select('*')
    .eq('source_id', sourceId);
  if (sourceType) {
    query = query.eq('source_type', sourceType);
  }
  const { data, error } = await query.maybeSingle();

  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function ensurePaidCourseLandingMetadata(
  course: MasterCoursesRow,
  sourceTypeOverride?: PaidCourseSourceType,
): Promise<PaidCourseLandingMetadataRow> {
  const sourceType = sourceTypeOverride ?? resolvePaidCourseSourceType(course);
  const existing = await getPaidCourseLandingMetadata(course.id, sourceType);
  if (existing) return existing;

  const admin = createAdminClient();
  const defaults = buildLandingDefaultsFromCourse(course);

  const { data, error } = await admin
    .from('paid_course_landing_metadata')
    .insert({
      source_type: sourceType,
      source_id: course.id,
      slug: defaults.slug ?? course.id,
      title: defaults.title ?? course.title,
      subtitle: defaults.subtitle,
      short_description: defaults.short_description,
      description: defaults.description,
      cover_image_url: defaults.cover_image_url,
      thumbnail_url: defaults.thumbnail_url,
      preview_video_url: defaults.preview_video_url,
      level: defaults.level ?? 'Beginner+',
      language: defaults.language ?? 'Hinglish',
      outcomes: defaults.outcomes ?? [],
      what_you_will_learn: defaults.what_you_will_learn ?? [],
      included_features: defaults.included_features ?? [],
      best_for: defaults.best_for ?? [],
      prerequisites: defaults.prerequisites ?? [],
      faqs: defaults.faqs ?? [],
      is_published: defaults.is_published ?? false,
      is_visible: defaults.is_visible ?? true,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to initialize paid course landing metadata: ${error?.message ?? 'unknown'}`);
  }

  return mapRow(data as Record<string, unknown>);
}

/** Sync publish/visibility flags when a builder or master paid course is published. */
export async function syncPaidCourseLandingPublishState(
  course: MasterCoursesRow,
): Promise<void> {
  const sourceType = resolvePaidCourseSourceType(course);
  const isBuilder = sourceType === 'paid_course_builder';
  const published = course.publish_status === 'published';

  await ensurePaidCourseLandingMetadata(course, sourceType);
  const existing = await getPaidCourseLandingMetadata(course.id, sourceType);
  if (!existing) return;

  const updates: UpsertPaidCourseLandingInput = {};
  if (published && !existing.is_published) {
    updates.is_published = true;
  } else if (!published && existing.is_published) {
    updates.is_published = false;
  }
  if (published && isBuilder && existing.is_visible === false) {
    // Respect explicit admin hide — do not force visible
  } else if (published && isBuilder && existing.is_visible !== true) {
    updates.is_visible = true;
  }

  if (Object.keys(updates).length === 0) return;

  await upsertPaidCourseLandingMetadata(course, updates);
}

/** Ensure landing metadata rows exist for all courses in a Paid Course Builder container. */
export async function repairPaidCourseBuilderLandingMetadata(
  bootcampId: string,
): Promise<number> {
  const admin = createAdminClient();
  const { data: courses, error } = await admin
    .from('master_courses')
    .select('*')
    .eq('bootcamp_id', bootcampId)
    .eq('catalog_type', 'bootcamp');

  if (error || !courses?.length) return 0;

  let repaired = 0;
  const repairResults = await Promise.allSettled(
    (courses as MasterCoursesRow[]).map(async (row) => {
      const existing = await getPaidCourseLandingMetadata(row.id, 'paid_course_builder');
      if (!existing) {
        await ensurePaidCourseLandingMetadata(row, 'paid_course_builder');
        return true;
      }
      if (row.publish_status === 'published' && !existing.is_published) {
        await syncPaidCourseLandingPublishState(row);
        return true;
      }
      return false;
    }),
  );

  for (const r of repairResults) {
    if (r.status === 'fulfilled' && r.value) repaired += 1;
  }
  return repaired;
}

export async function upsertPaidCourseLandingMetadata(
  course: MasterCoursesRow,
  input: UpsertPaidCourseLandingInput,
): Promise<PaidCourseLandingMetadataRow> {
  const admin = createAdminClient();
  const sourceType = resolvePaidCourseSourceType(course);
  const defaults = buildLandingDefaultsFromCourse(course);
  const existing = await ensurePaidCourseLandingMetadata(course, sourceType);

  const normalizedInput: UpsertPaidCourseLandingInput = { ...input };
  if (normalizedInput.slug !== undefined) {
    const slug = normalizedInput.slug?.trim();
    normalizedInput.slug = slug || existing.slug || defaults.slug || course.slug || course.id;
  }
  if (normalizedInput.title !== undefined) {
    const title = normalizedInput.title?.trim();
    normalizedInput.title = title || existing.title || defaults.title || course.title;
  }

  const payload = {
    ...normalizedInput,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from('paid_course_landing_metadata')
    .update(payload)
    .eq('source_type', sourceType)
    .eq('source_id', course.id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to save paid course landing metadata: ${error?.message ?? 'unknown'}`);
  }

  // Keep master_courses.metadata thumbnail in sync for legacy readers
  if (input.thumbnail_url !== undefined || input.cover_image_url !== undefined) {
    const metadata = { ...(course.metadata as Record<string, unknown>) };
    const thumb = input.thumbnail_url ?? input.cover_image_url;
    if (thumb) metadata.thumbnail_url = thumb;
    await admin.from('master_courses').update({ metadata }).eq('id', course.id);
  }

  if (input.short_description !== undefined) {
    await admin.from('master_courses').update({ short_description: input.short_description }).eq('id', course.id);
  }

  return mapRow(data as Record<string, unknown>);
}

function buildLandingDefaultsFromVariant(variant: CourseVariantsRow): UpsertPaidCourseLandingInput {
  return {
    slug: variant.slug ?? variant.id,
    title: variant.title,
    subtitle: null,
    short_description: variant.description,
    description: variant.description,
    level: 'Beginner+',
    language: 'English',
    is_published: variant.publish_status === 'published',
    is_visible: !!variant.show_as_paid_course,
    best_for: [],
    outcomes: [],
    what_you_will_learn: [],
    included_features: [],
    prerequisites: [],
    faqs: [],
  };
}

export async function ensurePaidCourseLandingMetadataForVariant(
  variant: CourseVariantsRow,
): Promise<PaidCourseLandingMetadataRow> {
  const existing = await getPaidCourseLandingMetadata(variant.id, 'course_variant');
  if (existing) return existing;

  const admin = createAdminClient();
  const defaults = buildLandingDefaultsFromVariant(variant);

  const { data, error } = await admin
    .from('paid_course_landing_metadata')
    .insert({
      source_type: 'course_variant',
      source_id: variant.id,
      slug: defaults.slug ?? variant.id,
      title: defaults.title ?? variant.title,
      subtitle: defaults.subtitle,
      short_description: defaults.short_description,
      description: defaults.description,
      level: defaults.level ?? 'Beginner+',
      language: defaults.language ?? 'English',
      outcomes: defaults.outcomes ?? [],
      what_you_will_learn: defaults.what_you_will_learn ?? [],
      included_features: defaults.included_features ?? [],
      best_for: defaults.best_for ?? [],
      prerequisites: defaults.prerequisites ?? [],
      faqs: defaults.faqs ?? [],
      is_published: defaults.is_published ?? false,
      is_visible: defaults.is_visible ?? true,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to initialize variant landing metadata: ${error?.message ?? 'unknown'}`);
  }

  return mapRow(data as Record<string, unknown>);
}

export async function upsertPaidCourseLandingMetadataForVariant(
  variant: CourseVariantsRow,
  input: UpsertPaidCourseLandingInput,
): Promise<PaidCourseLandingMetadataRow> {
  const admin = createAdminClient();
  const defaults = buildLandingDefaultsFromVariant(variant);
  const existing = await ensurePaidCourseLandingMetadataForVariant(variant);

  const normalizedInput: UpsertPaidCourseLandingInput = { ...input };
  if (normalizedInput.slug !== undefined) {
    const slug = normalizedInput.slug?.trim();
    normalizedInput.slug = slug || existing.slug || defaults.slug || variant.slug || variant.id;
  }
  if (normalizedInput.title !== undefined) {
    const title = normalizedInput.title?.trim();
    normalizedInput.title = title || existing.title || defaults.title || variant.title;
  }

  const payload = {
    ...normalizedInput,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from('paid_course_landing_metadata')
    .update(payload)
    .eq('source_type', 'course_variant')
    .eq('source_id', variant.id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to save variant landing metadata: ${error?.message ?? 'unknown'}`);
  }

  return mapRow(data as Record<string, unknown>);
}

async function _listPaidCoursesForAssignment(): Promise<
  Array<MasterCoursesRow & { landing_title: string; source_label: string }>
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('master_courses')
    .select('*')
    .eq('publish_status', 'published')
    .or('show_as_paid_course.eq.true,catalog_type.eq.bootcamp,bootcamp_id.not.is.null');

  if (error) throw new Error(error.message);

  return (data ?? []).map((course) => {
    const row = course as MasterCoursesRow;
    const isBuilder = row.catalog_type === 'bootcamp' || !!row.bootcamp_id;
    return {
      ...row,
      landing_title: row.title,
      source_label: isBuilder ? 'Paid Course Builder' : 'Master Paid Course',
    };
  });
}
