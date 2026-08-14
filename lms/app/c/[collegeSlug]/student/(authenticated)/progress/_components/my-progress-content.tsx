import { ProgressAnalyticsSection } from './progress-analytics-section';
import { ProgressContinueCard } from './progress-continue-card';
import { ProgressCourseList } from './progress-course-list';
import { ProgressSuggestedGoals } from './progress-suggested-goals';
import { ProgressSummaryCards } from './progress-summary-cards';
import type { ProgressPageData } from '../load-progress-data';

interface MyProgressContentProps {
  collegeSlug: string;
  data: ProgressPageData;
}

export function MyProgressContent({ collegeSlug, data }: MyProgressContentProps) {
  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      <ProgressSummaryCards metrics={data.summaryMetrics} />

      {data.continueLearning ? <ProgressContinueCard card={data.continueLearning} /> : null}

      <ProgressSuggestedGoals goals={data.suggestedGoals} programmePct={data.programmePct} />

      <ProgressCourseList courses={data.courses} collegeSlug={collegeSlug} />

      <ProgressAnalyticsSection
        collegeSlug={collegeSlug}
        learningHours={data.learningHours}
        activityDays={data.activityDays}
        hasChartData={data.hasChartData}
      />
    </div>
  );
}
