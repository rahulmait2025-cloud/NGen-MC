import { PlayCircle, Sparkles } from 'lucide-react';
import { StudentCtaButton } from '@/components/student/ui/student-cta-button';
import { LandingSectionShell } from './landing-section-shell';
import type { ContinueLearningCard } from './landing-data-types';

interface ContinueLearningSectionProps {
  card: ContinueLearningCard;
}

export function ContinueLearningSection({ card }: ContinueLearningSectionProps) {
  const progress = card.progressPercentage;

  return (
    <LandingSectionShell className="py-6 sm:py-8">
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 p-5 sm:p-6 lg:p-8 bg-card">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3.5" />
              Recommended next step
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] landing-muted">
                Continue where you left off
              </p>
              <h2 className="mt-1 font-display text-xl font-bold landing-heading sm:text-2xl">
                {card.courseTitle}
              </h2>
              <p className="mt-1 text-sm landing-muted line-clamp-2">{card.lessonTitle}</p>
            </div>
            {typeof progress === 'number' && progress > 0 ? (
              <div className="max-w-md space-y-1.5">
                <div className="flex justify-between text-xs font-medium landing-muted">
                  <span>Course progress</span>
                  <span className="tabular-nums landing-heading">{Math.round(progress)}%</span>
                </div>
                <div className="landing-progress-track h-1.5 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                    style={{ width: `${Math.min(Math.max(progress, 4), 100)}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <StudentCtaButton href={card.resumeHref} showArrow={false} className="shrink-0">
            <PlayCircle className="size-4" />
            Resume Learning
          </StudentCtaButton>
        </div>
      </div>
    </LandingSectionShell>
  );
}
