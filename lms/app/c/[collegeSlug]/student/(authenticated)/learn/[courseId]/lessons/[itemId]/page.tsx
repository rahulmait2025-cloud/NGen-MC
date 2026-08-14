import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { resolveVariantIdFromSearchParams } from '@/lib/services/variant-learn-scope';
import { isUuid } from '@/lib/utils/slug';
import { ActiveLessonView } from '@/components/student/course-player/active-lesson-view';
import { buildLearnHref } from '@/lib/utils/variant-learn-url';
import { getStudentCoursePlayerShellBundle } from '@/lib/services/course-player-shell-bundle';

interface LessonPageProps {
  params: Promise<{
    collegeSlug: string;
    courseId: string;
    itemId: string;
  }>;
  searchParams?: Promise<{
    variantId?: string;
    variant?: string;
  }>;
}

export default async function LessonPage({
  params,
  searchParams,
}: LessonPageProps): Promise<ReactNode> {
  const [{ collegeSlug, courseId, itemId }, sp] = await Promise.all([
    params,
    searchParams ? searchParams : Promise.resolve({}),
  ]);
  const courseKey = courseId;
  const itemKey = itemId;
  const variantId = resolveVariantIdFromSearchParams(sp);

  // Auth already enforced by layout.tsx — no need for requireStudent() here.

  const bundle = await getStudentCoursePlayerShellBundle({
    collegeSlug,
    rawCourseParam: courseKey,
    rawItemParam: itemKey,
    variantId,
  });

  if (!bundle.ok) {
    if (bundle.reason === 'course_not_found' || bundle.reason === 'item_not_found') {
      notFound();
    }
    if (bundle.reason === 'access_denied') {
      if (bundle.redirectHref) {
        redirect(bundle.redirectHref);
      }
      notFound();
    }
    notFound();
  }

  // Canonical redirect: if course was accessed by UUID, redirect to slug
  if (isUuid(courseKey) && bundle.courseSlug) {
    redirect(
      buildLearnHref(collegeSlug, bundle.courseSlug, {
        variantId,
        itemSlug: isUuid(itemKey) ? undefined : itemKey,
      }),
    );
  }

  const activeItem = bundle.activeItem;
  if (!activeItem) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
        <h3 className="text-base font-medium text-foreground mb-1">Lesson unavailable</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          This lesson is not available yet. Try another lesson from the course playlist.
        </p>
      </div>
    );
  }

  // Canonical redirect: if item was accessed by UUID, redirect to slug URL
  if (isUuid(itemKey) && activeItem.slug) {
    redirect(
      buildLearnHref(collegeSlug, bundle.courseSlug || bundle.resolvedCourseId, {
        variantId,
        itemSlug: activeItem.slug,
      }),
    );
  }

return (
    <ActiveLessonView
      activeItem={activeItem}
      lessonResources={bundle.resources}
      courseResourceMeta={bundle.courseResourceMeta}
      courseResourceSections={bundle.courseResourceSections}
      noteCollectionSlugMap={bundle.noteCollectionSlugMap}
      quizPayload={bundle.quizPayload}
    />
  );
}
