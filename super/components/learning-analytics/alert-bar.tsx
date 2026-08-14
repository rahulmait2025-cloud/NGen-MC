'use client';

import { useRef, useEffect } from 'react';
import { AlertTriangle, Flame, Zap } from 'lucide-react';
import type { PlatformAlertSummary } from '@/lib/superadmin/learning-analytics/types';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

function BreathingDot() {
  const dotRef = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = dotRef.current;
    if (!el || prefersReducedMotion) return;

    let ctx: { revert: () => void } | null = null;

    async function init() {
      const gsapModule = await import('gsap');
      const gsap = gsapModule.default;

      ctx = gsap.context(() => {
        gsap.to(el, {
          opacity: 0.4,
          scale: 1.3,
          duration: 1.6,
          ease: 'power1.inOut',
          repeat: -1,
          yoyo: true,
          transformOrigin: '50% 50%',
        });
      });
    }

    init();
    return () => { if (ctx) ctx.revert(); };
  }, [prefersReducedMotion]);

  return (
    <span className="relative inline-flex size-2">
      <span ref={dotRef} className="absolute inline-flex size-full rounded-full bg-rose-500" />
      <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
    </span>
  );
}

function AnimatedBar({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion) return;

    let ctx: { revert: () => void } | null = null;

    async function init() {
      const gsapModule = await import('gsap');
      const gsap = gsapModule.default;

      ctx = gsap.context(() => {
        gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', delay: 0.3 });
      });
    }

    init();
    return () => { if (ctx) ctx.revert(); };
  }, [prefersReducedMotion]);

  return <div ref={ref}>{children}</div>;
}

export function AlertBar({
  summary: {
    atRiskStudentCount,
    totalStudentsWithStreaks,
    averageStreakLength,
    totalActiveStreaks,
  },
}: {
  summary: PlatformAlertSummary;
}) {
  const hasRisk = atRiskStudentCount != null && atRiskStudentCount > 0;
  const hasStreaks = totalStudentsWithStreaks != null && totalStudentsWithStreaks > 0;

  if (!hasRisk && !hasStreaks) return null;

  return (
    <AnimatedBar>
      <div className="flex min-w-0 flex-wrap items-center gap-4 rounded-[1.5rem] border border-border bg-card px-4 py-4 text-card-foreground shadow-sm sm:gap-6 sm:px-6 dark:shadow-none">
        {hasRisk ? (
          <div className="flex items-center gap-2.5">
            <BreathingDot />
            <AlertTriangle className="size-4 text-rose-500" />
            <span className="text-sm font-semibold text-foreground">
              {atRiskStudentCount}
            </span>
            <span className="text-sm text-muted-foreground">at-risk students</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-2 rounded-full bg-[hsl(25,95%,53%/0.5)]" />
            <span className="text-sm text-muted-foreground">No at-risk students</span>
          </div>
        )}

        <div className="hidden h-6 w-px bg-border md:block" />

        <div className="flex items-center gap-2.5">
          <Flame className="size-4 text-amber-500" />
          <span className="text-sm font-semibold text-foreground">
            {totalActiveStreaks ?? '—'}
          </span>
          <span className="text-sm text-muted-foreground">active streaks</span>
        </div>

        <div className="hidden h-6 w-px bg-border md:block" />

        <div className="flex items-center gap-2.5">
          <Zap className="size-4 text-violet-500" />
          <span className="text-sm font-semibold text-foreground">
            {totalStudentsWithStreaks ?? '—'}
          </span>
          <span className="text-sm text-muted-foreground">students with streaks</span>
          <span className="text-xs text-muted-foreground/70">
            (avg {averageStreakLength != null ? `${averageStreakLength.toFixed(1)}d` : '—'})
          </span>
        </div>
      </div>
    </AnimatedBar>
  );
}
