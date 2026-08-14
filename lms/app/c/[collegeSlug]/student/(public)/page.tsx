import { getOptionalStudentContext } from '@/lib/auth/get-optional-student-context';
import { getTenantBranding } from '@/lib/tenant/get-tenant-branding-server';
import { loadStudentLandingData } from '../(authenticated)/home/load-student-landing-data';
import { StudentLandingPage } from '../(authenticated)/home/_components/student-landing-page';
import { getYouTubeChannelStats } from '@/lib/youtube/channel-stats';
import { getActiveAnnouncement } from '@/lib/services/announcements';

export default async function StudentTenantHomePage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;
  
  const dataPromise = (async () => {
    const ctx = await getOptionalStudentContext(collegeSlug);
    const branding = await getTenantBranding(collegeSlug);
    const collegeId = branding?.id ?? null;
    const isGlobal = ['direct-learners', 'direct-learner', 'unknown'].includes(collegeSlug.toLowerCase());

    return loadStudentLandingData(
      collegeSlug,
      ctx?.studentId ?? null,
      isGlobal,
      isGlobal ? null : collegeId,
      ctx?.user.id ?? null,
    );
  })();

  const youtubeStatsPromise = getYouTubeChannelStats();
  const announcementPromise = getActiveAnnouncement();

  return (
    <StudentLandingPage
      collegeSlug={collegeSlug}
      dataPromise={dataPromise}
      youtubeStatsPromise={youtubeStatsPromise}
      announcementPromise={announcementPromise}
    />
  );
}
