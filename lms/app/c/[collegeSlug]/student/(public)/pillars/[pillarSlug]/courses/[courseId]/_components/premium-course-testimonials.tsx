'use client';

import React from 'react';
import { Star, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const TESTIMONIALS = [
  {
    name: 'Amit K.',
    initial: 'A',
    quote: 'The focus on structured learning and building real output made the course feel practical from day one.',
  },
  {
    name: 'Vikram R.',
    initial: 'V',
    quote: 'The mentorship and roadmap helped me stop jumping between random tutorials and follow a clear path.',
  },
  {
    name: 'Rahul S.',
    initial: 'R',
    quote: 'The way concepts, projects, and profile-readiness are connected changed how I approach learning.',
  },
  {
    name: 'Ananya P.',
    initial: 'A',
    quote: 'NextGen CTO gave me a better bridge between college learning and real career preparation.',
  },
] as const;

export function PremiumCourseTestimonials() {
  return (
    <section id="testimonials" className="testimonials-section animate-section scroll-mt-28 border-t border-border/50 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-12">
        <div className="testimonials-header text-center">
          <Badge
            variant="outline"
            className="mb-4 rounded-full border-primary/20 bg-primary/5 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-primary"
          >
            Community Voice
          </Badge>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Hear From Students</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg font-medium text-muted-foreground">
            See how structured learning helps students move with more clarity and confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIALS.map((t, index) => (
            <div
              key={`${t.name}-${index}`}
              className="flex flex-col gap-6 rounded-3xl border border-border/60 p-6"
            >
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="size-3.5 fill-primary text-primary" />
                ))}
              </div>
              <p className="flex-1 text-sm font-medium leading-relaxed text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-bold text-primary">
                  {t.initial}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{t.name}</div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                      Verified Student
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
