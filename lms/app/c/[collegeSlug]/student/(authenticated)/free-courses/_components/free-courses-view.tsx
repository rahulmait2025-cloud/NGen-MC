'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Code2,
  GraduationCap,
  Laptop,
  Layers,
  Map,
  Medal,
  Play,
  PlayCircle,
  Quote,
  TrendingUp,
  UserPlus,
  Youtube,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StudentCtaButton } from '@/components/student/ui/student-cta-button';
import { YouTubeThumbnail } from '@/components/student/youtube-thumbnail';
import { UniversalMentorSection } from '@/components/brand/universal-mentor-section';
import { UniversalFinalCtaSection } from '@/components/brand/universal-final-cta-section';
import { UniversalFaqSection } from '@/components/brand/universal-faq-section';
import { LandingSectionHeader } from '@/components/student/landing/landing-section-header';
import type { FreeCoursesData } from '../load-free-courses-data';
import { FreeCatalogSection } from './free-courses-catalog';
import { enrollFreeDbCourseAction, unenrollFreeDbCourseAction } from '../actions';
import { useAuthGate } from '@/hooks/use-auth-gate';

const VALUE_STRIP = [
  { icon: Award, label: 'Free Enrollment' },
  { icon: BookOpen, label: 'Structured LMS Courses' },
  { icon: GraduationCap, label: 'Beginner Friendly' },
  { icon: Laptop, label: 'Structured Inside LMS' },
  { icon: Code2, label: 'Practical Skills' },
];

const WHY_ENROLL_ITEMS = [
  { icon: Map, title: 'Structured Learning', description: 'Follow a clear, sequential path. Build your foundation step by step.' },
  { icon: Quote, title: 'CTO Bhaiya Explanations', description: 'Learn from practical explanations that break down complex topics simply.' },
  { icon: Layers, title: 'Extra LMS Resources', description: 'Access additional notes, code snippets, and practice problems inside the platform.' },
  { icon: UserPlus, title: 'Beginner-First Approach', description: 'Every beginner-friendly course helps you start from the right level.' },
  { icon: Layers, title: 'Track Your Progress', description: 'Pick up exactly where you left off. Mark lessons complete and see your progress grow.' },
  { icon: TrendingUp, title: 'Clear Upgrade Path', description: 'When you\'re ready for advanced training, transition smoothly to premium learning.' },
];

const FAQ_ITEMS = [
  { question: 'Are these courses really free?', answer: 'Yes. Free courses are available without payment, subject to LMS access and course availability.' },
  { question: 'Do I need prior experience?', answer: 'No. Many free courses are beginner-friendly and designed to help you build fundamentals step by step.' },
  { question: 'Will my progress be tracked?', answer: 'Yes. If the course is delivered through the LMS, your progress can be tracked as you complete lessons.' },
  { question: 'Do free courses include extra LMS resources?', answer: 'Some free courses may include additional notes, practice resources, or structured learning materials inside the LMS.' },
  { question: 'Can I get a certificate for free courses?', answer: 'Certificate availability depends on the course and LMS rules. If a certificate is available, it will be shown inside the course.' },
  { question: 'Can I upgrade to premium courses later?', answer: 'Yes. Free courses help you build foundations, and premium courses provide deeper structure, projects, mentorship, and career readiness.' },
  { question: 'Are these YouTube videos only?', answer: 'Some lessons may use free video content, but the LMS can also include additional structure, resources, progress tracking, and premium learning support.' },
  { question: 'How do I enroll?', answer: 'Open a free course, click enroll or start learning, and continue inside the LMS.' },
];

function matchesSearch(text: string | null | undefined, q: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(q);
}

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

interface FreeCoursesViewProps {
  collegeSlug: string;
  data?: FreeCoursesData;
  isPending?: boolean;
  showBootcamp?: boolean;
}

