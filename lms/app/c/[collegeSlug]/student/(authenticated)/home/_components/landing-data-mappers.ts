import type { YouTubeCourse } from '@/lib/actions/youtube';
import type { GlobalDiscoverableCourse } from '@/lib/services/student-discoverable-catalog';
import type { GlobalDiscoverablePillarGroup } from '@/lib/services/global-courses';
import type {
  EntitledCourseListItem,
  EntitledPillarGroup,
} from '@/lib/services/student-courses';
import type { MasterCoursePillarsRow } from '@/types/database';
import type { ExplorePaidProductCard } from '../load-explore-paid-products';
import {
  buildLearnHref,
} from '@/lib/utils/variant-learn-url';
import {
  getStudentCoursePrimaryAction,
  resolveStudentCourseIsEnrolled,
} from '@/lib/student/student-course-cta';
import { studentBasePath } from '@/lib/student/student-home-route';
import {
  type BestCourseGradient,
  buildJourneyCards,
} from './landing-content';
import type {
  ContinueLearningCard,
  LandingCourseCard,
  LandingFreeCourseCard,
  LandingJourneyCard,
  LandingPathCard,
} from './landing-data-types';

const GRADIENT_CYCLE: BestCourseGradient[] = [
  'orange',
  'purple',
  'blue',
  'emerald',
  'amber',
  'rose',
];

const MAX_BEST_COURSES = 6;
const MAX_FREE_COURSES = 5;
const MAX_PATH_CARDS = 6;

type DiscoverableRow = {
  course: GlobalDiscoverableCourse;
  pillarSlug: string;
  pillarTitle: string;
};

function flattenDiscoverable(groups: GlobalDiscoverablePillarGroup[]): DiscoverableRow[] {
  return groups.flatMap((group) =>
    group.courses.map((course) => ({
      course,
      pillarSlug: group.pillar.slug,
      pillarTitle: group.pillar.title,
    })),
  );
}

function flattenEntitled(groups: EntitledPillarGroup[]): Array<{
  course: EntitledCourseListItem;
  pillarSlug: string;
  pillarTitle: string;
}> {
  return groups.flatMap((group) =>
    group.courses.map((course) => ({
      course,
      pillarSlug: group.pillar.slug,
      pillarTitle: group.pillar.title,
    })),
  );
}

function gradientForIndex(index: number): BestCourseGradient {
  return GRADIENT_CYCLE[index % GRADIENT_CYCLE.length];
}

function durationLabel(moduleCount: number, videoCount: number): string {
  if (videoCount > 0) return `${videoCount}+ lessons`;
  if (moduleCount > 0) return `${moduleCount} modules`;
  return 'Self-paced';
}

function mapExplorePaidProductToCard(
  collegeSlug: string,
  product: ExplorePaidProductCard,
  index: number,
): LandingCourseCard {
  const description =
    product.description?.trim()?.slice(0, 160)
    || `Explore ${product.pillarTitle} with structured modules and lessons.`;

  const badges: LandingCourseCard['badges'] = [];
  if (product.isEnrolled) {
    if (product.entitled) {
      badges.push({ label: 'College Unlocked', variant: 'unlocked' });
    }
    if ((product.progressPercentage ?? 0) > 0) {
      badges.push({ label: 'In Progress', variant: 'popular' });
    }
  } else {
    badges.push({ label: 'Premium', variant: 'premium' });
  }
  if (product.catalogKind === 'variant') {
    badges.push({ label: 'Career Track', variant: 'career' });
  }

  const tags = [product.pillarTitle].filter(Boolean).slice(0, 3);
  if (tags.length === 0) tags.push('Career');

  const action = getStudentCoursePrimaryAction({
    collegeSlug,
    courseId: product.masterCourseId,
    pillarSlug: product.pillarSlug,
    isEnrolled: product.isEnrolled,
    hasPlayableLessons: product.videoCount > 0,
    variantId: product.variantId,
    progressPercentage: product.progressPercentage,
  });

  return {
    id: product.id,
    title: product.title,
    description,
    badges,
    tags,
    duration: durationLabel(product.moduleCount, product.videoCount),
    language: 'English / Hinglish',
    ctaLabel: product.isEnrolled ? action.label : 'View Details',
    href: product.isEnrolled ? action.href : product.detailUrl,
    thumbnailUrl: product.thumbnailImageUrl || product.coverImageUrl || null,
    gradient: gradientForIndex(index),
    source: 'paid_product',
  };
}

