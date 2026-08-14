'use client';

import { use, Suspense, useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { Instagram, Linkedin, Youtube, Sparkles, ArrowRight } from 'lucide-react';
import { FounderMentorCard } from '@/components/brand/founder-mentor-card';
import { LANDING_SOCIAL_LINKS, MENTOR_SECTION, MENTOR_TRUST_STATS } from './landing-content';
import { LandingSectionShell } from './landing-section-shell';
import type { YouTubeChannelStats } from '@/lib/youtube/channel-stats';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

const SOCIAL_ICONS = {
  YouTube: Youtube,
  Instagram: Instagram,
  LinkedIn: Linkedin,
} as const;

interface MentorSectionProps {
  youtubeStatsPromise: Promise<YouTubeChannelStats>;
}

function MentorYouTubeStats({ promise }: { promise: Promise<YouTubeChannelStats> }) {
  const stats = use(promise);
  return <>{stats.subscriberDisplay}</>;
}

export function MentorSection({ youtubeStatsPromise }: MentorSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const kickerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const copyRef = useRef<HTMLParagraphElement>(null);
  const socialRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const badge1Ref = useRef<HTMLDivElement>(null);
  const badge2Ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (prefersReducedMotion || !sectionRef.current) return;

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
      // Set initial states via refs
      gsap.set(cardRef.current, { autoAlpha: 0, y: 14 });
      gsap.set(kickerRef.current, { autoAlpha: 0, y: -8, scale: 0.98 });
      gsap.set(headingRef.current, { autoAlpha: 0, y: 12 });
      gsap.set(copyRef.current, { autoAlpha: 0, y: 8 });
      gsap.set(socialRef.current?.children ? Array.from(socialRef.current.children) : [], { autoAlpha: 0, y: 8, scale: 0.99 });
      gsap.set(statsRef.current, { autoAlpha: 0, y: 10 });
      gsap.set(ctaRef.current, { autoAlpha: 0, y: 8 });
      gsap.set(visualRef.current, { autoAlpha: 0, y: 14, scale: 0.985 });
      gsap.set([badge1Ref.current, badge2Ref.current], { autoAlpha: 0, y: -6, scale: 0.98 });

      function runAnimation() {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.to(cardRef.current, { autoAlpha: 1, y: 0, duration: 0.35 })
          .to(kickerRef.current, { autoAlpha: 1, y: 0, scale: 1, duration: 0.3 }, '-=0.1')
          .to(headingRef.current, { autoAlpha: 1, y: 0, duration: 0.35 }, '-=0.1')
          .to(copyRef.current, { autoAlpha: 1, y: 0, duration: 0.3 }, '-=0.1')
          .to(Array.from(socialRef.current?.children ?? []), { autoAlpha: 1, y: 0, scale: 1, duration: 0.25, stagger: 0.04 }, '-=0.08')
          .to(statsRef.current, { autoAlpha: 1, y: 0, duration: 0.3 }, '-=0.06')
          .to(ctaRef.current, { autoAlpha: 1, y: 0, duration: 0.25 }, '-=0.1')
          .to(visualRef.current, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4 }, 0.08)
          .to([badge1Ref.current, badge2Ref.current], { autoAlpha: 1, y: 0, scale: 1, duration: 0.25, stagger: 0.05 }, '-=0.15');

        // Infinite floating halo
        gsap.to(haloRef.current, {
          y: -10,
          x: 8,
          duration: 6,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });

        // Parallax: card content shifts slightly on scroll
        const landingShell = document.querySelector('.landing-shell');
        if (landingShell) {
          gsap.to(visualRef.current, {
            y: -25,
            ease: 'none',
            scrollTrigger: {
              trigger: sectionRef.current,
              scroller: landingShell,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 2,
            },
          });
        }
      }

      // IntersectionObserver trigger
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          runAnimation();
          observer.disconnect();
        },
        { rootMargin: '0px 0px -12% 0px', threshold: 0.04 },
      );
      observer.observe(sectionRef.current!);

      return () => observer.disconnect();
      }, sectionRef);
    }

    void initAnimation();

    return () => {
      active = false;
      ctx?.revert();
    };
  }, [prefersReducedMotion]);

  return (
    <LandingSectionShell className="py-10 sm:py-14">
      <div ref={sectionRef}>
        <div ref={cardRef} className="relative overflow-hidden rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-card)] shadow-[0_18px_48px_-28px_color-mix(in_oklab,var(--landing-fg)_18%,transparent)]">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--landing-orange)]/3 via-transparent to-[var(--landing-accent-teal)]/3" aria-hidden="true" />
          
          <div className="relative z-10 grid grid-cols-1 items-center gap-8 p-6 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10 xl:p-12">
            <div className="order-2 flex flex-col gap-6 lg:order-1 lg:gap-7">
              <div ref={kickerRef} className="inline-flex w-fit items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--landing-orange)_30%,var(--landing-border))] bg-[color-mix(in_oklab,var(--landing-orange)_10%,var(--landing-card))] px-4 py-1.5 animate-badge-shimmer animate-badge-pulse-glow">
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--landing-orange)] opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-[var(--landing-orange)]"></span>
                </span>
                <Sparkles className="size-3.5 text-[var(--landing-orange)] animate-pulse" />
                <span className="hero-badge-text text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--landing-orange)]">
                  {MENTOR_SECTION.label}
                </span>
              </div>

              <h2 ref={headingRef} className="text-balance text-3xl font-bold leading-[1.08] tracking-tight landing-heading sm:text-4xl lg:text-[2.65rem]">
                Learn directly from{' '}
                <span className="hero-highlight-wrap relative inline-block">
                  <span className="hero-highlight hero-badge-motion landing-gradient-highlight-orange relative inline-block overflow-hidden">{MENTOR_SECTION.headingHighlight}</span>
                </span>
              </h2>

              <p ref={copyRef} className="max-w-xl text-base font-medium leading-relaxed text-[color-mix(in_oklab,var(--landing-fg)_88%,var(--landing-muted))] sm:text-[1.05rem] sm:leading-[1.7]">
                {MENTOR_SECTION.bio}
              </p>

              <div ref={socialRef} className="flex flex-wrap gap-3">
                {LANDING_SOCIAL_LINKS.map((social) => {
                  const Icon = SOCIAL_ICONS[social.label as keyof typeof SOCIAL_ICONS] ?? Youtube;
                  return (
                    <Link
                      key={social.href}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/social relative inline-flex items-center gap-2.5 rounded-full border border-[var(--landing-border)] bg-[var(--landing-card)] px-4 py-2.5 text-sm font-semibold text-[var(--landing-fg)] shadow-sm transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--landing-orange)]/40 hover:shadow-md hover:shadow-[var(--landing-orange)]/10 active:translate-y-0"
                    >
                      <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--landing-orange)]/10 to-[var(--landing-orange)]/5 text-[var(--landing-orange)] transition-all duration-300 group-hover/social:scale-110 group-hover/social:from-[var(--landing-orange)]/20 group-hover/social:to-[var(--landing-orange)]/10">
                        <Icon className="size-4" />
                      </span>
                      {social.label}
                      <ArrowRight className="size-3.5 opacity-0 -translate-x-2 transition-all duration-300 group-hover/social:translate-x-0 group-hover/social:opacity-100" />
                    </Link>
                  );
                })}
              </div>

              <div ref={statsRef} className="grid grid-cols-3 divide-x divide-[var(--landing-border)] rounded-2xl border border-[var(--landing-border)] bg-[color-mix(in_oklab,var(--landing-fg)_3%,var(--landing-card))] px-3 py-4 sm:px-5 sm:py-5">
                {MENTOR_TRUST_STATS.map((stat) => (
                  <div 
                    key={stat.label} 
                    className="px-2 text-center sm:px-3 sm:text-left"
                  >
                    <div className="text-lg font-bold leading-tight landing-heading sm:text-xl">
                      {'usesYoutubeCount' in stat && stat.usesYoutubeCount ? (
                        <Suspense fallback={<>100K+</>}>
                          <MentorYouTubeStats promise={youtubeStatsPromise} />
                        </Suspense>
                      ) : (
                        stat.title
                      )}
                    </div>
                    <div className="mt-1 text-[11px] font-medium leading-snug text-[color-mix(in_oklab,var(--landing-fg)_72%,var(--landing-muted))] sm:text-xs">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              <div ref={ctaRef}>
                <button className="group inline-flex items-center gap-2 rounded-xl bg-[var(--landing-orange)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[var(--landing-orange)]/90 hover:shadow-lg hover:shadow-[var(--landing-orange)]/25 active:translate-y-0">
                  Start Your Journey
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>
            </div>

            <div className="order-1 flex justify-center lg:order-2 lg:justify-end w-full">
              <div ref={visualRef} className="relative w-full max-w-[19rem] sm:max-w-xs lg:max-w-sm">
                <div ref={haloRef} className="absolute -inset-4 rounded-full bg-gradient-to-br from-[var(--landing-orange)]/10 to-[var(--landing-accent-teal)]/10" aria-hidden="true" />
                <div className="relative w-full">
                  <FounderMentorCard priority />
                  <div ref={badge1Ref} className="absolute -bottom-2 -right-2 rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] px-4 py-2.5 shadow-lg">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 rounded-full bg-[var(--landing-success)] shadow-[0_0_8px_color-mix(in_oklab,var(--landing-success)_50%,transparent)]" />
                      <span className="text-xs font-medium landing-heading">Live Sessions</span>
                    </div>
                  </div>
                  <div ref={badge2Ref} className="absolute -top-2 -right-2 rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] px-3 py-1.5 shadow-md">
                    <span className="text-xs font-semibold text-[var(--landing-orange)]">100K+ Students</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LandingSectionShell>
  );
}
