'use client';

import { useRef, useEffect } from 'react';
import {
  Award,
  FileText,
  Map,
  MessageSquare,
  Video,
  Zap,
} from 'lucide-react';
import { BENEFITS, BENEFITS_SECTION, type BenefitIconKey } from './landing-content';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

const BENEFIT_ICONS: Record<BenefitIconKey, typeof Video> = {
  video: Video,
  mentor: MessageSquare,
  certificate: Award,
  community: Zap,
  path: Map,
  notes: FileText,
};

const BENEFIT_STYLES = [
  { iconBg: 'bg-[var(--landing-orange)]/10', iconColor: 'text-[var(--landing-orange)]' },
  { iconBg: 'bg-[var(--landing-accent-teal)]/10', iconColor: 'text-[var(--landing-accent-teal)]' },
  { iconBg: 'bg-[var(--landing-orange)]/10', iconColor: 'text-[var(--landing-orange)]' },
  { iconBg: 'bg-[var(--landing-accent-teal)]/10', iconColor: 'text-[var(--landing-accent-teal)]' },
  { iconBg: 'bg-[var(--landing-orange)]/10', iconColor: 'text-[var(--landing-orange)]' },
  { iconBg: 'bg-[var(--landing-accent-teal)]/10', iconColor: 'text-[var(--landing-accent-teal)]' },
];

export function BenefitsGridSection() {
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
      <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-3 text-center sm:mb-12">
            <h2 className="benefits-title-row font-display text-2xl font-bold tracking-tight landing-heading sm:text-3xl text-balance lg:text-4xl">
              <span className="benefits-heading-prefix">Everything You Need For</span>{' '}
              <span className="benefits-highlight hero-badge-motion landing-gradient-highlight-orange relative inline-block overflow-hidden">
                {BENEFITS_SECTION.headingHighlight}
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed landing-muted sm:text-base text-pretty">
              {BENEFITS_SECTION.subtext}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((benefit, index) => {
              const Icon = BENEFIT_ICONS[benefit.icon];
              const style = BENEFIT_STYLES[index % BENEFIT_STYLES.length];
              return (
                <div
                  key={benefit.title}
                  className="border-beam-card group relative flex h-full flex-col gap-4 rounded-2xl bg-[var(--landing-card)] p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
                >
                  <div className="relative z-10 flex flex-col gap-4">
                    <div className={cn('flex size-12 items-center justify-center rounded-xl border border-[var(--landing-border)]', style.iconBg)}>
                      <Icon className={cn('size-6', style.iconColor)} />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold landing-heading">{benefit.title}</h4>
                      <p className="mt-1.5 text-sm leading-relaxed landing-muted">{benefit.description}</p>
                    </div>
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
        <div className="relative z-10 px-6 pb-8 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl text-center">
            <h2 className="benefits-title-row font-display text-2xl font-bold tracking-tight landing-heading sm:text-3xl text-balance lg:text-4xl">
              <span className="benefits-heading-prefix">Everything You Need For</span>{' '}
              <span className="benefits-highlight hero-badge-motion landing-gradient-highlight-orange relative inline-block overflow-hidden">
                {BENEFITS_SECTION.headingHighlight}
              </span>
            </h2>
            <p className="mt-3 mx-auto max-w-2xl text-sm leading-relaxed landing-muted sm:text-base text-pretty">
              {BENEFITS_SECTION.subtext}
            </p>
          </div>
        </div>

        {/* Horizontal track — extra left padding so first card isn't clipped */}
        <div className="relative z-10 overflow-hidden pb-10">
          <div
            ref={trackRef}
            className="flex w-max gap-5 pl-6 pr-6 sm:pl-8 sm:pr-8 lg:pl-12 lg:pr-12"
          >
            {BENEFITS.map((benefit, index) => {
              const Icon = BENEFIT_ICONS[benefit.icon];
              const style = BENEFIT_STYLES[index % BENEFIT_STYLES.length];
              return (
                <div
                  key={benefit.title}
                  className="benefit-card border-beam-card group relative flex w-[280px] flex-shrink-0 flex-col gap-4 rounded-2xl bg-[var(--landing-card)] p-7 shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg sm:w-[320px] lg:w-[360px]"
                >
                  <div className="relative z-10 flex flex-col gap-4">
                    <div className={cn('flex size-12 items-center justify-center rounded-xl border border-[var(--landing-border)] transition-transform duration-300 group-hover:scale-105', style.iconBg)}>
                      <Icon className={cn('size-6', style.iconColor)} />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold landing-heading">{benefit.title}</h4>
                      <p className="mt-1.5 text-sm leading-relaxed landing-muted">{benefit.description}</p>
                    </div>
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
