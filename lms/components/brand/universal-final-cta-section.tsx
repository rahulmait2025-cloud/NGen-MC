'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

export interface UniversalFinalCtaSectionProps {
  collegeSlug: string;
  badgeText?: string;
  heading?: string;
  subtext?: string;
  primaryCta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryCta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  trustBadgeLeft?: string;
  trustBadgeRight?: string;
  dotsLabel?: string;
  className?: string;
}

export function UniversalFinalCtaSection({
  collegeSlug,
  badgeText = 'Limited Seats Open',
  heading = 'Ready to transform your tech career?',
  subtext = 'Start with free courses or move into a structured learning journey when you are ready.',
  primaryCta,
  secondaryCta,
  trustBadgeLeft = 'No credit card required',
  trustBadgeRight = 'Start for free',
  dotsLabel = 'Join 100K+ learners',
  className,
}: UniversalFinalCtaSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const badgeRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLDivElement>(null);
  const ctaRowRef = useRef<HTMLDivElement>(null);
  const trustRowRef = useRef<HTMLDivElement>(null);
  const dotsRowRef = useRef<HTMLDivElement>(null);
  const orbARef = useRef<HTMLDivElement>(null);
  const orbBRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sweepRef = useRef<HTMLDivElement>(null);

  // Default CTAs if not provided
  const effectivePrimaryLabel = primaryCta?.label ?? 'Get Started Now';
  const effectivePrimaryHref = primaryCta?.href ?? `/c/${collegeSlug}/student/paid-courses`;

  const effectiveSecondaryLabel = secondaryCta?.label ?? 'View Curriculum';
  const effectiveSecondaryHref = secondaryCta?.href ?? `/c/${collegeSlug}/student/courses`;

  useEffect(() => {
    if (prefersReducedMotion || !sectionRef.current) return;

    let ctx: { revert: () => void } | null = null;
    let observer: IntersectionObserver | null = null;
    let active = true;

    async function init() {
      const gsapModule = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      if (!active || !sectionRef.current) return;
      const { gsap } = gsapModule;
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        const EASE = 'power3.out';

        const tl = gsap.timeline({ defaults: { ease: EASE } });

        tl.fromTo(badgeRef.current, { opacity: 0, y: 14, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.45 }, 0.05)
          .fromTo(headingRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.55 }, 0.12)
          .fromTo(subtextRef.current, { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: 0.45 }, 0.22)
          .fromTo(ctaRowRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45 }, 0.32)
          .fromTo(trustRowRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4 }, 0.42)
          .fromTo(dotsRowRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 }, 0.5);

        // Staggered dot bounce-in
        dotRefs.current.forEach((dot, i) => {
          if (!dot) return;
          tl.fromTo(
            dot,
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2.5)' },
            0.56 + i * 0.06
          );
        });

        // Gradient sweep across heading
        if (sweepRef.current) {
          tl.fromTo(
            sweepRef.current,
            { x: '-100%', opacity: 0.6 },
            { x: '200%', opacity: 0, duration: 1.2, ease: 'power2.inOut' },
            0.3
          );
        }

        // Floating orbs — yoyo continuous animation
        gsap.to(orbARef.current, {
          y: -22,
          x: 16,
          duration: 6,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
        gsap.to(orbBRef.current, {
          y: 18,
          x: -14,
          duration: 7.5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 2,
        });

        // Scroll-driven parallax if inside a landing shell
        const landingShell = document.querySelector('.landing-shell');
        if (landingShell) {
          gsap.to(orbARef.current, {
            y: -40,
            ease: 'none',
            scrollTrigger: {
              trigger: sectionRef.current,
              scroller: landingShell,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 2,
            },
          });
          gsap.to(orbBRef.current, {
            y: 30,
            ease: 'none',
            scrollTrigger: {
              trigger: sectionRef.current,
              scroller: landingShell,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 2.5,
            },
          });
        }
      }, sectionRef);
    }

    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              init();
              observer?.disconnect();
            }
          });
        },
        { threshold: 0.15 }
      );
      if (sectionRef.current) {
        observer.observe(sectionRef.current);
      }
    } else {
      init();
    }

    return () => {
      active = false;
      observer?.disconnect();
      if (ctx) ctx.revert();
    };
  }, [prefersReducedMotion]);

  return (
    <section className={cn('relative w-full py-10 sm:py-14', className)}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={sectionRef}
          className="relative overflow-hidden rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-6 sm:p-10 lg:py-16 shadow-[0_18px_48px_-28px_color-mix(in_oklab,var(--landing-fg)_18%,transparent)]"
        >
          {/* Floating orbs */}
          <div
            ref={orbARef}
            className="absolute -right-16 -top-16 size-80 rounded-full"
            style={{ background: 'var(--landing-orange)', opacity: 0.07 }}
            aria-hidden="true"
          />
          <div
            ref={orbBRef}
            className="absolute -bottom-16 -left-16 size-80 rounded-full"
            style={{ background: 'var(--landing-accent-teal)', opacity: 0.07 }}
            aria-hidden="true"
          />

          <div className="relative z-10 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col justify-center">
              <div
                ref={badgeRef}
                className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--landing-orange)_30%,var(--landing-border))] bg-[color-mix(in_oklab,var(--landing-orange)_10%,var(--landing-card))] px-4 py-1.5 animate-badge-shimmer animate-badge-pulse-glow"
              >
                <span className="relative flex size-3.5 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-[var(--landing-orange)]/60 opacity-75" />
                  <Zap className="size-3.5 text-[var(--landing-orange)] animate-pulse" />
                </span>
                <span className="hero-badge-text text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--landing-orange)]">
                  {badgeText}
                </span>
              </div>

              <h2
                ref={headingRef}
                className="relative text-3xl font-bold tracking-tight landing-heading sm:text-4xl lg:text-5xl overflow-hidden leading-[1.12]"
              >
                {heading}
                {/* Gradient sweep effect */}
                <div
                  ref={sweepRef}
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(249,115,22,0.3), transparent)',
                    width: '50%',
                  }}
                  aria-hidden="true"
                />
              </h2>
            </div>

            <div className="flex flex-col justify-center gap-6">
              <div ref={subtextRef} className="relative">
                <div
                  className="absolute -left-4 top-0 h-full w-1 rounded-full bg-gradient-to-b from-[var(--landing-orange)] via-[var(--landing-accent-teal)] to-transparent"
                  aria-hidden="true"
                />
                <p className="pl-6 text-base leading-relaxed text-[color-mix(in_oklab,var(--landing-fg)_88%,var(--landing-muted))] sm:text-lg">
                  {subtext}
                </p>
              </div>

              <div ref={ctaRowRef} className="flex flex-wrap items-center gap-4">
                {primaryCta?.onClick ? (
                  <button
                    onClick={primaryCta.onClick}
                    className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--landing-orange)] px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-[var(--landing-orange)]/25 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[var(--landing-orange)]/90 hover:shadow-2xl hover:shadow-[var(--landing-orange)]/40 active:translate-y-0"
                  >
                    {effectivePrimaryLabel}
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                  </button>
                ) : (
                  <Link
                    href={effectivePrimaryHref}
                    className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--landing-orange)] px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-[var(--landing-orange)]/25 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[var(--landing-orange)]/90 hover:shadow-2xl hover:shadow-[var(--landing-orange)]/40 active:translate-y-0"
                  >
                    {effectivePrimaryLabel}
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                  </Link>
                )}

                {secondaryCta?.onClick ? (
                  <button
                    onClick={secondaryCta.onClick}
                    className="group inline-flex items-center gap-2 rounded-2xl border-2 border-[var(--landing-border)] bg-transparent px-7 py-3.5 text-base font-medium landing-heading transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--landing-accent-teal)]/50 hover:bg-[var(--landing-accent-teal)]/5 hover:text-[var(--landing-accent-teal)] active:translate-y-0"
                  >
                    {effectiveSecondaryLabel}
                    <ArrowRight className="size-4 text-[var(--landing-accent-teal)] transition-transform duration-300 group-hover:translate-x-1.5" />
                  </button>
                ) : (
                  <Link
                    href={effectiveSecondaryHref}
                    className="group inline-flex items-center gap-2 rounded-2xl border-2 border-[var(--landing-border)] bg-transparent px-7 py-3.5 text-base font-medium landing-heading transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--landing-accent-teal)]/50 hover:bg-[var(--landing-accent-teal)]/5 hover:text-[var(--landing-accent-teal)] active:translate-y-0"
                  >
                    {effectiveSecondaryLabel}
                    <ArrowRight className="size-4 text-[var(--landing-accent-teal)] transition-transform duration-300 group-hover:translate-x-1.5" />
                  </Link>
                )}
              </div>

              <div
                ref={trustRowRef}
                className="flex items-center gap-6 text-xs text-[color-mix(in_oklab,var(--landing-fg)_72%,var(--landing-muted))]"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-[var(--landing-orange)]" />
                  {trustBadgeLeft}
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-[var(--landing-accent-teal)]" />
                  {trustBadgeRight}
                </span>
              </div>

              <div ref={dotsRowRef} className="mt-1 flex items-center gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    ref={(el) => {
                      dotRefs.current[i] = el;
                    }}
                    className={cn(
                      'size-2 rounded-full',
                      i % 2 === 0
                        ? 'bg-[var(--landing-orange)]'
                        : 'bg-[var(--landing-accent-teal)]'
                    )}
                  />
                ))}
                <span className="ml-1 text-xs font-medium text-[var(--landing-orange)]">
                  {dotsLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
