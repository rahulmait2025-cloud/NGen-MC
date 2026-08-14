'use client';

import React, { use, Suspense } from 'react';
import Image from 'next/image';
import {
  PlayCircle,
  Video,
  Layers,
  Clock,
  ArrowRight,
  BrainCircuit,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StudentCtaButton } from '@/components/student/ui/student-cta-button';
import { PaidCoursePreviewVideo } from '@/components/student/paid-course-preview-video';
import { cn } from '@/lib/utils';
import type { CourseLandingDetail, JobReadyBootcampLandingMode } from './premium-course-landing-client';

const DEFAULT_LANDING_POSTER =
  'https://lh3.googleusercontent.com/aida/AP1WRLtZxor9NYj8GR_4gppU9T96ZfzZ5xJIYSewfUEQvfVs-nJRF0jIlB0TRProKjbv-MzygGGdCoNsEgemazdXne_gYuBMDJR6i64wnolAPz377HxgLIDuUO4UVS-Qw8eWmY7cU3l0M0o9HbkWrE39fGeoUEzhErdZVs6xrEsSD2EG1mQhv9V7u0BIiex-UT8Z8xs7_V6TNniqgt6SzFeU6NohyyiuDfDCpLxGlTssUmVwJoJz0CmSFoyrvg';

export function LandingPreviewMedia({
  detail,
  className,
  playButtonClassName,
  aspectClassName = 'aspect-video',
  priority = true,
}: {
  detail: CourseLandingDetail;
  className?: string;
  playButtonClassName?: string;
  aspectClassName?: string;
  priority?: boolean;
}) {
  const poster =
    detail.course.preview_poster_url ||
    detail.course.thumbnail_url ||
    DEFAULT_LANDING_POSTER;

  if (detail.course.preview_video_id) {
    return (
      <PaidCoursePreviewVideo
        videoId={detail.course.preview_video_id}
        posterUrl={poster}
        title={detail.course.title}
        className={cn(aspectClassName, className)}
        playButtonClassName={playButtonClassName}
        priority={priority}
      />
    );
  }

  return (
    <div className={cn('relative overflow-hidden', aspectClassName, className)}>
      <Image
        src={poster}
        alt={detail.course.title}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover"
        priority={priority}
      />
    </div>
  );
}

function DynamicHeroCta({
  promise,
  enrollCtaLabel,
  scrollToSection,
}: {
  promise: Promise<{
    hasLearningAccess: boolean;
    learnHref: string;
    progressPercentage: number | null;
  }>;
  enrollCtaLabel: string;
  scrollToSection: (id: string) => void;
}) {
  const data = use(promise);
  const continueCtaLabel = data.progressPercentage ? 'Continue' : 'Start';

  return data.hasLearningAccess ? (
    <StudentCtaButton href={data.learnHref} size="lg" showArrow={false}>
      <PlayCircle className="size-5" />
      {continueCtaLabel}
    </StudentCtaButton>
  ) : (
    <StudentCtaButton
      onClick={() => scrollToSection('enrollment-section')}
      size="lg"
      showArrow={false}
    >
      {enrollCtaLabel}
      <ArrowRight className="size-5" />
    </StudentCtaButton>
  );
}

function HeroCtaSkeleton() {
  return (
    <div className="h-12 w-36 animate-pulse rounded-2xl border border-border/40 bg-muted/30" />
  );
}

export interface PremiumCourseHeroProps {
  detail: CourseLandingDetail;
  jobReadyBootcampMode?: JobReadyBootcampLandingMode;
  heroCtaPromise?: Promise<{
    hasLearningAccess: boolean;
    learnHref: string;
    progressPercentage: number | null;
  }>;
  hasLearningAccess: boolean;
  learnHref: string;
  enrollCtaLabel: string;
  continueCtaLabel: string;
  scrollToSection: (id: string) => void;
}

export function PremiumCourseHero({
  detail,
  jobReadyBootcampMode,
  heroCtaPromise,
  hasLearningAccess,
  learnHref,
  enrollCtaLabel,
  continueCtaLabel,
  scrollToSection,
}: PremiumCourseHeroProps) {
  const courseTitle = detail.course.title;
  const words = courseTitle.split(' ');
  const highlightWord = words[words.length - 1];
  const beforeHighlight = words.slice(0, words.length - 1).join(' ');

  const heroBadgeLabel =
    jobReadyBootcampMode?.heroBadgeLabel ??
    (detail.course.is_free ? 'FREE COURSE' : 'PREMIUM COURSE');

  return (
    <section className="relative flex min-h-[80vh] items-center overflow-hidden pb-16 pt-24">
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <div className="hero-badge flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className="rounded-full border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold tracking-wide text-primary"
            >
              {heroBadgeLabel}
            </Badge>

            {detail.course.level && (
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                {detail.course.level}
              </Badge>
            )}
          </div>

          <h1 className="hero-title landing-heading text-[var(--landing-h1-size)] font-bold leading-[1.08] tracking-tight">
            {beforeHighlight}{' '}
            <span className="hero-highlight hero-badge-motion landing-gradient-highlight-orange relative inline-block overflow-hidden">
              {highlightWord}
            </span>
          </h1>

          <p className="hero-desc max-w-2xl text-xl font-medium leading-relaxed landing-muted">
            {detail.course.short_description ||
              'Master the core concepts, patterns, and real-world execution required to build career-ready engineering proof.'}
          </p>

          <div className="hero-cta flex flex-wrap items-center gap-4">
            {heroCtaPromise ? (
              <Suspense fallback={<HeroCtaSkeleton />}>
                <DynamicHeroCta
                  promise={heroCtaPromise}
                  enrollCtaLabel={enrollCtaLabel}
                  scrollToSection={scrollToSection}
                />
              </Suspense>
            ) : hasLearningAccess ? (
              <StudentCtaButton href={learnHref} size="lg" showArrow={false}>
                <PlayCircle className="size-5" />
                {continueCtaLabel}
              </StudentCtaButton>
            ) : (
              <StudentCtaButton
                onClick={() => scrollToSection('enrollment-section')}
                size="lg"
                showArrow={false}
              >
                {enrollCtaLabel}
                <ArrowRight className="size-5" />
              </StudentCtaButton>
            )}

            <StudentCtaButton
              onClick={() => scrollToSection('curriculum')}
              variant="secondary"
              size="lg"
              showArrow={false}
            >
              View Curriculum
            </StudentCtaButton>
          </div>

          <div className="hero-stats flex flex-wrap items-center gap-8 pt-4 border-t border-border/40">
            <div className="flex items-center gap-2">
              <Video className="size-4 text-primary" />
              <span className="text-sm font-semibold">{detail.video_count} Lectures</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span className="text-sm font-semibold">{detail.module_count} Modules</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <span className="text-sm font-semibold">Self-Paced</span>
            </div>
            <div className="flex items-center gap-2">
              <BrainCircuit className="size-4 text-primary" />
              <span className="text-sm font-semibold">Structured Practice</span>
            </div>
          </div>
        </div>

        <div className="hero-visual group relative">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-3 shadow-2xl transition-all duration-300 group-hover:border-primary/40">
            <LandingPreviewMedia
              detail={detail}
              aspectClassName="aspect-video"
              className="rounded-2xl"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
