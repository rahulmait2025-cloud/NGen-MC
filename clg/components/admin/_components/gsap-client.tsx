'use client';

import { useRef, useEffect, ReactNode } from 'react';
import { gsap } from 'gsap';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

const springEase = 'back.out(1.4)';

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}

export function StaggerContainer({
  children,
  className,
  stagger = 0.07,
  delay = 0.08,
}: StaggerContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const items = el.querySelectorAll('[data-gsap-item]');
    if (!items.length) return;

    if (prefersReducedMotion) {
      gsap.set(items, { opacity: 1, y: 0 });
      return;
    }

    gsap.fromTo(
      items,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.3,
        ease: springEase,
        stagger,
        delay,
      }
    );
  }, [stagger, delay, prefersReducedMotion]);

  return <div ref={containerRef} className={className}>{children}</div>;
}

export { StaggerItem } from './gsap-stagger-item';
export { FloatCard } from './gsap-float-card';
