import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Layers, Play } from 'lucide-react';
import { requireStudent } from '@/lib/auth/require-student';
import {
  getBootcampPillarBySlug,
  isStudentEnrolledInJobReadyBootcamp,
} from '@/lib/services/job-ready-bootcamp';
import { isJobReadyBootcampFeatureEnabled } from '@/lib/services/job-ready-bootcamp-feature';
import { buildEnrolledBootcampHubHref, buildBootcampLandingHref } from '@/lib/student/bootcamp-routes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function EnrolledBootcampPillarPage({
  params,
}: {
  params: Promise<{ collegeSlug: string; pillarSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug, pillarSlug } = await params;

  if (!(await isJobReadyBootcampFeatureEnabled())) notFound();

  const ctx = await requireStudent(collegeSlug);

  const enrolled = await isStudentEnrolledInJobReadyBootcamp(
    ctx.studentId,
    ctx.isGlobal ? null : ctx.tenant.id,
  );
  if (!enrolled) {
    redirect(buildBootcampLandingHref(collegeSlug));
  }

  const pillar = await getBootcampPillarBySlug(collegeSlug, pillarSlug);
  if (!pillar) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={buildEnrolledBootcampHubHref(collegeSlug)}>
          <ArrowLeft className="mr-2 size-4" />
          Job Ready Bootcamp
        </Link>
      </Button>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{pillar.title}</h1>
        <p className="text-muted-foreground">{pillar.short_description || pillar.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pillar.courses.map((course) => (
          <div key={course.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            {course.thumbnail_url ? (
              <div className="relative mb-4 aspect-video overflow-hidden rounded-xl bg-muted">
                <Image src={course.thumbnail_url} alt={course.title} fill className="object-cover" sizes="33vw" />
              </div>
            ) : null}
            <Badge variant="secondary" className="mb-2">{course.code}</Badge>
            <h2 className="text-lg font-semibold">{course.title}</h2>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Layers className="size-3.5" />{course.module_count}</span>
              <span className="inline-flex items-center gap-1"><Play className="size-3.5" />{course.video_count}</span>
            </div>
            <Button asChild className="mt-5 w-full rounded-xl">
              <Link href={`/c/${collegeSlug}/student/learn/${course.id}`}>
                {course.progress_percentage ? `Continue (${course.progress_percentage}%)` : 'Start Learning'}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
