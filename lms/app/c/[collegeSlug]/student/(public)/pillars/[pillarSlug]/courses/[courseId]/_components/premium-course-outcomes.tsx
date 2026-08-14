'use client';

import React from 'react';
import {
  CheckCircle2,
  BrainCircuit,
  TrendingUp,
  Rocket,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CourseLandingDetail } from './premium-course-landing-client';

export function PremiumCourseOutcomes({ detail }: { detail: CourseLandingDetail }) {
  const learningPoints = detail.course.learning_points || [
    'Build a strong foundation in essential engineering principles.',
    'Master pattern-based problem solving with real-world examples.',
    'Apply learnings through practical assignments and code implementations.',
    'Construct portfolio-ready proof for technical interviews.',
  ];

  return (
    <div className="space-y-16">
      {/* 1. What You Will Learn */}
      <section className="animate-section scroll-mt-28 space-y-8">
        <div>
          <Badge
            variant="outline"
            className="mb-3 rounded-full border-primary/20 bg-primary/5 px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary"
          >
            Key Outcomes
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">What You Will Learn</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {learningPoints.map((point, index) => (
            <div
              key={index}
              className="flex items-start gap-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 hover:border-primary/30"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CheckCircle2 className="size-4" />
              </div>
              <p className="text-sm font-medium leading-relaxed text-foreground">{point}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Bento Feature Grid */}
      <section className="animate-section scroll-mt-28 space-y-8">
        <div>
          <Badge
            variant="outline"
            className="mb-3 rounded-full border-primary/20 bg-primary/5 px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary"
          >
            The Ecosystem
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Why This Course Matters</h2>
        </div>

        <div className="bento-grid grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="bento-card-animate group flex flex-col gap-6 rounded-3xl border border-border/60 bg-card p-8 transition-colors duration-200 hover:border-primary/40">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <BrainCircuit className="size-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Pattern Recognition</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Learn reusable patterns instead of memorizing code line-by-line.
              </p>
            </div>
          </div>

          <div className="bento-card-animate group flex flex-col gap-6 rounded-3xl border border-border/60 bg-card p-8 transition-colors duration-200 hover:border-primary/40">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <TrendingUp className="size-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Structured Progression</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Move systematically from basic concepts to advanced execution.
              </p>
            </div>
          </div>

          <div className="bento-card-animate group flex flex-col gap-6 rounded-3xl border border-border/60 bg-card p-8 transition-colors duration-200 hover:border-primary/40">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <Rocket className="size-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Project-First Proof</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Build tangible projects that demonstrate career-ready confidence.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
