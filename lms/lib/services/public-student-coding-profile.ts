import 'server-only';
import { cache } from 'react';

import { studentUsernameSchema } from '@/lib/profile/student-username';
import { readPublicProfile, toPublicProfileResult } from '@/lib/services/public-profile-reader';
import { CodingPlatform, PublicStudentCodingProfileResult } from '@/types/student-stats';

/**
 * Validates protocol (only http: or https:) and returns canonical string or null.
 */
export function sanitizePublicUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function getPublicStudentCodingStats(
  username: string,
  year?: number,
  platform?: CodingPlatform | 'combined',
): Promise<PublicStudentCodingProfileResult | null> {
  const parsedUsername = studentUsernameSchema.safeParse(username);
  if (!parsedUsername.success) {
    return null;
  }
  const normalizedUsername = parsedUsername.data;

  const profileData = await readPublicProfile(normalizedUsername, year, platform);
  if (!profileData) return null;

  return toPublicProfileResult(profileData);
}

export const getPublicProfileForRender = cache(
  async (username: string, year?: number, platform?: CodingPlatform | 'combined') =>
    getPublicStudentCodingStats(username, year, platform),
);