function mapEntitledToCard(
  collegeSlug: string,
  row: { course: EntitledCourseListItem; pillarSlug: string; pillarTitle: string },
  index: number,
): LandingCourseCard {
  const c = row.course;
  const displayTitle = c.variant_title ?? c.title;
  const description =
    c.short_description?.trim() ||
    c.description?.trim()?.slice(0, 160) ||
    `Continue your ${row.pillarTitle} learning path.`;

  const badges: LandingCourseCard['badges'] = [
    { label: 'College Unlocked', variant: 'unlocked' },
  ];
  if (c.variant_id) badges.push({ label: 'Career Track', variant: 'career' });
  if (c.progress_percentage > 0) badges.push({ label: 'In Progress', variant: 'popular' });

  const progress = c.progress_percentage ?? 0;
  const action = getStudentCoursePrimaryAction({
    collegeSlug,
    courseId: c.id,
    pillarSlug: row.pillarSlug,
    isEnrolled: true,
    hasPlayableLessons: c.video_count > 0,
    variantId: c.variant_id,
    progressPercentage: progress,
  });

  const meta = (c.metadata as Record<string, unknown> | null) ?? {};
  const thumbnailUrl =
    c.thumbnail_url?.trim()
    || (typeof meta.thumbnail_url === 'string' ? meta.thumbnail_url.trim() : '')
    || (typeof meta.youtube_playlist_thumbnail_url === 'string'
      ? meta.youtube_playlist_thumbnail_url.trim()
      : '')
    || null;

  return {
    id: c.variant_id ? `variant:${c.variant_id}` : `master:${c.id}`,
    title: displayTitle,
    description,
    badges,
    tags: [
      row.pillarTitle,
      c.code?.replace(/-[A-Za-z0-9]{4}$/, '') || null,
    ].filter((x): x is string => Boolean(x)).slice(0, 3),
    duration: durationLabel(c.module_count, c.video_count),
    language: 'English / Hinglish',
    ctaLabel: action.label,
    href: action.href,
    thumbnailUrl,
    gradient: gradientForIndex(index),
    source: 'entitled',
  };
}


