'use client';

import { type RefObject } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Route, Sparkles } from 'lucide-react';
import { COURSE_LEVELS } from './courses-hub-content';
import { cn } from '@/lib/utils';

interface CoursesHubHeroProps {
  collegeSlug: string;
  showBootcamp?: boolean;
  badgeRef?: RefObject<HTMLDivElement | null>;
  titleRef?: RefObject<HTMLHeadingElement | null>;
  subRef?: RefObject<HTMLParagraphElement | null>;
  ctaRef?: RefObject<HTMLDivElement | null>;
}

export function CoursesHubHero({
  collegeSlug,
  showBootcamp = false,
  badgeRef,
  titleRef,
  subRef,
  ctaRef,
}: CoursesHubHeroProps) {
  const path = (segment: string) => `/c/${collegeSlug}/student/${segment}`;
  const levels = showBootcamp ? COURSE_LEVELS : COURSE_LEVELS.filter((level) => level.id !== 'bootcamp');
  const trustItems = showBootcamp
    ? ['Free entry', 'Curated paid tracks', 'Bootcamp roadmap']
    : ['Free entry', 'Curated paid tracks'];

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20">
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)] lg:gap-16">
        <div className="z-10 space-y-7 text-center lg:text-left">
          <div ref={badgeRef} style={{ opacity: 0 }} className="inline-flex items-center gap-2 rounded-full border border-[var(--landing-orange)]/30 bg-[var(--landing-orange)]/10 px-4 py-1.5 text-xs font-bold text-[var(--landing-orange)] animate-badge-shimmer animate-badge-pulse-glow">
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--landing-orange)] opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-[var(--landing-orange)]"></span>
            </span>
            <Sparkles className="hero-sparkle-icon size-3.5 animate-pulse" />
            <span className="hero-badge-text">Course Hub</span>
          </div>

          <h1 ref={titleRef} style={{ opacity: 0 }} className="text-balance text-[var(--landing-h1-size)] font-bold leading-[var(--landing-h1-leading)] tracking-[var(--landing-h1-tracking)] landing-heading">
            Pick the course path that matches your next level.
          </h1>

          <p ref={subRef} style={{ opacity: 0 }} className="mx-auto max-w-2xl text-pretty text-[var(--landing-body-size)] leading-[var(--landing-body-leading)] landing-muted lg:mx-0">
            {showBootcamp
              ? 'Start free, go deeper with paid courses, or commit to the full bootcamp when you want software-engineer-ready structure.'
              : 'Start free, then go deeper with paid courses when you are ready for curated depth.'}
          </p>

          <div ref={ctaRef} className="flex flex-wrap justify-center gap-3 lg:justify-start">
            <Button asChild size="lg" className="h-12 rounded-xl bg-[var(--landing-orange)] px-7 font-semibold text-white hover:bg-[var(--landing-orange-hover)]">
              <Link href="#course-levels" className="gap-2">
                Compare Levels
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 rounded-xl border-[var(--landing-border)] bg-[var(--landing-card)] px-7 font-semibold landing-heading hover:border-[var(--landing-orange)]/45 hover:text-[var(--landing-orange)]">
              <Link href={path('free-courses')}>View Free Courses</Link>
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-3 text-xs font-semibold landing-muted lg:justify-start">
            {trustItems.map((item) => (
              <span key={item} className="inline-flex items-center gap-2 rounded-full border border-[var(--landing-border)] bg-[var(--landing-card)] px-3 py-1.5">
                <CheckCircle2 className="size-3.5 text-[var(--landing-orange)]" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="gsap-hero-card relative min-h-[410px] w-full overflow-hidden rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-7">
          <div className="relative z-10 flex h-full flex-col gap-4">
            <div className="flex items-center justify-between rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)]/70 p-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--landing-orange)]/10 text-[var(--landing-orange)]">
                  <Route className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold landing-heading">Learning route</p>
                  <p className="text-xs landing-muted">Choose by commitment level</p>
                </div>
              </div>
              <span className="rounded-full bg-[var(--landing-orange)]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--landing-orange)]">
                {levels.length} paths
              </span>
            </div>

            <div className="grid flex-1 gap-4">
              {levels.map((level, index) => {
                const Icon = level.icon;
                return (
                  <Link
                    key={level.id}
                    href={path(level.href)}
                    className={cn(
                      'border-beam-card group relative overflow-hidden rounded-2xl bg-[var(--landing-surface)] p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg',
                    )}
                  >
                    <div className="relative z-10 flex items-center gap-4">
                      <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl border', level.ring)}>
                        <Icon className={cn('size-6', level.tone)} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-[0.14em] landing-muted">Level {index + 1}</span>
                          {level.recommended ? (
                            <span className="hero-badge-motion rounded-full bg-[var(--landing-orange)]/10 px-2 py-0.5 text-xs font-bold text-[var(--landing-orange)]">
                              guided
                            </span>
                          ) : null}
                        </div>
                        <h3 className="mt-1 text-lg font-bold landing-heading">{level.title}</h3>
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed landing-muted">{level.summary}</p>
                      </div>
                      <ArrowRight className="size-5 shrink-0 text-[var(--landing-orange)] opacity-0 transition duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
