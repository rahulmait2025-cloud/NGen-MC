'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  trackClassName?: string;
  indicatorClassName?: string;
}

export function CircularProgress({
  value,
  size = 56,
  strokeWidth = 4,
  className,
  trackClassName,
  indicatorClassName,
}: CircularProgressProps) {
  const ref = useRef<SVGCircleElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion) {
      el.style.strokeDashoffset = `${offset}`;
      return;
    }

    let cancelled = false;
    async function animate() {
      const gsapModule = await import('gsap');
      const { gsap } = gsapModule;
      if (cancelled) return;

      gsap.fromTo(
        el!,
        { strokeDashoffset: circumference },
        {
          strokeDashoffset: offset,
          duration: 1,
          ease: 'power2.out',
          delay: 0.2,
        },
      );
    }
    animate();
    return () => {
      cancelled = true;
    };
  }, [offset, circumference, prefersReducedMotion]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('-rotate-90', className)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className={cn('text-muted/40', trackClassName)}
      />
      <circle
        ref={ref}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        className={cn('text-primary transition-colors', indicatorClassName)}
      />
    </svg>
  );
}
