'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  BookOpen,
  Bot,
  CheckCircle2,
  Code2,
  Cpu,
  Layers,
  Map,
  Medal,
  Play,
  Search,
  SlidersHorizontal,
  TrendingUp,
  UserPlus,
  Verified,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StudentCtaButton } from '@/components/student/ui/student-cta-button';
import { StudentPaidCourseCard } from '@/components/student/landing/student-landing-card';
import { buildPillarCourseDetailHref } from '@/lib/utils/variant-learn-url';
import { getStudentCourseActionFromCatalogItem } from '@/lib/student/student-course-cta';
import { studentBasePath } from '@/lib/student/student-home-route';
import { UniversalMentorSection } from '@/components/brand/universal-mentor-section';
import { UniversalFinalCtaSection } from '@/components/brand/universal-final-cta-section';
import { UniversalFaqSection } from '@/components/brand/universal-faq-section';
import type {
  PaidCourseCatalogData,
  PaidCourseCatalogDiscoverableItem,
} from '../load-paid-courses-data';
import { BundleCardsSection } from '../../bundles/_components/bundle-cards-section';
import { LandingSectionHeader } from '@/components/student/landing/landing-section-header';

const WHY_CHOOSE_ITEMS = [
  {
    icon: Map,
    title: 'Clear Roadmap',
    description: 'No more guessing what to learn next. Follow structured paths designed by industry experts.',
  },
  {
    icon: Wrench,
    title: 'Project-first Learning',
    description: 'Learn by building real-world applications, not just watching theoretical videos.',
  },
  {
    icon: TrendingUp,
    title: 'Career-focused Outcomes',
    description: 'Curriculum optimized for what top tech companies actually test for and require.',
  },
  {
    icon: UserPlus,
    title: 'Profile Building',
    description: 'Stand out with a strong GitHub, optimized LinkedIn, and professional resume.',
  },
  {
    icon: Layers,
    title: 'Progress Tracking',
    description: 'Monitor your growth with structured milestones and learning progress.',
  },
  {
    icon: Medal,
    title: 'Certificate on Completion',
    description: 'Earn a verifiable certificate to showcase your completed learning journey.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'Do I need prior experience?',
    answer: 'No. Courses are structured to help you start from the right level and build step by step. Some advanced courses may recommend basic programming knowledge.',
  },
  {
    question: 'How long do I get access?',
    answer: 'Access depends on the course, plan, and college eligibility. You will see the exact access details before enrollment.',
  },
  {
    question: 'Do these courses include projects?',
    answer: 'Yes. The focus is on structured learning with practical execution, projects, profile building, and interview readiness.',
  },
  {
    question: 'Are there live classes?',
    answer: 'Some programs may include live sessions, mentorship, or review support depending on the course or college plan.',
  },
  {
    question: 'Will I get a certificate?',
    answer: 'Eligible learners can receive a certificate after completing the required course milestones.',
  },
  {
    question: 'Do you provide placement support?',
    answer: 'The courses focus on career readiness, portfolio strength, interview preparation, and profile improvement. Placement support depends on the program or college agreement.',
  },
  {
    question: 'Can I switch courses?',
    answer: 'Course access depends on your enrollment, plan, and college eligibility. Available courses will be shown inside your LMS.',
  },
  {
    question: 'Is there an EMI option?',
    answer: 'If EMI or flexible payment options are enabled for a course, they will appear during checkout.',
  },
];


