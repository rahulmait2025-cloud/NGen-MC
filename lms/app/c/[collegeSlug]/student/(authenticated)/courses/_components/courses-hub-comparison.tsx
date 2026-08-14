'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COURSE_LEVELS } from './courses-hub-content';

export function CoursesHubComparison({
  collegeSlug,
  showBootcamp = false,
}: {
  collegeSlug: string;
  showBootcamp?: boolean;
}) {
  const path = (segment: string) => `/c/${collegeSlug}/student/${segment}`;
  const levels = showBootcamp ? COURSE_LEVELS : COURSE_LEVELS.filter((level) => level.id !== 'bootcamp');

  return (
    <section id="course-levels" className="course-level-story scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)] lg:gap-14">
        <div className="course-level-visual self-start lg:sticky lg:top-24">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-8">
            <div className="relative z-10 space-y-8">
              <div className="space-y-4">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--landing-orange)_30%,var(--landing-border))] bg-[color-mix(in_oklab,var(--landing-orange)_10%,var(--landing-card))] px-4 py-1.5 animate-badge-shimmer animate-badge-pulse-glow text-xs font-bold uppercase tracking-[0.14em] text-[var(--landing-orange)]">
                  <span className="relative flex size-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--landing-orange)] opacity-75"></span>
                    <span className="relative inline-flex size-2 rounded-full bg-[var(--landing-orange)]"></span>
                  </span>
                  <span className="hero-badge-motion">Path selector</span>
                </span>
                <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight landing-heading sm:text-4xl">
                  {showBootcamp ? 'Three ways to learn. One clear progression.' : 'Two ways to learn. One clear progression.'}
                </h2>
                <p className="text-pretty text-base leading-relaxed landing-muted">
                  The page now explains the offer by commitment level instead of presenting courses as a flat catalog.
                </p>
              </div>

              <div className="relative pl-8">
                <div className="absolute left-3 top-2 h-[calc(100%-1rem)] w-px bg-[var(--landing-border)]" aria-hidden="true">
                  <div className="course-level-progress h-0 w-px bg-[var(--landing-orange)]" />
                </div>
                <div className="space-y-5">
                  {levels.map((level, index) => {
                    const Icon = level.icon;
                    return (
                      <a key={level.id} href={`#level-${level.id}`} className="group flex items-center gap-4">
                        <span className={cn('relative z-10 flex size-7 items-center justify-center rounded-full border text-xs font-bold', level.ring, level.tone)}>
                          {index + 1}
                        </span>
                        <span className="flex min-w-0 items-center gap-3">
                          <Icon className={cn('size-4 shrink-0', level.tone)} />
                          <span className="text-sm font-semibold landing-heading group-hover:text-[var(--landing-orange)]">{level.shortTitle}</span>
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:space-y-8">
          {levels.map((level, index) => {
            const Icon = level.icon;
            return (
              <article
                id={`level-${level.id}`}
                key={level.id}
                className="course-level-card relative overflow-hidden scroll-mt-28 rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-6 sm:p-8 lg:min-h-[62vh] lg:p-10"
              >
                <div className="relative z-10 grid min-h-full grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
                  <div className="space-y-7">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={cn('inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold animate-badge-shimmer animate-badge-pulse-glow', level.ring, level.tone)}>
                        <span className="relative flex size-2 shrink-0">
                          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', level.tone.includes('emerald') ? 'bg-emerald-500' : level.tone.includes('sky') ? 'bg-sky-500' : 'bg-[var(--landing-orange)]')}></span>
                          <span className={cn('relative inline-flex size-2 rounded-full', level.tone.includes('emerald') ? 'bg-emerald-500' : level.tone.includes('sky') ? 'bg-sky-500' : 'bg-[var(--landing-orange)]')}></span>
                        </span>
                        <Icon className="size-3.5 animate-pulse" />
                        Level {index + 1}: {level.eyebrow}
                      </span>
                      {level.recommended ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--landing-orange)]/30 bg-[var(--landing-orange)]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--landing-orange)] animate-badge-shimmer animate-badge-pulse-glow">
                          <span className="relative flex size-2 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--landing-orange)] opacity-75"></span>
                            <span className="relative inline-flex size-2 rounded-full bg-[var(--landing-orange)]"></span>
                          </span>
                          most guided
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-balance text-3xl font-bold tracking-tight landing-heading sm:text-4xl lg:text-5xl">
                        {level.title}
                      </h3>
                      <p className="max-w-2xl text-pretty text-base leading-relaxed landing-muted sm:text-lg">
                        {level.description}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {level.includes.map((item) => (
                        <div key={item} className="rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)]/70 p-4">
                          <CheckCircle2 className={cn('mb-3 size-4', level.tone)} />
                          <p className="text-sm font-semibold leading-snug landing-heading">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-5 rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)]/80 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] landing-muted">Outcome</p>
                    <p className="text-sm font-semibold leading-relaxed landing-heading">{level.outcome}</p>
                    <Link
                      href={path(level.href)}
                      className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--landing-orange)] px-5 py-3 text-sm font-bold text-white transition duration-300 hover:bg-[var(--landing-orange-hover)] active:scale-[0.98]"
                    >
                      {level.cta}
                      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
