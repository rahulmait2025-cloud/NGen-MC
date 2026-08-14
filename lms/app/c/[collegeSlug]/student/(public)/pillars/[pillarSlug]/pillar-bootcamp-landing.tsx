'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PillarCatalogTabs, type PillarCatalogCourse } from '@/components/pillars/pillar-catalog-tabs';
import { Card, CardContent } from '@/components/ui/card';
import type { MasterCoursePillarsRow } from '@/types/database';
import {
  BOOTCAMP_BUILD_ITEMS,
  BOOTCAMP_HERO_FEATURES,
  BOOTCAMP_OUTCOME_ITEMS,
} from './bootcamp-landing-content';
import { resolveBootcampCta } from '@/lib/utils/bootcamp-cta';
import { BootcampProgramCta } from '../../bootcamp/_components/bootcamp-program-cta';
import type { JobReadyBootcampProduct } from '@/lib/services/job-ready-bootcamp';
import { usePrefersReducedMotion, SectionHeader } from './bootcamp-shared';
import { BootcampCourseExplorer } from './bootcamp-course-explorer';
import { BootcampCurriculum } from './bootcamp-curriculum';
import {
  BootcampProblems,
  BootcampJourney,
  BootcampComparison,
  BootcampFounder,
  BootcampFaq,
  BootcampFinalCta,
} from './bootcamp-sections';
import type { BootcampPillarCourseGroup } from './bootcamp-shared';

export type { BootcampPillarCourseGroup };

const EMPTY_VISIBLE_PILLARS: MasterCoursePillarsRow[] = [];
const EMPTY_PILLAR_COURSE_GROUPS: BootcampPillarCourseGroup[] = [];

function formatPillarHeading(count: number): string {
  return `${count} ${count === 1 ? 'Pillar' : 'Pillars'} of Tech Career Readiness`;
}

function formatCareerPillarExplorerTitle(count: number): string {
  return `Explore Courses Across ${count} Career ${count === 1 ? 'Pillar' : 'Pillars'}`;
}

function formatCoursesIncluded(count: number): string {
  if (count === 0) return 'Courses coming soon';
  return `${count} ${count === 1 ? 'course' : 'courses'} included`;
}

function formatCareerPillarLabel(count: number): string {
  return `${count} Career ${count === 1 ? 'Pillar' : 'Pillars'}`;
}

interface PillarBootcampLandingProps {
  collegeSlug: string;
  pillarSlug: string;
  pillarTitle: string;
  pillarDescription: string | null;
  courses: PillarCatalogCourse[];
  courseCount: number;
  moduleCount: number;
  videoCount: number;
  isCompleteBootcamp?: boolean;
  visiblePillars?: MasterCoursePillarsRow[];
  pillarCourseGroups?: BootcampPillarCourseGroup[];
  bootcampProduct?: JobReadyBootcampProduct | null;
  isBootcampEnrolled?: boolean;
  bootcampAccessExpired?: boolean;
  isPending?: boolean;
}

const ENROLLMENT_VALUE_BASE = [
  { title: 'Real projects and portfolio proof', description: 'Ship production-grade work recruiters can actually verify.' },
  { title: 'Resume, GitHub, LinkedIn readiness', description: 'A credible developer profile optimized for callbacks.' },
  { title: 'Interview and communication confidence', description: 'Behavioral frameworks and practice that hold up under pressure.' },
];

