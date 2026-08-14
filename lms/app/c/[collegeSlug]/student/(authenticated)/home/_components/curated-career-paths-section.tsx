'use client';

import Link from 'next/link';
import { ArrowRight, Brain, Code2, Sparkles } from 'lucide-react';
import { LandingSectionShell } from './landing-section-shell';
import { LandingReveal, LandingRevealItem } from './landing-motion';
import { studentBasePath } from '@/lib/student/student-home-route';
import { cn } from '@/lib/utils';

interface CuratedCareerPathsSectionProps {
  collegeSlug: string;
}

const CURATED_PATHS = [
  {
    id: 'full-stack',
    title: 'Full Stack Bootcamp',
    description:
      'Build production-ready web apps with modern frontend, backend, and deployment skills.',
    icon: Code2,
    segment: 'courses',
  },
  {
    id: 'dsa',
    title: 'DSA & Interview Prep',
    description:
      'Master data structures, algorithms, and problem-solving patterns for technical interviews.',
    icon: Brain,
    segment: 'courses',
  },
  {
    id: 'ai',
    title: 'AI Developer Starter',
    description:
      'Learn practical AI tooling, APIs, and workflows to ship intelligent product features.',
    icon: Sparkles,
    segment: 'courses',
  },
] as const;

export function CuratedCareerPathsSection({ collegeSlug }: CuratedCareerPathsSectionProps) {
  const base = studentBasePath(collegeSlug);

  return (
    <LandingSectionShell className="py-10 sm:py-12">
      <div className="mb-8 flex flex-col gap-2 sm:mb-10">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Career Paths
        </span>
        <h2 className="text-2xl font-semibold tracking-tight landing-heading sm:text-3xl">
          Start with a proven track
        </h2>
        <p className="max-w-2xl text-sm landing-muted sm:text-base">
          Curated learning paths to explore on Courses and level up your skills.
        </p>
      </div>

      <LandingReveal staggerChildren={0.08}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CURATED_PATHS.map((path) => {
            const Icon = path.icon;
            const href = `${base}/${path.segment}`;
            return (
              <LandingRevealItem key={path.id}>
                <Link
                  href={href}
                  className={cn(
                    'border-beam-card group flex flex-col gap-4 rounded-2xl bg-[var(--landing-card)] p-6',
                    'transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg',
                  )}
                >
                  <div className="relative z-10 flex flex-1 flex-col gap-4">
                    <div className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 transition-transform duration-200 ease-out group-hover:scale-105">
                      <Icon className="size-6 text-primary" aria-hidden />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <h3 className="text-lg font-semibold landing-heading transition-colors duration-200 group-hover:text-primary">
                        {path.title}
                      </h3>
                      <p className="text-sm leading-relaxed landing-muted line-clamp-3">
                        {path.description}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary mt-auto">
                      Explore
                      <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </LandingRevealItem>
            );
          })}
        </div>
      </LandingReveal>
    </LandingSectionShell>
  );
}
