'use client';

import { useRef, useEffect } from 'react';
import { BookOpen, Code2, Users, Trophy, Rocket, Shield } from 'lucide-react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Structured Curriculum',
    description: 'Every module follows a clear sequence — no more guessing what to learn next.',
    iconColor: 'text-[var(--landing-orange)]',
    iconBg: 'bg-[var(--landing-orange)]/10',
  },
  {
    icon: Code2,
    title: 'Project-First Learning',
    description: 'Build real applications from day one. Learn by doing, not just watching.',
    iconColor: 'text-[var(--landing-accent-teal)]',
    iconBg: 'bg-[var(--landing-accent-teal)]/10',
  },
  {
    icon: Users,
    title: 'Live Mentorship',
    description: "Get guidance from industry practitioners who've built what you're learning.",
    iconColor: 'text-[var(--landing-orange)]',
    iconBg: 'bg-[var(--landing-orange)]/10',
  },
  {
    icon: Trophy,
    title: 'Profile Building',
    description: 'GitHub repos, LinkedIn optimization, and resume-ready projects.',
    iconColor: 'text-[var(--landing-accent-teal)]',
    iconBg: 'bg-[var(--landing-accent-teal)]/10',
  },
  {
    icon: Rocket,
    title: 'Interview Readiness',
    description: 'Practice problems, mock interviews, and system design preparation.',
    iconColor: 'text-[var(--landing-orange)]',
    iconBg: 'bg-[var(--landing-orange)]/10',
  },
  {
    icon: Shield,
    title: 'Verified Certificate',
    description: 'Earn a completion certificate that validates your learning journey.',
    iconColor: 'text-[var(--landing-accent-teal)]',
    iconBg: 'bg-[var(--landing-accent-teal)]/10',
  },
];

/**
 * Horizontal scroll feature showcase — pinned section that scrolls
 * horizontally as the user scrolls vertically.
 */
export function HorizontalScrollFeatures() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion || !wrapperRef.current || !panelRef.current || !trackRef.current) return;

    let ctx: { revert: () => void } | null = null;
    let active = true;

    async function init() {
      const gsapModule = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      if (!active || !wrapperRef.current || !panelRef.current || !trackRef.current) return;

      const { gsap } = gsapModule;
      gsap.registerPlugin(ScrollTrigger);

      const landingShell = document.querySelector('.landing-shell');
      const scroller = landingShell ? { scroller: landingShell } : {};

      const track = trackRef.current;
      const panel = panelRef.current;
      const getTravel = () => Math.max(0, track.scrollWidth - panel.offsetWidth);

      ctx = gsap.context(() => {
        gsap.fromTo(
          track.children,
          { autoAlpha: 0, y: 36, scale: 0.96 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 1,
            ease: 'power3.out',
            stagger: 0.08,
            scrollTrigger: {
              trigger: wrapperRef.current,
              ...scroller,
              start: 'top 82%',
              end: 'top 45%',
              scrub: 0.7,
            },
          },
        );

        gsap.to(track, {
          x: () => -getTravel(),
          ease: 'none',
          scrollTrigger: {
            trigger: wrapperRef.current,
            ...scroller,
            start: 'top top',
            end: () => '+=' + Math.max(getTravel(), panel.offsetHeight * 0.75),
            pin: panel,
            pinSpacing: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              wrapperRef.current?.style.setProperty('--hscroll-progress', String(self.progress));
            },
          },
        });
      }, wrapperRef);

      ScrollTrigger.refresh();
    }

    init();

    return () => {
      active = false;
      if (ctx) ctx.revert();
    };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-16 bg-[var(--landing-bg)]">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              Why NextGen CTO
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight landing-heading sm:text-4xl lg:text-5xl">
              Built for career-ready outcomes
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="border-beam-card relative flex flex-col rounded-2xl bg-[var(--landing-card)] p-7 shadow-sm"
                >
                  <div className="relative z-10 flex flex-col">
                    <div className={`mb-5 flex size-12 items-center justify-center rounded-xl ${feature.iconBg}`}>
                      <Icon className={`size-6 ${feature.iconColor}`} />
                    </div>
                    <h3 className="mb-2 text-lg font-bold landing-heading">{feature.title}</h3>
                    <p className="text-sm leading-relaxed landing-muted">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="relative w-full bg-[var(--landing-bg)] [--hscroll-progress:0]"
      style={{ zIndex: 30 }}
    >
      <div ref={panelRef} className="relative flex min-h-[100dvh] w-full flex-col justify-center overflow-hidden bg-[var(--landing-bg)] py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--landing-bg)] via-[var(--landing-bg)] to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[var(--landing-bg)] via-[var(--landing-bg)] to-transparent" aria-hidden="true" />

        {/* Header */}
        <div className="relative z-10 px-6 pb-10 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--landing-orange)_30%,var(--landing-border))] bg-[color-mix(in_oklab,var(--landing-orange)_10%,var(--landing-card))] px-4 py-1.5 animate-badge-shimmer animate-badge-pulse-glow text-xs font-bold uppercase tracking-wider text-[var(--landing-orange)]">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--landing-orange)] opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-[var(--landing-orange)]"></span>
              </span>
              Why NextGen CTO
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight landing-heading sm:text-4xl lg:text-5xl">
              Built for career-ready outcomes
            </h2>
            <p className="mt-3 text-base landing-muted sm:text-lg max-w-2xl mx-auto">
              Every part of the system is designed to move you from learning to proof.
            </p>
          </div>
        </div>

        {/* Horizontal track — extra left padding so first card isn't clipped */}
        <div className="relative z-10 overflow-hidden pb-10">
          <div
            ref={trackRef}
            className="flex w-max gap-5 pl-6 pr-6 sm:pl-8 sm:pr-8 lg:pl-12 lg:pr-12"
          >
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="hscroll-card border-beam-card relative flex-shrink-0 w-[280px] sm:w-[320px] lg:w-[360px] rounded-2xl bg-[var(--landing-card)] p-7 shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative z-10 flex flex-col">
                    <div className={`mb-5 flex size-12 items-center justify-center rounded-xl ${feature.iconBg}`}>
                      <Icon className={`size-6 ${feature.iconColor}`} />
                    </div>
                    <h3 className="mb-2 text-lg font-bold landing-heading">{feature.title}</h3>
                    <p className="text-sm leading-relaxed landing-muted">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
