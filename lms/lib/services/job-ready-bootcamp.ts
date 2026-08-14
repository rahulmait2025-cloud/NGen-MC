import 'server-only';
import { cache } from 'react';

import { createAdminClient } from '@/lib/supabase/admin';
import { cacheLife, cacheTag } from 'next/cache';
import { getBootcampCatalog, getBootcampPillarCourseIdSet, getPublicBootcampCatalog } from '@/lib/student/bootcamp/get-bootcamp-catalog';
export { getBootcampCatalog, getBootcampPillarCourseIdSet, getPublicBootcampCatalog, getBootcampViewerOverlay } from '@/lib/student/bootcamp/get-bootcamp-catalog';
export type { BootcampCatalog, BootcampCatalogPillar, BootcampCatalogCourse as BootcampCatalogCourseDetail } from '@/lib/student/bootcamp/get-bootcamp-catalog';
import { getActivePricePlansForSource } from '@/lib/services/course-price-plans';
import { isEntitlementActive } from '@/lib/services/access-helpers';
import { normUuid } from '@/lib/utils';
import { JOB_READY_BOOTCAMP_SLUG, JOB_READY_BOOTCAMP_TITLE } from '@/lib/student/bootcamp-routes';
import { isJobReadyBootcampFeatureEnabled } from '@/lib/services/job-ready-bootcamp-feature';
import { localDateTimeToUtc } from '@/lib/time/application-timezone';

export interface BootcampCatalogCourse {
  id: string;
  code: string;
  title: string;
  description: string | null;
  short_description: string | null;
  thumbnail_url: string | null;
  module_count: number;
  video_count: number;
  entitled: boolean;
  progress_percentage: number | null;
  is_free: boolean;
  slug?: string | null;
  isEnrolled?: boolean;
  pricing_model?: string | null;
  course_kind?: string | null;
  status?: string;
  sort_order?: number | null;
}

export interface BootcampPillarWithCourses {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  course_count: number;
  courses: BootcampCatalogCourse[];
}

export interface JobReadyBootcampEnrollment {
  id: string;
  student_id: string;
  college_id: string | null;
  bootcamp_id: string | null;
  status: string;
  valid_from?: string | null;
  valid_until: string | null;
  created_at: string;
}

export interface JobReadyBootcampProduct {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  short_description: string | null;
  thumbnail_url: string | null;
  price_minor: number | null;
  currency: string;
  price_plan_id: string | null;
  validity_days: number | null;
  price_plans: Array<{
    id: string;
    plan_name: string;
    description: string | null;
    validity_days: number | null;
    price_minor: number;
    currency: string;
    is_default: boolean;
    badge_label?: string | null;
  }>;
}

export interface MentorshipSessionRow {
  id: string;
  title: string;
  meeting_url: string;
  session_date: string;
  session_day: string;
  start_time_ist: string;
  end_time_ist: string;
  description: string | null;
  status: string;
}

export async function getJobReadyBootcampProduct(): Promise<JobReadyBootcampProduct | null> {
  const sb = createAdminClient();
  const { data: bootcamp } = await sb
    .from('bootcamps')
    .select('id, slug, title, description, short_description, thumbnail_url, publish_status, lifecycle_status')
    .eq('slug', JOB_READY_BOOTCAMP_SLUG)
    .eq('publish_status', 'published')
    .eq('lifecycle_status', 'active')
    .maybeSingle();

  if (!bootcamp) return null;

  const pricePlans = await getActivePricePlansForSource('job_ready_bootcamp', bootcamp.id);
  const defaultPlan = pricePlans.find((p) => p.is_default) ?? pricePlans[0] ?? null;

  return {
    id: bootcamp.id,
    slug: bootcamp.slug,
    title: bootcamp.title,
    description: bootcamp.description,
    short_description: bootcamp.short_description,
    thumbnail_url: bootcamp.thumbnail_url,
    price_minor: defaultPlan?.price_minor ?? null,
    currency: defaultPlan?.currency ?? 'INR',
    price_plan_id: defaultPlan?.id ?? null,
    validity_days: defaultPlan?.validity_days ?? null,
    price_plans: pricePlans.map((p) => ({
      id: p.id,
      plan_name: p.plan_name,
      description: p.description,
      validity_days: p.validity_days,
      price_minor: p.price_minor,
      currency: p.currency,
      is_default: p.is_default,
      badge_label: p.badge_label ?? null,
    })),
  };
}

