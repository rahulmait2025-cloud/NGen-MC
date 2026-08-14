import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { readCodePulseData } from '@/lib/services/code-pulse-reader';
import { CodingPlatform, StudentCodingStatsResult } from '@/types/student-stats';

export async function readStudentCodingStats(params: {
  userId: string;
  studentId: string;
  selectedYear?: number;
  selectedPlatform?: CodingPlatform | 'combined';
  identityFallback?: {
    fullName?: string | null;
    avatarUrl?: string | null;
    emailPrefix?: string | null;
    username?: string | null;
  };
}): Promise<StudentCodingStatsResult | null> {
  const codePulseData = await readCodePulseData({
    studentId: params.studentId,
    selectedYear: params.selectedYear,
    selectedPlatform: params.selectedPlatform,
  });

  if (!codePulseData) {
    return null;
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('full_name, avatar_url, username, username_set')
    .eq('id', params.userId)
    .maybeSingle();

  if (profileError) {
    console.error('[coding-stats-read] Profile query error:', profileError.code);
    throw new Error('Database query failed during profile lookup.');
  }

  const studentName =
    profile?.full_name ||
    params.identityFallback?.fullName ||
    (profile?.username ? `@${profile.username}` : (params.identityFallback?.username ? `@${params.identityFallback.username}` : (params.identityFallback?.emailPrefix || 'Student')));

  const avatarUrl =
    profile?.avatar_url ||
    params.identityFallback?.avatarUrl ||
    null;

  const username = profile?.username ?? params.identityFallback?.username ?? null;
  const usernameSet = profile?.username_set === true || (profile?.username && profile.username.trim().length > 0);

  return {
    studentId: codePulseData.studentId,
    studentName,
    avatarUrl,
    username,
    usernameSet,
    bio: codePulseData.bio,
    resumeUrl: codePulseData.resumeUrl,
    connectionStatus: codePulseData.connectionStatus,
    summaryStats: codePulseData.summaryStats,
    activitiesMap: codePulseData.activitiesMap,
    selectedYear: codePulseData.selectedYear,
    selectedPlatform: codePulseData.selectedPlatform,
    availableYearsByPlatform: codePulseData.availableYearsByPlatform,
    activityYears: codePulseData.activityYears,
    syncStatusByPlatform: codePulseData.syncStatusByPlatform,
    isYearFullyCached: codePulseData.isYearFullyCached,
    platformErrors: codePulseData.platformErrors,
    fetchedAt: codePulseData.fetchedAt,
  };
}
