import { studentBasePath } from '@/lib/student/student-home-route';
import { BRAND_SOCIAL_LINKS } from '@/lib/brand/social-links';

export const LANDING_HERO = {
  badge: 'Join 100,000+ Students',
  headingBefore: 'From College Beginner to ',
  headingHighlight: 'Industry Ready.',
  subheading:
    'Master DSA, build real projects, and create a profile that gets recruiters to reach out — all in one structured learning path designed for Indian college students.',
  bullets: [
    'Structured curriculum with clear progression',
    'Real projects that impress recruiters',
    'Profile optimization for maximum visibility',
  ],
  primaryCta: { label: 'Start Your Journey', path: 'courses' },
  secondaryCta: { label: 'Explore Curriculum', path: 'courses' },
} as const;

export const LANDING_TRUST_STATS = [
  { icon: 'users' as const, title: '100K+', label: 'Active Learners', usesYoutubeCount: true },
  { icon: 'rocket' as const, title: '50+', label: 'Courses' },
  { icon: 'brain' as const, title: 'AI-Powered', label: 'Learning Tools' },
  { icon: 'badge' as const, title: 'Industry', label: 'Recognized' },
] as const;

export const LANDING_SOCIAL_LINKS = [
  { label: 'YouTube', href: BRAND_SOCIAL_LINKS.youtube },
  { label: 'Instagram', href: BRAND_SOCIAL_LINKS.instagram },
  { label: 'LinkedIn', href: BRAND_SOCIAL_LINKS.linkedin },
] as const;

export const BEST_COURSES_SECTION = {
  label: 'Premium Content',
  heading: 'Explore Our Best Courses',
  subtext: 'Curated tracks moving continuously — hover to explore and resume learning.',
} as const;

export type BestCourseBadgeVariant =
  | 'popular'
  | 'free'
  | 'career'
  | 'new'
  | 'practice'
  | 'unlocked'
  | 'premium';

export type BestCourseGradient =
  | 'orange'
  | 'purple'
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'rose';

export interface BestCourseItem {
  id: string;
  title: string;
  description: string;
  badges: { label: string; variant: BestCourseBadgeVariant }[];
  tags: string[];
  duration: string;
  language: string;
  ctaLabel: string;
  ctaSegment: 'courses';
  gradient: BestCourseGradient;
}

export const BEST_COURSES: BestCourseItem[] = [];

export const BENEFITS_SECTION = {
  heading: 'Learning Experience Designed For Career Growth',
  headingHighlight: 'Career Growth',
  subtext:
    'Everything students need to move from confusion to career confidence in one structured learning ecosystem.',
} as const;

export type BenefitIconKey =
  | 'video'
  | 'mentor'
  | 'certificate'
  | 'community'
  | 'path'
  | 'notes';

export interface BenefitItem {
  icon: BenefitIconKey;
  title: string;
  description: string;
}

export const BENEFITS: BenefitItem[] = [
  {
    icon: 'video',
    title: 'On-demand video access',
    description: 'Structured lectures you can revisit anytime on your schedule.',
  },
  {
    icon: 'mentor',
    title: 'Mentor-led guidance',
    description: 'Learn inside a mentor-led ecosystem built for real outcomes.',
  },
  {
    icon: 'certificate',
    title: 'Certificate on completion',
    description: 'Earn recognition when you finish eligible learning paths.',
  },
  {
    icon: 'community',
    title: 'Premium community access',
    description: 'Stay motivated with peers on the same career journey.',
  },
  {
    icon: 'path',
    title: 'Structured paths',
    description: 'Follow step-by-step roadmaps instead of scattered content.',
  },
  {
    icon: 'notes',
    title: 'Detailed notes',
    description: 'Revision-friendly notes and references alongside videos.',
  },
];

export const BUNDLES_SECTION = {
  label: 'Value Packs',
  heading: 'Curated Learning Bundles For Maximum Growth',
  headingHighlight: 'Maximum Growth',
} as const;

export type BundleBadgeVariant =
  | 'career'
  | 'interview'
  | 'ai';

export interface BundleItem {
  id: string;
  title: string;
  description: string;
  includedItems: string[];
  badge: { label: string; variant: BundleBadgeVariant };
  availabilityNote: string;
  ctaLabel: string;
  ctaSegment: 'courses';
  featured?: boolean;
}

