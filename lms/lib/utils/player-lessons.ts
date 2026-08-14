/**
 * Client-safe normalized lesson list for player navigation.
 * Keeps playlist, current lesson, prev/next, and completion on one ID scheme.
 */

import { buildLearnHref } from '@/lib/utils/variant-learn-url';
import type { CourseForStudent } from '@/types/student-runtime';
import type { MasterCourseItemType } from '@/types/student-runtime';

export type PlayerLessonItem = {
  id: string;
  moduleId: string;
  title: string;
  slug: string | null;
  type: MasterCourseItemType;
  href: string;
  isPublished: boolean;
  sortOrder: number;
};

export function buildPlayerLessonList(
  course: CourseForStudent,
  collegeSlug: string,
  learnVariantId?: string | null,
): PlayerLessonItem[] {
  const courseKey = course.slug?.trim() || course.id;
  const lessons: PlayerLessonItem[] = [];

  const sortedModules = course.modules.toSorted((a, b) => {
    const diff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (diff !== 0) return diff;
    return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
  });

  for (const mod of sortedModules) {
    if (mod.visible_to_students === false) continue;
    const sortedItems = mod.items.toSorted((a, b) => {
      const diff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (diff !== 0) return diff;
      return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
    });
    for (const item of sortedItems) {
      // Safety net: skip quiz placeholders that are no longer linked to a quiz
      if (item.item_type === 'quiz_placeholder' && !item.quiz_id) continue;
      lessons.push({
        id: item.id,
        moduleId: mod.id,
        title: item.title,
        slug: item.slug ?? null,
        type: item.item_type,
        href: buildLearnHref(collegeSlug, courseKey, {
          variantId: learnVariantId,
          itemId: item.id,
          itemSlug: item.slug,
        }),
        isPublished: item.publish_status === 'published',
        sortOrder: item.sort_order ?? 0,
      });
    }
  }

  return lessons;
}

export function findPlayerLessonIndex(
  lessons: PlayerLessonItem[],
  activeItemId: string,
): number {
  const want = activeItemId.trim().toLowerCase();
  return lessons.findIndex(
    (lesson) =>
      lesson.id.toLowerCase() === want ||
      (lesson.slug?.trim().toLowerCase() === want),
  );
}

function _resolvePlayerLessonById(
  lessons: PlayerLessonItem[],
  itemId: string,
): PlayerLessonItem | null {
  const idx = findPlayerLessonIndex(lessons, itemId);
  return idx >= 0 ? lessons[idx] : null;
}
