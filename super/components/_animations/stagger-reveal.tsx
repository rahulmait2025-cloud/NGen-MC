'use client';

import { useRef, useEffect, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

export function StaggerReveal({
  children,
  className,
  stagger = 0.06,
  delay = 0.1,
  y = 16,
  duration = 0.4,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  y?: number;
  duration?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = containerRef.current;
    if (!el || prefersReducedMotion) {
      if (el) {
        el.style.opacity = '1';
        const children = el.querySelectorAll('[data-stagger-child]');
        children.forEach((child) => {
          (child as HTMLElement).style.opacity = '1';
          (child as HTMLElement).style.transform = 'none';
        });
      }
      return;
    }

    let cancelled = false;
    let ctx: { revert: () => void } | null = null;

    async function animate() {
      const gsapModule = await import('gsap');
      const gsap = gsapModule.default;
      if (cancelled) return;

      const items = el!.querySelectorAll('[data-stagger-child]');
      if (!items.length) return;

      ctx = gsap.context(() => {
        gsap.set(el!, { opacity: 1 });
        gsap.fromTo(
          items,
          { opacity: 0, y },
          {
            opacity: 1,
            y: 0,
            duration,
            ease: 'power2.out',
            stagger,
            delay,
          }
        );
      }, el!);
    }

    animate();
    return () => {
      cancelled = true;
      if (ctx) ctx.revert();
    };
  }, [stagger, delay, y, duration, prefersReducedMotion]);

  return (
    <div ref={containerRef} className={className} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}

export function StaggerChild({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-stagger-child className={className}>
      {children}
    </div>
  );
}
