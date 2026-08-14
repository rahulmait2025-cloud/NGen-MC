import {
  getCollegeDashboardStats,
  listStudentsForCollege,
  listAdminsForCollege,
  getCollegeDashboardExtendedData,
} from '@/lib/services/dashboard';
import { listMentorshipSessionsForCollege } from '@/lib/services/mentorship-sessions';
import { CollegeDashboardContent } from '@/components/admin/college-dashboard-content';

export async function CollegeDashboardBody({
  collegeSlug,
  collegeId,
}: {
  collegeSlug: string;
  collegeId: string;
}) {
  const [stats, students, admins, extendedData, mentorshipSessions] = await Promise.all([
    getCollegeDashboardStats(collegeId),
    listStudentsForCollege(collegeId, 12),
    listAdminsForCollege(collegeId, 8),
    getCollegeDashboardExtendedData(collegeId).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[dashboard] getCollegeDashboardExtendedData failed', {
        collegeId,
        error: msg,
      });
      return {
        collegeKpis: null,
        cohortPerformance: [],
        lectureEngagement: null,
        assessmentAnalytics: null,
        placementFunnel: null,
        pendingReviewsCount: 0,
        notifications: [],
        recentActivity: [],
        atRiskStudents: [],
        _error: true,
      };
    }),
    listMentorshipSessionsForCollege(collegeId).catch(() => []),
  ]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const scheduledFuture = mentorshipSessions
    .filter((s) => s.status === 'scheduled' && s.session_date >= todayStr);
  const nextSession = scheduledFuture.length > 0
    ? scheduledFuture.reduce((min, s) =>
        (s.session_date + s.start_time_ist).localeCompare(min.session_date + min.start_time_ist) < 0 ? s : min
      )
    : null;

  const adminBasePath = `/c/${collegeSlug}/admin`;

  const snapshot = {
    collegeId,
    studentsCount: stats.studentsCount,
    adminsCount: stats.adminsCount,
    students,
    admins,
  };

  return (
    <CollegeDashboardContent
      snapshot={snapshot}
      extendedData={extendedData}
      adminBasePath={adminBasePath}
      nextMentorshipSession={nextSession}
    />
  );
}
