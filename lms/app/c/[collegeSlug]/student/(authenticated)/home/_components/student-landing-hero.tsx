'use client';

import { useLayoutEffect, useRef } from 'react';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { LANDING_HERO, landingHref } from './landing-content';
import { LandingSectionShell } from './landing-section-shell';
import { StudentLandingHeroVisual } from './student-landing-hero-visual';
import { StudentCtaButton } from '@/components/student/ui/student-cta-button';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

interface StudentLandingHeroProps {
  collegeSlug: string;
}

export function StudentLandingHero({ collegeSlug }: StudentLandingHeroProps) {
  const primaryHref = landingHref(collegeSlug, LANDING_HERO.primaryCta.path);
  const secondaryHref = landingHref(collegeSlug, LANDING_HERO.secondaryCta.path);
  const prefersReducedMotion = usePrefersReducedMotion();

  const sectionRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const bulletListRef = useRef<HTMLUListElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion) return;

    let active = true;
    let ctx: { revert: () => void } | null = null;

    async function initAnimation() {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (!active || !sectionRef.current) return;

      ctx = gsap.context(() => {
      gsap.registerPlugin(ScrollTrigger);
      const heading = headingRef.current;
      if (!heading) return;

      const wordWraps = heading.querySelectorAll('.hero-word-wrap');
      const words = heading.querySelectorAll('.hero-word');
      const highlight = heading.querySelector('.hero-highlight');
      const underline = heading.querySelector('.hero-underline');
      const bullets = bulletListRef.current?.querySelectorAll('.hero-bullet') ?? [];

      // Set initial states via refs
      gsap.set(badgeRef.current, { autoAlpha: 0, y: -10, scale: 0.96 });
      gsap.set(wordWraps, { autoAlpha: 0 });
      gsap.set(words, { y: '100%' });
      if (highlight) gsap.set(highlight, { autoAlpha: 0, y: -8, scale: 0.98 });
      if (underline) gsap.set(underline, { scaleX: 0, transformOrigin: 'left' });
      gsap.set(subRef.current, { autoAlpha: 0, y: 8 });
      gsap.set(bullets, { autoAlpha: 0, x: -12 });
      gsap.set(ctaRef.current, { autoAlpha: 0, y: 12 });
      gsap.set(visualRef.current, { autoAlpha: 0, scale: 0.95, y: 20 });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.to(badgeRef.current, { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, delay: 0.05 })
        // Word-by-word reveal: each word slides up from below its overflow:hidden wrapper
        .to(wordWraps, { autoAlpha: 1, duration: 0.01 }, '<')
        .to(words, {
          y: '0%',
          duration: 0.45,
          ease: 'power4.out',
          stagger: 0.06,
        }, '<');

      if (highlight) {
        // Highlight badge pops in with a slight bounce
        tl.to(highlight, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.4,
          ease: 'back.out(1.4)',
        }, '-=0.2');
      }

      if (underline) {
        // Underline sweeps in from left
        tl.to(underline, { scaleX: 1, duration: 0.4, ease: 'power3.out' }, '-=0.15');
      }

      tl.to(subRef.current, { autoAlpha: 1, y: 0, duration: 0.3 }, '-=0.1')
        // Bullets slide in from left with stagger
        .to(bullets, { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.05 }, '-=0.1')
        .to(ctaRef.current, { autoAlpha: 1, y: 0, duration: 0.3 }, '-=0.1')
        // Hero visual scales up and fades in
        .to(visualRef.current, {
          autoAlpha: 1,
          scale: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
        }, 0.15);

      // Parallax: hero visual drifts up as user scrolls down
      const landingShell = document.querySelector('.landing-shell');
      if (landingShell) {
        gsap.to(visualRef.current, {
          y: -40,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            scroller: landingShell,
            start: 'top top',
            end: 'bottom top',
            scrub: 1.5,
          },
        });
      }
      }, sectionRef);
    }

    void initAnimation();

    return () => {
      active = false;
      ctx?.revert();
    };
  }, [prefersReducedMotion]);

  return (
    <LandingSectionShell className="!pt-4 !pb-6 sm:!pt-6 lg:!pt-10 lg:!pb-8">
      <div ref={sectionRef} className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-12 lg:gap-16">
        <div className="relative z-10 flex flex-col gap-5 sm:gap-6">

          {/* Badge */}
          <div ref={badgeRef} className="hero-badge group inline-flex w-max max-w-full items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary transition-all duration-300 hover:border-primary/50 hover:bg-primary/15 hover:shadow-[0_0_24px_color-mix(in_oklab,var(--primary)_35%,transparent)] animate-badge-shimmer animate-badge-pulse-glow">
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-primary"></span>
            </span>
            <span className="hero-badge-text">{LANDING_HERO.badge}</span>
            <Sparkles className="size-3.5 text-primary/70 animate-pulse ml-0.5 shrink-0" />
          </div>

          {/* Heading with word-by-word reveal */}
          <h1 ref={headingRef} className="hero-heading text-[var(--landing-h1-size)] font-bold leading-[var(--landing-h1-leading)] tracking-tight landing-heading text-balance">
            <span className="hero-line-before block sm:inline">
              {LANDING_HERO.headingBefore.trim().split(/\s+/).map((word, i) => (
                <span
                  key={`${word}-${i}`}
                  className="hero-word-wrap inline-block mr-[0.28em] overflow-hidden"
                >
                  <span className="hero-word inline-block">{word}</span>
                </span>
              ))}
            </span>{' '}
            <span className="hero-highlight-wrap relative mt-2 inline-block sm:mt-0">
              <span className="hero-highlight hero-badge-motion landing-gradient-highlight-orange relative inline-block overflow-hidden">
                {LANDING_HERO.headingHighlight}
              </span>
              <span
                className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-[var(--landing-orange)] via-[var(--landing-orange-bright)] to-transparent opacity-60 hero-underline"
                aria-hidden="true"
              />
            </span>
          </h1>

          {/* Subheading */}
          <p ref={subRef} className="hero-sub max-w-xl text-base sm:text-[var(--landing-body-size)] font-medium leading-relaxed" style={{ color: 'var(--landing-heading)' }}>
            {LANDING_HERO.subheading}
          </p>

          {/* Bullet points */}
          <ul ref={bulletListRef} className="flex flex-col gap-3">
            {LANDING_HERO.bullets.map((bullet) => (
              <li
                key={bullet}
                className="hero-bullet flex items-center gap-3 text-sm sm:text-base font-medium landing-heading"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
                  <Check className="size-3.5 text-primary" strokeWidth={2.5} />
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div ref={ctaRef} className="mt-2 flex flex-wrap items-center gap-4">
            <a
              href={primaryHref}
              className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--landing-orange)] px-7 py-3.5 text-sm font-bold text-white shadow-[0_0_24px_color-mix(in_oklab,var(--landing-orange)_40%,transparent)] transition-transform duration-200 ease-out hover:gap-3 hover:shadow-[0_0_32px_color-mix(in_oklab,var(--landing-orange)_55%,transparent)] active:scale-[0.98]"
            >
              {LANDING_HERO.primaryCta.label}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity duration-300 hover:opacity-100" aria-hidden="true" />
            </a>
            <StudentCtaButton href={secondaryHref} variant="secondary" size="lg" showArrow={false}>
              {LANDING_HERO.secondaryCta.label}
            </StudentCtaButton>
          </div>
        </div>

        {/* Hero visual with parallax */}
        <div ref={visualRef} className="group relative">
          <StudentLandingHeroVisual />
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-[var(--landing-accent-teal)]/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
        </div>
      </div>
    </LandingSectionShell>
  );
}
