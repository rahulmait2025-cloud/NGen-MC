import type { ComponentType } from 'react';
import {
  Users,
  Clock,
  PlayCircle,
  CheckCircle2,
  Video,
  AlertCircle,
  UserCheck,
  UserX,
} from 'lucide-react';
import { BentoCard, BentoCardBody } from '@/components/admin/bento-card';
import { PageTransition, TransitionItem } from '@/components/admin/page-transition';
import { VideoAnalyticsLeaderboard } from '@/components/admin/video-analytics-leaderboard';
import { VideoAnalyticsLeaderboardFilters } from '@/components/admin/video-analytics-leaderboard-filters';
import { VideoAnalyticsDrilldownProvider } from '@/components/admin/video-analytics-drilldown-provider';
import {
  VideoAnalyticsCharts,
  LearningStatusPieChart,
  EngagementTiersChart,
  DayOfWeekActivityChart,
  ContentPieChart,
} from '@/components/admin/video-analytics-charts';
import type {
  CollegeVideoAnalyticsOverview,
  CollegeStudentLeaderboardEntry,
  CollegeVideoAnalyticsFilters,
  CollegeVideoAnalyticsChartData,
} from '@/lib/services/college-video-analytics';

const EMPTY_OVERVIEW: CollegeVideoAnalyticsOverview = {
  totalStudents: 0,
  activeStudents: 0,
  inactiveStudents: 0,
  totalWatchSeconds: 0,
  totalWatchHours: 0,
  totalLecturesWatched: 0,
  totalCompletedLectures: 0,
  averageCompletionPercentage: 0,
};

const EMPTY_APPLIED_FILTERS: CollegeVideoAnalyticsFilters = {};

const EMPTY_CHART_PERIODS = { weekStart: null, month: null };

const EMPTY_COURSE_OPTIONS: Array<{ id: string; title: string }> = [];

const EMPTY_ENGAGEMENT_TIERS: Array<{ tier: string; count: number; percentage: number }> = [];

const EMPTY_DAY_OF_WEEK_ACTIVITY: Array<{ dayLabel: string; activeStudents: number; watchHours: number }> = [];

const EMPTY_LEADERBOARD: CollegeStudentLeaderboardEntry[] = [];

interface OverviewCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  icon: ComponentType<{ className?: string }>;
}

function OverviewCard({ label, value, suffix = '', icon: Icon }: OverviewCardProps) {
  return (
    <div className="min-w-0 rounded-[1.25rem] border border-border bg-card px-4 py-3.5 text-card-foreground shadow-sm transition-shadow duration-200 hover:shadow-md sm:px-5 sm:py-4">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-gradient-orange-soft flex items-center justify-center shrink-0">
          <Icon className="size-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground font-medium truncate">{label}</p>
          <p className="text-xl font-bold text-foreground tabular-nums">
            {value}
            {suffix}
          </p>
        </div>
      </div>
    </div>
  );
}

function hasVideoAnalyticsData(overview: CollegeVideoAnalyticsOverview): boolean {
  return overview.totalWatchHours > 0 || overview.totalLecturesWatched > 0;
}

export interface VideoAnalyticsContentProps {
  overview: CollegeVideoAnalyticsOverview;
  leaderboard: CollegeStudentLeaderboardEntry[];
  appliedFilters?: CollegeVideoAnalyticsFilters;
  chartPeriods?: { weekStart: string | null; month: string | null };
  basePath?: string;
  collegeId?: string;
  chartData?: CollegeVideoAnalyticsChartData;
  courseOptions?: Array<{ id: string; title: string }>;
  engagementTiers?: Array<{ tier: string; count: number; percentage: number }>;
  dayOfWeekActivity?: Array<{ dayLabel: string; activeStudents: number; watchHours: number }>;
  errorMessage?: string | null;
}

