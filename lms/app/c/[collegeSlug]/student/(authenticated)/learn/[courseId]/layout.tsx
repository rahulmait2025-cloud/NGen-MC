import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import Script from 'next/script';
import { requireStudent } from '@/lib/auth/require-student';
import { CoursePlayerShell } from '@/components/student/course-player/course-player-shell';
import { getStudentCoursePlayerShellBundle } from '@/lib/services/course-player-shell-bundle';
import { Skeleton } from '@/components/ui/skeleton';
import { Play } from 'lucide-react';

interface LearnLayoutProps {
  children: ReactNode;
  params: Promise<{ collegeSlug: string; courseId: string }>;
}

function LearnLayoutSkeleton() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      {/* Top Header Bar Skeleton */}
      <header className="h-14 border-b border-border/80 bg-background px-4 md:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-36 rounded-md" />
          <Skeleton className="h-4 w-48 rounded-md hidden sm:block" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex flex-1 min-h-[calc(100vh-3.5rem)]">
        {/* Left / Main Video Player Content Skeleton Area */}
        <main className="flex-1 p-4 lg:p-6 space-y-6 max-w-6xl">
          {/* 16:9 Video Box Skeleton */}
          <div className="aspect-video w-full rounded-2xl bg-muted/40 border border-border/60 relative overflow-hidden flex items-center justify-center shadow-sm">
            <div className="size-16 rounded-2xl bg-background/80 border border-border/50 flex items-center justify-center shadow-sm">
              <Play className="size-7 text-muted-foreground/40 ml-0.5" />
            </div>
          </div>

          {/* Video Meta / Action Bar Skeleton */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
            <div className="space-y-2">
              <Skeleton className="h-6 w-72 rounded-md" />
              <Skeleton className="h-4 w-44 rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>

          {/* Tabs Panel Skeleton */}
          <div className="space-y-4">
            <div className="flex gap-6 border-b border-border/50 pb-2">
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
            <div className="space-y-3 pt-2">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-4/5 rounded-md" />
              <Skeleton className="h-4 w-3/5 rounded-md" />
            </div>
          </div>
        </main>

        {/* Right Sidebar Playlist Dock Skeleton */}
        <aside className="hidden lg:flex w-80 xl:w-96 flex-col border-l border-border/80 bg-muted/10 p-4 space-y-4 shrink-0">
          <div className="p-4 rounded-xl bg-background border border-border/60 space-y-3 shadow-sm">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>

          <Skeleton className="h-10 w-full rounded-xl" />

          {/* Modules List Skeleton */}
          <div className="space-y-3 flex-1">
            {[1, 2, 3].map((m) => (
              <div key={m} className="rounded-xl border border-border/60 bg-background p-3.5 space-y-2.5 shadow-sm">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-4 w-8 rounded-md" />
                </div>
                <div className="space-y-2 pt-1">
                  <Skeleton className="h-9 w-full rounded-lg" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

async function CoursePlayerLoader({
  collegeSlug,
  courseId,
  studentId,
  children,
}: {
  collegeSlug: string;
  courseId: string;
  studentId: string;
  children: ReactNode;
}) {
  const bundle = await getStudentCoursePlayerShellBundle({
    collegeSlug,
    rawCourseParam: courseId,
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

  const course = bundle.course;
  const metadata = course.metadata as Record<string, unknown> | null;
  const parentCourseTitle =
    typeof metadata?.parent_course_title === 'string'
      ? metadata.parent_course_title
      : null;

  const learnVariantId =
    typeof metadata?.catalog_variant_id === 'string'
      ? metadata.catalog_variant_id
      : bundle.resolvedVariantId;

  return (
    <CoursePlayerShell
      course={course}
      collegeSlug={collegeSlug}
      studentId={studentId}
      learnVariantId={learnVariantId}
      parentCourseTitle={parentCourseTitle}
    >
      {children}
    </CoursePlayerShell>
  );
}

export default async function LearnLayout({ children, params }: LearnLayoutProps) {
  const { collegeSlug, courseId } = await params;

  const ctx = await requireStudent(collegeSlug);

  return (
    <>
      <Script
        src="https://static.tpstreams.com/static/js/player_v2.js"
        strategy="afterInteractive"
      />
      <Suspense fallback={<LearnLayoutSkeleton />}>
        <CoursePlayerLoader
          collegeSlug={collegeSlug}
          courseId={courseId}
          studentId={ctx.studentId}
        >
          {children}
        </CoursePlayerLoader>
      </Suspense>
    </>
  );
}
