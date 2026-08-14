'use client'

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

interface AnimatedCounterProps {
  value: number
  suffix: string
  className?: string
}

export function AnimatedCounter({ value, suffix, className }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      if (ref.current) {
        ref.current.textContent = `${value}${suffix}`;
      }
      return;
    }

    let active = true;
    let ctx: { revert: () => void } | null = null;

    const initAnimation = async () => {
      const gsap = (await import('gsap')).default;
      if (!active) return;
      if (!ref.current) return;

      ctx = gsap.context(() => {
        const el = ref.current;
        if (!el) return;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: value,
          duration: 0.4,
          ease: "power2.out",
          onUpdate() {
            if (el) {
              el.textContent = `${Math.round(obj.val)}${suffix}`;
            }
          },
        });
      });
    };

    initAnimation();

    return () => {
      active = false;
      ctx?.revert();
    };
  }, [value, suffix, prefersReducedMotion]);

  return <span ref={ref} className={className}>0{suffix}</span>;
}