async function getActiveJobReadyBootcampEnrollment(
  studentId: string,
  collegeId?: string | null,
): Promise<JobReadyBootcampEnrollment | null> {
  const sb = createAdminClient();
  let query = sb
    .from('job_ready_bootcamp_enrollments')
    .select('id, student_id, college_id, bootcamp_id, status, valid_from, valid_until, created_at')
    .eq('student_id', studentId)
    .eq('status', 'active');

  if (collegeId) {
    query = query.or(`college_id.is.null,college_id.eq.${collegeId}`);
  }

  const { data } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  if (!isEntitlementActive({ status: data.status, valid_from: data.valid_from, valid_until: data.valid_until })) return null;
  return data as JobReadyBootcampEnrollment;
}

async function _isStudentEnrolledInJobReadyBootcampCached(
  studentId: string,
  collegeId: string | null,
): Promise<boolean> {
  'use cache';
  cacheLife('weeks');
  cacheTag('entitlements', `student-bootcamp-enrollment-${studentId}`);
  const enrollment = await getActiveJobReadyBootcampEnrollment(studentId, collegeId);
  return !!enrollment;
}

export async function isStudentEnrolledInJobReadyBootcamp(
  studentId: string,
  collegeId?: string | null,
): Promise<boolean> {
  return _isStudentEnrolledInJobReadyBootcampCached(studentId, collegeId ?? null);
}

export async function hasExpiredJobReadyBootcampEnrollment(
  studentId: string,
  collegeId?: string | null,
): Promise<boolean> {
  if (await isStudentEnrolledInJobReadyBootcamp(studentId, collegeId)) return false;

  const sb = createAdminClient();
  let query = sb
    .from('job_ready_bootcamp_enrollments')
    .select('status, valid_from, valid_until')
    .eq('student_id', studentId);

  if (collegeId) {
    query = query.or(`college_id.is.null,college_id.eq.${collegeId}`);
  }

  const { data } = await query.limit(5);
  return (data ?? []).some((row) => !isEntitlementActive(row));
}

async function isBootcampPillarCourse(courseId: string): Promise<boolean> {
  const ids = await getBootcampPillarCourseIdSet();
  return ids.has(normUuid(courseId));
}

/**
 * Grants course-player access via Job Ready Bootcamp enrollment.
 *
 * Gated by the `job_ready_bootcamp_enabled` platform feature flag: while the
 * feature is disabled, this returns false for everyone, which blocks the
 * learn player and inclusion-based access checks for bootcamp pillar
 * courses — without touching the underlying enrollment rows. Existing
 * enrollments resume working automatically the moment the flag is
 * re-enabled.
 */
export async function canAccessBootcampCourse(
  studentId: string,
  courseId: string,
  collegeId?: string | null,
): Promise<boolean> {
  if (!(await isJobReadyBootcampFeatureEnabled())) return false;
  const enrolled = await isStudentEnrolledInJobReadyBootcamp(studentId, collegeId);
  if (!enrolled) return false;
  return isBootcampPillarCourse(courseId);
}