export function VideoAnalyticsContent({
  overview = EMPTY_OVERVIEW,
  leaderboard = EMPTY_LEADERBOARD,
  appliedFilters = EMPTY_APPLIED_FILTERS,
  chartPeriods = EMPTY_CHART_PERIODS,
  basePath = '',
  collegeId = '',
  chartData,
  courseOptions = EMPTY_COURSE_OPTIONS,
  engagementTiers = EMPTY_ENGAGEMENT_TIERS,
  dayOfWeekActivity = EMPTY_DAY_OF_WEEK_ACTIVITY,
  errorMessage = null,
}: VideoAnalyticsContentProps) {
  const showEmpty = !errorMessage && !hasVideoAnalyticsData(overview);
  const learningStatus = chartData?.learningStatus ?? [];

  const contentPieData = (() => {
    const total = overview.totalLecturesWatched + overview.totalCompletedLectures;
    return {
      completed: overview.totalCompletedLectures,
      inProgress: Math.max(0, overview.totalLecturesWatched - overview.totalCompletedLectures),
      notStarted: Math.max(0, overview.totalStudents > 0 ? overview.totalStudents - total : 0),
    };
  })();

  if (errorMessage) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-full xl:max-w-7xl">
        <BentoCard>
          <BentoCardBody>
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <AlertCircle className="size-10 text-destructive opacity-80" />
              <p className="text-sm font-semibold text-foreground">Could not load video analytics</p>
              <p className="text-sm text-muted-foreground max-w-md">{errorMessage}</p>
            </div>
          </BentoCardBody>
        </BentoCard>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto w-full min-w-0 max-w-full space-y-10 pb-16 xl:max-w-7xl">
        {showEmpty && (
          <TransitionItem>
            <BentoCard>
              <BentoCardBody>
                <div className="flex items-start gap-3">
                  <Video className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    No video analytics available yet. Analytics will appear once students start watching
                    lectures.
                  </p>
                </div>
              </BentoCardBody>
            </BentoCard>
          </TransitionItem>
        )}

        <TransitionItem>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <OverviewCard label="Total students" value={overview.totalStudents} icon={Users} />
            <OverviewCard
              label="Active learners"
              value={overview.activeStudents}
              icon={UserCheck}
            />
            <OverviewCard
              label="Inactive"
              value={overview.inactiveStudents}
              icon={UserX}
            />
            <OverviewCard
              label="Total hours watched"
              value={overview.totalWatchHours}
              suffix="h"
              icon={Clock}
            />
            <OverviewCard
              label="Lectures watched"
              value={overview.totalLecturesWatched}
              icon={PlayCircle}
            />
            <OverviewCard
              label="Completed lectures"
              value={overview.totalCompletedLectures}
              icon={CheckCircle2}
            />
          </div>
        </TransitionItem>

        {!errorMessage && chartData && basePath ? (
          <VideoAnalyticsCharts
            basePath={basePath}
            appliedFilters={appliedFilters}
            chartPeriods={chartPeriods}
            chartData={chartData}
          />
        ) : null}

        {(learningStatus.length > 0 || engagementTiers.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
            {learningStatus.length > 0 && (
              <TransitionItem>
                <BentoCard>
                  <BentoCardBody>
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-card-foreground">Learning Status</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Student engagement breakdown
                      </p>
                    </div>
                    <LearningStatusPieChart data={learningStatus} />
                  </BentoCardBody>
                </BentoCard>
              </TransitionItem>
            )}
            {engagementTiers.length > 0 && (
              <TransitionItem>
                <BentoCard>
                  <BentoCardBody>
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-card-foreground">Engagement Tiers</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Students classified by total watch time
                      </p>
                    </div>
                    <EngagementTiersChart data={engagementTiers} />
                  </BentoCardBody>
                </BentoCard>
              </TransitionItem>
            )}
          </div>
        )}

        {(dayOfWeekActivity.length > 0 || contentPieData.completed > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
            {dayOfWeekActivity.length > 0 && (
              <TransitionItem>
                <BentoCard>
                  <BentoCardBody>
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-card-foreground">Day-of-Week Activity</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Active students and watch hours by weekday
                      </p>
                    </div>
                    <DayOfWeekActivityChart data={dayOfWeekActivity} />
                  </BentoCardBody>
                </BentoCard>
              </TransitionItem>
            )}
            {contentPieData.completed > 0 && (
              <TransitionItem>
                <BentoCard>
                  <BentoCardBody>
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-card-foreground">Content Summary</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Lectures completed, in progress, and not started
                      </p>
                    </div>
                    <ContentPieChart data={contentPieData} />
                  </BentoCardBody>
                </BentoCard>
              </TransitionItem>
            )}
          </div>
        )}

        {basePath && collegeId ? (
          <VideoAnalyticsDrilldownProvider collegeId={collegeId} appliedFilters={appliedFilters}>
            <TransitionItem>
              <VideoAnalyticsLeaderboardFilters
                basePath={basePath}
                appliedFilters={appliedFilters}
                courseOptions={courseOptions}
              />
            </TransitionItem>
            <TransitionItem>
              <VideoAnalyticsLeaderboard leaderboard={leaderboard} compact />
            </TransitionItem>
          </VideoAnalyticsDrilldownProvider>
        ) : null}
      </div>
    </PageTransition>
  );
}
