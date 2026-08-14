'use client';

import Link from 'next/link';
import { Play, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StaggerReveal, StaggerChild } from '@/components/_animations/stagger-reveal';
import type { ContinueLearningCard } from '../../home/_components/landing-data-types';

interface DashboardContinueLearningProps {
  card: ContinueLearningCard;
}

export function DashboardContinueLearning({ card }: DashboardContinueLearningProps) {
  const progress = card.progressPercentage;
  const hasProgress = typeof progress === 'number' && progress > 0;

  return (
    <StaggerReveal stagger={0.06} delay={0.2}>
      <StaggerChild>
        <div className="group relative rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.04] to-primary/[0.01] overflow-hidden dashboard-card-hover">
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Play className="size-4 text-primary fill-primary/20" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Continue learning
                  </span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-snug">
                    {card.courseTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {card.lessonTitle}
                  </p>
                </div>

                {hasProgress && (
                  <div className="space-y-2 max-w-md">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Progress</span>
                      <span className="font-bold tabular-nums text-foreground">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full progress-bar-animated"
                        style={{ width: `${Math.min(Math.max(progress, 4), 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button asChild className="shrink-0 rounded-full" size="lg">
                <Link href={card.resumeHref}>
                  Resume
                  <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Subtle gradient overlay on hover */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>
      </StaggerChild>
    </StaggerReveal>
  );
}
