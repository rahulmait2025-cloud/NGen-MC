import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { requireCollegeAdmin } from '@/lib/auth/require-college-admin';
import { guardModulePage } from '@/lib/modules/guard-module-page';
import { AnalyticsContent } from '@/components/admin/analytics-content';
import { Skeleton } from '@/components/ui/skeleton';
import { CollegeInstitutionService } from '@/lib/college-admin/analytics/services/institution';
import { CollegeEngagementService } from '@/lib/college-admin/analytics/services/engagement';
import { CollegeContentUsageService } from '@/lib/college-admin/analytics/services/content';
import { getPlacementReadinessFunnel } from '@/lib/services/placements';

export default async function ActivityPerformancePage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug } = await params;
  const { tenant } = await requireCollegeAdmin(collegeSlug);

  if (!tenant) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-full space-y-4 xl:max-w-7xl">
        <h1 className="text-2xl font-semibold tracking-tight">Performance analytics</h1>
        <p className="text-sm text-muted-foreground">Tenant not found.</p>
      </div>
    );
  }

  const [guard, overview, engagement, lectureCompletion, weeklyPerf, weeklyEngagement, placementFunnel, atRiskDetails, scoreDist, watchMetrics, engagementTiers, dayOfWeekActivity] = await Promise.all([
    guardModulePage(tenant.id, 'analytics'),
    CollegeInstitutionService.getOverview(tenant.id),
    CollegeEngagementService.getStudentEngagement(tenant.id),
    CollegeContentUsageService.getLectureCompletionByCourse(tenant.id),
    CollegeEngagementService.getWeeklyPerformance(tenant.id),
    CollegeEngagementService.getWeeklyEngagement(tenant.id),
    getPlacementReadinessFunnel(tenant.id),
    CollegeEngagementService.getAtRiskDetails(tenant.id),
    CollegeEngagementService.getScoreDistribution(tenant.id),
    CollegeEngagementService.getTotalWatchMetrics(tenant.id),
    CollegeEngagementService.getEngagementTiers(tenant.id),
    CollegeEngagementService.getDayOfWeekActivity(tenant.id),
  ]);

  if (guard.locked) {
    return guard.node;
  }

  const kpis = {
    totalStudents: overview.entitledStudents,
    completionRate: Math.round(engagement.completionRate),
    placementRate: placementFunnel
      ? Math.round((placementFunnel.placed_count / (placementFunnel.total_profiles || 1)) * 100)
      : 0,
    activeCourses: overview.assignedContent,
    atRiskStudents: atRiskDetails.length,
    activeLearners: engagement.activeLearnersCount,
    watchHours: watchMetrics.totalWatchHours,
    avgCompletionPct: Math.round(engagement.completionRate),
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-full xl:max-w-7xl">
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent
          kpis={kpis}
          rawWeeklyPerf={weeklyPerf}
          rawPlacementFunnel={placementFunnel}
          rawLectureCompletion={lectureCompletion}
          rawWeeklyEngagement={weeklyEngagement}
          atRiskDetails={atRiskDetails}
          rawScoreDist={scoreDist}
          watchMetrics={{
            totalWatchHours: watchMetrics.totalWatchHours,
            totalWatchedLectures: watchMetrics.totalWatchedLectures,
            totalCompletedLectures: watchMetrics.totalCompletedLectures,
          }}
          engagementTiers={engagementTiers.map((t) => ({
            tier: t.tier,
            count: t.count,
            percentage: t.percentage,
          }))}
          rawDayOfWeekActivity={dayOfWeekActivity}
        />
      </Suspense>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-10">
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={`kpi-${i}`} className="rounded-[1.25rem] border border-border bg-card p-4 shadow-sm">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-6 w-10" />
          </div>
        ))}
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2 xl:gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`chart-${i}`} className="rounded-[2.5rem] border border-border bg-card p-6 shadow-sm">
            <Skeleton className="h-[220px] w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
