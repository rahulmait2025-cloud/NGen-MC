'use client';

import { useCallback, useEffect, useRef, type RefCallback } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

interface UseGsapInViewOptions {
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  rootMargin?: string;
  amount?: number;
  once?: boolean;
}

/**
 * Hook that animates a child element with GSAP only when it scrolls into view.
 * Honors prefers-reduced-motion by skipping the tween entirely.
 *
 * Usage:
 *   const setRef = useGsapInView<HTMLDivElement>();
 *   <div ref={setRef} />
 */
export function useGsapInView<T extends HTMLElement = HTMLDivElement>(
  options: UseGsapInViewOptions = {}
): RefCallback<T> {
  const {
    from = { opacity: 0, y: 20 },
    to = { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
    rootMargin = '0px 0px -50px 0px',
    amount = 0.1,
    once = true,
  } = options;

  const elRef = useRef<T | null>(null);
  const ctxRef = useRef<{ revert: () => void } | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const setRef = useCallback<RefCallback<T>>((node) => {
    elRef.current = node;
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el || prefersReducedMotion) {
      if (el) {
        el.style.opacity = '1';
        el.style.transform = 'none';
      }
      return;
    }

    let observer: IntersectionObserver | null = null;
    let cancelled = false;

    async function init() {
      const gsapModule = await import('gsap');
      const gsap = gsapModule.default;
      if (cancelled || !elRef.current) return;

      const target = elRef.current;
      const runTween = () => {
        if (ctxRef.current) ctxRef.current.revert();
        ctxRef.current = gsap.context(() => {
          gsap.fromTo(target, from, { ...to, transformOrigin: (to as { transformOrigin?: string }).transformOrigin ?? '50% 50%' });
        });
      };

      if (typeof IntersectionObserver === 'undefined') {
        runTween();
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              runTween();
              if (once && observer) observer.disconnect();
            } else if (!once) {
              if (ctxRef.current) ctxRef.current.revert();
            }
          }
        },
        { rootMargin, threshold: amount }
      );
      observer.observe(target);
    }

    init();

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (ctxRef.current) ctxRef.current.revert();
    };
  }, [prefersReducedMotion, rootMargin, amount, once, from, to]);

  return setRef;
}
