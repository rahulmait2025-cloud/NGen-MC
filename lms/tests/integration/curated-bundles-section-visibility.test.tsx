/**
 * Curated Learning Bundles section visibility.
 *
 * The hardcoded "Complete Career Readiness" card represents the Job Ready
 * Bootcamp, so it renders only when the existing bootcamp feature flag
 * (`bootcampFeatureEnabled` from `isJobReadyBootcampFeatureEnabled`) is on.
 * The whole section is hidden when it would have no visible cards.
 */

import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CuratedBundlesSection } from '@/app/c/[collegeSlug]/student/(authenticated)/home/_components/curated-bundles-section';
import type { DiscoverableBundleCard } from '@/lib/services/student-bundles';

vi.mock('next/link', () => ({
  default: function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    className?: string;
    prefetch?: boolean;
  }) {
    const { prefetch: _prefetch, ...anchorProps } = rest;
    return (
      <a href={typeof href === 'string' ? href : '#'} {...anchorProps}>
        {children}
      </a>
    );
  },
}));

const COLLEGE_SLUG = 'nextgen';
const SECTION_HEADING = /Curated Learning Bundles For/i;
const CAREER_READINESS_TITLE = 'Complete Career Readiness';

const ACTIVE_BUNDLE: DiscoverableBundleCard = {
  id: 'bundle-frontend-mastery',
  slug: 'frontend-mastery',
  title: 'Frontend Mastery Bundle',
  description: 'React, Next.js, and system design fundamentals.',
  courseCount: 4,
  priceMinor: 499900,
  currency: 'INR',
  accessLabel: 'Premium',
  highlights: ['React deep dive', 'Next.js App Router'],
  footerNote: 'Lifetime access',
};

describe('CuratedBundlesSection visibility', () => {
  it('Case 1 — flag enabled with active bundles shows section, career card, and bundle cards', () => {
    render(
      <CuratedBundlesSection
        collegeSlug={COLLEGE_SLUG}
        bundles={[ACTIVE_BUNDLE]}
        showJobReadyBootcampCard
      />,
    );

    expect(screen.getByRole('heading', { name: SECTION_HEADING })).toBeInTheDocument();
    expect(screen.getByText('Value Packs')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: CAREER_READINESS_TITLE })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: ACTIVE_BUNDLE.title })).toBeInTheDocument();
  });

  it('Case 2 — flag disabled with active bundles hides only the career card', () => {
    render(
      <CuratedBundlesSection
        collegeSlug={COLLEGE_SLUG}
        bundles={[ACTIVE_BUNDLE]}
        showJobReadyBootcampCard={false}
      />,
    );

    expect(screen.getByRole('heading', { name: SECTION_HEADING })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: ACTIVE_BUNDLE.title })).toBeInTheDocument();
    expect(screen.queryByText(CAREER_READINESS_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText('DSA + projects roadmap')).not.toBeInTheDocument();
    expect(screen.queryByText('Mock interview practice')).not.toBeInTheDocument();
  });

  it('Case 3 — flag enabled with no active bundles still shows section and career card', () => {
    render(
      <CuratedBundlesSection
        collegeSlug={COLLEGE_SLUG}
        bundles={[]}
        showJobReadyBootcampCard
      />,
    );

    expect(screen.getByRole('heading', { name: SECTION_HEADING })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: CAREER_READINESS_TITLE })).toBeInTheDocument();
    expect(screen.getByText('DSA + projects roadmap')).toBeInTheDocument();
    expect(screen.queryByText(ACTIVE_BUNDLE.title)).not.toBeInTheDocument();
  });

  it('Case 4 — flag disabled with no active bundles renders nothing at all', () => {
    const { container } = render(
      <CuratedBundlesSection
        collegeSlug={COLLEGE_SLUG}
        bundles={[]}
        showJobReadyBootcampCard={false}
      />,
    );

    expect(screen.queryByRole('heading', { name: SECTION_HEADING })).not.toBeInTheDocument();
    expect(screen.queryByText('Value Packs')).not.toBeInTheDocument();
    expect(screen.queryByText(CAREER_READINESS_TITLE)).not.toBeInTheDocument();
    // No leftover section container, background, or vertical spacing.
    expect(container).toBeEmptyDOMElement();
  });

  it('defaults to hiding the career card when the bootcamp flag is not provided', () => {
    render(<CuratedBundlesSection collegeSlug={COLLEGE_SLUG} bundles={[ACTIVE_BUNDLE]} />);

    expect(screen.getByRole('heading', { name: ACTIVE_BUNDLE.title })).toBeInTheDocument();
    expect(screen.queryByText(CAREER_READINESS_TITLE)).not.toBeInTheDocument();
  });
});
