'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, Video, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CoursesRing } from './courses-ring';
import { StaggerReveal, StaggerChild } from '@/components/_animations/stagger-reveal';
import type { DashboardCourseRow } from '../page';
import { cn } from '@/lib/utils';

interface DashboardCoursesProps {
  courses: DashboardCourseRow[];
  collegeSlug: string;
}

function DashboardCoursesBase({ courses, collegeSlug }: DashboardCoursesProps) {
  if (courses.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">My Courses</h2>
        </div>
        <EmptyState
          icon={<BookOpen />}
          title="No courses yet"
          description="Enroll in courses from the catalog to track your progress here."
          action={
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href={`/c/${collegeSlug}/student/courses`}>
                Browse courses
                <ArrowRight className="size-3.5 ml-1" />
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">My Courses</h2>
        <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-primary hover:text-primary/80 -mr-1">
          <Link href={`/c/${collegeSlug}/student/my-courses`}>
            View all
            <ArrowRight className="size-3.5 ml-1" />
          </Link>
        </Button>
      </div>

      <StaggerReveal
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        stagger={0.05}
        delay={0.15}
      >
        {courses.slice(0, 6).map((course) => {
          const pct = Math.round(course.progressPercentage);
          const isStarted = course.progressPercentage > 0;

          return (
            <StaggerChild key={course.id}>
              <Link
                href={course.learnHref}
                className="group block rounded-2xl border border-border/60 bg-card p-4 dashboard-card-hover hover:border-primary/20"
              >
                <div className="flex items-start gap-3.5">
                  <div className="relative shrink-0">
                    <CoursesRing
                      value={course.progressPercentage}
                      size={52}
                      strokeWidth={4}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums text-foreground">
                      {pct}%
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/70 truncate">
                      {course.pillarTitle}
                    </p>
                    <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    {course.sourceLabel && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {course.sourceLabel}
                      </p>
                    )}
                    {course.daysUntilExpiry != null && course.daysUntilExpiry <= 30 && course.daysUntilExpiry > 0 && (
                      <p className={cn(
                        'text-[11px] font-medium flex items-center gap-1',
                        course.daysUntilExpiry <= 7 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400',
                      )}>
                        <Clock className="size-3" />
                        Expires in {course.daysUntilExpiry} days
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="size-3" />
                      {course.moduleCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Video className="size-3" />
                      {course.videoCount}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    {isStarted ? 'Continue' : 'Start'} →
                  </span>
                </div>
              </Link>
            </StaggerChild>
          );
        })}
      </StaggerReveal>
    </div>
  );
}

export const DashboardCourses = React.memo(DashboardCoursesBase);
