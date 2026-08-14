'use client';

import { UniversalFinalCtaSection } from '@/components/brand/universal-final-cta-section';

interface FinalCtaSectionProps {
  collegeSlug: string;
}

export function FinalCtaSection({ collegeSlug }: FinalCtaSectionProps) {
  return (
    <UniversalFinalCtaSection
      collegeSlug={collegeSlug}
      badgeText="Limited Seats Open"
      heading="Ready to transform your tech career?"
      subtext="Start with free courses or move into a structured learning journey when you are ready."
      primaryCta={{
        label: 'Get Started Now',
        href: `/c/${collegeSlug}/student/courses`,
      }}
      secondaryCta={{
        label: 'View Curriculum',
        href: `/c/${collegeSlug}/student/courses`,
      }}
    />
  );
}