const _CURATED_BUNDLES: BundleItem[] = [
  {
    id: 'career-readiness',
    title: 'Complete Career Readiness',
    description: 'End-to-end path from fundamentals to interview-ready profile.',
    includedItems: [
      'DSA + projects roadmap',
      'Resume, GitHub, LinkedIn support',
      'Mock interview practice',
    ],
    badge: { label: 'Career Track', variant: 'career' },
    availabilityNote: 'Included for eligible students',
    ctaLabel: 'Explore Bundle',
    ctaSegment: 'courses',
    featured: true,
  },
  {
    id: 'dsa-interview',
    title: 'DSA + Interview Prep',
    description: 'Pattern-based DSA with interview communication practice.',
    includedItems: [
      'DSA patterns curriculum',
      'Problem-solving frameworks',
      'Interview practice modules',
    ],
    badge: { label: 'Interview Prep', variant: 'interview' },
    availabilityNote: 'Structured learning path',
    ctaLabel: 'Explore Bundle',
    ctaSegment: 'courses',
  },
  {
    id: 'ai-starter',
    title: 'AI Developer Starter',
    description: 'Modern AI tooling for developers without losing fundamentals.',
    includedItems: [
      'AI-assisted coding workflows',
      'Responsible tool usage',
      'Career readiness tie-ins',
    ],
    badge: { label: 'AI Starter', variant: 'ai' },
    availabilityNote: 'Structured learning path',
    ctaLabel: 'Explore Bundle',
    ctaSegment: 'courses',
  },
];

export const LEARNING_FAILS_SECTION = {
  heading: 'Why standard learning fails',
  headingHighlight: 'fails',
  subtext:
    'Most students do not fail because they lack effort. They fail because the path is scattered.',
} as const;

export interface LearningFailPoint {
  number: string;
  title: string;
  description: string;
}

export const LEARNING_FAIL_POINTS: LearningFailPoint[] = [
  {
    number: '01',
    title: 'Studying DSA but not recognizing patterns',
    description:
      'Solving problems blindly without pattern frameworks leads to blanking out in real interviews.',
  },
  {
    number: '02',
    title: 'Building basic projects that do not impress recruiters',
    description:
      'Generic todo apps do not show scalable thinking or production-level skills.',
  },
  {
    number: '03',
    title: 'Weak developer profile',
    description:
      'An unstructured resume, quiet GitHub, and unoptimized LinkedIn reduce inbound opportunities.',
  },
  {
    number: '04',
    title: 'Struggling with technical communication',
    description:
      'Knowing answers but failing to explain thought process clearly to interviewers.',
  },
  {
    number: '05',
    title: 'Application ghosting',
    description:
      'Applying widely without profile strength, projects, or a structured outreach strategy.',
  },
];

export const MENTOR_SECTION = {
  label: 'Meet Your Mentor',
  heading: 'Learn directly from CTO Bhaiya',
  headingHighlight: 'CTO Bhaiya',
  bio: 'Learn from a mentor-led ecosystem built for Indian college students. The goal is simple: help you build strong fundamentals, real projects, a credible profile, and interview confidence.',
} as const;

export const MENTOR_TRUST_STATS = [
  { title: '100K+', label: 'YouTube Community', usesYoutubeCount: true },
  { title: 'Built for', label: 'Indian college students' },
  { title: 'Project-first', label: 'Learning' },
] as const;

export const COMPARISON_SECTION = {
  heading: 'Choose the right path for you',
} as const;

export interface ComparisonPath {
  id: 'self-taught' | 'career-readiness';
  title: string;
  subtitle: string;
  recommended?: boolean;
  points: { text: string; positive: boolean }[];
  ctaLabel?: string;
  ctaSegment?: 'courses';
  footerNote?: string;
}

export const COMPARISON_PATHS: ComparisonPath[] = [
  {
    id: 'self-taught',
    title: 'Self-Taught Path',
    subtitle: 'Learning from scattered free resources online.',
    points: [
      { text: 'Scattered content', positive: false },
      { text: 'Basic projects', positive: false },
      { text: 'No structured review', positive: false },
      { text: 'No interview practice', positive: false },
      { text: 'Slow feedback loop', positive: false },
    ],
  },
  {
    id: 'career-readiness',
    title: 'Career Readiness Program',
    subtitle: 'A structured ecosystem for career confidence.',
    recommended: true,
    points: [
      { text: 'Structured roadmap', positive: true },
      { text: 'Real-world projects', positive: true },
      { text: 'Resume / GitHub / LinkedIn support', positive: true },
      { text: 'Mock interviews', positive: true },
      { text: 'Mentorship', positive: true },
      { text: 'Certificate on eligible paths', positive: true },
    ],
    ctaLabel: 'Start Your Journey',
    ctaSegment: 'courses',
    footerNote: 'Build career readiness step by step.',
  },
];

export const FINAL_CTA_SECTION = {
  heading: 'Ready to transform your tech career?',
  subtext:
    'Start with free courses or move into a structured learning journey when you are ready.',
  primaryCta: { label: 'Get Started Now', path: 'courses' },
  secondaryCta: { label: 'View Curriculum', path: 'courses' },
} as const;

export const LANDING_FOOTER_BRAND = {
  name: 'NextGen CTO',
  description:
    'Engineering career confidence for students. Learn, build projects, and grow interview-ready skills in one premium ecosystem.',
} as const;

export interface FooterLinkGroup {
  title: string;
  links: { label: string; segment?: string; href?: string }[];
}

