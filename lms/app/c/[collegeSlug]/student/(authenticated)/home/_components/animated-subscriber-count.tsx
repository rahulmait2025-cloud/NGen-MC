'use client';

import { useEffect, useRef, useState } from 'react';
import {
  formatSubscriberCountCompact,
  parseCompactCountDisplay,
} from '@/lib/youtube/format-subscriber-count';
import { useLandingReducedMotion } from './landing-motion';
import { cn } from '@/lib/utils';

interface AnimatedSubscriberCountProps {
  targetCount: number | null;
  fallbackDisplay: string;
  className?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function resolveAnimationTarget(
  targetCount: number | null,
  fallbackDisplay: string,
): number | null {
  if (targetCount !== null && Number.isFinite(targetCount) && targetCount > 0) {
    return targetCount;
  }
  return parseCompactCountDisplay(fallbackDisplay);
}

function AnimatedSubscriberCountInner({
  targetCount,
  className,
}: {
  targetCount: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(() => formatSubscriberCountCompact(0));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const durationMs = 1600;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const value = Math.floor(targetCount * easeOutCubic(progress));
      setDisplay(formatSubscriberCountCompact(value));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(formatSubscriberCountCompact(targetCount));
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [targetCount]);

  return (
    <span className={cn('tabular-nums', className)} suppressHydrationWarning>
      {display}
    </span>
  );
}

export function AnimatedSubscriberCount({
  targetCount,
  fallbackDisplay,
  className,
}: AnimatedSubscriberCountProps) {
  const reduceMotion = useLandingReducedMotion();
  const animationTarget = resolveAnimationTarget(targetCount, fallbackDisplay);

  if (animationTarget === null) {
    return <span className={cn('tabular-nums', className)}>{fallbackDisplay}</span>;
  }

  if (reduceMotion) {
    return (
      <span className={cn('tabular-nums', className)}>
        {formatSubscriberCountCompact(animationTarget)}
      </span>
    );
  }

  return (
    <AnimatedSubscriberCountInner targetCount={animationTarget} className={className} />
  );
}
