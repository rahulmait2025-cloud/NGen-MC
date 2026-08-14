import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type { MasterCoursesRow } from '@/types/database';

export async function getCachedMasterCourse(courseId: string): Promise<MasterCoursesRow | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(`master-course-${courseId}`);

  const sb = createAdminClient();
  const { data, error } = await sb
    .from('master_courses')
    .select('id, created_at, updated_at, code, title, description, short_description, slug, pillar_id, bootcamp_id, is_free, pricing_model, selling_price, currency, publish_status, visible_to_college_students, visible_to_global_students, metadata, course_kind')
    .eq('id', courseId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as MasterCoursesRow;
}

export interface CachedPillar {
  id: string;
  title: string;
  description: string | null;
  short_description: string | null;
  slug: string;
  publish_status: string;
  visible_to_college_students: boolean;
  visible_to_global_students: boolean;
  sort_order: number | null;
}

export async function getCachedPublishedPillars(): Promise<CachedPillar[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('master-course-pillars');

  const sb = createAdminClient();
  const { data, error } = await sb
    .from('master_course_pillars')
    .select('id, title, description, short_description, slug, publish_status, visible_to_college_students, visible_to_global_students, sort_order')
    .eq('publish_status', 'published')
    .order('sort_order', { ascending: true });

  if (error || !data) {
    return [];
  }
  return data as CachedPillar[];
}
