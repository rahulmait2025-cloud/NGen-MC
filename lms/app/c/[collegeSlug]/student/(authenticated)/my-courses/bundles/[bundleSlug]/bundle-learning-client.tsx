'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BookOpen, CheckCircle2, Package, Play } from 'lucide-react';
import type { BundleLearningPageData } from '@/lib/services/bundle-learning';
import { Progress } from '@/components/ui/progress';

interface BundleLearningClientProps {
  collegeSlug: string;
  data: BundleLearningPageData;
}

export function BundleLearningClient({ collegeSlug, data }: BundleLearningClientProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <Link
          href={`/c/${collegeSlug}/student/my-courses`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to My Courses
        </Link>
      </div>

      <header className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              <Package className="size-7" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{data.sourceLabel}</p>
              <h1 className="text-2xl font-semibold tracking-tight">{data.title}</h1>
              <p className="text-sm text-muted-foreground max-w-2xl">{data.description}</p>
            </div>
          </div>
          <span className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
            {data.courseCount} course{data.courseCount === 1 ? '' : 's'}
          </span>
        </div>

        {data.progressPercentage > 0 ? (
          <div className="space-y-2 max-w-md">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Bundle progress</span>
              <span className="font-semibold text-foreground">{data.progressPercentage}%</span>
            </div>
            <Progress value={data.progressPercentage} className="h-2" />
          </div>
        ) : null}
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Courses in this bundle</h2>
        {data.courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No courses are connected to this bundle yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {data.courses.map((course) => (
              <Link
                key={course.courseId}
                href={course.learnHref}
                className="group flex gap-4 rounded-xl border border-border/60 bg-card p-4 hover:border-primary/25 hover:shadow-md transition-[box-shadow,border-color]"
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-primary/[0.02]">
                  {course.thumbnailUrl ? (
                    <Image
                      src={course.thumbnailUrl}
                      alt={course.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <BookOpen className="size-6 text-primary/30" />
                    </div>
                  )}
                  <span className="absolute left-1.5 top-1.5 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {course.sequence}
                  </span>
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {course.title}
                    </h3>
                    {course.accessScope === 'partial' ? (
                      <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        Partial access
                      </span>
                    ) : null}
                  </div>

                  {course.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="size-3" />
                      {course.moduleCount} modules
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Play className="size-3" />
                      {course.lessonCount} lessons
                    </span>
                  </div>

                  {course.progressPercentage > 0 ? (
                    <div className="flex items-center gap-2 max-w-xs">
                      <Progress value={course.progressPercentage} className="h-1.5 flex-1" />
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
                        <CheckCircle2 className="size-3" />
                        {course.progressPercentage}%
                      </span>
                    </div>
                  ) : null}

                  <p className="text-xs font-semibold text-primary inline-flex items-center gap-1">
                    {course.progressPercentage > 0 ? 'Continue' : 'Start'}
                    <Play className="size-3" />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
