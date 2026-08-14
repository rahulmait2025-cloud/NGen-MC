'use client';

import React, { useEffect, useRef } from 'react';
import { UniversalMentorSection } from '@/components/brand/universal-mentor-section';
import { UniversalFinalCtaSection } from '@/components/brand/universal-final-cta-section';
import { UniversalFaqSection } from '@/components/brand/universal-faq-section';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

import { PremiumCourseHero } from './premium-course-hero';
import { PremiumCourseStickyCard } from './premium-course-sticky-card';
import { PremiumCourseCurriculum } from './premium-course-curriculum';
import { PremiumCourseOutcomes } from './premium-course-outcomes';
import { PremiumCourseTestimonials } from './premium-course-testimonials';

export interface CourseLandingFaq {
  q: string;
  a: string;
}

export interface CourseLandingModuleItem {
  id: string;
  title: string;
  preview_enabled?: boolean;
}

export interface CourseLandingModule {
  id: string;
  title: string;
  item_count: number;
  items?: CourseLandingModuleItem[];
}

export interface CourseLandingDetail {
  course: {
    title: string;
    short_description?: string | null;
    learning_points?: string[];
    is_free?: boolean;
    thumbnail_url?: string;
    preview_video_id?: string;
    preview_video_url?: string;
    preview_poster_url?: string;
    level?: string | null;
    faqs: CourseLandingFaq[];
  };
  entitled: boolean;
  /** Broad learning access — bootcamp, college, purchase, etc. */
  has_learning_access?: boolean;
  /** Exact paid product purchase — not bootcamp/pillar inheritance. */
  is_product_enrolled?: boolean;
  inclusion_message?: string;
  progress_percentage?: number | null;
  module_count: number;
  video_count: number;
  modules: CourseLandingModule[];
}

export interface JobReadyBootcampLandingMode {
  heroBadgeLabel?: string;
  enrollCtaLabel: string;
}

export interface PremiumCourseLandingClientProps {
  collegeSlug: string;
  pillarSlug: string;
  courseId: string;
  detail: CourseLandingDetail;
  enrollmentSlot?: React.ReactNode;
  finalPricingSlot?: React.ReactNode;
  learnHref: string;
  variantExplorer?: React.ReactNode;
  jobReadyBootcampMode?: JobReadyBootcampLandingMode;
  heroCtaPromise?: Promise<{
    hasLearningAccess: boolean;
    learnHref: string;
    progressPercentage: number | null;
  }>;
  enrollmentPromise?: Promise<React.ReactNode>;
  finalPricingPromise?: Promise<React.ReactNode>;
  variantExplorerPromise?: Promise<React.ReactNode>;
}

const scrollToSection = async (id: string) => {
  const gsapModule = await import('gsap');
  const { gsap } = gsapModule;
  const { ScrollToPlugin } = await import('gsap/ScrollToPlugin');
  gsap.registerPlugin(ScrollToPlugin);
  const target = document.querySelector('.landing-shell') ? '.landing-shell' : window;
  gsap.to(target, { duration: 0.8, scrollTo: { y: `#${id}`, offsetY: 100 }, ease: 'power3.inOut' });
};

