'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { LEARNING_FAIL_POINTS, LEARNING_FAILS_SECTION } from './landing-content';
import { LandingSectionShell } from './landing-section-shell';
import { useGsapScrollReveal } from '@/hooks/use-gsap-scroll-reveal';
import { cn } from '@/lib/utils';
import { studentBasePath } from '@/lib/student/student-home-route';

export function LearningFailsSection({ collegeSlug }: { collegeSlug: string }) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const copyRef = useRef<HTMLParagraphElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const { ref: sectionRef } = useGsapScrollReveal({
    children: '.pitfall-card',
    stagger: 0.04,
    from: { opacity: 0, y: 16, scale: 0.99 },
    to: { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out' },
    rootMargin: '0px 0px -12% 0px',
    threshold: 0.04,
  });

  const { ref: textRef } = useGsapScrollReveal({
    from: { opacity: 0, y: 10 },
    to: { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' },
    rootMargin: '0px 0px -12% 0px',
  });

  return (
    <LandingSectionShell alternateBg className="py-12 sm:py-20">
      <div className="mx-auto flex max-w-4xl flex-col gap-12">
        <div ref={textRef} className="flex flex-col items-center gap-4 text-center">
          <div ref={badgeRef} className="inline-flex items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--landing-orange)_30%,var(--landing-border))] bg-[color-mix(in_oklab,var(--landing-orange)_10%,var(--landing-card))] px-4 py-1.5 animate-badge-shimmer animate-badge-pulse-glow">
            <span className="relative flex size-2 shrink-0 mr-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--landing-orange)] opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-[var(--landing-orange)]"></span>
            </span>
            <AlertTriangle className="mr-2 size-3.5 text-[var(--landing-orange)] animate-pulse" />
            <span className="hero-badge-text text-xs font-bold uppercase tracking-wider text-[var(--landing-orange)]">
              Common Pitfalls
            </span>
          </div>
          <h2 ref={headingRef} className="font-heading text-3xl font-bold tracking-tight landing-heading sm:text-4xl lg:text-5xl text-balance max-w-2xl">
            Why Most Students{' '}
            <span className="hero-highlight-wrap relative inline-block">
              <span className="hero-highlight hero-badge-motion landing-gradient-highlight-orange relative inline-block overflow-hidden">
                Get Left Behind
              </span>
            </span>
          </h2>
          <p ref={copyRef} className="max-w-xl text-base leading-relaxed landing-muted sm:text-lg">
            {LEARNING_FAILS_SECTION.subtext}
          </p>
        </div>

        <div ref={sectionRef}>
          <div className="grid grid-cols-1 gap-4 sm:gap-5">
            {LEARNING_FAIL_POINTS.map((point) => (
              <div
                key={point.number}
                className={cn(
                  'pitfall-card group relative overflow-hidden rounded-2xl border bg-[var(--landing-surface)] p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl sm:p-6',
                  'border-[var(--landing-border)] hover:border-[var(--landing-orange)]/30',
                )}
              >
                <div className="flex items-start gap-4 sm:gap-5">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--landing-orange)]/20 to-[var(--landing-orange)]/5 sm:size-14 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <span className="text-lg font-bold text-[var(--landing-orange)] sm:text-xl">
                      {point.number}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <h4 className="mb-2 text-base font-semibold leading-snug landing-heading sm:text-lg">
                      {point.title}
                    </h4>
                    <p className="text-sm leading-relaxed landing-muted">
                      {point.description}
                    </p>
                  </div>
                </div>
                
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[var(--landing-orange)]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
        
        <div ref={footerRef} className="mt-4 text-center">
          <p className="text-sm landing-muted">
            Don&apos;t let this be you.{' '}
            <Link
              href={`${studentBasePath(collegeSlug)}/courses`}
              className="inline-flex items-center gap-1 font-semibold text-[var(--landing-orange)] transition-colors hover:underline"
            >
              See how we solve this
              <ArrowRight className="size-4" />
            </Link>
          </p>
        </div>
      </div>
    </LandingSectionShell>
  );
}
