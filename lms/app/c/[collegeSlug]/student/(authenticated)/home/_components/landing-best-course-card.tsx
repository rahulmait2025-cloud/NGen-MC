'use client';

import Image from 'next/image';
import { Clock, Globe, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StudentCtaButton } from '@/components/student/ui/student-cta-button';
import { LandingCourseVisual } from './landing-course-visual';
import type { LandingCourseCard } from './landing-data-types';
import type { BestCourseBadgeVariant } from './landing-content';
import { cn } from '@/lib/utils';

const BADGE_STYLES: Record<BestCourseBadgeVariant, string> = {
  popular: 'bg-primary text-primary-foreground border-0',
  free: 'bg-muted text-muted-foreground border border-border',
  career: 'bg-card text-foreground border border-border',
  new: 'bg-teal-500/10 text-teal-600 border border-teal-500/30 dark:text-teal-400',
  practice: 'bg-amber-500/10 text-amber-600 border border-amber-500/30',
  unlocked: 'bg-emerald-600 text-white border border-emerald-500/70 shadow-sm shadow-emerald-950/15',
  premium: 'bg-muted text-muted-foreground border border-border',
};

const FALLBACK_TAGS = ['Career', 'Self-paced'];

function sanitizeCourse(course: LandingCourseCard) {
  const title = course.title?.trim() || 'Featured Course';
  const description =
    course.description?.trim() ||
    'Structured lessons and projects to build job-ready skills at your pace.';
  const tags =
    course.tags?.filter((t) => t?.trim()).slice(0, 3) ?? [];
  const safeTags = tags.length > 0 ? tags : FALLBACK_TAGS;
  const duration = course.duration?.trim() || 'Self-paced';
  const language = course.language?.trim() || 'English';
  const badges = course.badges?.length
    ? course.badges.slice(0, 2)
    : [{ label: 'Featured', variant: 'popular' as const }];

  return { title, description, tags: safeTags, duration, language, badges };
}

interface LandingBestCourseCardProps {
  course: LandingCourseCard;
  className?: string;
}

export function LandingBestCourseCard({ course, className }: LandingBestCourseCardProps) {
  const safe = sanitizeCourse(course);

  return (
    <article
      className={cn(
        'group/card flex h-full min-h-[560px] w-[min(88vw,380px)] shrink-0 flex-col rounded-2xl border border-border/60 sm:min-h-[580px] sm:w-[380px]',
        className,
      )}
    >
      <div className="relative shrink-0 overflow-hidden rounded-t-2xl">
        {course.thumbnailUrl ? (
          <div className="relative h-52 overflow-hidden bg-[var(--landing-surface)] sm:h-56 landing-best-course-visual">
            <Image
              src={course.thumbnailUrl}
              alt={safe.title}
              fill
              sizes="(max-width: 640px) 88vw, 380px"
              className="object-cover transition-transform duration-300 ease-out group-hover/card:scale-105"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <LandingCourseVisual
            gradient={course.gradient}
            title={safe.title}
            className="landing-best-course-visual"
          />
        )}
        <div className="absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 z-10">
          {safe.badges.map((badge) => (
            <Badge
              key={`${course.id}-${badge.label}`}
              className={cn(
                'text-[10px] font-bold uppercase tracking-wider transition-all duration-300 group-hover/card:scale-105 animate-badge-shimmer',
                badge.variant === 'unlocked' && 'ring-1 ring-white/45 animate-badge-pulse-glow',
                badge.variant === 'popular' && 'animate-badge-pulse-glow',
                BADGE_STYLES[badge.variant],
              )}
            >
              {(badge.variant === 'unlocked' || badge.variant === 'popular' || badge.variant === 'new') && (
                <span className="relative mr-1.5 flex size-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75"></span>
                  <span className="relative inline-flex size-1.5 rounded-full bg-current"></span>
                </span>
              )}
              {badge.label}
            </Badge>
          ))}
        </div>
        <div className="absolute bottom-4 right-4 flex max-w-[45%] items-center gap-1 truncate rounded bg-card/90 px-2 py-1 text-[11px] font-medium landing-heading border border-border/60 sm:text-xs">
          <Globe className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">{safe.language}</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-5 pb-6 sm:gap-3 sm:p-6 sm:pb-6">
        <div className="flex h-7 shrink-0 flex-wrap gap-1.5 overflow-hidden">
          {safe.tags.map((tag) => (
            <span
              key={tag}
              className="max-w-full truncate rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        <h3 className="line-clamp-2 shrink-0 text-lg font-semibold leading-snug tracking-tight landing-heading sm:text-xl">
          {safe.title}
        </h3>
        <p className="line-clamp-3 min-h-0 flex-1 text-sm leading-relaxed landing-muted">
          {safe.description}
        </p>
        <div className="flex shrink-0 items-center gap-4 border-t border-[var(--landing-border)] pt-3 text-sm landing-muted">
          <span className="flex min-w-0 items-center gap-1 truncate">
            <PlayCircle className="size-4 shrink-0 text-primary" />
            <span className="truncate">{safe.duration}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <Clock className="size-4 text-[var(--landing-accent-teal)]" />
            Self-paced
          </span>
        </div>
        <div className="mt-auto shrink-0 pt-2">
          <StudentCtaButton href={course.href} className="w-full">
            {course.ctaLabel}
          </StudentCtaButton>
        </div>
      </div>
    </article>
  );
}
