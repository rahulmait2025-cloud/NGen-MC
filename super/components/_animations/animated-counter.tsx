'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

export function AnimatedCounter({
  value,
  suffix = '',
  className,
  decimals = 0,
  duration = 0.6,
}: {
  value: number;
  suffix?: string;
  className?: string;
  decimals?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!ref.current) return;
    let ctx: { revert: () => void } | null = null;

    async function animate() {
      if (prefersReducedMotion) {
        if (ref.current) {
          ref.current.textContent = `${value.toLocaleString(undefined, {
            maximumFractionDigits: decimals,
            minimumFractionDigits: decimals,
          })}${suffix}`;
        }
        return;
      }

      const gsapModule = await import('gsap');
      const gsap = gsapModule.default;

      ctx = gsap.context(() => {
        const obj = { val: 0 };
        gsap.to(obj, {
          val: value,
          duration,
          ease: 'power2.out',
          onUpdate: () => {
            if (ref.current) {
              ref.current.textContent = `${obj.val.toLocaleString(undefined, {
                maximumFractionDigits: decimals,
                minimumFractionDigits: decimals,
              })}${suffix}`;
            }
          },
        });
      });
    }
    animate();
    return () => { if (ctx) ctx.revert(); };
  }, [value, suffix, decimals, duration, prefersReducedMotion]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      0{suffix}
    </span>
  );
}
