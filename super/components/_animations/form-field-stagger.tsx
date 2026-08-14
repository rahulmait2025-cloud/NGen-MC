'use client';

import { useRef, useEffect, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

export function FormFieldStagger({
  children,
  className,
  stagger = 0.05,
  delay = 0.15,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion) {
      if (el) {
        el.style.opacity = '1';
        const items = el.querySelectorAll('[data-field]');
        items.forEach((item) => {
          (item as HTMLElement).style.opacity = '1';
          (item as HTMLElement).style.transform = 'none';
        });
      }
      return;
    }

    let cancelled = false;

    async function animate() {
      const gsapModule = await import('gsap');
      const gsap = gsapModule.default;
      if (cancelled || !el) return;

      const fields = el.querySelectorAll('[data-field]');
      if (!fields.length) return;

      gsap.fromTo(
        fields,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: 'power2.out',
          stagger,
          delay,
        }
      );
    }

    animate();
    return () => { cancelled = true; };
  }, [stagger, delay, prefersReducedMotion]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