export function FreeCoursesView({ collegeSlug, data, isPending, showBootcamp = false }: FreeCoursesViewProps) {
  const router = useRouter();
  const { requireAuth } = useAuthGate();
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const [enrollingFeatured, setEnrollingFeatured] = useState(false);
  const [unenrollingFeatured, setUnenrollingFeatured] = useState(false);

  const handleEnrollFeatured = async (courseId: string) => {
    if (!requireAuth({
      intent: 'Enroll',
      returnTo: typeof window !== 'undefined' ? window.location.href : '',
    })) {
      return;
    }
    setEnrollingFeatured(true);
    try {
      const res = await enrollFreeDbCourseAction(collegeSlug, courseId);
      if (res.ok) {
        toast.success('Enrolled successfully.');
        router.push(`/c/${encodeURIComponent(collegeSlug)}/student/payment-success?courseId=${encodeURIComponent(courseId)}&enrollment=free`);
      } else {
        toast.error(res.error || 'Enrollment failed');
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setEnrollingFeatured(false);
    }
  };

  const handleUnenrollFeatured = async (courseId: string) => {
    if (!requireAuth({
      intent: 'Enroll',
      returnTo: typeof window !== 'undefined' ? window.location.href : '',
    })) {
      return;
    }
    setUnenrollingFeatured(true);
    try {
      const res = await unenrollFreeDbCourseAction(collegeSlug, courseId);
      if (res.ok) {
        toast.success('Unenrolled successfully.');
      } else {
        toast.error(res.error || 'Could not unenroll');
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setUnenrollingFeatured(false);
    }
  };

  const featuredCourse = useMemo(() => {
    if (!data) return null;
    return data.courses.find((c) => matchesSearch(c.title, 'dsa') || matchesSearch(c.title, 'java')) || data.courses[0] || null;
  }, [data]);

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
          .from('.gsap-hero-title', { opacity: 0, y: 22, duration: 0.6 }, '-=0.3')
          .from('.gsap-hero-sub', { opacity: 0, y: 15, duration: 0.5 }, '-=0.3')
          .from('.gsap-hero-trust', { opacity: 0, y: 12, duration: 0.4 }, '-=0.25')
          .from('.gsap-hero-cta', { opacity: 0, y: 12, stagger: 0.1, duration: 0.4 }, '-=0.2')
          .from('.gsap-hero-card', { opacity: 0, x: 20, rotation: 5, stagger: 0.1, duration: 0.6 }, '-=0.5');

        observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const target = entry.target;
              const staggerItems = target.querySelectorAll('.gsap-stagger-item');
              if (staggerItems.length > 0) {
                gsap.fromTo(staggerItems, { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.55, ease: 'power2.out' });
              } else {
                gsap.fromTo(target, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.58, ease: 'power2.out' });
              }
              observer?.unobserve(target);
            }
          });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

        rootRef.current?.querySelectorAll('.gsap-reveal')?.forEach((sec) => observer?.observe(sec));
      }, rootRef);
    }).catch(() => {});

    return () => { active = false; ctx?.revert(); observer?.disconnect(); };
  }, [reduceMotion]);

  return (
    <div ref={rootRef} className="relative isolate min-h-0 w-full max-w-none overflow-x-clip pb-24 font-sans">
      {/* Hero */}
      <section className="relative px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="space-y-6 text-center lg:text-left relative z-10">
              <Badge variant="outline" className="gsap-hero-badge rounded-full px-4 py-1.5 font-medium border-primary/30 bg-primary/5 text-primary">
                <Youtube className="mr-1.5 size-3.5 text-primary" /> Premium Free Learning
              </Badge>
              <h1 className="gsap-hero-title text-balance text-[var(--landing-h1-size)] font-bold tracking-tight sm:text-5xl lg:text-6xl landing-heading leading-[var(--landing-h1-leading)]">
                Start Learning With CTO Bhaiya&apos;s<br />
                <span className="text-primary relative inline-block">Free Courses</span>
              </h1>
              <p className="gsap-hero-sub max-w-2xl text-pretty text-[var(--landing-body-size)] landing-muted sm:text-lg mx-auto lg:mx-0 leading-relaxed">
                Explore our free learning library and beginner-friendly lessons built inside the NextGen CTO LMS. Build strong foundations with high-quality tech education.
              </p>
              <div className="gsap-hero-trust inline-flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
                <CheckCircle2 className="size-5 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground text-left leading-relaxed">
                  Created by <span className="font-semibold text-foreground">CTO Bhaiya</span>. Delivered through <span className="font-semibold text-foreground">NextGen CTO LMS</span>.
                </p>
              </div>
              <div className="gsap-hero-cta flex flex-col items-center gap-4 sm:flex-row lg:justify-start pt-4">
                <StudentCtaButton href="#free-course-catalog" size="lg">
                  Enroll Now
                </StudentCtaButton>
                <StudentCtaButton href="#free-course-catalog" variant="secondary" size="lg" showArrow={false}>
                  Browse Catalog
                </StudentCtaButton>
              </div>
            </div>

            <div className="hidden lg:block relative h-[400px]">
              <div className="gsap-hero-card absolute top-32 right-16 w-[300px] rounded-2xl border border-border/60 bg-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-primary/10 rounded-xl"><Youtube className="size-5 text-primary" /></div>
                  <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] uppercase font-bold tracking-wider">100% Free</Badge>
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">Complete DSA in Java</h3>
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed">Master Data Structures and Algorithms from scratch using Java.</p>
                <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="flex items-center gap-1.5"><PlayCircle className="size-3.5" /> 45 Lessons</span>
                  <span className="flex items-center gap-1.5"><Medal className="size-3.5" /> Beginner</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Strip */}
      <section className="px-4 py-8 sm:px-6 lg:px-8 gsap-reveal border-y border-border/40 bg-muted/10">
        <div className="mx-auto max-w-7xl grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 gsap-stagger-item">
          {VALUE_STRIP.map((item) => (
            <div key={item.label} className="group flex flex-col items-center gap-3 rounded-2xl border border-border/60 p-5 text-center transition-colors duration-200 ease-out hover:border-primary/40">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 transition-colors group-hover:bg-primary/20">
                <item.icon className="size-6 text-primary" />
              </div>
              <h3 className="text-sm font-bold text-foreground">{item.label}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Course */}
      {featuredCourse ? (
        <section className="px-4 py-16 sm:px-6 lg:px-8 gsap-reveal">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card">
              <div className="absolute top-0 right-0 z-20 rounded-bl-2xl bg-primary text-black font-semibold text-sm px-4 py-1.5 uppercase tracking-wider">Featured Course</div>
              <div className="flex flex-col lg:flex-row">
                <div className="relative w-full lg:w-1/2 min-h-[280px] bg-muted/40 overflow-hidden">
                  {featuredCourse.thumbnail ? (
                    <YouTubeThumbnail src={featuredCourse.thumbnail} alt="" fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-card"><Youtube className="size-16 text-primary/50" /></div>
                  )}
                    <div className="absolute inset-0 flex items-center justify-center bg-background/20">
                      <div className="size-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center transition-transform duration-200 ease-out hover:scale-110 active:scale-95">
                      <Play className="size-8 text-primary ml-1" />
                    </div>
                  </div>
                </div>
                <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
                  <div className="flex gap-2 mb-4">
                    <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] uppercase font-bold tracking-wider">100% Free</Badge>
                  </div>
                  <h2 className="text-3xl font-bold text-foreground sm:text-4xl landing-heading mb-4 leading-tight">{featuredCourse.title}</h2>
                  <p className="text-base text-muted-foreground mb-6 leading-relaxed line-clamp-3">
                    {featuredCourse.description || 'Master Data Structures and Algorithms from scratch using Java.'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {featuredCourse.isEnrolled ? (
                      <>
                        <StudentCtaButton href={featuredCourse.learnHref ?? `/c/${encodeURIComponent(collegeSlug)}/student/learn/${encodeURIComponent(featuredCourse.id)}`} size="lg">
                          Start Learning
                        </StudentCtaButton>
                        <StudentCtaButton onClick={() => handleUnenrollFeatured(featuredCourse.id)} disabled={unenrollingFeatured} variant="secondary" size="lg" showArrow={false}>
                          {unenrollingFeatured ? 'Unenrolling...' : 'Unenroll'}
                        </StudentCtaButton>
                      </>
                    ) : (
                      <>
                        <StudentCtaButton
                          onClick={() => handleEnrollFeatured(featuredCourse.id)}
                          disabled={enrollingFeatured}
                          size="lg"
                        >
                          {enrollingFeatured ? 'Enrolling...' : 'Enroll Free'}
                        </StudentCtaButton>
                        <StudentCtaButton
                          href={featuredCourse.detailsHref ?? `/c/${encodeURIComponent(collegeSlug)}/student/courses/${encodeURIComponent(featuredCourse.id)}`}
                          variant="secondary"
                          size="lg"
                          showArrow={false}
                        >
                          View Details
                        </StudentCtaButton>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Catalog */}
      <FreeCatalogSection 
        collegeSlug={collegeSlug} 
        courses={data?.courses ?? []} 
        isPending={isPending} 
      />

      {/* Why Enroll */}
      <section className="border-t border-border/50 px-4 py-16 sm:px-6 lg:px-8 gsap-reveal">
        <div className="mx-auto max-w-7xl">
          <LandingSectionHeader title="Why Enroll in the NextGen CTO LMS?" description="We've structured our free learning library in a professional environment." className="mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 gsap-stagger-item">
            {WHY_ENROLL_ITEMS.map((item) => (
              <div key={item.title} className="p-8 rounded-3xl border border-border/60 transition-colors duration-200 ease-out hover:border-primary/30">
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

      {/* Mentor Section */}
      <UniversalMentorSection collegeSlug={collegeSlug} showBootcamp={showBootcamp} />

      {/* Final CTA */}
      <UniversalFinalCtaSection
        collegeSlug={collegeSlug}
        badgeText="100% Free Learning"
        heading="Start building strong tech foundations today"
        subtext="Zero cost, high-quality curated playlists and foundation courses. Upgrade to paid tracks whenever you are ready."
        primaryCta={{
          label: 'Explore Free Catalog',
          href: '#free-course-catalog',
        }}
        secondaryCta={{
          label: 'Explore Paid Courses',
          href: `/c/${collegeSlug}/student/paid-courses`,
        }}
      />

      {/* FAQ */}
      <UniversalFaqSection
        eyebrow="FAQ"
        title="Last checks before choosing."
        description="Short answers only. The goal is to remove doubts, not add another section to study."
        items={FAQ_ITEMS.map((item) => ({ q: item.question, a: item.answer }))}
      />
    </div>
  );
}
