'use client';

import { useRef, useEffect, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

export function PageTransition({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion) return;
    const scope: HTMLDivElement = el;

    let ctx: { revert: () => void } | null = null;

    async function init() {
      const gsapModule = await import('gsap');
      const gsap = gsapModule.default;

      ctx = gsap.context(() => {
        const childrenEls = scope.querySelectorAll('[data-stagger]');
        if (childrenEls.length === 0) return;

        gsap.fromTo(
          childrenEls,
          { opacity: 1, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.3,
            ease: 'power3.out',
            stagger: 0.06,
            delay: 0.05,
          },
        );
      });
    }

    init();

    return () => {
      if (ctx) ctx.revert();
    };
  }, [prefersReducedMotion]);

  return (
    <div ref={ref} className="w-full min-w-0 max-w-full overflow-x-hidden">
      {children}
    </div>
  );
}

export function TransitionItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div data-stagger className={`min-w-0 ${className}`.trim()}>
      {children}
    </div>
  );
}
