'use client';

import { useRef, useEffect, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

export function PageTransition({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion || !ref.current) return;
    let cancelled = false;
    let ctx: { revert: () => void } | null = null;

    async function animate() {
      const gsapModule = await import('gsap');
      if (cancelled) return;
      const gsap = gsapModule.default;

      ctx = gsap.context(() => {
        gsap.from(ref.current, {
          y: 12,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out',
        });
      }, ref);
    }

    animate();
    return () => {
      cancelled = true;
      if (ctx) ctx.revert();
    };
  }, [prefersReducedMotion]);

  return <div ref={ref}>{children}</div>;
}
