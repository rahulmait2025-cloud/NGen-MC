'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

export function AnimatedCounter({
  value,
  suffix = '',
  className,
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  className?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    let active = true;
    let ctx: { revert: () => void } | null = null;
    async function animate() {
      const gsapModule = await import('gsap');
      const { gsap } = gsapModule;

      if (!active) return;
      if (!ref.current) return;

      if (prefersReducedMotion) {
        if (ref.current) {
          ref.current.textContent = `${value.toLocaleString(undefined, {
            maximumFractionDigits: decimals,
            minimumFractionDigits: decimals,
          })}${suffix ? `\u2009${suffix}` : ''}`;
        }
        return;
      }

      ctx = gsap.context(() => {
        const obj = { val: 0 };
        gsap.to(obj, {
          val: value,
          duration: 0.3,
          ease: 'power2.out',
          onUpdate: () => {
            if (ref.current) {
              ref.current.textContent = `${obj.val.toLocaleString(undefined, {
                maximumFractionDigits: decimals,
                minimumFractionDigits: decimals,
              })}${suffix ? `\u2009${suffix}` : ''}`;
            }
          },
        });
      });
    }
    animate();
    return () => {
      active = false;
      if (ctx) ctx.revert();
    };
  }, [value, suffix, decimals, prefersReducedMotion]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      0{suffix ? `\u2009${suffix}` : ''}
    </span>
  );
}