export function mergeBestCourseCards(
  collegeSlug: string,
  explorePaidProducts: ExplorePaidProductCard[],
  entitledGroups: EntitledPillarGroup[],
): LandingCourseCard[] {
  const seen = new Set<string>();
  const cards: LandingCourseCard[] = [];
  let index = 0;

  for (const product of explorePaidProducts) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    cards.push(mapExplorePaidProductToCard(collegeSlug, product, index++));
    if (cards.length >= MAX_BEST_COURSES) return cards;
  }

  for (const row of flattenEntitled(entitledGroups)) {
    const key = row.course.variant_id
      ? `variant:${row.course.variant_id}`
      : `master:${row.course.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push(mapEntitledToCard(collegeSlug, row, index++));
    if (cards.length >= MAX_BEST_COURSES) return cards;
  }

  return cards.slice(0, MAX_BEST_COURSES);
}

export function mapPillarsToPathCards(
  collegeSlug: string,
  pillars: MasterCoursePillarsRow[],
): LandingPathCard[] {
  const base = studentBasePath(collegeSlug);
  return pillars.slice(0, MAX_PATH_CARDS).map((pillar) => ({
    id: pillar.id,
    title: pillar.title,
    description:
      pillar.short_description?.trim() ||
      pillar.description?.trim()?.slice(0, 140) ||
      'Structured competency track with courses and projects.',
    href: `${base}/pillars/${encodeURIComponent(pillar.slug)}`,
    slug: pillar.slug,
  }));
}

function mapYouTubeToFreeCards(
  collegeSlug: string,
  catalog: YouTubeCourse[],
  enrolledIds?: Set<string>,
): LandingFreeCourseCard[] {
  const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  return catalog.slice(0, MAX_FREE_COURSES).map((course) => {
    const isDb = isUuid(course.playlistId);
    const href = isDb
      ? `/c/${encodeURIComponent(collegeSlug)}/student/learn/${encodeURIComponent(course.id)}`
      : `/c/${encodeURIComponent(collegeSlug)}/student/courses/youtube/${encodeURIComponent(course.playlistId)}`;
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail || undefined,
      videoCount: course.videoCount,
      href,
      source: (isDb ? 'static' : 'youtube') as 'static' | 'youtube',
      isEnrolled: enrolledIds?.has(course.id) ?? false,
    };
  });
}

export function mergeFreeCourseCards(
  collegeSlug: string,
  catalog: YouTubeCourse[],
  enrolledIds?: Set<string>,
): LandingFreeCourseCard[] {
  return mapYouTubeToFreeCards(collegeSlug, catalog, enrolledIds);
}

function findCourseHref(
  collegeSlug: string,
  discoverable: DiscoverableRow[],
  entitled: ReturnType<typeof flattenEntitled>,
  matcher: (title: string, slug: string, code: string) => boolean,
  fallback: string,
): string {
  for (const row of discoverable) {
    const t = row.course.title;
    const code = row.course.code;
    if (matcher(t, row.pillarSlug, code)) {
      const c = row.course;
      const isEnrolled = resolveStudentCourseIsEnrolled({
        isEnrolled: c.is_enrolled,
        entitled: c.entitled,
        isFree: c.is_free,
      });
      return getStudentCoursePrimaryAction({
        collegeSlug,
        courseId: c.id,
        pillarSlug: row.pillarSlug,
        isEnrolled,
        isFree: c.is_free,
        hasPlayableLessons: c.video_count > 0,
        variantId: c.variant_id,
        progressPercentage: c.progress_percentage,
      }).href;
    }
  }
  for (const row of entitled) {
    const t = row.course.variant_title ?? row.course.title;
    if (matcher(t, row.pillarSlug, row.course.code)) {
      return buildLearnHref(collegeSlug, row.course.id, {
        variantId: row.course.variant_id,
      });
    }
  }
  return fallback;
}

export function buildSmartJourneyCards(
  collegeSlug: string,
  discoverableGroups: GlobalDiscoverablePillarGroup[],
  entitledGroups: EntitledPillarGroup[],
  pathCards: LandingPathCard[],
): LandingJourneyCard[] {
  const base = studentBasePath(collegeSlug);
  const discoverable = flattenDiscoverable(discoverableGroups);
  const entitled = flattenEntitled(entitledGroups);

  const dsaHref = findCourseHref(
    collegeSlug,
    discoverable,
    entitled,
    (title, slug, code) =>
      /dsa|data structure|algorithm/i.test(title) ||
      /dsa|algorithm/i.test(slug) ||
      /dsa/i.test(code),
    pathCards[0]?.href ?? `${base}/paid-courses`,
  );

  const profileHref = `${base}/profile`;

  return [
    {
      icon: 'code',
      title: 'DSA Basics',
      description: 'Structured patterns and problem-solving foundations.',
      path: dsaHref,
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
      path: profileHref,
    },
  ];
}

export function buildContinueLearningCard(
  collegeSlug: string,
  target: {
    item_id: string;
    last_position_seconds: number;
    updated_at: string;
  },
  item: { title: string | null; master_course_id: string },
  entitledGroups: EntitledPillarGroup[],
  courseTitleFallback: string,
): ContinueLearningCard {
  const courseId = item.master_course_id;
  let variantId: string | null = null;
  let progressPercentage: number | null = null;
  let courseTitle = courseTitleFallback;

  for (const group of entitledGroups) {
    for (const course of group.courses) {
      if (course.id === courseId) {
        courseTitle = course.variant_title ?? course.title;
        variantId = course.variant_id ?? null;
        progressPercentage = course.progress_percentage;
        break;
      }
    }
  }

  return {
    courseTitle,
    lessonTitle: item.title?.trim() || 'Continue your lesson',
    progressPercentage,
    resumeHref: buildLearnHref(collegeSlug, courseId, {
      variantId,
      itemId: target.item_id,
    }),
    lastWatchedAt: target.updated_at,
  };
}

/** Fallback journey cards when smart paths cannot be built. */
export function defaultJourneyCards(collegeSlug: string): LandingJourneyCard[] {
  return buildJourneyCards(collegeSlug);
}
