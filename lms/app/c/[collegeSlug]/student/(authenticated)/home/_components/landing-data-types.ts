import type {
  BestCourseGradient,
  BestCourseBadgeVariant,
  JourneyCardIcon,
} from './landing-content';
import type { DiscoverableBundleCard } from '@/lib/services/student-bundles';

export interface LandingCourseCard {
  id: string;
  title: string;
  description: string;
  badges: { label: string; variant: BestCourseBadgeVariant }[];
  tags: string[];
  duration: string;
  language: string;
  ctaLabel: string;
  href: string;
  /** Superadmin-published course thumbnail; falls back to gradient visual when absent. */
  thumbnailUrl?: string | null;
  gradient: BestCourseGradient;
  source: 'discoverable' | 'entitled' | 'static' | 'paid_product';
}

export interface LandingPathCard {
  id: string;
  title: string;
  description: string;
  href: string;
  slug: string;
}

export interface LandingFreeCourseCard {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  videoCount?: number;
  href: string;
  source: 'youtube' | 'static';
  isEnrolled?: boolean;
}

export interface ContinueLearningCard {
  courseTitle: string;
  lessonTitle: string;
  progressPercentage: number | null;
  resumeHref: string;
  lastWatchedAt: string | null;
}

export interface LandingJourneyCard {
  icon: JourneyCardIcon;
  title: string;
  description: string;
  path: string;
}

export interface StudentLandingPageData {
  careerPathsHref: string;
  bootcampPillarHref: string;
  bootcampFeatureEnabled: boolean;
  continueLearning: ContinueLearningCard | null;
  journeyCards: LandingJourneyCard[];
  pathCards: LandingPathCard[];
  bestCourseCards: LandingCourseCard[];
  freeCourseCards: LandingFreeCourseCard[];
  visiblePillarSlugs: string[];
  discoverableBundles: DiscoverableBundleCard[];
  curatedBundles: DiscoverableBundleCard[];
  catalogBundles: DiscoverableBundleCard[];
}
