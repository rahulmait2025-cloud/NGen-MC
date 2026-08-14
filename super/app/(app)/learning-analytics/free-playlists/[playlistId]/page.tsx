import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

import { FreePlaylistDetailSection } from '@/components/learning-analytics/free-playlist-detail-section';
import { LearningAnalyticsShell } from '@/components/learning-analytics/learning-analytics-shell';
import { LearningPageHeader } from '@/components/learning-analytics/learning-page-header';
import { PageTransition, TransitionItem } from '@/components/learning-analytics/page-transition';
import { getFreePlaylistAnalyticsDetail } from '@/lib/superadmin/learning-analytics/services/free-playlists';

export default async function FreePlaylistAnalyticsDetailPage({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}): Promise<ReactNode> {
  const { playlistId } = await params;
  const data = await getFreePlaylistAnalyticsDetail(playlistId);

  if (data.totalEnrollments === 0 && !data.loadError) {
    notFound();
  }

  return (
    <PageTransition>
      <LearningAnalyticsShell>
        <div className="mx-auto w-full min-w-0 max-w-full space-y-8 pb-16 sm:space-y-10 xl:max-w-7xl">
          <TransitionItem>
            <LearningPageHeader
              title="Free Playlist Detail"
              subtitle="Students enrolled in this free YouTube playlist."
              backHref="/learning-analytics"
              backLabel="Back to Learning Analytics"
            />
          </TransitionItem>

          <TransitionItem>
            <FreePlaylistDetailSection data={data} />
          </TransitionItem>
        </div>
      </LearningAnalyticsShell>
    </PageTransition>
  );
}