export function PremiumCourseLandingClient({
  collegeSlug,
  pillarSlug: _pillarSlug,
  courseId: _courseId,
  detail,
  enrollmentSlot,
  finalPricingSlot: _finalPricingSlot,
  learnHref,
  variantExplorer,
  jobReadyBootcampMode,
  heroCtaPromise,
  enrollmentPromise,
  variantExplorerPromise,
}: PremiumCourseLandingClientProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  // GSAP Animations
  useEffect(() => {
    if (reduceMotion) return;
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;
    (async () => {
      const gsapModule = await import('gsap');
      if (cancelled) return;
      const { gsap } = gsapModule;
      const [{ ScrollToPlugin }, { ScrollTrigger }] = await Promise.all([
        import('gsap/ScrollToPlugin'),
        import('gsap/ScrollTrigger'),
      ]);
      gsap.registerPlugin(ScrollToPlugin, ScrollTrigger);

      const landingShell = document.querySelector('.landing-shell');

      ctx = gsap.context(() => {
        // Hero Animation
        const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        heroTl
          .from('.hero-badge', { y: 20, opacity: 0, duration: 0.8 })
          .from('.hero-title', { y: 30, opacity: 0, duration: 0.8 }, '-=0.6')
          .from('.hero-desc', { y: 20, opacity: 0, duration: 0.8 }, '-=0.6')
          .from('.hero-cta', { y: 20, opacity: 0, duration: 0.8, stagger: 0.2 }, '-=0.6')
          .from('.hero-stats', { y: 10, opacity: 0, duration: 0.8, stagger: 0.1 }, '-=0.6')
          .from('.hero-visual', { scale: 0.95, opacity: 0, duration: 1.2 }, '-=1');

        // Scroll Animations for sections — scrub-driven for smooth reveal
        const sections = gsap.utils.toArray<Element>('.animate-section');
        if (landingShell) {
          sections.forEach((section) => {
            gsap.fromTo(
              section,
              { y: 40, autoAlpha: 0.7 },
              {
                y: 0,
                autoAlpha: 1,
                ease: 'power2.out',
                scrollTrigger: {
                  trigger: section,
                  scroller: landingShell,
                  start: 'top 88%',
                  end: 'top 50%',
                  scrub: 1.2,
                },
              }
            );
          });
        }

        // Bento Cards
        const bentoCards = gsap.utils.toArray<Element>('.bento-card-animate');
        if (bentoCards.length > 0 && landingShell) {
          gsap.fromTo(
            bentoCards,
            { scale: 0.94, autoAlpha: 0.5, y: 20 },
            {
              scale: 1,
              autoAlpha: 1,
              y: 0,
              stagger: 0.15,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: '.bento-grid',
                scroller: landingShell,
                start: 'top 80%',
                end: 'top 35%',
                scrub: 1,
              },
            }
          );
        }

        // Testimonials
        if (landingShell) {
          gsap.fromTo(
            '.testimonials-header',
            { y: 20, autoAlpha: 0.5 },
            {
              y: 0,
              autoAlpha: 1,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: '.testimonials-section',
                scroller: landingShell,
                start: 'top 85%',
                end: 'top 55%',
                scrub: 1,
              },
            }
          );
        }
      }, rootRef);
    })();
    return () => {
      cancelled = true;
      if (ctx) {
        ctx.revert();
      }
    };
  }, [reduceMotion]);

  const hasLearningAccess = detail.has_learning_access ?? detail.entitled;
  const isProductEnrolled = detail.is_product_enrolled ?? false;
  const inclusionMessage = detail.inclusion_message;
  const enrollCtaLabel =
    jobReadyBootcampMode?.enrollCtaLabel ?? (detail.course.is_free ? 'Enroll Free' : 'Enroll Now');
  const continueCtaLabel = detail.progress_percentage ? 'Continue' : 'Start';

  return (
    <div
      ref={rootRef}
      className="relative min-h-0 w-full overflow-x-clip font-sans selection:bg-primary selection:text-primary-foreground"
    >
      {/* 1. Hero Section */}
      <PremiumCourseHero
        detail={detail}
        jobReadyBootcampMode={jobReadyBootcampMode}
        heroCtaPromise={heroCtaPromise}
        hasLearningAccess={hasLearningAccess}
        learnHref={learnHref}
        enrollCtaLabel={enrollCtaLabel}
        continueCtaLabel={continueCtaLabel}
        scrollToSection={scrollToSection}
      />

      {/* 2. Main Content & Sticky Card Grid */}
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-12 lg:grid-cols-[1fr_380px]">
        {/* Left Column: Outcomes & Curriculum */}
        <div className="min-w-0 space-y-20">
          <PremiumCourseOutcomes detail={detail} />
          <PremiumCourseCurriculum detail={detail} />
        </div>

        {/* Right Column: Sticky Sidebar Card */}
        <aside className="min-w-0">
          <PremiumCourseStickyCard
            detail={detail}
            hasLearningAccess={hasLearningAccess}
            isProductEnrolled={isProductEnrolled}
            inclusionMessage={inclusionMessage}
            learnHref={learnHref}
            enrollCtaLabel={enrollCtaLabel}
            continueCtaLabel={continueCtaLabel}
            enrollmentSlot={enrollmentSlot}
            variantExplorer={variantExplorer}
            enrollmentPromise={enrollmentPromise}
            variantExplorerPromise={variantExplorerPromise}
            scrollToSection={scrollToSection}
          />
        </aside>
      </main>

      {/* 3. Mentor Section */}
      <div id="mentor">
        <UniversalMentorSection collegeSlug={collegeSlug} />
      </div>

      {/* 4. Testimonials Section */}
      <PremiumCourseTestimonials />

      {/* 5. Final CTA Section */}
      <UniversalFinalCtaSection
        collegeSlug={collegeSlug}
        badgeText="Limited Enrollment"
        heading="Stop Learning Randomly. Start Building With Structure."
        subtext="Enroll in this course and follow a clear path from learning to practice to real output."
        primaryCta={{
          label: hasLearningAccess ? 'Continue Learning' : enrollCtaLabel,
          onClick: hasLearningAccess
            ? () => {
                window.location.href = learnHref;
              }
            : () => scrollToSection('enrollment-section'),
        }}
        secondaryCta={{
          label: 'View Curriculum',
          onClick: () => scrollToSection('curriculum'),
        }}
      />

      {/* 6. FAQ Section (Placed at the end of the page) */}
      <UniversalFaqSection
        eyebrow="FAQ"
        title="Last checks before choosing."
        description="Short answers only. The goal is to remove doubts, not add another section to study."
        items={detail.course.faqs}
      />
    </div>
  );
}