export function PillarBootcampLanding({
  collegeSlug,
  pillarSlug,
  pillarTitle,
  pillarDescription,
  courses,
  courseCount,
  moduleCount,
  videoCount,
  isCompleteBootcamp = false,
  visiblePillars: _visiblePillars = EMPTY_VISIBLE_PILLARS,
  pillarCourseGroups = EMPTY_PILLAR_COURSE_GROUPS,
  bootcampProduct = null,
  isBootcampEnrolled = false,
  bootcampAccessExpired = false,
  isPending = false,
}: PillarBootcampLandingProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  const cta = useMemo(
    () => resolveBootcampCta(courses, collegeSlug, pillarSlug),
    [courses, collegeSlug, pillarSlug],
  );

  const totalPillars = pillarCourseGroups.length;
  const trustStrip = useMemo(
    () => [
      { label: formatCareerPillarLabel(totalPillars) },
      { label: 'Project-led Learning' },
      { label: 'Profile Building' },
      { label: 'Interview Readiness' },
    ],
    [totalPillars],
  );
  const enrollmentValue = useMemo(
    () => [
      {
        title: `Structured roadmap across ${totalPillars} ${totalPillars === 1 ? 'pillar' : 'pillars'}`,
        description: 'One guided path instead of scattered tutorials and random playlists.',
      },
      ...ENROLLMENT_VALUE_BASE,
    ],
    [totalPillars],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (reduceMotion || !root) return;

    let ctx: { revert: () => void } | null = null;
    let observer: IntersectionObserver | null = null;
    let active = true;

    import('gsap').then((gsapModule) => {
      if (!active || !rootRef.current) return;
      const { gsap } = gsapModule;

      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from('.gsap-hero-badge', { opacity: 0, y: 15, duration: 0.5 })
          .from('.gsap-hero-title', { opacity: 0, y: 22, duration: 0.62 }, '-=0.28')
          .from('.gsap-hero-sub', { opacity: 0, y: 15, duration: 0.5 }, '-=0.3')
          .from('.gsap-hero-stats', { opacity: 0, y: 10, duration: 0.4 }, '-=0.25')
          .from('.gsap-hero-cta', { opacity: 0, y: 12, stagger: 0.1, duration: 0.4 }, '-=0.2')
          .from('.gsap-hero-pill', { opacity: 0, scale: 0.9, stagger: 0.05, duration: 0.3 }, '-=0.15');

        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const target = entry.target;
                const staggerItems = target.querySelectorAll('.gsap-stagger-item');
                if (staggerItems.length > 0) {
                  gsap.fromTo(staggerItems, { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.07, duration: 0.55, ease: 'power2.out' });
                } else {
                  gsap.fromTo(target, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.58, ease: 'power2.out' });
                }
                observer?.unobserve(target);
              }
            });
          },
          { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
        );

        rootRef.current?.querySelectorAll('.gsap-reveal')?.forEach((sec) => observer?.observe(sec));
      }, rootRef);
    }).catch(() => {});

    return () => { active = false; ctx?.revert(); observer?.disconnect(); };
  }, [reduceMotion]);

  return (
    <div ref={rootRef} className="relative isolate min-h-0 w-full max-w-none overflow-x-clip font-sans">
      <main className="flex-1">
        {/* Hero */}
        <section id="overview" className="relative px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
          <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
            <Badge variant="outline" className="gsap-hero-badge landing-hero-badge rounded-full px-4 py-1.5 font-medium border-primary/30 bg-primary/5 text-primary">
              <Check className="mr-1.5 size-3.5 text-primary" />
              {isCompleteBootcamp ? 'Built for students who want structure, accountability, mentorship, and proof of work.' : 'Focused Bootcamp Pillar Track'}
            </Badge>
            <h1 className="gsap-hero-title text-balance text-[var(--landing-h1-size)] font-bold tracking-tight sm:text-5xl lg:text-6xl landing-heading">
              {isCompleteBootcamp ? (
                <>Build Skills. Ship Projects. Become <span className="landing-hero-highlight block sm:inline">Job Ready.</span></>
              ) : (
                <>Master Specific Domain: <span className="landing-hero-highlight block sm:inline">{pillarTitle}</span></>
              )}
            </h1>
            <p className="gsap-hero-sub max-w-3xl text-pretty text-base landing-muted sm:text-lg">
              {isCompleteBootcamp
                ? 'Follow a structured career readiness bootcamp that brings together technical foundations, AI workflows, real projects, profile building, communication skills, mentorship, and interview confidence.'
                : (pillarDescription || 'Follow a structured path that builds technical foundations and industry readiness.')}
            </p>
            <div className="gsap-hero-cta mt-2 flex flex-col items-center gap-3">
              <BootcampProgramCta
                collegeSlug={collegeSlug}
                isCompleteBootcamp={isCompleteBootcamp}
                isBootcampEnrolled={isBootcampEnrolled}
                bootcampProduct={bootcampProduct}
                fallbackCta={cta}
                size="lg"
                className="scale-105 sm:scale-110"
                enrollLabel="Enroll Now"
                layout="hero"
                accessExpired={bootcampAccessExpired}
                isPending={isPending}
              />
            </div>
            <p className="gsap-hero-stats mt-2 text-xs font-semibold uppercase tracking-widest text-primary">
              {isCompleteBootcamp
                ? `${totalPillars} career ${totalPillars === 1 ? 'pillar' : 'pillars'} • projects • profile building • interview readiness`
                : `${pillarTitle} • ${courseCount} courses • ${moduleCount} modules • ${videoCount} lessons`}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {BOOTCAMP_HERO_FEATURES.map((item) => (
                <Badge key={item.label} variant="secondary" className="gsap-hero-pill landing-tag-pill rounded-full px-3 py-1.5 text-xs font-medium">
                  <item.icon className="mr-1.5 size-3.5 text-primary" />
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* Trust strip */}
        {isCompleteBootcamp && (
          <section className="border-y border-border/50 bg-muted/20 px-4 py-6 sm:px-6 lg:px-8 gsap-reveal">
            <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4 gsap-stagger-item">
              {trustStrip.map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:text-left">
                  <span className="text-sm font-semibold text-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Enrollment value */}
        {isCompleteBootcamp && (
          <section className="border-t border-border/50 px-4 py-16 sm:px-6 lg:px-8 gsap-reveal">
            <div className="mx-auto max-w-6xl space-y-10">
              <SectionHeader eyebrow="The Value" title="What Your Enrollment Unlocks" description="A complete career-readiness system — not just another set of video lectures." />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 gsap-stagger-item">
                {enrollmentValue.map((item) => (
                  <div key={item.title} className="group flex flex-col gap-4 rounded-3xl border border-border/60 p-6">
                    <h3 className="text-base font-bold text-foreground leading-snug">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {isCompleteBootcamp && totalPillars > 0 && (
          <section className="border-t border-border/50 px-4 py-16 sm:px-6 lg:px-8 gsap-reveal">
            <div className="mx-auto max-w-7xl space-y-12">
              <SectionHeader
                eyebrow="The System"
                title={formatPillarHeading(totalPillars)}
                description="Become a complete, placement-ready engineer by mastering every dimension configured in your bootcamp catalog."
              />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 gsap-stagger-item">
                {pillarCourseGroups.map((pillar) => (
                  <div key={pillar.slug} className="group flex flex-col gap-4 rounded-3xl border border-border/60 p-6 sm:p-8">
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{pillar.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {formatCoursesIncluded(pillar.courses.length)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <BootcampProblems />
        <BootcampJourney />
        <BootcampCurriculum
          cta={cta}
          collegeSlug={collegeSlug}
          isCompleteBootcamp={isCompleteBootcamp}
          isBootcampEnrolled={isBootcampEnrolled}
          bootcampProduct={bootcampProduct}
          isPending={isPending}
        />

        {/* Course Explorer */}
        {isCompleteBootcamp ? (
          <section id="course-explorer" className="border-t border-border/50 px-4 py-16 sm:px-6 lg:px-8 gsap-reveal">
            <div className="mx-auto max-w-7xl space-y-10">
              <SectionHeader
                eyebrow="Course Library"
                title={formatCareerPillarExplorerTitle(totalPillars)}
                description="Switch between pillars and browse every course included in your bootcamp catalog."
              />
              {isPending ? (
                <div className="space-y-8">
                  {/* Tab skeleton */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-10 w-24 animate-pulse rounded-full bg-muted/30" />
                    ))}
                  </div>
                  {/* Grid skeleton */}
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-72 animate-pulse rounded-3xl bg-muted/20 border border-border/40" />
                    ))}
                  </div>
                </div>
              ) : (
                <BootcampCourseExplorer collegeSlug={collegeSlug} pillarCourseGroups={pillarCourseGroups} reduceMotion={reduceMotion} />
              )}
            </div>
          </section>
        ) : (
          <section id="course-explorer" className="border-t border-border/50 px-4 py-16 sm:px-6 lg:px-8 gsap-reveal">
            <div className="mx-auto max-w-7xl space-y-6">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Available Courses in {pillarTitle}</h3>
                <p className="text-sm text-muted-foreground">Select a course to continue your progress or start fresh.</p>
              </div>
              {isPending ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-64 animate-pulse rounded-3xl bg-muted/20 border border-border/40" />
                  ))}
                </div>
              ) : courses.length === 0 ? (
                <Card className="border-dashed"><CardContent className="py-16 text-center text-muted-foreground">Pillar content is being curated. Check back soon.</CardContent></Card>
              ) : (
                <PillarCatalogTabs courses={courses} collegeSlug={collegeSlug} pillarSlug={pillarSlug} />
              )}
            </div>
          </section>
        )}

        {/* Build items */}
        <section id="projects" className="border-t border-border/50 px-4 py-16 sm:px-6 lg:px-8 gsap-reveal">
          <div className="mx-auto max-w-7xl space-y-10">
            <SectionHeader title="What You'll Build During The Bootcamp" description="Real, production-grade systems that exceed boilerplate recruiter expectations." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 gsap-stagger-item">
              {BOOTCAMP_BUILD_ITEMS.map((item) => (
                <div key={item.title} className="group flex flex-col items-center gap-3 rounded-3xl border border-border/60 p-8 text-center">
                  <item.icon className="size-8 text-primary transition-transform duration-200 group-hover:scale-110" />
                  <h3 className="font-bold text-foreground text-sm sm:text-base mt-2">{item.title}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Outcomes */}
        <section id="outcomes" className="border-t border-border/50 px-4 py-16 sm:px-6 lg:px-8 gsap-reveal">
          <div className="mx-auto max-w-7xl space-y-10">
            <SectionHeader title="What You'll Walk Away With" description="Practical proof of your engineering and career readiness that recruiters can verify." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 gsap-stagger-item">
              {BOOTCAMP_OUTCOME_ITEMS.map((item) => (
                <div key={item.title} className="group flex flex-col items-center gap-3 rounded-3xl border border-border/60 p-8 text-center">
                  <item.icon className="size-8 text-primary transition-transform duration-200 group-hover:scale-110" />
                  <h3 className="font-bold text-foreground text-sm sm:text-base mt-2">{item.title}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <BootcampComparison />
        <BootcampFounder cta={cta} collegeSlug={collegeSlug} isCompleteBootcamp={isCompleteBootcamp} isBootcampEnrolled={isBootcampEnrolled} bootcampProduct={bootcampProduct} />
        <BootcampFinalCta
          cta={cta}
          collegeSlug={collegeSlug}
          isCompleteBootcamp={isCompleteBootcamp}
          isBootcampEnrolled={isBootcampEnrolled}
          bootcampProduct={bootcampProduct}
          accessExpired={bootcampAccessExpired}
          isPending={isPending}
        />
        <BootcampFaq />
      </main>
    </div>
  );
}
