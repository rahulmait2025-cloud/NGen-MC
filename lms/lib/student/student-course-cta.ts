import {
  buildLearnHref,
  buildPillarCourseDetailHref,
} from '@/lib/utils/variant-learn-url';

export type StudentCoursePrimaryHrefInput = {
  collegeSlug: string;
  courseId: string;
  pillarSlug: string;
  isEnrolled: boolean;
  isFree?: boolean;
  hasPlayableLessons?: boolean;
  variantId?: string | null;
  progressPercentage?: number | null;
  /** YouTube playlist cards on the courses hub */
  isYouTube?: boolean;
  youtubePlaylistId?: string;
};

export type StudentCoursePrimaryAction = {
  href: string;
  label: string;
};

/**
 * True enrollment for catalog rows.
 * Prefer explicit `isEnrolled` from catalog (`is_enrolled` access record).
 * Global free courses set `entitled` for discoverability without enrollment.
 */
export function resolveStudentCourseIsEnrolled(input: {
  isEnrolled?: boolean;
  entitled?: boolean;
  isFree?: boolean;
}): boolean {
  if (typeof input.isEnrolled === 'boolean') {
    return input.isEnrolled;
  }
  if (input.isFree) {
    return false;
  }
  return !!input.entitled;
}

function buildYouTubeHref(collegeSlug: string, playlistId: string): string {
  return `/c/${collegeSlug}/student/courses/youtube/${encodeURIComponent(playlistId)}`;
}

function buildDetailHref(input: StudentCoursePrimaryHrefInput): string {
  return buildPillarCourseDetailHref(
    input.collegeSlug,
    input.pillarSlug,
    input.courseId,
    input.variantId,
  );
}

function buildPlayerHref(input: StudentCoursePrimaryHrefInput): string {
  return buildLearnHref(input.collegeSlug, input.courseId, {
    variantId: input.variantId,
  });
}

function resolveHasPlayableLessons(input: StudentCoursePrimaryHrefInput): boolean {
  return input.hasPlayableLessons ?? true;
}

function getStudentCoursePrimaryHref(
  input: StudentCoursePrimaryHrefInput,
): string {
  if (input.isYouTube && input.youtubePlaylistId) {
    return buildYouTubeHref(input.collegeSlug, input.youtubePlaylistId);
  }

  if (input.isEnrolled && resolveHasPlayableLessons(input)) {
    return buildPlayerHref(input);
  }

  return buildDetailHref(input);
}

function getStudentCoursePrimaryLabel(
  input: Pick<
    StudentCoursePrimaryHrefInput,
    'isEnrolled' | 'isFree' | 'progressPercentage' | 'isYouTube'
  >,
): string {
  if (input.isYouTube) return 'Start Learning';
  if (input.isEnrolled) {
    return (input.progressPercentage ?? 0) > 0
      ? 'Continue'
      : 'Start';
  }
  if (input.isFree) return 'Enroll Free';
  return 'Enroll Now';
}

export function getStudentCoursePrimaryAction(
  input: StudentCoursePrimaryHrefInput,
): StudentCoursePrimaryAction {
  return {
    href: getStudentCoursePrimaryHref(input),
    label: getStudentCoursePrimaryLabel(input),
  };
}

/** Catalog discoverable row → enrollment + action for course cards. */
export function getStudentCourseActionFromCatalogItem(
  collegeSlug: string,
  item: {
    id: string;
    pillar_slug: string;
    variant_id: string | null;
    entitled: boolean;
    is_enrolled?: boolean;
    is_free: boolean;
    video_count: number;
    progress_percentage?: number | null;
  },
): StudentCoursePrimaryAction {
  const isEnrolled = resolveStudentCourseIsEnrolled({
    isEnrolled: item.is_enrolled,
    entitled: item.entitled,
    isFree: item.is_free,
  });

  return getStudentCoursePrimaryAction({
    collegeSlug,
    courseId: item.id,
    pillarSlug: item.pillar_slug,
    isEnrolled,
    isFree: item.is_free,
    hasPlayableLessons: item.video_count > 0,
    variantId: item.variant_id,
    progressPercentage: item.progress_percentage,
  });
}
