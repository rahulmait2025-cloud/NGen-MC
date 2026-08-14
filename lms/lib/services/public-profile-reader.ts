import 'server-only';
import { readIdentityByUsername, StudentIdentity } from '@/lib/profile/student-identity-reader';
import { readCodePulseData } from '@/lib/services/code-pulse-reader';
import {
  AvailableYearsByPlatform,
  CodingPlatform,
  CombinedHeatmapDay,
  PublicCodingPlatformLinks,
  PublicStudentCodingProfileResult,
  CodePulseSummaryStats,
} from '@/types/student-stats';
import { sanitizePublicUrl } from '@/lib/services/public-student-coding-profile';

type PublicProfileData = {
  identity: StudentIdentity;
  platformLinks: PublicCodingPlatformLinks;
  summaryStats: CodePulseSummaryStats;
  activitiesMap: Record<string, CombinedHeatmapDay>;
  selectedYear: number;
  selectedPlatform: CodingPlatform | 'combined';
  availableYearsByPlatform: AvailableYearsByPlatform;
  activityYears: number[];
};

export async function readPublicProfile(
  username: string,
  year?: number,
  platform?: CodingPlatform | 'combined',
): Promise<PublicProfileData | null> {
  const identityResult = await readIdentityByUsername(username);
  if (!identityResult) return null;

  const { identity } = identityResult;

  const codePulseData = await readCodePulseData({
    studentId: identity.studentId,
    selectedYear: year,
    selectedPlatform: platform || 'combined',
  });

  if (!codePulseData) return null;

  const { connectionStatus } = codePulseData;

  const githubUsername = connectionStatus.github.username;
  const githubProfileUrl = connectionStatus.github.profileUrl
    ? sanitizePublicUrl(connectionStatus.github.profileUrl)
    : null;

  const platformLinks: PublicCodingPlatformLinks = {
    github: { username: githubUsername, profileUrl: githubProfileUrl },
    leetcode: {
      username: connectionStatus.leetcode.username,
      profileUrl: connectionStatus.leetcode.username
        ? sanitizePublicUrl(`https://leetcode.com/u/${encodeURIComponent(connectionStatus.leetcode.username)}`)
        : null,
    },
    codeforces: {
      handle: connectionStatus.codeforces.handle,
      profileUrl: connectionStatus.codeforces.handle
        ? sanitizePublicUrl(`https://codeforces.com/profile/${encodeURIComponent(connectionStatus.codeforces.handle)}`)
        : null,
    },
    gfg: {
      username: connectionStatus.gfg.username,
      profileUrl: connectionStatus.gfg.username
        ? sanitizePublicUrl(`https://www.geeksforgeeks.org/user/${encodeURIComponent(connectionStatus.gfg.username)}`)
        : null,
    },
    linkedinUrl: sanitizePublicUrl(connectionStatus.linkedin?.url),
    portfolioUrl: null,
    resumeUrl: sanitizePublicUrl(codePulseData.resumeUrl),
  };

  return {
    identity,
    platformLinks,
    summaryStats: codePulseData.summaryStats,
    activitiesMap: codePulseData.activitiesMap,
    selectedYear: codePulseData.selectedYear,
    selectedPlatform: codePulseData.selectedPlatform,
    availableYearsByPlatform: codePulseData.availableYearsByPlatform,
    activityYears: codePulseData.activityYears,
  };
}

export function toPublicProfileResult(
  data: PublicProfileData,
): PublicStudentCodingProfileResult {
  return {
    username: data.identity.username,
    studentName: data.identity.displayName,
    avatarUrl: data.identity.avatarUrl
      ? sanitizePublicUrl(data.identity.avatarUrl)
      : null,
    bio: data.identity.bio,
    platformLinks: data.platformLinks,
    summaryStats: data.summaryStats,
    activitiesMap: data.activitiesMap,
    selectedYear: data.selectedYear,
    selectedPlatform: data.selectedPlatform,
    availableYearsByPlatform: data.availableYearsByPlatform,
    activityYears: data.activityYears,
  };
}