function mapCatalogToLegacyPillars(catalog: Awaited<ReturnType<typeof getBootcampCatalog>>): BootcampPillarWithCourses[] {
  return catalog.pillars.map((pillar) => ({
    id: pillar.id,
    title: pillar.title,
    slug: pillar.slug,
    description: pillar.description,
    short_description: pillar.short_description,
    course_count: pillar.courseCount,
    courses: pillar.courses.map((course) => ({
      id: course.id,
      code: course.code,
      title: course.title,
      description: course.description,
      short_description: course.short_description,
      thumbnail_url: course.thumbnail_url,
      module_count: course.module_count,
      video_count: course.video_count,
      entitled: course.entitled,
      progress_percentage: course.progress_percentage,
      is_free: course.is_free,
      slug: course.slug,
      isEnrolled: course.isEnrolled,
      pricing_model: course.pricing_model,
      course_kind: course.course_kind,
      status: course.status,
      sort_order: course.sort_order,
    })),
  }));
}

export async function getBootcampPillarsWithCourses(collegeSlug: string): Promise<BootcampPillarWithCourses[]> {
  const catalog = await getBootcampCatalog(collegeSlug);
  return mapCatalogToLegacyPillars(catalog);
}

export async function getPublicBootcampPillarsWithCourses(collegeSlug: string): Promise<BootcampPillarWithCourses[]> {
  const catalog = await getPublicBootcampCatalog(collegeSlug);
  return mapCatalogToLegacyPillars(catalog);
}

export async function getBootcampPillarBySlug(
  collegeSlug: string,
  pillarSlug: string,
): Promise<BootcampPillarWithCourses | null> {
  const pillars = await getBootcampPillarsWithCourses(collegeSlug);
  return pillars.find((p) => p.slug === pillarSlug) ?? null;
}

export async function getPublicBootcampPillarBySlug(
  collegeSlug: string,
  pillarSlug: string,
): Promise<BootcampPillarWithCourses | null> {
  const pillars = await getPublicBootcampPillarsWithCourses(collegeSlug);
  return pillars.find((p) => p.slug === pillarSlug) ?? null;
}

export async function getBootcampCourseInPillar(
  collegeSlug: string,
  pillarSlug: string,
  courseId: string,
): Promise<{ pillar: BootcampPillarWithCourses; course: BootcampCatalogCourse } | null> {
  const pillar = await getBootcampPillarBySlug(collegeSlug, pillarSlug);
  if (!pillar) return null;
  const course = pillar.courses.find((c) => normUuid(c.id) === normUuid(courseId));
  if (!course) return null;
  return { pillar, course };
}

export async function getPublicBootcampCourseInPillar(
  collegeSlug: string,
  pillarSlug: string,
  courseId: string,
): Promise<{ pillar: BootcampPillarWithCourses; course: BootcampCatalogCourse } | null> {
  const pillar = await getPublicBootcampPillarBySlug(collegeSlug, pillarSlug);
  if (!pillar) return null;
  const course = pillar.courses.find((c) => normUuid(c.id) === normUuid(courseId));
  if (!course) return null;
  return { pillar, course };
}

const istDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getTodayIstDate(): string {
  return istDateFormatter.format(new Date());
}

function getMentorshipSessionEndsAt(sessionDate: string, endTimeIst: string): Date {
  const [hourStr, minuteStr, secondStr] = String(endTimeIst).split(':');
  return localDateTimeToUtc(sessionDate, 'Asia/Kolkata', {
    hour: Number(hourStr) || 0,
    minute: Number(minuteStr) || 0,
    second: Number(secondStr) || 0,
  });
}

function isMentorshipSessionEnded(session: Pick<MentorshipSessionRow, 'session_date' | 'end_time_ist'>): boolean {
  return getMentorshipSessionEndsAt(session.session_date, session.end_time_ist).getTime() < Date.now();
}

export async function listUpcomingMentorshipSessions(limit = 5): Promise<MentorshipSessionRow[]> {
  const sb = createAdminClient();
  const today = getTodayIstDate();
  const { data, error } = await sb
    .from('job_ready_bootcamp_mentorship_sessions')
    .select('id, title, meeting_url, session_date, session_day, start_time_ist, end_time_ist, description, status')
    .eq('status', 'scheduled')
    .gte('session_date', today)
    .order('session_date', { ascending: true })
    .order('start_time_ist', { ascending: true })
    .limit(Math.max(limit * 3, 15));

  if (error) {
    console.warn('[job-ready-bootcamp] listUpcomingMentorshipSessions failed:', error.message, error.code);
    return [];
  }

  return ((data ?? []) as MentorshipSessionRow[])
    .filter((session) => !isMentorshipSessionEnded(session))
    .slice(0, limit);
}

