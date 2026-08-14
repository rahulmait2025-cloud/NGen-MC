import { Suspense } from 'react';
import { headers } from 'next/headers';
import { getStudentCodingStats } from '@/lib/actions/coding-stats-actions';
import { CodingPulseDashboardClient } from '@/components/student-stats/coding-pulse-dashboard-client';
import { CodingStatsSkeleton } from '@/components/student-stats/coding-stats-skeleton';
import { StatsOnboardingEmptyState } from '@/components/student-stats/stats-onboarding-empty-state';

async function StudentStatsContent({ loginUrl }: { loginUrl: string }) {
  await headers();
  const statsData = await getStudentCodingStats();

  if (!statsData) {
    return <StatsOnboardingEmptyState loginUrl={loginUrl} />;
  }

  const hasConnectedCodingPlatform =
    statsData.connectionStatus.github.isConnected ||
    !!statsData.connectionStatus.leetcode.username ||
    !!statsData.connectionStatus.codeforces.handle ||
    !!statsData.connectionStatus.gfg.username;

  if (!hasConnectedCodingPlatform) {
    return <StatsOnboardingEmptyState loginUrl={loginUrl} />;
  }

  return <CodingPulseDashboardClient statsData={statsData} />;
}

export default async function StandaloneStudentStatsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <Suspense fallback={<CodingStatsSkeleton />}>
          <StudentStatsContent loginUrl="/login" />
        </Suspense>
      </div>
    </div>
  );
}
