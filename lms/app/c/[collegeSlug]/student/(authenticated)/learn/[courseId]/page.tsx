import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { buildLearnHref, resolveVariantIdFromSearchParams } from '@/lib/services/variant-learn-scope';
import { isUuid } from '@/lib/utils/slug';
import { getStudentCoursePlayerShellBundle } from '@/lib/services/course-player-shell-bundle';

interface LearnCoursePageProps {
  params: Promise<{ collegeSlug: string; courseId: string }>;
  searchParams?: Promise<{ variantId?: string; variant?: string }>;
}

export default async function LearnCoursePage({
  params,
  searchParams,
}: LearnCoursePageProps): Promise<ReactNode> {
  const [{ collegeSlug, courseId }, sp] = await Promise.all([
    params,
    searchParams ? searchParams : Promise.resolve({}),
  ]);
  const variantId = resolveVariantIdFromSearchParams(sp);

  // Auth already enforced by layout.tsx — no need for requireStudent() here.

  const bundle = await getStudentCoursePlayerShellBundle({
    collegeSlug,
    rawCourseParam: courseId,
    variantId,
  });

  if (!bundle.ok) {
    if (bundle.reason === 'course_not_found') {
      notFound();
    }
    if (bundle.reason === 'access_denied') {
      if (bundle.redirectHref) {
        redirect(bundle.redirectHref);
      }
      redirect(`/c/${collegeSlug}/student/my-courses`);
    }
    notFound();
  }

  // Redirect to first lesson
  const canonicalSlug = bundle.courseSlug ?? bundle.resolvedCourseId;
  const flatItems = bundle.course.modules.flatMap((m) => m.items);

  if (flatItems.length > 0) {
    const firstItem = flatItems[0];
    if (isUuid(courseId) && bundle.courseSlug) {
      redirect(buildLearnHref(collegeSlug, bundle.courseSlug, { variantId }));
    }
    redirect(
      buildLearnHref(collegeSlug, canonicalSlug, {
        variantId: bundle.resolvedVariantId ?? undefined,
        itemId: firstItem.id,
        itemSlug: firstItem.slug,
      }),
    );
  }

  // Empty course — no lessons available
  if (isUuid(courseId) && bundle.courseSlug) {
    redirect(buildLearnHref(collegeSlug, bundle.courseSlug, { variantId }));
  }

  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
      <div className="size-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <BookOpen className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-medium text-foreground mb-1">Course in preparation</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        This course is being prepared. Please check back soon.
      </p>
      <p className="sr-only">{canonicalSlug}</p>
    </div>
  );
}