function Wrench(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function matchesSearch(text: string | null | undefined, q: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(q);
}

function resolveCourseAction(
  course: PaidCourseCatalogDiscoverableItem,
  collegeSlug: string,
): { href: string; label: string } {
  return getStudentCourseActionFromCatalogItem(collegeSlug, course);
}

/** Local reduced-motion check (GSAP-only, no Framer Motion dependency). */
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

interface PaidCourseCatalogViewProps {
  collegeSlug: string;
  data?: PaidCourseCatalogData;
  isPending?: boolean;
  showBootcamp?: boolean;
}

export function PaidCourseCatalogView({
  collegeSlug,
  data,
  isPending = false,
  showBootcamp = false,
}: PaidCourseCatalogViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  const [search, setSearch] = useState('');

  // Master courses, paid variants, and Paid Course Builder courses in the paid catalog
  const premiumCourses = useMemo(() => {
    if (isPending || !data) return [];
    return data.discoverableItems.filter((c) => {
      if (c.is_free || c.pricing_model === 'free') return false;

      const isPaid =
        c.catalog_kind === 'variant'
          ? (c.paid_source_type === 'course_variant' || (!!c.pricing_model && c.pricing_model !== 'free'))
          : (c.paid_source_type === 'paid_course_builder' || c.show_as_paid_course || (!!c.pricing_model && c.pricing_model !== 'free'));

      return isPaid;
    });
  }, [data, isPending]);

  const featuredCourse = useMemo(() => {
    if (isPending || !data) return null;
    // Try to find a premium bootcamp/project course
    return (
      premiumCourses.find((c) => matchesSearch(c.title, 'bootcamp') || matchesSearch(c.title, 'project')) ||
      premiumCourses[0] ||
      data.discoverableItems[0]
    );
  }, [premiumCourses, data, isPending]);

  const filteredCourses = useMemo(() => {
    if (isPending || !data) return [];
    const q = search.trim().toLowerCase();
    let items = premiumCourses.length > 0 ? premiumCourses : data.discoverableItems;

    if (q) {
      items = items.filter(
        (i) =>
          matchesSearch(i.title, q) ||
          matchesSearch(i.pillar_title, q) ||
          matchesSearch(i.description, q)
      );
    }

    return items;
  }, [premiumCourses, search, isPending, data]);

  useEffect(() => {
    const root = rootRef.current;
    if (reduceMotion || !root) return;

    let ctx: { revert: () => void } | null = null;
    let observer: IntersectionObserver | null = null;
    let active = true;

    // Lazy-load GSAP — page content is fully visible without animation
    import('gsap').then((gsapModule) => {
      if (!active || !rootRef.current) return;
      const { gsap } = gsapModule;

      ctx = gsap.context(() => {
        // 1. Hero Reveal
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from('.gsap-hero-badge', { opacity: 0, y: 15, duration: 0.5 })
          .from('.gsap-hero-title', { opacity: 0, y: 22, duration: 0.6 }, '-=0.3')
          .from('.gsap-hero-sub', { opacity: 0, y: 15, duration: 0.5 }, '-=0.3')
          .from('.gsap-hero-cta', { opacity: 0, y: 12, stagger: 0.1, duration: 0.4 }, '-=0.2')
          .from('.gsap-hero-card', { opacity: 0, x: 20, rotation: 5, stagger: 0.1, duration: 0.6 }, '-=0.5');

        // 2. Scroll Reveals
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const target = entry.target;
                const staggerItems = target.querySelectorAll('.gsap-stagger-item');
                if (staggerItems.length > 0) {
                  gsap.fromTo(
                    staggerItems,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, stagger: 0.08, duration: 0.55, ease: 'power2.out' },
                  );
                } else {
                  gsap.fromTo(
                    target,
                    { opacity: 0, y: 24 },
                    { opacity: 1, y: 0, duration: 0.58, ease: 'power2.out' },
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

      }, rootRef);
    }).catch(() => {
      // GSAP failed — content stays fully visible
    });

    return () => {
      active = false;
      ctx?.revert();
      observer?.disconnect();
    };
  }, [reduceMotion]);

  const base = studentBasePath(collegeSlug);

  return (
    <div ref={rootRef} className="relative isolate min-h-0 w-full max-w-none overflow-x-clip pb-24 font-sans">
      {/* 1. Hero Section */}
      <section className="relative px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="space-y-6 text-center lg:text-left relative z-10">
              <Badge variant="outline" className="gsap-hero-badge rounded-full px-4 py-1.5 font-semibold border-primary/35 bg-primary/10 text-primary animate-badge-shimmer animate-badge-pulse-glow">
                <span className="relative mr-1.5 flex size-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-primary"></span>
                </span>
                <Verified className="mr-1.5 size-3.5 text-primary" />
                Premium Course Library
              </Badge>

              <h1 className="gsap-hero-title text-balance text-[var(--landing-h1-size)] font-bold tracking-tight sm:text-5xl lg:text-6xl landing-heading leading-[var(--landing-h1-leading)]">
                Stop Watching Random Tutorials.<br className="hidden lg:block" />
                <span className="text-primary">Start Building With Structure.</span>
              </h1>

              <p className="gsap-hero-sub max-w-2xl text-pretty text-[var(--landing-body-size)] landing-muted sm:text-lg mx-auto lg:mx-0 leading-relaxed">
                Choose premium NextGen CTO courses built around structured learning, practical execution, profile strength, and interview confidence — all inside one focused LMS ecosystem.
              </p>

              <div className="gsap-hero-cta flex flex-col items-center gap-4 sm:flex-row lg:justify-start pt-4">
                <StudentCtaButton href="#course-grid" size="lg">
                  Explore Courses
                </StudentCtaButton>
                <StudentCtaButton href={`${base}/my-courses`} variant="secondary" size="lg" showArrow={false}>
                  My Courses
                </StudentCtaButton>
              </div>
            </div>

            {/* Decorative Course Cards — Hidden on mobile */}
            <div className="hidden lg:block relative h-[400px]">
              <div className="gsap-hero-card absolute top-10 right-0 w-[260px] rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex items-center gap-3 mb-3 text-muted-foreground"><Cpu className="size-5" /><h3 className="font-bold text-sm">Interview Prep</h3></div>
                <div className="h-1.5 bg-muted/50 rounded-full mt-3 overflow-hidden"><div className="h-full bg-primary/40 w-1/4" /></div>
              </div>
              <div className="gsap-hero-card absolute top-24 right-8 w-[280px] rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex items-center gap-3 mb-3 text-muted-foreground"><Bot className="size-5" /><h3 className="font-bold text-sm">AI Tools for Devs</h3></div>
                <div className="h-1.5 bg-muted/50 rounded-full mt-3 overflow-hidden"><div className="h-full bg-primary/60 w-1/3" /></div>
              </div>
              <div className="gsap-hero-card absolute top-38 right-16 w-[300px] rounded-2xl border border-border/60 bg-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-primary/10 rounded-xl">
                    <Code2 className="size-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                    Advanced
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">Advanced DSA</h3>
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed">Master complex algorithms and system design patterns.</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider"><span className="text-muted-foreground">Progress</span><span className="text-primary">75%</span></div>
                  <Progress value={75} className="h-1.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <BundleCardsSection collegeSlug={collegeSlug} bundles={data?.bundles ?? []} isPending={isPending} />

      {/* 3. Course Grid */}
      <section id="course-grid" className="px-4 py-16 sm:px-6 lg:px-8 gsap-reveal min-h-[60vh]">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl landing-heading mb-2">
                Explore Premium Courses
              </h2>
              <p className="text-base text-muted-foreground">
                Curated paths for serious developers.
              </p>
            </div>
            <div className="p-2 rounded-2xl flex gap-2 items-center w-full md:w-auto border border-border/60 bg-card">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search courses..."
                  className="w-full bg-muted/50 border border-border/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition placeholder:text-muted-foreground/60"
                  aria-label="Search courses"
                />
              </div>
              <Button variant="outline" size="icon" className="shrink-0 rounded-xl border-border/50 hover:text-primary">
                <SlidersHorizontal className="size-4" />
              </Button>
            </div>
          </div>

          {isPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-80 animate-pulse rounded-3xl bg-muted/20 border border-border/40" />
              ))}
            </div>
          ) : data?.loadError ? (
            <div className="mx-auto max-w-2xl rounded-3xl border border-destructive/30 bg-destructive/5 p-16 text-center gsap-stagger-item">
              <BookOpen className="mx-auto mb-5 size-12 text-destructive/50" />
              <h3 className="mb-2 text-xl font-bold text-foreground">Catalog loading failed</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                We could not load the premium course catalog right now. Please try again shortly.
              </p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="mx-auto max-w-2xl rounded-3xl border border-dashed border-border/60 p-16 text-center gsap-stagger-item">
              <BookOpen className="mx-auto mb-5 size-12 text-muted-foreground/40" />
              <h3 className="mb-2 text-xl font-bold text-foreground">No courses found</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Premium courses will appear here once they are published for your college.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 gsap-stagger-item">
              {filteredCourses.map((course, idx) => {
                const action = resolveCourseAction(course, collegeSlug);
                const isBestseller = idx === 0;
                const isFeatured = idx === 2;

                return (
                  <StudentPaidCourseCard
                    key={course.catalog_key}
                    title={course.title}
                    description={course.description}
                    pillarLabel={course.pillar_title || 'Premium'}
                    moduleCount={course.module_count}
                    videoCount={course.video_count}
                    media={
                      course.thumbnailUrl ? (
                        <Image
                          src={course.thumbnailUrl}
                          alt={course.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          priority={idx < 4}
                        />
                      ) : undefined
                    }
                    topRightBadge={
                      isBestseller || isFeatured ? (
                        <Badge className="bg-orange-500 text-white border-0 text-[10px] font-bold uppercase tracking-wider animate-badge-shimmer animate-badge-pulse-glow shadow-md">
                          <span className="relative mr-1.5 flex size-1.5 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-85"></span>
                            <span className="relative inline-flex size-1.5 rounded-full bg-white"></span>
                          </span>
                          {isBestseller ? 'Bestseller' : 'Featured'}
                        </Badge>
                      ) : undefined
                    }
                    primaryAction={action}
                    secondaryAction={{
                      href: buildPillarCourseDetailHref(collegeSlug, course.pillar_slug, course.id, course.variant_id),
                      label: 'Details',
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 4. Featured Premium Track */}
      {featuredCourse && !isPending && (
        <section className="px-4 py-16 sm:px-6 lg:px-8 gsap-reveal">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card p-8 sm:p-12">
              
              <div className="flex flex-col lg:flex-row gap-12 items-center">
                <div className="flex-1 space-y-6">
                  <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Featured Premium Track</span>
                  <h2 className="text-3xl font-bold text-foreground sm:text-4xl landing-heading leading-tight">
                    {featuredCourse.title}
                  </h2>
                  <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
                    {featuredCourse.description || 'Master end-to-end development by building real, scalable applications. Go beyond simple tutorials and learn to architect systems like a senior engineer.'}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2 mb-8">
                    <div className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                      <CheckCircle2 className="text-primary size-5" /> Frontend + Backend
                    </div>
                    <div className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                      <CheckCircle2 className="text-primary size-5" /> API + Database
                    </div>
                    <div className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                      <CheckCircle2 className="text-primary size-5" /> Project Build
                    </div>
                    <div className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                      <CheckCircle2 className="text-primary size-5" /> GitHub Showcase
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <StudentCtaButton href={resolveCourseAction(featuredCourse, collegeSlug).href}>
                      {resolveCourseAction(featuredCourse, collegeSlug).label}
                    </StudentCtaButton>
                    <StudentCtaButton
                      href={buildPillarCourseDetailHref(collegeSlug, featuredCourse.pillar_slug, featuredCourse.id, featuredCourse.variant_id)}
                      variant="secondary"
                      showArrow={false}
                    >
                      View Details
                    </StudentCtaButton>
                  </div>
                </div>

                <div className="w-full lg:w-[40%] aspect-video bg-muted/40 rounded-2xl border border-border/50 flex items-center justify-center relative overflow-hidden group">
                  {featuredCourse.thumbnailUrl ? (
                    <Image
                      src={featuredCourse.thumbnailUrl}
                      alt={featuredCourse.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-br from-card/10 to-muted/20 opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="size-14 rounded-full bg-background/90 border border-border flex items-center justify-center shadow-sm backdrop-blur transition-transform duration-300 group-hover:scale-110">
                      <Play className="size-6 text-primary ml-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. Why Choose NextGen CTO? */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 gsap-reveal">
        <div className="mx-auto max-w-7xl">
          <LandingSectionHeader
            title="Why Choose NextGen CTO?"
            description="The premium difference in your learning journey."
            className="mb-12"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 gsap-stagger-item">
            {WHY_CHOOSE_ITEMS.map((item) => (
              <div key={item.title} className="p-8 rounded-3xl border border-border/60 transition-colors duration-200 hover:border-primary/30">
                <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                  <item.icon className="size-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Mentor Section */}
      <UniversalMentorSection collegeSlug={collegeSlug} showBootcamp={showBootcamp} />

      {/* 7. Final CTA Section */}
      <UniversalFinalCtaSection
        collegeSlug={collegeSlug}
        badgeText="Structured Growth"
        heading="Elevate your engineering skills with paid tracks"
        subtext="Deep-dive project courses, pattern-based DSA, and career support to help you crack top tech roles."
        primaryCta={{
          label: showBootcamp ? 'Explore Bootcamp Path' : 'Get Started Now',
          href: showBootcamp
            ? `/c/${collegeSlug}/student/bootcamp`
            : `/c/${collegeSlug}/student/paid-courses`,
        }}
        secondaryCta={{
          label: 'View Free Courses',
          href: `/c/${collegeSlug}/student/free-courses`,
        }}
      />

      {/* 8. FAQ Section */}
      <UniversalFaqSection
        eyebrow="FAQ"
        title="Last checks before choosing."
        description="Short answers only. The goal is to remove doubts, not add another section to study."
        items={FAQ_ITEMS.map((item) => ({ q: item.question, a: item.answer }))}
      />
    </div>
  );
}
