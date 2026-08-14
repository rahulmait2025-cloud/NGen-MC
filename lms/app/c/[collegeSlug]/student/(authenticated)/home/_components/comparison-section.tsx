'use client';

import { Check, X, ArrowRight, Sparkles } from 'lucide-react';
import { COMPARISON_PATHS, COMPARISON_SECTION } from './landing-content';
import { LandingSectionShell } from './landing-section-shell';

interface ComparisonSectionProps {
  bootcampPillarHref: string;
}

export function ComparisonSection({ bootcampPillarHref }: ComparisonSectionProps) {
  const selfTaught = COMPARISON_PATHS.find((p) => p.id === 'self-taught')!;
  const careerReady = COMPARISON_PATHS.find((p) => p.id === 'career-readiness')!;
  const ctaHref = bootcampPillarHref;

  return (
    <LandingSectionShell className="py-12 sm:py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight landing-heading sm:text-3xl lg:text-4xl">
            {COMPARISON_SECTION.heading}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <div>
            <div className="flex h-full flex-col gap-5 rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)] p-6 transition-all duration-300 hover:shadow-lg sm:p-8">
              <div>
                <span className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--landing-muted)]">
                  <X className="size-3.5 text-rose-500" />
                  <span>The Old Way</span>
                </span>
                <h3 className="text-xl font-bold landing-heading sm:text-2xl">{selfTaught.title}</h3>
                <p className="mt-2 text-sm landing-muted">{selfTaught.subtitle}</p>
              </div>
              <ul className="flex flex-1 flex-col gap-3">
                {selfTaught.points.map((point) => (
                  <li key={point.text} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10">
                      <X className="size-3 text-rose-500" strokeWidth={2.5} />
                    </span>
                    <span className="text-sm sm:text-base landing-muted">{point.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <div className="group relative flex h-full flex-col gap-5 overflow-hidden rounded-2xl border-2 border-[var(--landing-orange)]/50 bg-gradient-to-br from-[var(--landing-orange)]/8 via-[var(--landing-surface)] to-[var(--landing-surface-elevated)] p-6 shadow-xl shadow-[var(--landing-orange)]/10 transition-all duration-300 hover:shadow-2xl hover:shadow-[var(--landing-orange)]/15 sm:p-8">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--landing-orange)]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
              
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <span className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--landing-orange)]">
                    <Sparkles className="size-3.5" />
                    <span>Career Ready</span>
                  </span>
                  <h3 className="text-xl font-bold text-[var(--landing-orange)] sm:text-2xl">{careerReady.title}</h3>
                  <p className="mt-2 text-sm landing-muted">{careerReady.subtitle}</p>
                </div>
              </div>
              
              <ul className="relative z-10 flex flex-1 flex-col gap-3">
                {careerReady.points.map((point) => (
                  <li key={point.text} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--landing-orange)]/15">
                      <Check className="size-3 text-[var(--landing-orange)]" strokeWidth={2.5} />
                    </span>
                    <span className="text-sm font-medium sm:text-base landing-heading">{point.text}</span>
                  </li>
                ))}
              </ul>
              
              {careerReady.footerNote ? (
                <p className="relative z-10 text-sm italic landing-muted">{careerReady.footerNote}</p>
              ) : null}
              
              <div className="relative z-10 mt-2">
                <a
                  href={ctaHref}
                  className="group/btn flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--landing-orange)] px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_color-mix(in_oklab,var(--landing-orange)_35%,transparent)] transition-transform duration-200 ease-out hover:gap-3 hover:shadow-[0_0_30px_color-mix(in_oklab,var(--landing-orange)_50%,transparent)] active:scale-[0.98]"
                >
                  {careerReady.ctaLabel}
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LandingSectionShell>
  );
}
