'use client';

import dynamic from 'next/dynamic';
import { BEST_COURSES_SECTION } from './landing-content';
import { LandingSectionShell } from './landing-section-shell';
import type { LandingCourseCard } from './landing-data-types';
import { studentBasePath } from '@/lib/student/student-home-route';
import { ArrowRight } from 'lucide-react';

const BestCoursesMarquee = dynamic(
  () => import('./best-courses-marquee').then((m) => m.BestCoursesMarquee),
  { ssr: false },
);

interface BestCoursesSectionProps {
  collegeSlug: string;
  courses: LandingCourseCard[];
}

export function BestCoursesSection({ collegeSlug, courses }: BestCoursesSectionProps) {
  if (courses.length === 0) return null;

  return (
    <LandingSectionShell className="py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2 max-w-2xl">
          <h2 className="font-display text-2xl font-bold tracking-tight landing-heading sm:text-3xl lg:text-4xl text-balance">
            {BEST_COURSES_SECTION.heading}
          </h2>
          <p className="text-sm landing-muted sm:text-base">
            {BEST_COURSES_SECTION.subtext}
          </p>
        </div>
        <a
          href={`${studentBasePath(collegeSlug)}/paid-courses`}
          className="group inline-flex items-center gap-2 text-sm font-semibold text-[var(--landing-orange)] transition-[gap] duration-200 ease-out hover:gap-3"
        >
          Explore All Courses
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </a>
      </div>

      <div>
        <BestCoursesMarquee courses={courses} />
      </div>
    </LandingSectionShell>
  );
}
