'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  GitCompare,
  Layers,
  Map,
  Route,
  Sparkles,
  Target,
  TrendingUp,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BundleLandingData } from '@/lib/services/student-bundles';

const MOCK_PROGRESS_PREVIEW_PERCENT = 46;

/** Shared duration keeps cards evenly spaced on the same ellipse (no collisions). */
const ORBIT_DURATION_SEC = 32;

const ORBIT_CARDS = [
  { label: 'Course', startAngle: 330, tilt: -4 },
  { label: 'Task', startAngle: 60, tilt: 3 },
  { label: 'Project', startAngle: 150, tilt: -5 },
  { label: 'Review', startAngle: 240, tilt: 5 },
] as const;

const PROMISE_CARDS = [
  { icon: Route, title: 'Learn In The Right Order', description: 'No more guessing what to learn next. Follow a carefully curated sequence.' },
  { icon: Target, title: 'Practice With Purpose', description: 'Apply concepts immediately through targeted, real-world exercises.' },
  { icon: Wrench, title: 'Build Real Output', description: 'Create verifiable projects that demonstrate your technical capability.' },
  { icon: BarChart3, title: 'Track Your Progress', description: 'See exactly how far you’ve come and what remains on your journey.' },
] as const;

const ACHIEVE_CARDS = [
  { icon: Layers, title: 'Stronger Fundamentals', description: 'A solid grasp of core principles that scale.' },
  { icon: Zap, title: 'Practical Output', description: 'Deployable work that demonstrates your skill.' },
  { icon: TrendingUp, title: 'Problem-Solving', description: 'Confidence to tackle unseen technical challenges.' },
  { icon: CheckCircle2, title: 'Verified Completion', description: 'Tangible proof of your journey through the bundle.' },
] as const;

