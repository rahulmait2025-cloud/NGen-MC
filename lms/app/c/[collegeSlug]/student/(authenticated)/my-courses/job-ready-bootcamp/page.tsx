import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { requireStudent } from '@/lib/auth/require-student';
import {
  getBootcampPillarsWithCourses,
  getJobReadyBootcampCardPresentation,
  isStudentEnrolledInJobReadyBootcamp,
} from '@/lib/services/job-ready-bootcamp';
import { isJobReadyBootcampFeatureEnabled } from '@/lib/services/job-ready-bootcamp-feature';
import { buildEnrolledBootcampPillarHref, buildBootcampLandingHref } from '@/lib/student/bootcamp-routes';
import { Button } from '@/components/ui/button';
import { notFound, redirect } from 'next/navigation';

export default async function EnrolledBootcampHubPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug } = await params;

  if (!(await isJobReadyBootcampFeatureEnabled())) notFound();

  const ctx = await requireStudent(collegeSlug);

  const enrolled = await isStudentEnrolledInJobReadyBootcamp(
    ctx.studentId,
    ctx.isGlobal ? null : ctx.tenant.id,
  );
  if (!enrolled) {
    redirect(buildBootcampLandingHref(collegeSlug));
  }

  const pillars = await getBootcampPillarsWithCourses(collegeSlug);
  const card = getJobReadyBootcampCardPresentation();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">My Courses</p>
        <h1 className="text-3xl font-bold tracking-tight">{card.title}</h1>
        <p className="max-w-2xl text-muted-foreground">{card.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pillars.map((pillar) => (
          <div key={pillar.slug} className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{pillar.title}</h2>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {pillar.short_description || pillar.description || 'Pillar courses'}
            </p>
            <p className="mt-3 text-xs font-semibold text-primary">
              {pillar.course_count} {pillar.course_count === 1 ? 'course' : 'courses'}
            </p>
            <Button asChild variant="outline" className="mt-5 w-full rounded-xl">
              <Link href={buildEnrolledBootcampPillarHref(collegeSlug, pillar.slug)}>
                Open Pillar
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
