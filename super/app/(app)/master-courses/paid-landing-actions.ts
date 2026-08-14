'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { getMasterCourseById } from '@/lib/services/master-courses';
import {
  ensurePaidCourseLandingMetadata,
  getPaidCourseLandingMetadata,
  upsertPaidCourseLandingMetadata,
  type UpsertPaidCourseLandingInput,
} from '@/lib/services/paid-course-landing-metadata';

export async function getPaidCourseLandingMetadataAction(courseId: string) {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false as const, error: authResult.error };

  const course = await getMasterCourseById(courseId);
  if (!course) return { ok: false as const, error: 'Course not found' };

  const metadata = await ensurePaidCourseLandingMetadata(course);
  return { ok: true as const, data: metadata, course };
}

export async function savePaidCourseLandingMetadataAction(
  courseId: string,
  input: UpsertPaidCourseLandingInput,
) {
  const authResult = await requireAuth();
  if (!authResult.ok) return { ok: false as const, error: authResult.error };

  const course = await getMasterCourseById(courseId);
  if (!course) return { ok: false as const, error: 'Course not found' };

  const saved = await upsertPaidCourseLandingMetadata(course, input);

  revalidatePath('/bootcamps');
  revalidatePath('/paid-course-builder');
  revalidatePath('/master-courses');
  revalidatePath(`/master-courses/${courseId}`);
  if (course.pillar_id) {
    revalidatePath(`/master-courses/pillars/${course.pillar_id}/courses/${courseId}`);
  }
  if (course.bootcamp_id) {
    revalidatePath(`/bootcamps/${course.bootcamp_id}/courses/${courseId}`);
  }

  return { ok: true as const, data: saved };
}

async function _loadPaidCourseLandingMetadataAction(courseId: string) {
  const authResult = await requireAuth();
  if (!authResult.ok) return null;
  return getPaidCourseLandingMetadata(courseId);
}
