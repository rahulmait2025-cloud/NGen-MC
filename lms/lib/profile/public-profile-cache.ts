import { revalidatePath, revalidateTag, updateTag } from 'next/cache';
import { getConfirmedPublicUsernameForUser } from '@/lib/profile/confirmed-public-username';

export const PUBLIC_CODING_PROFILES_CACHE_TAG = 'public-coding-profiles';
export const CODE_PULSE_DATA_CACHE_TAG = 'code-pulse-data';

export function getPublicCodingProfileCacheTag(username: string): string {
  return `public-coding-profile:${username.trim().toLowerCase()}`;
}

export function getCodePulseStudentCacheTag(studentId: string): string {
  return `code-pulse-student:${studentId}`;
}

export function invalidateCodePulseCacheForStudent(studentId: string) {
  const cacheTagStr = getCodePulseStudentCacheTag(studentId);
  updateTag(cacheTagStr);
  revalidateTag(cacheTagStr, 'max');
  revalidateTag(CODE_PULSE_DATA_CACHE_TAG, 'max');
}

export async function invalidateProfileForUser(userId: string) {
  try {
    revalidateTag(CODE_PULSE_DATA_CACHE_TAG, 'max');
    const confirmedUsername = await getConfirmedPublicUsernameForUser(userId);
    if (confirmedUsername) {
      invalidateProfile(confirmedUsername);
    }
  } catch (err) {
    console.error('[public-profile-cache] Failed to invalidate cache:', err);
  }
}

export function invalidateProfile(username: string) {
  const normalized = username.trim().toLowerCase();
  const cacheTagStr = getPublicCodingProfileCacheTag(normalized);

  updateTag(cacheTagStr);
  revalidateTag(cacheTagStr, 'max');
  revalidateTag(PUBLIC_CODING_PROFILES_CACHE_TAG, 'max');
  revalidateTag(CODE_PULSE_DATA_CACHE_TAG, 'max');
  revalidatePath(`/u/${normalized}`);
  revalidatePath('/u/[username]', 'page');
}