/** Upcoming sessions assigned to a specific student via recipient snapshot. */
export const listUpcomingMentorshipSessionsForStudent = cache(async function listUpcomingMentorshipSessionsForStudent(
  studentId: string,
  limit = 5,
): Promise<MentorshipSessionRow[]> {
  'use cache';
  cacheLife('weeks');
  cacheTag(`mentorship-sessions-${studentId}`);

  const sb = createAdminClient();
  const today = getTodayIstDate();

  const { data: recipientRows, error: recipientError } = await sb
    .from('job_ready_bootcamp_mentorship_recipients')
    .select('session_id')
    .eq('student_id', studentId);

  if (recipientError) {
    console.warn('[job-ready-bootcamp] listUpcomingMentorshipSessionsForStudent recipients failed:', recipientError.message);
    return [];
  }

  const sessionIds = [...new Set((recipientRows ?? []).map((row) => row.session_id as string))];
  if (sessionIds.length === 0) return [];

  const { data, error } = await sb
    .from('job_ready_bootcamp_mentorship_sessions')
    .select('id, title, meeting_url, session_date, session_day, start_time_ist, end_time_ist, description, status')
    .in('id', sessionIds)
    .eq('status', 'scheduled')
    .gte('session_date', today)
    .order('session_date', { ascending: true })
    .order('start_time_ist', { ascending: true })
    .limit(Math.max(limit * 3, 15));

  if (error) {
    console.warn('[job-ready-bootcamp] listUpcomingMentorshipSessionsForStudent failed:', error.message, error.code);
    return [];
  }

  return ((data ?? []) as MentorshipSessionRow[])
    .filter((session) => !isMentorshipSessionEnded(session))
    .slice(0, limit);
});

/** Past scheduled bootcamp mentorship sessions for history UI (query-time, not cron-dependent). */
export const listPastMentorshipSessionsForStudent = cache(async function listPastMentorshipSessionsForStudent(
  studentId: string,
  limit = 20,
): Promise<MentorshipSessionRow[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag(`mentorship-sessions-${studentId}`);

  const sb = createAdminClient();

  const { data: recipientRows, error: recipientError } = await sb
    .from('job_ready_bootcamp_mentorship_recipients')
    .select('session_id')
    .eq('student_id', studentId);

  if (recipientError) {
    console.warn('[job-ready-bootcamp] listPastMentorshipSessionsForStudent recipients failed:', recipientError.message);
    return [];
  }

  const sessionIds = [...new Set((recipientRows ?? []).map((row) => row.session_id as string))];
  if (sessionIds.length === 0) return [];

  const { data, error } = await sb
    .from('job_ready_bootcamp_mentorship_sessions')
    .select('id, title, meeting_url, session_date, session_day, start_time_ist, end_time_ist, description, status')
    .in('id', sessionIds)
    .in('status', ['scheduled', 'completed', 'cancelled'])
    .order('session_date', { ascending: false })
    .order('start_time_ist', { ascending: false })
    .limit(Math.max(limit * 3, 30));

  if (error) {
    console.warn('[job-ready-bootcamp] listPastMentorshipSessionsForStudent failed:', error.message, error.code);
    return [];
  }

  return ((data ?? []) as MentorshipSessionRow[])
    .filter((session) => session.status === 'completed' || session.status === 'cancelled' || isMentorshipSessionEnded(session))
    .slice(0, limit);
});

export function getJobReadyBootcampCardPresentation() {
  return {
    slug: JOB_READY_BOOTCAMP_SLUG,
    title: JOB_READY_BOOTCAMP_TITLE,
    description: 'Complete career readiness program across every pillar in your bootcamp catalog.',
  };
}
