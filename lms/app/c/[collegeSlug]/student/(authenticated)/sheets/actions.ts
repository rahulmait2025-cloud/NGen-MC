'use server';

import { toggleDsaProgress, toggleDsaFavorite, enrollInDsaSheet, unenrollFromDsaSheet } from '@/lib/services/dsa-sheet';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-student-action';

export async function toggleProgress(
  collegeSlug: string,
  problemId: string,
  done: boolean
) {
  const auth = await requireAuth(collegeSlug);
  if (!auth) throw new Error('Unauthorized');
  await toggleDsaProgress(auth.studentId, problemId, done);
  revalidatePath(`/c/${collegeSlug}/student/sheets`, 'layout');
}

export async function toggleFavorite(
  collegeSlug: string,
  problemId: string,
  favorited: boolean
) {
  const auth = await requireAuth(collegeSlug);
  if (!auth) throw new Error('Unauthorized');
  await toggleDsaFavorite(auth.studentId, problemId, favorited);
  revalidatePath(`/c/${collegeSlug}/student/sheets`, 'layout');
}

export async function enrollStudentInSheet(
  collegeSlug: string,
  sheetId: string
) {
  const auth = await requireAuth(collegeSlug);
  if (!auth) throw new Error('Unauthorized');
  await enrollInDsaSheet(auth.studentId, sheetId);
  revalidatePath(`/c/${collegeSlug}/student/sheets`, 'layout');
}

export async function unenrollStudentFromSheet(
  collegeSlug: string,
  sheetId: string
) {
  const auth = await requireAuth(collegeSlug);
  if (!auth) throw new Error('Unauthorized');
  await unenrollFromDsaSheet(auth.studentId, sheetId);
  revalidatePath(`/c/${collegeSlug}/student/sheets`, 'layout');
}
