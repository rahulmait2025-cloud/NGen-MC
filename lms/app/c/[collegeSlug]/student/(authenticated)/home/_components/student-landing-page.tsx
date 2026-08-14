import { Suspense } from 'react';
import { StudentAnnouncementBar } from './student-announcement-bar';
import { StudentLandingHero } from './student-landing-hero';
import { TrustStatStrip } from './trust-stat-strip';
import { ContinueLearningSection } from './continue-learning-section';
import { StartJourneySection } from './start-journey-section';
import { CuratedCareerPathsSection } from './curated-career-paths-section';
import { BestCoursesSection } from './best-courses-section';
import { FreeCoursesSection } from './free-courses-section';
import { BenefitsGridSection } from './benefits-grid-section';
import { CuratedBundlesSection } from './curated-bundles-section';
import { BundleCardsSection } from '@/app/c/[collegeSlug]/student/(public)/bundles/_components/bundle-cards-section';
import { LearningFailsSection } from './learning-fails-section';
import { UniversalMentorSection } from '@/components/brand/universal-mentor-section';
import { ComparisonSection } from './comparison-section';
import { FinalCtaSection } from './final-cta-section';
import type { StudentLandingPageData } from './landing-data-types';
import type { YouTubeChannelStats } from '@/lib/youtube/channel-stats';
import type { ActiveAnnouncement } from '@/lib/services/announcements';

interface StudentLandingPageProps {
  collegeSlug: string;
  dataPromise: Promise<StudentLandingPageData>;
  youtubeStatsPromise: Promise<YouTubeChannelStats>;
  announcementPromise: Promise<ActiveAnnouncement | null>;
}

export function StudentLandingPage({
  collegeSlug,
  dataPromise,
  youtubeStatsPromise,
  announcementPromise,
}: StudentLandingPageProps) {
  return (
    <>
      <Suspense fallback={null}>
        <AnnouncementWrapper collegeSlug={collegeSlug} announcementPromise={announcementPromise} />
      </Suspense>
      <main className="relative z-[1] flex flex-col">
        <StudentLandingHero collegeSlug={collegeSlug} />
        
        <Suspense fallback={<div className="h-20 bg-[var(--landing-surface)]/50" />}>
          <TrustStatStrip youtubeStatsPromise={youtubeStatsPromise} />
        </Suspense>

        <Suspense fallback={null}>
          <ContinueLearningSectionWrapper dataPromise={dataPromise} />
        </Suspense>

        <Suspense fallback={<div className="h-40 bg-[var(--landing-surface)]/50" />}>
          <StartJourneySectionWrapper dataPromise={dataPromise} />
        </Suspense>

        <CuratedCareerPathsSection collegeSlug={collegeSlug} />

        <Suspense fallback={<BestCoursesFallback />}>
          <BestCoursesSectionWrapper collegeSlug={collegeSlug} dataPromise={dataPromise} />
        </Suspense>

        <Suspense fallback={<div className="h-[400px] bg-[var(--landing-surface)]/50" />}>
          <FreeCoursesSectionWrapper collegeSlug={collegeSlug} dataPromise={dataPromise} />
        </Suspense>

        <BenefitsGridSection />

        <Suspense fallback={<div className="h-[300px] bg-[var(--landing-surface)]/50" />}>
          <BundleCardsSectionWrapper collegeSlug={collegeSlug} dataPromise={dataPromise} />
        </Suspense>

        <Suspense fallback={<div className="h-[300px] bg-[var(--landing-surface)]/50" />}>
          <CuratedBundlesSectionWrapper collegeSlug={collegeSlug} dataPromise={dataPromise} />
        </Suspense>

        <LearningFailsSection collegeSlug={collegeSlug} />

        <Suspense fallback={<div className="h-60 bg-[var(--landing-surface)]/50" />}>
          <MentorSectionWrapper collegeSlug={collegeSlug} youtubeStatsPromise={youtubeStatsPromise} />
        </Suspense>

        <Suspense fallback={<div className="h-60 bg-[var(--landing-surface)]/50" />}>
          <ComparisonSectionWrapper dataPromise={dataPromise} />
        </Suspense>

        <FinalCtaSection collegeSlug={collegeSlug} />
      </main>
    </>
  );
}

async function ContinueLearningSectionWrapper({ dataPromise }: { dataPromise: Promise<StudentLandingPageData> }) {
  const data = await dataPromise;
  if (!data.continueLearning) return null;
  return <ContinueLearningSection card={data.continueLearning} />;
}

async function StartJourneySectionWrapper({ dataPromise }: { dataPromise: Promise<StudentLandingPageData> }) {
  const data = await dataPromise;
  return <StartJourneySection cards={data.journeyCards} />;
}

async function BestCoursesSectionWrapper({ collegeSlug, dataPromise }: { collegeSlug: string; dataPromise: Promise<StudentLandingPageData> }) {
  const data = await dataPromise;
  return <BestCoursesSection collegeSlug={collegeSlug} courses={data.bestCourseCards} />;
}

function BestCoursesFallback() {
  return (
    <section className="landing-section relative w-full py-10 sm:py-14">
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="h-8 w-64 rounded bg-[var(--landing-surface)] animate-pulse" />
            <div className="h-4 w-80 rounded bg-[var(--landing-surface)] animate-pulse" />
          </div>
        </div>
        <div className="flex gap-6 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[560px] w-[380px] shrink-0 rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)] animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  );
}

async function FreeCoursesSectionWrapper({ collegeSlug, dataPromise }: { collegeSlug: string; dataPromise: Promise<StudentLandingPageData> }) {
  const data = await dataPromise;
  return <FreeCoursesSection collegeSlug={collegeSlug} courses={data.freeCourseCards} />;
}

async function BundleCardsSectionWrapper({ collegeSlug, dataPromise }: { collegeSlug: string; dataPromise: Promise<StudentLandingPageData> }) {
  const data = await dataPromise;
  return (
    <BundleCardsSection
      collegeSlug={collegeSlug}
      bundles={data.catalogBundles}
      viewAllHref={`/c/${collegeSlug}/student/bundles`}
    />
  );
}

async function CuratedBundlesSectionWrapper({ collegeSlug, dataPromise }: { collegeSlug: string; dataPromise: Promise<StudentLandingPageData> }) {
  const data = await dataPromise;
  return (
    <CuratedBundlesSection
      collegeSlug={collegeSlug}
      bundles={data.curatedBundles}
      showJobReadyBootcampCard={data.bootcampFeatureEnabled}
    />
  );
}

async function MentorSectionWrapper({ collegeSlug, youtubeStatsPromise }: { collegeSlug: string; youtubeStatsPromise: Promise<YouTubeChannelStats> }) {
  return <UniversalMentorSection collegeSlug={collegeSlug} youtubeStatsPromise={youtubeStatsPromise} />;
}

async function ComparisonSectionWrapper({ dataPromise }: { dataPromise: Promise<StudentLandingPageData> }) {
  const data = await dataPromise;
  return <ComparisonSection bootcampPillarHref={data.bootcampPillarHref} />;
}

async function AnnouncementWrapper({
  collegeSlug,
  announcementPromise,
}: {
  collegeSlug: string;
  announcementPromise: Promise<ActiveAnnouncement | null>;
}) {
  const announcement = await announcementPromise;
  return <StudentAnnouncementBar collegeSlug={collegeSlug} announcement={announcement} />;
}
