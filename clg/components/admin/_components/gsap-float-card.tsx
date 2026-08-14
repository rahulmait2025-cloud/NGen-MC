'use client';

import { useRef, useCallback, ReactNode } from 'react';
import { gsap } from 'gsap';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

const hoverEase = 'power1.out';

interface FloatCardProps {
  children: ReactNode;
  className?: string;
  y?: number;
}

export function FloatCard({
  children,
  className,
  y = -2,
}: FloatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleMouseEnter = useCallback(() => {
    if (prefersReducedMotion) return;
    gsap.to(ref.current, {
      y,
      boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
      duration: 0.3,
      ease: hoverEase,
    });
  }, [y, prefersReducedMotion]);

  const handleMouseLeave = useCallback(() => {
    if (prefersReducedMotion) return;
    gsap.to(ref.current, {
      y: 0,
      boxShadow: 'none',
      duration: 0.3,
      ease: hoverEase,
    });
  }, [prefersReducedMotion]);

  return (
    <div
      ref={ref}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}
