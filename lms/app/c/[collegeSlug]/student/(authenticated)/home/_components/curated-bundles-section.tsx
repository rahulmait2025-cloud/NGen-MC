import {
  BUNDLES_SECTION,
} from './landing-content';
import { buildBundleHref, isCareerReadinessBundle, resolveCareerReadinessBundleHref } from '@/lib/utils/bundle-routes';
import { MAX_DB_CURATED_CARDS, type DiscoverableBundleCard } from '@/lib/services/student-bundles';
import { LandingSectionShell } from './landing-section-shell';
import {
  PremiumCuratedBundleCard,
  type CuratedBundleCardData,
} from '@/components/student/landing/premium-bundle-card';

const CAREER_READINESS_CURATED_CARD: CuratedBundleCardData = {
  id: 'hardcoded-career-readiness',
  title: 'Complete Career Readiness',
  description: 'End-to-end path from fundamentals to interview-ready profile.',
  badgeLabel: 'CAREER TRACK',
  badgeVariant: 'premium',
  includedItems: [
    'DSA + projects roadmap',
    'Resume, GitHub, LinkedIn support',
    'Mock interview practice',
  ],
  availabilityNote: 'Included for eligible students',
  featured: true,
  href: '', // set per collegeSlug at render
  ctaLabel: 'Explore Bundle',
};

function buildCareerReadinessCard(collegeSlug: string): CuratedBundleCardData {
  return {
    ...CAREER_READINESS_CURATED_CARD,
    href: resolveCareerReadinessBundleHref(collegeSlug),
  };
}

function isDuplicateCareerReadinessBundle(bundle: DiscoverableBundleCard): boolean {
  return isCareerReadinessBundle({
    slug: bundle.slug,
    title: bundle.title,
    code: bundle.slug,
  });
}

interface CuratedBundlesSectionProps {
  collegeSlug: string;
  bundles?: DiscoverableBundleCard[];
  /**
   * Resolved `bootcampFeatureEnabled` from the landing data loader
   * (`isJobReadyBootcampFeatureEnabled`). Gates the hardcoded
   * Career Readiness card, which represents the Job Ready Bootcamp.
   */
  showJobReadyBootcampCard?: boolean;
}

const EMPTY_BUNDLES: DiscoverableBundleCard[] = [];

function mapBadgeVariant(
  variant: string | undefined,
  accessLabel: DiscoverableBundleCard['accessLabel'],
): CuratedBundleCardData['badgeVariant'] {
  switch (variant) {
    case 'free':
      return 'free';
    case 'included':
    case 'assigned':
      return 'included';
    case 'premium':
      return 'premium';
    default:
      if (accessLabel === 'Free') return 'free';
      if (accessLabel === 'Included' || accessLabel === 'Assigned') return 'included';
      return 'premium';
  }
}

function mapBundleToCard(
  collegeSlug: string,
  bundle: DiscoverableBundleCard,
): CuratedBundleCardData {
  return {
    id: bundle.id,
    title: bundle.title,
    description: bundle.description,
    badgeLabel: bundle.badgeLabel ?? bundle.accessLabel,
    badgeVariant: mapBadgeVariant(bundle.badgeVariant, bundle.accessLabel),
    includedItems: bundle.highlights ?? [],
    availabilityNote: bundle.footerNote,
    featured: bundle.featured,
    href: buildBundleHref(collegeSlug, bundle.slug),
    ctaLabel: 'Explore Bundle',
  };
}

export function CuratedBundlesSection({
  collegeSlug,
  bundles = EMPTY_BUNDLES,
  showJobReadyBootcampCard = false,
}: CuratedBundlesSectionProps) {
  // Curated section supports 6 total cards: 1 hardcoded Career Readiness + 5 DB curated bundles.
  const eligibleDbBundles = bundles.filter((bundle) => !isDuplicateCareerReadinessBundle(bundle));
  const dbBundles = eligibleDbBundles.slice(0, MAX_DB_CURATED_CARDS);

  const cards: CuratedBundleCardData[] = [
    ...(showJobReadyBootcampCard ? [buildCareerReadinessCard(collegeSlug)] : []),
    ...dbBundles.map((bundle) => mapBundleToCard(collegeSlug, bundle)),
  ];

  // No visible cards means no badge, heading, container, or vertical spacing.
  if (cards.length === 0) return null;

  return (
    <LandingSectionShell className="py-10 sm:py-14">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 p-6 sm:p-8 lg:p-10">

        <div className="mb-6 sm:mb-8 space-y-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--landing-orange)_30%,var(--landing-border))] bg-[color-mix(in_oklab,var(--landing-orange)_10%,var(--landing-card))] px-3.5 py-1 animate-badge-shimmer animate-badge-pulse-glow">
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--landing-orange)] opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-[var(--landing-orange)]"></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--landing-orange)]">
              {BUNDLES_SECTION.label}
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight landing-heading sm:text-3xl lg:text-4xl text-balance">
            Curated Learning Bundles For{' '}
            <span className="hero-highlight-wrap relative inline-block">
              <span className="hero-highlight hero-badge-motion landing-gradient-highlight-orange relative inline-block overflow-hidden">
                {BUNDLES_SECTION.headingHighlight}
              </span>
            </span>
          </h2>
        </div>

        <div className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((bundle) => (
            <PremiumCuratedBundleCard
              key={bundle.id}
              bundle={bundle}
            />
          ))}
        </div>

        {eligibleDbBundles.length > MAX_DB_CURATED_CARDS ? (
          <div className="relative z-10 mt-8 text-center">
            <a
              href={`/c/${encodeURIComponent(collegeSlug)}/student/bundles`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              View all bundles
            </a>
          </div>
        ) : null}
      </div>
    </LandingSectionShell>
  );
}
