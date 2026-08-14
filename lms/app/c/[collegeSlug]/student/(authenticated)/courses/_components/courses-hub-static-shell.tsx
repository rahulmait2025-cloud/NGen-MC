'use client';

import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { CoursesHubHero } from './courses-hub-hero';
import { CoursesHubComparison } from './courses-hub-comparison';
import { CoursesHubLearningSystem } from './courses-hub-learning-system';
import { UniversalMentorSection } from '@/components/brand/universal-mentor-section';
import { CoursesHubCtaAndFaq } from './courses-hub-cta';
import { HorizontalScrollFeatures } from './horizontal-scroll-features';
import { TRUST_STRIP_ITEMS } from './courses-hub-content';

interface CoursesHubStaticShellProps {
  collegeSlug: string;
  showBootcamp?: boolean;
}

export function CoursesHubStaticShell({ collegeSlug, showBootcamp = false }: CoursesHubStaticShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroBadgeRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroSubRef = useRef<HTMLParagraphElement>(null);
  const heroCtaRef = useRef<HTMLDivElement>(null);
  const trustStripRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const root = rootRef.current;
    if (!root) return;

    let ctx: { revert: () => void } | null = null;
    let observer: IntersectionObserver | null = null;
    let active = true;

    Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]).then(([gsapModule, scrollTriggerModule]) => {
      if (!active || !rootRef.current) return;
      const { gsap } = gsapModule;
      const { ScrollTrigger } = scrollTriggerModule;
      const landingShell = document.querySelector('.landing-shell');

      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        // Hero entrance timeline — refs-based
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.fromTo(heroBadgeRef.current, { opacity: 0, y: 15, duration: 0.5 }, { opacity: 1, y: 0 })
          .fromTo(heroTitleRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.28')
          .fromTo(heroSubRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
          .fromTo(heroCtaRef.current?.children ? Array.from(heroCtaRef.current.children) : [], { opacity: 0, y: 14, stagger: 0.1 }, { opacity: 1, y: 0, duration: 0.4 }, '-=0.2');

        // Trust strip — stagger reveal
        if (trustStripRef.current) {
          observer = new IntersectionObserver(
            ([entry]) => {
              if (entry?.isIntersecting) {
                const items = trustStripRef.current!.querySelectorAll('.gsap-trust-item');
                gsap.fromTo(items,
                  { opacity: 0, y: 18 },
                  { opacity: 1, y: 0, stagger: 0.06, duration: 0.45, ease: 'power2.out' },
                );
                observer?.disconnect();
              }
            },
            { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
          );
          observer.observe(trustStripRef.current);
        }

        // Generic reveal sections
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const target = entry.target;
                const staggerItems = target.querySelectorAll('.gsap-stagger-item');
                if (staggerItems.length > 0) {
                  gsap.fromTo(
                    staggerItems,
                    { opacity: 0, y: 22 },
                    { opacity: 1, y: 0, stagger: 0.07, duration: 0.55, ease: 'power2.out' },
                  );
                } else {
                  gsap.fromTo(
                    target,
                    { opacity: 0, y: 26 },
                    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
                  );
                }
                observer?.unobserve(target);
              }
            });
          },
          { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
        );

        const revealSections = rootRef.current?.querySelectorAll('.gsap-reveal');
        revealSections?.forEach((sec) => observer?.observe(sec));

        // Scroll-driven course level progress bar
        const scroller = landingShell ? { scroller: landingShell } : {};
        gsap.to('.course-level-progress', {
          height: '100%',
          ease: 'none',
          scrollTrigger: {
            trigger: '.course-level-story',
            ...scroller,
            start: 'top 64%',
            end: 'bottom 54%',
            scrub: 0.7,
          },
        });

        // Course level cards — scroll-driven scale + fade
        gsap.utils.toArray<HTMLElement>('.course-level-card').forEach((card) => {
          gsap.fromTo(
            card,
            { autoAlpha: 0.6, y: 30, scale: 0.98 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: card,
                ...scroller,
                start: 'top 85%',
                end: 'top 40%',
                scrub: 0.8,
              },
            },
          );
        });
      }, rootRef);
    }).catch(() => {});

    return () => {
      active = false;
      ctx?.revert();
      observer?.disconnect();
    };
  }, [reduceMotion]);

  return (
    <div ref={rootRef} className="flex flex-col">
      <CoursesHubHero
        collegeSlug={collegeSlug}
        showBootcamp={showBootcamp}
        badgeRef={heroBadgeRef}
        titleRef={heroTitleRef}
        subRef={heroSubRef}
        ctaRef={heroCtaRef}
      />

      {/* Trust Strip */}
      <section ref={trustStripRef} className="border-y border-border/50 bg-muted/20 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 sm:grid-cols-4">
          {TRUST_STRIP_ITEMS.map((item) => (
            <div key={item.label} className="gsap-trust-item flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:text-left group">
              <div className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 transition-colors group-hover:bg-primary/10">
                <item.icon className="size-5 text-primary" />
              </div>
              <span className="text-sm font-bold text-foreground tracking-tight">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <HorizontalScrollFeatures />

      <CoursesHubComparison collegeSlug={collegeSlug} showBootcamp={showBootcamp} />
      <CoursesHubLearningSystem />
      <UniversalMentorSection collegeSlug={collegeSlug} showBootcamp={showBootcamp} />
      <CoursesHubCtaAndFaq collegeSlug={collegeSlug} showBootcamp={showBootcamp} />
    </div>
  );
}
