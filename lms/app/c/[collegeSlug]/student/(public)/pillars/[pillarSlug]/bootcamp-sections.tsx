'use client';

import { CheckCircle2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { UniversalMentorSection } from '@/components/brand/universal-mentor-section';
import { UniversalFinalCtaSection } from '@/components/brand/universal-final-cta-section';
import { UniversalFaqSection } from '@/components/brand/universal-faq-section';
import { BOOTCAMP_PROBLEMS, BOOTCAMP_COMPARISON, BOOTCAMP_JOURNEY_STEPS, BOOTCAMP_FAQ } from './bootcamp-landing-content';
import { SectionHeader } from './bootcamp-shared';
import type { BootcampCtaState } from '@/lib/utils/bootcamp-cta';
import type { JobReadyBootcampProduct } from '@/lib/services/job-ready-bootcamp';

export function BootcampProblems() {
  return (
    <section className="border-t border-border/50 px-4 py-16 sm:px-6 lg:px-8 gsap-reveal">
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          title="Why Standard Learning Fails"
          description="Talent is not the problem. Scattered, tutorial-heavy learning is."
        />
        <div className="mt-10 divide-y divide-border/40 border-y border-border/40 gsap-stagger-item">
          {BOOTCAMP_PROBLEMS.map((problem, index) => (
            <div key={problem.title} className="flex gap-4 py-6 sm:gap-6">
              <span className="text-2xl font-bold text-primary/40 tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">{problem.title}</h3>
                <p className="text-sm text-muted-foreground">{problem.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BootcampJourney() {
  return (
    <section className="border-t border-border/50 px-4 py-16 sm:px-6 lg:px-8 gsap-reveal">
      <div className="mx-auto max-w-6xl space-y-10 text-center">
        <SectionHeader
          title="The NextGen CTO Career Readiness System"
          description="A structured journey from learning fundamentals to building projects, improving profiles, and preparing for interviews."
        />
        <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 gsap-stagger-item">
          {BOOTCAMP_JOURNEY_STEPS.map((step) => (
            <Card
              key={step.title}
              className="border-border/60 text-center shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary/40"
            >
              <CardContent className="flex flex-col items-center gap-2 p-6">
                <step.icon className="size-8 text-primary" />
                <h4 className="font-semibold text-foreground">{step.title}</h4>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BootcampComparison() {
  return (
    <section className="border-t border-border/50 px-4 py-16 sm:px-6 lg:px-8 gsap-reveal">
      <div className="mx-auto max-w-5xl space-y-10">
        <SectionHeader
          title="Random Learning vs Structured Bootcamp"
          description="Random learning feels productive. Structured execution creates visible outcomes."
        />
        <div className="grid gap-6 md:grid-cols-2 gsap-stagger-item">
          <Card className="border-border/60 bg-muted/20 rounded-3xl p-6">
            <CardContent className="space-y-4 p-0 pt-2">
              <h3 className="text-center text-lg font-bold text-muted-foreground">Random Learning</h3>
              {BOOTCAMP_COMPARISON.random.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="relative border-2 border-primary/40 bg-primary/5 rounded-3xl p-6 md:scale-[1.02]">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground hover:bg-primary px-3 py-1 font-bold">
              The NextGen CTO Way
            </Badge>
            <div className="space-y-4 pt-6">
              <h3 className="text-center text-lg font-bold text-primary">NextGen CTO Job Ready Bootcamp</h3>
              {BOOTCAMP_COMPARISON.structured.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-foreground font-semibold">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BootcampFounder({
  collegeSlug,
}: {
  cta?: BootcampCtaState;
  collegeSlug?: string;
  isCompleteBootcamp?: boolean;
  isBootcampEnrolled?: boolean;
  bootcampProduct?: JobReadyBootcampProduct | null;
}) {
  return (
    <div id="mentor">
      <UniversalMentorSection collegeSlug={collegeSlug} showBootcamp />
    </div>
  );
}

export function BootcampFaq() {
  return (
    <UniversalFaqSection
      eyebrow="FAQ"
      title="Last checks before choosing."
      description="Short answers only. The goal is to remove doubts, not add another section to study."
      items={BOOTCAMP_FAQ.map((item) => ({ q: item.q, a: item.a, tag: item.tag }))}
    />
  );
}

export function BootcampFinalCta({
  collegeSlug = '',
}: {
  cta?: BootcampCtaState;
  collegeSlug?: string;
  isCompleteBootcamp?: boolean;
  isBootcampEnrolled?: boolean;
  bootcampProduct?: JobReadyBootcampProduct | null;
  accessExpired?: boolean;
  isPending?: boolean;
}) {
  return (
    <UniversalFinalCtaSection
      collegeSlug={collegeSlug}
      badgeText="Job Ready Cohort"
      heading="Transform into a career-ready software engineer"
      subtext="Get direct mentor accountability, portfolio projects, resume reviews, and interview prep."
      primaryCta={{
        label: 'Join Job Ready Bootcamp',
        href: collegeSlug ? `/c/${collegeSlug}/student/bootcamp#pricing` : '#pricing',
      }}
      secondaryCta={{
        label: 'Explore All Courses',
        href: collegeSlug ? `/c/${collegeSlug}/student/paid-courses` : '/courses',
      }}
    />
  );
}