const AUDIENCE_BULLETS = [
  'You want a single, cohesive path rather than piecing together random tutorials.',
  'You learn best when theory is immediately followed by guided practice.',
  'You need clear milestones to track your progress and stay motivated.',
] as const;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function BundleOrbitVisual({ reduceMotion }: { reduceMotion: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    const orbitLayer = orbitRef.current;
    if (!container || !orbitLayer) return;

    const cardEls = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    if (cardEls.length === 0) return;

    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const animateOrbit = !reduceMotion && !isMobile;

    const getEllipseRadii = () => {
      const rect = orbitLayer.getBoundingClientRect();
      return {
        radiusX: (rect.width / 2) * 0.96,
        radiusY: (rect.height / 2) * 0.96,
      };
    };

    const placeOnTrack = (el: HTMLDivElement, angleDeg: number, radiusX: number, radiusY: number, gsap: typeof import('gsap').default) => {
      const rad = (angleDeg * Math.PI) / 180;
      const x = Math.cos(rad) * radiusX;
      const y = Math.sin(rad) * radiusY;
      gsap.set(el, { x, y, rotation: 0, transformOrigin: '50% 50%', force3D: true });
    };

    let ctx: { revert: () => void } | undefined;

    const initOrbit = async () => {
      const gsapModule = await import('gsap');
      const { gsap } = gsapModule;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      const { radiusX, radiusY } = getEllipseRadii();
      if (radiusX < 20 || radiusY < 12) return;

      ORBIT_CARDS.forEach((card, index) => {
        const el = cardEls[index];
        if (!el) return;
        placeOnTrack(el, card.startAngle, radiusX, radiusY, gsap);
      });

      if (!animateOrbit) return;

      ctx = gsap.context(() => {
        ORBIT_CARDS.forEach((card, index) => {
          const el = cardEls[index];
          if (!el) return;

          const state = { angle: card.startAngle };

          gsap.to(state, {
            angle: card.startAngle + 360,
            duration: ORBIT_DURATION_SEC,
            repeat: -1,
            ease: 'none',
            onUpdate: () => placeOnTrack(el, state.angle, radiusX, radiusY, gsap),
          });
        });
      }, container);
    };

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(initOrbit);
    });

    return () => {
      cancelAnimationFrame(frame);
      ctx?.revert();
    };
  }, [reduceMotion]);

  return (
    <div
      ref={containerRef}
      className="bundle-hero-visual relative aspect-[16/10] min-h-[260px] w-full overflow-hidden rounded-2xl border border-border/60 bg-card sm:min-h-[300px]"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_oklab,var(--landing-bg)_92%,transparent)] via-transparent to-transparent" aria-hidden />

      <div className="bundle-orbit-track absolute left-1/2 top-1/2 h-[58%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-primary/15 sm:h-[56%] sm:w-[76%]" aria-hidden />
      <div className="bundle-orbit-track bundle-orbit-track-inner absolute left-1/2 top-1/2 h-[42%] w-[54%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-dashed border-primary/25 sm:h-[40%] sm:w-[52%]" aria-hidden />
      <div className="bundle-orbit-line absolute left-1/2 top-[18%] h-px w-[62%] -translate-x-1/2 rotate-[12deg] bg-gradient-to-r from-transparent via-primary/40 to-transparent" aria-hidden />
      <div className="bundle-orbit-line absolute left-1/2 bottom-[20%] h-px w-[58%] -translate-x-1/2 -rotate-[8deg] bg-gradient-to-r from-transparent via-primary/30 to-transparent" aria-hidden />

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-[5] size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/50 shadow-[0_0_12px_rgba(255,107,0,0.5)]"
          aria-hidden
        />

        <div ref={orbitRef} className="relative z-10 h-[58%] w-[78%] max-h-full max-w-full sm:h-[56%] sm:w-[76%]">
          {ORBIT_CARDS.map((card, index) => (
            <div
              key={card.label}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="absolute left-1/2 top-1/2 z-20 will-change-transform"
            >
              <div
                data-orbit-inner
                style={{ transform: `translate(-50%, -50%) rotate(${card.tilt}deg)` }}
                className="bundle-orbit-card h-16 w-24 rounded-xl border border-border/60 bg-card sm:h-20 sm:w-28"
              >
                <div className="flex h-full flex-col justify-between p-2.5">
                  <div className="size-2 rounded-full bg-primary/70" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary sm:text-[10px]">{card.label}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute right-[10%] top-[14%] z-10 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-primary">
        Guided
      </div>
      <div className="absolute bottom-[12%] left-[10%] z-10 rounded-full border border-white/10 bg-[color-mix(in_oklab,var(--landing-surface)_80%,transparent)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest landing-muted">
        Sequential
      </div>
    </div>
  );
}

function BundleProgressCard({
  progress,
  access,
}: {
  progress: BundleLandingData['progress'];
  access: BundleLandingData['access'];
}) {
  const isPreview = !progress.hasRealProgress;
  const progressBadge = progress.previewLabel ?? (access.entitled ? 'Path Active' : 'Progress Preview');
  const progressPercent = isPreview ? MOCK_PROGRESS_PREVIEW_PERCENT : progress.percentage;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h2 className="mb-8 text-center text-3xl font-bold landing-heading">Track Your Bundle Progress</h2>
      <div className="border border-border/60 bg-card rounded-2xl border border-[color-mix(in_oklab,var(--landing-border)_50%,transparent)] p-5 text-left shadow-none sm:p-8 md:p-10">
        <div className="flex flex-col gap-3 border-b border-[color-mix(in_oklab,var(--landing-border)_55%,transparent)] pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary sm:size-11">
              <BarChart3 className="size-5" />
            </div>
            <span className="text-base font-bold landing-heading sm:text-xl">Your Dashboard</span>
          </div>
          <span className="w-fit shrink-0 rounded border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            {progressBadge}
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <span className="text-[10px] font-bold uppercase tracking-wider landing-muted sm:text-xs">Progress Overview</span>
          <span className="shrink-0 text-sm font-bold text-primary sm:text-base">{progressPercent}%</span>
        </div>

        <progress
          className="mt-3 h-3 w-full overflow-hidden rounded-full border border-[color-mix(in_oklab,var(--landing-border)_45%,transparent)] bg-[color-mix(in_oklab,var(--landing-surface)_90%,transparent)] shadow-inner sm:h-4 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-gradient-to-r [&::-webkit-progress-value]:from-primary [&::-webkit-progress-value]:to-primary/80 [&::-webkit-progress-value]:shadow-[0_0_16px_rgba(255,107,0,0.45)] [&>div]:rounded-full [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-primary/80 [&>div]:shadow-[0_0_16px_rgba(255,107,0,0.45)]"
          value={progressPercent}
          max={100}
          aria-label={isPreview ? 'Sample progress preview' : 'Bundle progress'}
        />

        <p className="mt-4 text-xs leading-relaxed landing-muted">
          {isPreview
            ? 'Sample progress preview — enroll to track real completion across this bundle path.'
            : `${progress.completedLessons} of ${progress.totalLessons} lessons completed across connected courses.`}
        </p>
      </div>
    </div>
  );
}

