import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Layers,
  Video,
  Plus,
  ChevronRight,
  GraduationCap,
  Pencil,
  Library,
} from 'lucide-react';

import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getBootcampById } from '@/lib/services/bootcamps';
import { listBootcampCourses } from '@/lib/services/bootcamp-courses';
import { repairPaidCourseBuilderLandingMetadata } from '@/lib/services/paid-course-landing-metadata';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BootcampCourseCardDeleteButton } from '@/components/master-courses/bootcamp-course-card-delete-button';
import { resolveBootcampByKey } from '@/lib/resolvers';
import { isUuid } from '@/lib/utils/slug';

function displayPaidBuilderContainerTitle(title: string): string {
  const normalized = title.trim().toLowerCase();
  if (normalized === 'bootcamp' || normalized === 'bootcamps') {
    return 'Paid Course Builder';
  }
  return title;
}

function formatPrice(course: { is_free: boolean; effective_price: number | null; currency: string }): string {
  if (course.is_free) return 'Free';
  if (course.effective_price === null || course.effective_price === undefined) return '\u2014';
  const symbol = course.currency === 'INR' ? '\u20b9' : '$';
  return `${symbol}${course.effective_price.toLocaleString('en-IN')}`;
}

export default async function BootcampDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ bootcampId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactNode> {
  const { bootcampId } = await params;
  const bootcampKey = bootcampId;
  const resolvedSearchParams = await searchParams;

  const [_auth, resolved] = await Promise.all([
    getSessionFromHeaders(),
    resolveBootcampByKey(bootcampKey),
  ]);
  if (!_auth) { redirect('/login'); }

  if (!resolved) {
    notFound();
  }

  // Canonical redirect: UUID → slug
  if (isUuid(bootcampKey) && resolved.slug) {
    const searchParamsQuery = new URLSearchParams(resolvedSearchParams as Record<string, string>).toString();
    const queryString = searchParamsQuery ? `?${searchParamsQuery}` : '';
    redirect(`/bootcamps/${resolved.slug}${queryString}`);
  }

  const [bootcamp, courses, _repairedMetadata] = await Promise.all([
    getBootcampById(resolved.id),
    listBootcampCourses(resolved.id).catch(() => []),
    repairPaidCourseBuilderLandingMetadata(resolved.id).catch(() => 0),
  ]);

  if (!bootcamp) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Workspace header — minimal: icon + title only. Bootcamp is a
          read-only container; the "+ New Course" affordance lives in the
          courses grid below (centered when empty, last tile when not). */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <GraduationCap className="size-5 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight truncate">
          {displayPaidBuilderContainerTitle(bootcamp.title)}
        </h1>
      </div>

      {/* Courses section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-foreground/60" />
            <span>Paid Course Curriculum</span>
            <span className="text-sm font-normal text-muted-foreground tabular-nums">
              {courses.length}
            </span>
          </h2>
        </div>

        {courses.length === 0 ? (
          <div className="flex justify-center">
            <div className="w-full sm:max-w-sm">
              <CreateNewCourseCard bootcampId={bootcampId} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                bootcampId={resolved.id}
              />
            ))}
            <CreateNewCourseCard bootcampId={bootcampId} />
          </div>
        )}
      </div>
    </div>
  );
}

function CourseCard({
  course,
  bootcampId,
}: {
  course: Awaited<ReturnType<typeof listBootcampCourses>>[number];
  bootcampId: string;
}) {
  const price = formatPrice(course);
  const manageHref = `/bootcamps/${bootcampId}/courses/${course.id}`;
  const editHref = `/bootcamps/${bootcampId}/courses/${course.id}/edit`;

  return (
    <div className="group relative block h-full">
      <Card className="relative h-full overflow-hidden rounded-xl border border-border/60 bg-card transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:border-foreground/20 hover:shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="p-5 flex flex-col h-full">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <StatusDot status={course.publish_status} />
              <StatusLabel status={course.publish_status} />
            </span>
            <code className="font-mono text-[10px] text-muted-foreground/70 tracking-wider">
              {course.code}
            </code>
          </div>

          <Link
            href={manageHref}
            className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
          >
            <h3 className="text-[15px] font-semibold leading-snug tracking-tight line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
              {course.title}
            </h3>
          </Link>

          {course.short_description && (
            <p className="text-[13px] text-muted-foreground/80 line-clamp-2 mb-4 leading-relaxed">
              {course.short_description}
            </p>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-4 pt-3 mt-1 border-t border-dashed border-border/60">
            <div className="flex items-baseline gap-1">
              <Layers className="size-3 text-muted-foreground/60" />
              <span className="text-base font-semibold tabular-nums leading-none">{course.module_count}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                modules
              </span>
            </div>
            <div className="text-muted-foreground/30">|</div>
            <div className="flex items-baseline gap-1">
              <Video className="size-3 text-muted-foreground/60" />
              <span className="text-base font-semibold tabular-nums leading-none">{course.video_count}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                videos
              </span>
            </div>
            <div className="ml-auto">
              <span className="text-sm font-semibold tabular-nums tracking-tight">{price}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 sm:gap-1.5 mt-4 -mb-1">
            <Button asChild variant="default" size="sm" className="h-8 text-xs">
              <Link href={manageHref}>
                <Library className="mr-1 size-3" />
                Manage
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href={editHref}>
                <Pencil className="mr-1 size-3" />
                Edit
              </Link>
            </Button>
            <BootcampCourseCardDeleteButton
              bootcampId={bootcampId}
              courseId={course.id}
              courseTitle={course.title}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

function CreateNewCourseCard({ bootcampId }: { bootcampId: string }) {
  return (
    <Link
      href={`/bootcamps/${bootcampId}/courses/new`}
      className="group relative block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
    >
      <div className="relative h-full overflow-hidden rounded-xl border-2 border-dashed border-border/60 bg-muted/10 transition-[border-color,background-color,color,box-shadow] duration-200 hover:border-primary/60 hover:bg-primary/5 min-h-[280px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-110 transition-[background-color,transform] duration-200">
            <Plus className="size-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold tracking-tight">Create Paid Course</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Add another paid course to the builder
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
            <span>Click to start</span>
            <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}

const STATUS_DOT_COLOR: Record<string, string> = {
  published: 'bg-emerald-500',
  unpublished: 'bg-zinc-400',
  draft: 'bg-amber-500',
};

const STATUS_LABEL_TEXT: Record<string, string> = {
  published: 'text-emerald-700',
  unpublished: 'text-zinc-600',
  draft: 'text-amber-700',
};

const STATUS_LABEL: Record<string, string> = {
  published: 'Published',
  unpublished: 'Unpublished',
  draft: 'Draft',
};

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`inline-block size-1.5 rounded-full ${STATUS_DOT_COLOR[status] || 'bg-zinc-400'}`}
      aria-hidden
    />
  );
}

function StatusLabel({ status }: { status: string }) {
  return (
    <span
      className={`text-[11px] font-medium tracking-tight ${STATUS_LABEL_TEXT[status] || 'text-muted-foreground'}`}
    >
      {STATUS_LABEL[status] || status}
    </span>
  );
}