const LANDING_FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  {
    title: 'Learning Paths',
    links: [
      { label: 'Job Ready Bootcamp', segment: 'bootcamp' },
      { label: 'Premium Courses', segment: 'paid-courses' },
      { label: 'Free Learning Library', segment: 'free-courses' },
      { label: 'All Courses Hub', segment: 'courses' },
    ],
  },
  {
    title: 'Ecosystem',
    links: [
      { label: 'My Courses', segment: 'my-courses' },
      { label: 'Jobs Board', segment: 'jobs' },
      { label: 'Mentorship', segment: 'mentorship' },
      { label: 'Campus Ambassador', href: '/campus-ambassador' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Our Team', segment: 'our-team' },
      { label: 'About', href: 'https://nextgen-cto.in/about' },
      { label: 'Support', href: 'mailto:support@nextgen-cto.in' },
      { label: 'Privacy Policy', segment: 'privacy' },
      { label: 'Terms of Service', segment: 'terms' },
      { label: 'Refund Policy', segment: 'refund-policy' },
      { label: 'Cookies', segment: 'cookies' },
    ],
  },
];

export type JourneyCardIcon = 'code' | 'play' | 'user';

export interface JourneyCard {
  icon: JourneyCardIcon;
  title: string;
  description: string;
  path: string;
}

export function buildJourneyCards(collegeSlug: string): JourneyCard[] {
  const base = studentBasePath(collegeSlug);
  return [
    {
      icon: 'code',
      title: 'DSA Basics',
      description: 'Structured patterns and problem-solving foundations.',
      path: `${base}/paid-courses`,
    },
    {
      icon: 'play',
      title: 'Free Courses',
      description: 'Curated YouTube playlists — start learning today.',
      path: `${base}/free-courses`,
    },
    {
      icon: 'user',
      title: 'Profile Building',
      description: 'Resume, GitHub, and LinkedIn readiness.',
      path: `${base}/profile`,
    },
  ];
}

export function resolveCareerPathsHref(
  collegeSlug: string,
  firstPillarSlug?: string | null,
): string {
  const base = studentBasePath(collegeSlug);
  if (firstPillarSlug) {
    return `${base}/pillars/${encodeURIComponent(firstPillarSlug)}`;
  }
  return `${base}/paid-courses`;
}

/** Bootcamp landing: point to the complete bootcamp landing page. */
export function resolveBootcampPillarHref(
  collegeSlug: string,
  _visiblePillarSlugs?: string[],
): string {
  return `${studentBasePath(collegeSlug)}/bootcamp`;
}

export interface LandingNavLink {
  label: string;
  href: string;
  badge?: string;
}


function _buildDesktopNavLinks(collegeSlug: string): LandingNavLink[] {
  const base = studentBasePath(collegeSlug);
  return [
    { label: 'Explore', href: base },
    { label: 'Bootcamp', href: `${base}/bootcamp` },
    { label: 'Paid Courses', href: `${base}/paid-courses` },
    { label: 'Free Courses', href: `${base}/free-courses` },
    { label: 'My Courses', href: `${base}/my-courses` },
  ];
}

export interface LandingMenuGroup {
  title: string;
  links: { label: string; href: string; description?: string }[];
}

function _buildHamburgerMenuGroups(
  collegeSlug: string,
  careerPathsHref: string,
): LandingMenuGroup[] {
  const base = studentBasePath(collegeSlug);
  return [
    {
      title: 'Learning',
      links: [
        { label: 'Career Paths', href: careerPathsHref, description: 'Pillar tracks' },
        { label: 'Premium Courses', href: `${base}/paid-courses`, description: 'Browse paid catalog' },
        { label: 'Free Courses', href: `${base}/free-courses`, description: 'Browse free catalog' },
      ],
    },
    {
      title: 'Career',
      links: [
        { label: 'My Applications', href: `${base}/my-applications` },
        { label: 'Mentorship', href: `${base}/mentorship` },
      ],
    },
    {
      title: 'Insights',
      links: [
        { label: 'Rewards', href: `${base}/rewards` },
        { label: 'Activity', href: `${base}/activity` },
        { label: 'Analytics', href: `${base}/analytics` },
      ],
    },
  ];
}

export function landingHref(collegeSlug: string, segment: string): string {
  return `${studentBasePath(collegeSlug)}/${segment}`;
}

export function courseCtaHref(collegeSlug: string, segment: 'courses'): string {
  return landingHref(collegeSlug, segment);
}

function isExternalFooterHref(href: string): boolean {
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:')
  );
}

export function buildFooterLinks(collegeSlug: string, options?: { showBootcamp?: boolean }) {
  const base = studentBasePath(collegeSlug);
  const showBootcamp = options?.showBootcamp ?? false;
  return LANDING_FOOTER_LINK_GROUPS.map((group) => ({
    title: group.title,
    links: group.links
      .filter((link) => showBootcamp || link.segment !== 'bootcamp')
      .map((link) => {
      const href = link.href ?? `${base}/${link.segment}`;
      return {
        label: link.label,
        href,
        external: isExternalFooterHref(href),
      };
    }),
  }));
}