function BundlePurchaseCard({
  bundle,
  access,
  includedItems,
  enrollmentSlot,
  onViewPath,
  className,
}: {
  bundle: BundleLandingData['bundle'];
  access: BundleLandingData['access'];
  includedItems: string[];
  enrollmentSlot?: ReactNode;
  onViewPath: () => void;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <div className="border border-border/60 bg-card relative flex flex-col gap-5 overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="relative z-10 flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-xl font-bold leading-tight landing-heading sm:text-2xl">{bundle.title}</h3>
          <span className="shrink-0 rounded border border-primary/50 bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary shadow-none">
            {access.accessLabel}
          </span>
        </div>

        <p className="relative z-10 text-sm leading-relaxed landing-muted">
          A guided path that connects courses, practice, and outcomes in the recommended order.
        </p>

        {bundle.priceMinor && bundle.priceMinor > 0 && !access.entitled ? (
          <div className="relative z-10 flex items-end gap-2">
            <span className="text-3xl font-bold landing-heading">
              {bundle.currency === 'INR' ? '₹' : `${bundle.currency} `}
              {(bundle.priceMinor / 100).toLocaleString()}
            </span>
            {bundle.discountedPriceMinor && bundle.discountedPriceMinor > bundle.priceMinor ? (
              <span className="mb-1 text-sm landing-muted line-through">
                {bundle.currency === 'INR' ? '₹' : ''}
                {(bundle.discountedPriceMinor / 100).toLocaleString()}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="relative z-10">{enrollmentSlot}</div>

        <button
          type="button"
          onClick={onViewPath}
          className="relative z-10 w-full py-1 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-primary underline-offset-4 transition-colors hover:underline"
        >
          View Full Path
        </button>

        <div className="relative z-10 space-y-3 border-t border-[color-mix(in_oklab,var(--landing-border)_60%,transparent)] pt-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">What&apos;s Included</p>
          {includedItems.map((item) => (
            <div key={item} className="flex items-center gap-3 text-sm landing-heading">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                <Check className="size-3.5" />
              </span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface PremiumBundleLandingClientProps {
  collegeSlug: string;
  data: BundleLandingData;
  enrollmentSlot?: ReactNode;
  finalCtaSlot?: ReactNode;
}

export function PremiumBundleLandingClient({
  collegeSlug: _collegeSlug,
  data,
  enrollmentSlot,
  finalCtaSlot,
}: PremiumBundleLandingClientProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  const { bundle, access, progress, connectedCourses, curriculum, outcomes, audiencePoints, pathSteps, includesInterviewPrep } = data;

  const includedItems = [
    bundle.courseCount > 0 ? `${bundle.courseCount} Connected Courses` : null,
    'Sequential Practice Tasks',
    'Guided Project Milestones',
    includesInterviewPrep ? 'Resume & Interview Reviews' : null,
  ].filter(Boolean) as string[];

  useEffect(() => {
    if (reduceMotion || !rootRef.current) return;
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;
    (async () => {
      const gsapModule = await import('gsap');
      if (cancelled) return;
      const { gsap } = gsapModule;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      const landingShell = document.querySelector('.landing-shell');

      ctx = gsap.context(() => {
        gsap.from('.bundle-reveal', {
          y: 28,
          opacity: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power2.out',
        });
        gsap.utils.toArray<Element>('.bundle-scroll-reveal').forEach((el) => {
          gsap.from(el, {
            y: 24,
            opacity: 0,
            duration: 0.6,
            scrollTrigger: { 
              trigger: el, 
              ...(landingShell ? { scroller: landingShell } : {}),
              start: 'top 88%', 
              once: true 
            },
          });
        });
      }, rootRef);
    })();
    return () => {
      cancelled = true;
      if (ctx) {
        ctx.revert();
      }
    };
  }, [reduceMotion]);

  const featureChips = [
    { icon: Map, label: 'Guided Roadmap' },
    ...(bundle.courseCount > 0 ? [{ icon: BookOpen, label: `${bundle.courseCount} Connected Courses` }] : []),
    { icon: Sparkles, label: 'Verified Outcomes' },
  ];

  return (
    <div ref={rootRef} className="bundle-landing relative min-w-0 overflow-x-clip">
      <main className="relative mx-auto flex max-w-[1440px] flex-col gap-20 px-4 pb-16 pt-10 sm:px-6 md:gap-32 md:px-12 md:pt-16 lg:px-12">
        {/* Hero */}
        <section id="overview" className="scroll-mt-24">
          <div className="grid min-w-0 grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:gap-12">
            <div className="bundle-reveal min-w-0 space-y-6">
              <div className="inline-flex w-max items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 border border-border/60 bg-card shadow-none">
                <Route className="size-3.5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  {bundle.categoryLabel}
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight landing-heading sm:text-4xl lg:text-[2.75rem]">
                  {bundle.heroTitle}
                </h1>
                {bundle.heroSubtitle ? (
                  <p className="max-w-2xl line-clamp-3 text-base font-medium leading-relaxed text-primary sm:text-lg">
                    {bundle.heroSubtitle}
                  </p>
                ) : null}
                {bundle.description ? (
                  <p className="max-w-2xl line-clamp-4 text-sm leading-relaxed landing-muted sm:text-base">
                    {bundle.description}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                {featureChips.map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-2 rounded-lg border border-[color-mix(in_oklab,var(--landing-border)_55%,transparent)] bg-[color-mix(in_oklab,var(--landing-surface)_82%,transparent)] px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider landing-heading sm:text-xs"
                  >
                    <chip.icon className="size-3.5 shrink-0 text-primary" />
                    {chip.label}
                  </span>
                ))}
              </div>

              {bundle.thumbnailUrl ? (
                <div className="relative aspect-[16/10] min-h-[260px] overflow-hidden rounded-2xl border border-border/60 bg-card">
                  <Image src={bundle.thumbnailUrl} alt={bundle.title} fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" priority />
                  <div className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_oklab,var(--landing-bg)_85%,transparent)] via-transparent to-transparent" />
                </div>
              ) : (
                <BundleOrbitVisual reduceMotion={reduceMotion} />
              )}
            </div>

            <aside className="bundle-reveal mt-10 hidden lg:mt-16 lg:block xl:mt-20">
              <div className="sticky top-36">
                <BundlePurchaseCard
                  bundle={bundle}
                  access={access}
                  includedItems={includedItems}
                  enrollmentSlot={enrollmentSlot}
                  onViewPath={() => scrollToSection('courses')}
                />
              </div>
            </aside>
          </div>

          <div className="bundle-reveal mt-10 lg:hidden">
            <BundlePurchaseCard
              bundle={bundle}
              access={access}
              includedItems={includedItems}
              enrollmentSlot={enrollmentSlot}
              onViewPath={() => scrollToSection('courses')}
            />
          </div>
        </section>

        {/* Bundle Promise */}
        <section className="bundle-scroll-reveal">
          <div className="relative mb-10 text-center">
            <h2 className="relative text-3xl font-bold landing-heading sm:text-4xl">The Bundle Promise</h2>
            <p className="relative mx-auto mt-3 max-w-2xl text-base landing-muted sm:text-lg">
              A cohesive approach to mastering skills and proving them.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {PROMISE_CARDS.map((card) => (
              <PromiseCard key={card.title} icon={card.icon} title={card.title} description={card.description} />
            ))}
          </div>
        </section>

        {/* The Path */}
        <section id="roadmap" className="bundle-scroll-reveal scroll-mt-24">
          <div className="border border-border/60 bg-card relative overflow-hidden rounded-3xl p-6 sm:p-10 md:p-14">
            <div className="relative z-10 mb-10 md:text-left">
              <h2 className="text-3xl font-bold landing-heading">The Path</h2>
              <p className="mt-2 text-base landing-muted sm:text-lg">A streamlined sequence to mastery.</p>
            </div>
            <div className="relative">
              {/* Connector sits behind cards, aligned to step-number row only */}
              <div
                className="pointer-events-none absolute inset-x-8 top-[2.75rem] z-0 hidden h-px overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--landing-surface)_90%,transparent)] lg:block"
                aria-hidden
              >
                <div
                  className="h-full bg-gradient-to-r from-primary via-primary/70 to-[color-mix(in_oklab,var(--landing-surface)_90%,transparent)]"
                  style={{ width: `${((pathSteps.length - 1) / pathSteps.length) * 100}%` }}
                />
              </div>
              <div className="relative z-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-5">
                {pathSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={cn(
                      'relative flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-[border-color,transform,box-shadow] hover:-translate-y-1',
                      step.isFinal
                        ? 'bundle-path-step bundle-path-step-final border-2 border-primary/50 bg-[color-mix(in_oklab,var(--landing-bg)_92%,transparent)] shadow-none'
                        : 'bundle-path-step border-2 border-primary/30 bg-[color-mix(in_oklab,var(--landing-bg)_92%,transparent)] hover:border-primary/45',
                    )}
                  >
                    <div
                      className={cn(
                        'relative z-10 flex size-11 items-center justify-center rounded-full border text-sm font-bold',
                        step.isFinal
                          ? 'border-primary/50 bg-[color-mix(in_oklab,var(--landing-bg)_95%,transparent)] text-primary shadow-none'
                          : 'border-[color-mix(in_oklab,var(--landing-border)_55%,transparent)] bg-[color-mix(in_oklab,var(--landing-bg)_95%,transparent)] landing-muted',
                      )}
                    >
                      {index + 1}
                    </div>
                    <h4 className={cn('text-sm font-bold', step.isFinal ? 'text-primary' : 'landing-heading')}>{step.title}</h4>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Connected Courses */}
        <section id="courses" className="bundle-scroll-reveal scroll-mt-24 space-y-10">
          <div>
            <h2 className="text-3xl font-bold landing-heading">Connected Courses</h2>
            <p className="mt-2 text-base landing-muted sm:text-lg">
              These courses are sequenced for optimal learning within the bundle.
            </p>
          </div>

          {connectedCourses.length === 0 ? (
            <div className="border border-border/60 bg-card rounded-2xl border border-dashed border-primary/25 p-10 text-center">
              <p className="text-sm landing-muted">Connected courses will appear here once this bundle is configured.</p>
            </div>
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {connectedCourses.map((course, index) => (
                <article
                  key={`${course.id}-${course.sequence}`}
                  className="border border-border/60 bg-card bundle-v2-glow-hover group flex min-h-[220px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--landing-border)_50%,transparent)] shadow-[0_15px_40px_rgba(0,0,0,0.35)]"
                >
                  <div
                    className={cn(
                      'h-1.5 w-full',
                      index === 0
                        ? 'bg-gradient-to-r from-primary to-primary/70'
                        : 'bg-[color-mix(in_oklab,var(--landing-border)_70%,transparent)] transition-colors group-hover:bg-primary/35',
                    )}
                  />
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col p-5">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded border text-xs font-bold',
                            index === 0
                              ? 'border-primary/35 bg-primary/15 text-primary'
                              : 'border-[color-mix(in_oklab,var(--landing-border)_55%,transparent)] landing-muted group-hover:border-primary/30 group-hover:text-primary',
                          )}
                        >
                          {course.sequence}
                        </span>
                        {course.stageLabel ? (
                          <span className="truncate text-[10px] font-bold uppercase tracking-wider landing-muted">{course.stageLabel}</span>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest',
                          index === 0
                            ? 'border-primary/35 bg-primary/10 text-primary'
                            : 'border-[color-mix(in_oklab,var(--landing-border)_55%,transparent)] landing-muted group-hover:border-primary/25 group-hover:text-primary',
                        )}
                      >
                        Included
                      </span>
                    </div>
                    <h3 className="mb-2 line-clamp-2 break-words text-sm font-bold leading-snug landing-heading transition-colors group-hover:text-primary sm:text-base">
                      {course.title}
                    </h3>
                    {course.shortDescription ? (
                      <p className="mb-4 line-clamp-3 flex-1 break-words text-xs leading-relaxed landing-muted sm:text-sm">{course.shortDescription}</p>
                    ) : (
                      <div className="flex-1" />
                    )}
                    <div className="mt-auto pt-2">
                      {course.learnHref ? (
                        <Link href={course.learnHref} className="text-xs font-bold uppercase tracking-wider text-primary hover:underline">
                          Continue
                        </Link>
                      ) : course.detailHref ? (
                        <Link href={course.detailHref} className="text-[11px] font-bold uppercase tracking-wider text-primary hover:underline">
                          View Course
                        </Link>
                      ) : (course.moduleCount > 0 || course.lessonCount > 0) ? (
                        <p className="text-xs font-medium landing-muted">
                          {course.moduleCount > 0 ? `${course.moduleCount} modules` : null}
                          {course.moduleCount > 0 && course.lessonCount > 0 ? ' · ' : null}
                          {course.lessonCount > 0 ? `${course.lessonCount} lessons` : null}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Course-wise Curriculum */}
        {curriculum.length > 0 ? (
          <section id="curriculum" className="bundle-scroll-reveal scroll-mt-24 space-y-10">
            <div>
              <h2 className="text-3xl font-bold landing-heading">Bundle Curriculum</h2>
              <p className="mt-2 text-base landing-muted sm:text-lg">
                Everything included in this bundle, organized course by course.
              </p>
            </div>
            <div className="space-y-8">
              {curriculum.map((course) => (
                <div
                  key={course.courseId}
                  className="border border-border/60 bg-card overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--landing-border)_50%,transparent)]"
                >
                  <div className="border-b border-[color-mix(in_oklab,var(--landing-border)_45%,transparent)] bg-primary/5 px-6 py-4 sm:px-8">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                      Course {course.sequence}
                    </p>
                    <h3 className="mt-1 line-clamp-2 break-words text-lg font-bold landing-heading sm:text-xl">{course.title}</h3>
                  </div>
                  <div className="divide-y divide-[color-mix(in_oklab,var(--landing-border)_40%,transparent)]">
                    {course.modules.map((mod) => (
                      <div key={mod.id} className="px-6 py-5 sm:px-8">
                        <h4 className="mb-3 line-clamp-2 break-words text-sm font-bold uppercase tracking-wider landing-muted">{mod.title}</h4>
                        <ul className="space-y-2">
                          {mod.lessons.map((lesson) => (
                            <li
                              key={lesson.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-[color-mix(in_oklab,var(--landing-border)_35%,transparent)] bg-[color-mix(in_oklab,var(--landing-surface)_60%,transparent)] px-3 py-2.5"
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                <BookOpen className="size-4 shrink-0 text-primary/80" />
                                <span className="line-clamp-2 break-words text-sm landing-heading">{lesson.title}</span>
                              </div>
                              <div className="flex shrink-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                                {lesson.durationSeconds ? (
                                  <span className="landing-muted">
                                    {Math.max(1, Math.round(lesson.durationSeconds / 60))} min
                                  </span>
                                ) : null}
                                <span
                                  className={cn(
                                    'rounded border px-2 py-0.5',
                                    lesson.locked
                                      ? 'border-[color-mix(in_oklab,var(--landing-border)_55%,transparent)] landing-muted'
                                      : 'border-primary/30 bg-primary/10 text-primary',
                                  )}
                                >
                                  {lesson.locked ? 'Locked' : 'Included'}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Outcomes */}
        <section id="outcomes" className="bundle-scroll-reveal scroll-mt-24">
          <div className="grid min-w-0 grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold landing-heading">What You Will Achieve</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                {(outcomes.length > 0
                  ? outcomes.map((text, i) => ({
                      icon: ACHIEVE_CARDS[i % ACHIEVE_CARDS.length].icon,
                      title: text,
                      description: '',
                    }))
                  : ACHIEVE_CARDS
                ).map((card) => (
                  <div
                    key={card.title}
                    className="border border-border/60 bg-card rounded-2xl border border-[color-mix(in_oklab,var(--landing-border)_45%,transparent)] bg-gradient-to-br from-[color-mix(in_oklab,var(--landing-surface)_70%,transparent)] to-transparent p-5 transition-[border-color,box-shadow] hover:border-primary/35 hover:shadow-[0_15px_30px_rgba(255,107,0,0.08)] sm:p-6"
                  >
                    <div className="mb-3 flex size-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                      <card.icon className="size-5" />
                    </div>
                    <h4 className="font-bold landing-heading">{card.title}</h4>
                    {card.description ? (
                      <p className="mt-1.5 text-sm leading-relaxed landing-muted">{card.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-border/60 bg-card relative overflow-hidden rounded-3xl border border-primary/25 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.4),inset_0_0_30px_rgba(255,107,0,0.04)] sm:p-10 md:p-12">
              <div className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-primary/10 blur-3xl md:blur-[80px]" aria-hidden />
              <h2 className="relative z-10 text-2xl font-bold landing-heading sm:text-3xl">This Bundle Is For You If...</h2>
              <ul className="relative z-10 mt-8 space-y-6">
                {(audiencePoints.length > 0 ? audiencePoints : [...AUDIENCE_BULLETS]).map((bullet) => (
                  <li key={bullet} className="flex items-start gap-4">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                      <Check className="size-4" />
                    </span>
                    <span className="text-sm leading-relaxed landing-heading sm:text-base">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Progress */}
        <section className="bundle-scroll-reveal">
          <BundleProgressCard progress={progress} access={access} />
        </section>

        {/* Final CTA */}
        <section className="bundle-scroll-reveal pb-4">
          <div className="border border-border/60 bg-card relative overflow-hidden rounded-[2rem] border border-primary/25 p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.5)] sm:p-12 md:p-16">
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-[min(600px,90%)] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" aria-hidden />
            <h2 className="relative z-10 text-2xl font-bold landing-heading sm:text-3xl md:text-4xl">
              Start Your Guided Path Today
            </h2>
            <p className="relative z-10 mx-auto mt-4 max-w-2xl text-sm leading-relaxed landing-muted sm:text-base">
              Join this bundle and unlock a structured sequence of courses, practical tasks, and outcome reviews inside one focused learning path.
            </p>
            <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-3">{finalCtaSlot ?? enrollmentSlot}</div>
            <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-6 text-[10px] font-bold uppercase tracking-wider landing-muted sm:text-xs">
              <span className="inline-flex items-center gap-1.5">
                <Zap className="size-3.5 text-primary" />
                Instant Access
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" />
                Self-paced
              </span>
              <span className="inline-flex items-center gap-1.5">
                <GitCompare className="size-3.5 text-primary" />
                Trackable Progress
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function PromiseCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="border border-border/60 bg-card bundle-v2-glow-hover group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--landing-border)_45%,transparent)] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)] sm:p-8">
      <div className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-primary/5 blur-2xl transition-colors group-hover:bg-primary/10" aria-hidden />
      <div className="flex size-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-[inset_0_0_16px_rgba(255,107,0,0.12)] transition-transform group-hover:scale-105 sm:size-14">
        <Icon className="size-5 sm:size-6" />
      </div>
      <h3 className="text-lg font-bold landing-heading sm:text-xl">{title}</h3>
      <p className="text-sm leading-relaxed landing-muted">{description}</p>
    </div>
  );
}
