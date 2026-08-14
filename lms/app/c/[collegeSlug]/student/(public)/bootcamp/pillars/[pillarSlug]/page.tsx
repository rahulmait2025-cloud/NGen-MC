import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Layers, Play } from 'lucide-react';
import { getPublicBootcampPillarBySlug } from '@/lib/services/job-ready-bootcamp';
import { isJobReadyBootcampFeatureEnabled } from '@/lib/services/job-ready-bootcamp-feature';
import { buildBootcampLandingHref, buildBootcampCoursePreviewHref } from '@/lib/student/bootcamp-routes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function BootcampPillarPage({
  params,
}: {
  params: Promise<{ collegeSlug: string; pillarSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug, pillarSlug } = await params;

  if (!(await isJobReadyBootcampFeatureEnabled())) notFound();

  const pillar = await getPublicBootcampPillarBySlug(collegeSlug, pillarSlug);
  if (!pillar) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={buildBootcampLandingHref(collegeSlug)}>
            <ArrowLeft className="mr-2 size-4" />
            Job Ready Bootcamp
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{pillar.title}</h1>
        <p className="text-muted-foreground max-w-2xl">
          {pillar.short_description || pillar.description || 'Courses in this career pillar.'}
        </p>
        <p className="text-sm font-semibold text-primary">
          {pillar.course_count} {pillar.course_count === 1 ? 'course' : 'courses'}
        </p>
      </div>

      {pillar.courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center text-muted-foreground">
          Courses for this pillar will appear here once published in Master Courses.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pillar.courses.map((course) => (
            <div key={course.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
              {course.thumbnail_url ? (
                <div className="relative mb-4 aspect-video overflow-hidden rounded-xl bg-muted">
                  <Image src={course.thumbnail_url} alt={course.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
                </div>
              ) : null}
              <Badge variant="secondary" className="mb-2">{course.code}</Badge>
              <h2 className="text-lg font-semibold">{course.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{course.description}</p>
              <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Layers className="size-3.5" />{course.module_count} modules</span>
                <span className="inline-flex items-center gap-1"><Play className="size-3.5" />{course.video_count} videos</span>
              </div>
              <Button asChild variant="outline" className="mt-5 w-full rounded-xl">
                <Link href={buildBootcampCoursePreviewHref(collegeSlug, pillar.slug, course.id)}>
                  View Details
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
