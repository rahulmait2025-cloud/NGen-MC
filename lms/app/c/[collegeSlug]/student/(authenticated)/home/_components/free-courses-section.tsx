'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Loader2, PlayCircle, Youtube } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { YouTubeThumbnail } from '@/components/student/youtube-thumbnail';
import { LandingSectionShell } from './landing-section-shell';
import { LandingReveal, LandingRevealItem } from './landing-motion';
import type { LandingFreeCourseCard } from './landing-data-types';
import { studentBasePath } from '@/lib/student/student-home-route';
import { StudentCtaButton } from '@/components/student/ui/student-cta-button';
import { enrollFreeDbCourseAction } from '@/app/c/[collegeSlug]/student/(authenticated)/free-courses/actions';
import { useAuthGate } from '@/hooks/use-auth-gate';
import { cn } from '@/lib/utils';

const FREE_COURSES_SECTION = {
  heading: 'Start Free. Upgrade When You\'re Ready.',
  subtext: 'Curated YouTube playlists — no payment required to begin learning.',
} as const;

interface FreeCoursesSectionProps {
  collegeSlug: string;
  courses: LandingFreeCourseCard[];
}

export function FreeCoursesSection({ collegeSlug, courses }: FreeCoursesSectionProps) {
  const router = useRouter();
  const { requireAuth } = useAuthGate();
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  if (courses.length === 0) return null;

  async function handleStartLearning(course: LandingFreeCourseCard) {
    if (course.isEnrolled) {
      router.push(course.href);
      return;
    }

    if (!requireAuth({
      intent: 'Enroll',
      returnTo: typeof window !== 'undefined' ? window.location.href : '',
    })) {
      return;
    }

    // YouTube playlist routes already show the enroll gate — navigate there.
    if (course.source === 'youtube') {
      router.push(course.href);
      return;
    }

    setEnrollingId(course.id);
    try {
      const res = await enrollFreeDbCourseAction(collegeSlug, course.id);
      if (res.ok) {
        toast.success('Enrolled successfully.');
        router.push(
          `/c/${encodeURIComponent(collegeSlug)}/student/payment-success?courseId=${encodeURIComponent(course.id)}&enrollment=free`,
        );
      } else {
        toast.error(res.error || 'Enrollment failed');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setEnrollingId(null);
    }
  }

  return (
    <LandingSectionShell className="py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-bold tracking-tight landing-heading sm:text-3xl text-balance">
            {FREE_COURSES_SECTION.heading}
          </h2>
          <p className="max-w-2xl text-sm landing-muted sm:text-base">
            {FREE_COURSES_SECTION.subtext}
          </p>
        </div>
        <div className="shrink-0">
          <StudentCtaButton href={`${studentBasePath(collegeSlug)}/free-courses`} showArrow={false}>
            Explore All Courses
          </StudentCtaButton>
        </div>
      </div>

      <LandingReveal staggerChildren={0.07}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const isEnrolling = enrollingId === course.id;
            const cardClassName = cn(
              'group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60',
              'transition-transform duration-200 ease-out hover:-translate-y-1 hover:border-[var(--landing-orange)]/30',
              'hover:shadow-xl hover:shadow-[var(--landing-orange)]/5',
              'relative w-full text-left',
            );

            const cardBody = (
              <>
                <div className="relative aspect-video w-full bg-[var(--landing-surface)] overflow-hidden">
                  {course.thumbnail ? (
                    <YouTubeThumbnail
                      src={course.thumbnail}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-[var(--landing-orange)]/10 to-[var(--landing-surface)]">
                      <Youtube className="size-12 text-[var(--landing-orange)]/50" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <Badge className="absolute left-3 top-3 inline-flex min-h-7 items-center gap-1.5 rounded-full border-0 bg-[var(--landing-orange)] px-3.5 py-1.5 text-[10px] font-bold uppercase leading-none tracking-[0.04em] text-white shadow-sm shadow-black/20 transition-transform duration-300 group-hover:scale-105">
                    <Youtube className="size-3.5 shrink-0" />
                    Free on YouTube
                  </Badge>

                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-medium text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <PlayCircle className="size-3.5" />
                    Watch Now
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2.5 p-5 sm:p-5">
                  <h3 className="font-semibold leading-snug landing-heading transition-colors duration-200 line-clamp-2 group-hover:text-[var(--landing-orange)]">
                    {course.title}
                  </h3>
                  <p className="text-sm leading-relaxed landing-muted line-clamp-2">
                    {course.description}
                  </p>

                  <div className="mt-auto flex items-center justify-between pt-2">
                    {typeof course.videoCount === 'number' && course.videoCount > 0 ? (
                      <p className="flex items-center gap-1.5 text-xs landing-muted">
                        <PlayCircle className="size-3.5 text-[var(--landing-accent-teal)]" />
                        {course.videoCount} videos
                      </p>
                    ) : (
                      <div />
                    )}
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--landing-orange)]">
                      {isEnrolling ? (
                        <>
                          <div className="animate-spin"><Loader2 className="size-4" /></div>
                          Enrolling...
                        </>
                      ) : course.isEnrolled ? (
                        <>
                          Start Learning
                          <ChevronRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </>
                      ) : (
                        <>
                          Enroll Free
                          <ChevronRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </>
            );

            return (
              <LandingRevealItem key={course.id} className="h-full">
                {course.isEnrolled ? (
                  <Link href={course.href} className={cardClassName}>
                    {cardBody}
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={isEnrolling}
                    onClick={() => void handleStartLearning(course)}
                    className={cardClassName}
                  >
                    {cardBody}
                  </button>
                )}
              </LandingRevealItem>
            );
          })}
        </div>
      </LandingReveal>
    </LandingSectionShell>
  );
}
