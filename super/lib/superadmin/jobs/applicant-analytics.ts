import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStudentLearningAnalytics } from '@/lib/superadmin/learning-analytics/services/student';
import type { LearningAnalyticsStudentResult } from '@/lib/superadmin/learning-analytics/types';

export interface ApplicantLearningSnapshot {
  available: boolean;
  isGlobal: boolean;
  collegeId: string | null;
  studentId: string;
  totals: LearningAnalyticsStudentResult['totals'] | null;
  watchedVideos: LearningAnalyticsStudentResult['watchedVideos'];
  moduleBreakdown: LearningAnalyticsStudentResult['moduleBreakdown'];
  freePlaylistCompletions: number;
  lastActivityAt: string | null;
  analyticsRoute: string | null;
  error: string | null;
}

export async function getApplicantLearningSnapshot(
  studentId: string,
  collegeId: string | null
): Promise<ApplicantLearningSnapshot> {
  const empty: ApplicantLearningSnapshot = {
    available: false,
    isGlobal: !collegeId,
    collegeId,
    studentId,
    totals: null,
    watchedVideos: [],
    moduleBreakdown: [],
    freePlaylistCompletions: 0,
    lastActivityAt: null,
    analyticsRoute: null,
    error: null,
  };

  try {
    const admin = createAdminClient();

    let freePlaylistCompletions = 0;
    try {
      const { count } = await admin
        .from('free_youtube_video_completions')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId);
      freePlaylistCompletions = count ?? 0;
    } catch {
      // Table may not exist
    }

    if (collegeId) {
      try {
        const result = await getStudentLearningAnalytics(collegeId, studentId);

        return {
          available: true,
          isGlobal: false,
          collegeId,
          studentId,
          totals: result.totals,
          watchedVideos: (result.watchedVideos ?? []).slice(0, 10),
          moduleBreakdown: (result.moduleBreakdown ?? []).slice(0, 10),
          freePlaylistCompletions,
          lastActivityAt: result.totals?.lastActivityAt ?? null,
          analyticsRoute: `/learning-analytics/${collegeId}/students/${studentId}`,
          error: null,
        };
      } catch {
        return {
          ...empty,
          freePlaylistCompletions,
          error: 'Could not load college learning analytics.',
        };
      }
    }

    return {
      ...empty,
      freePlaylistCompletions,
      available: freePlaylistCompletions > 0,
    };
  } catch (e) {
    return {
      ...empty,
      error: e instanceof Error ? e.message : 'Failed to load analytics.',
    };
  }
}
