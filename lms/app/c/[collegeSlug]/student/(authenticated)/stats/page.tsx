import { Suspense } from 'react';
import { headers } from 'next/headers';
import { getStudentCodingStats } from '@/lib/actions/coding-stats-actions';
import { CodingPulseDashboardClient } from '@/components/student-stats/coding-pulse-dashboard-client';
import { CodingStatsSkeleton } from '@/components/student-stats/coding-stats-skeleton';
import { StatsOnboardingEmptyState } from '@/components/student-stats/stats-onboarding-empty-state';
import { CodingPlatform } from '@/types/student-stats';

interface PageProps {
  params: Promise<{ collegeSlug: string }>;
  searchParams: Promise<{
    year?: string | string[];
    platform?: string | string[];
  }>;
}

async function CollegeStudentStatsContent({
  collegeSlug,
  searchParams,
}: {
  collegeSlug: string;
  searchParams: Promise<{
    year?: string | string[];
    platform?: string | string[];
  }>;
}) {
  await headers();
  const resolvedSearchParams = await searchParams;

  const rawYear = Array.isArray(resolvedSearchParams.year)
    ? resolvedSearchParams.year[0]
    : resolvedSearchParams.year;
  const parsedYear = rawYear && /^\d{4}$/.test(rawYear) ? Number(rawYear) : undefined;

  const rawPlatform = Array.isArray(resolvedSearchParams.platform)
    ? resolvedSearchParams.platform[0]
    : resolvedSearchParams.platform;
  const validPlatforms = ['combined', 'github', 'leetcode', 'codeforces', 'gfg'];
  const parsedPlatform =
    rawPlatform && validPlatforms.includes(rawPlatform)
      ? (rawPlatform as CodingPlatform | 'combined')
      : undefined;

  const statsData = await getStudentCodingStats(parsedYear, parsedPlatform);

  if (!statsData) {
    return <StatsOnboardingEmptyState loginUrl={`/c/${collegeSlug}/login`} />;
  }

  const hasConnectedCodingPlatform =
    statsData.connectionStatus.github.isConnected ||
    !!statsData.connectionStatus.leetcode.username ||
    !!statsData.connectionStatus.codeforces.handle ||
    !!statsData.connectionStatus.gfg.username;

  if (!hasConnectedCodingPlatform) {
    return <StatsOnboardingEmptyState loginUrl={`/c/${collegeSlug}/login`} />;
  }

  return <CodingPulseDashboardClient statsData={statsData} />;
}

export default async function CollegeStudentStatsPage({
  params,
  searchParams,
}: PageProps) {
  const { collegeSlug } = await params;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <Suspense fallback={<CodingStatsSkeleton />}>
        <CollegeStudentStatsContent collegeSlug={collegeSlug} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
