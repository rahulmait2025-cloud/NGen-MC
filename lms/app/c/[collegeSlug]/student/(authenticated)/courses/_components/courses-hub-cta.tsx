'use client';

import { COURSES_HUB_FAQ } from './courses-hub-content';
import { UniversalFinalCtaSection } from '@/components/brand/universal-final-cta-section';
import { UniversalFaqSection } from '@/components/brand/universal-faq-section';

export function CoursesHubCtaAndFaq({
  collegeSlug,
  showBootcamp = false,
}: {
  collegeSlug: string;
  showBootcamp?: boolean;
}) {
  const path = (segment: string) => `/c/${collegeSlug}/student/${segment}`;
  const faq = (
    showBootcamp
      ? COURSES_HUB_FAQ.slice(0, 6)
      : COURSES_HUB_FAQ.filter((item) => item.tag !== 'Bootcamp').slice(0, 6)
  ).map((item) => ({ q: item.q, a: item.a, tag: item.tag }));

  return (
    <>
      <UniversalFinalCtaSection
        collegeSlug={collegeSlug}
        badgeText="Start from your current level"
        heading="Choose one path. Start moving."
        subtext={
          showBootcamp
            ? 'Keep it simple: Free for foundations, Paid for curated depth, Bootcamp for the full software-engineer-ready journey.'
            : 'Keep it simple: Free for foundations, Paid for curated depth.'
        }
        primaryCta={{
          label: showBootcamp ? 'Explore Bootcamp Path' : 'Browse Paid Courses',
          href: showBootcamp ? path('bootcamp') : path('paid-courses'),
        }}
        secondaryCta={{
          label: 'Start Free Courses',
          href: path('free-courses'),
        }}
      />

      <UniversalFaqSection
        eyebrow="FAQ"
        title="Last checks before choosing."
        description="Short answers only. The goal is to remove doubts, not add another section to study."
        items={faq}
      />
    </>
  );
}
