'use client';

import { useEffect, useRef, useCallback, useMemo, type RefObject } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

interface ScrollRevealOptions {
  /** Child selector to stagger (e.g. '.card'). If omitted, animates the container itself. */
  children?: string;
  /** Stagger delay between children (seconds) */
  stagger?: number;
  /** Initial state for gsap.fromTo "from" */
  from?: Record<string, unknown>;
  /** Animation vars for gsap.fromTo "to" */
  to?: Record<string, unknown>;
  /** Timeline defaults (ease, duration, etc.) */
  defaults?: Record<string, unknown>;
  /** IntersectionObserver rootMargin */
  rootMargin?: string;
  /** IntersectionObserver threshold */
  threshold?: number;
  /** ScrollTrigger config — if provided, uses ScrollTrigger instead of IntersectionObserver */
  scrollTrigger?: {
    start?: string;
    end?: string;
    scrub?: boolean | number;
    pin?: boolean;
    scroller?: Element | string;
  };
  /** Whether to use ScrollTrigger (requires it to be registered externally) */
  useScrollTrigger?: boolean;
}

interface ScrollRevealReturn {
  ref: RefObject<HTMLDivElement | null>;
  ctxRef: RefObject<{ revert: () => void } | null>;
}

/**
 * Reusable hook that animates a container's children (or the container itself)
 * when it scrolls into view. Supports both IntersectionObserver and ScrollTrigger.
 *
 * Replaces the duplicated pattern across 8+ section components.
 *
 * Usage:
 *   const { ref } = useGsapScrollReveal({ children: '.card', stagger: 0.06 });
 *   <div ref={ref}><div className="card">...</div></div>
 */
export function useGsapScrollReveal(options: ScrollRevealOptions = {}): ScrollRevealReturn {
  const childSelector = options.children;
  const stagger = options.stagger ?? 0.06;
  const from = useMemo(() => options.from ?? { opacity: 0, y: 20 }, [options.from]);
  const to = useMemo(() => options.to ?? { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, [options.to]);
  const defaults = useMemo(() => options.defaults ?? { ease: 'power3.out' }, [options.defaults]);
  const rootMargin = options.rootMargin ?? '0px 0px -12% 0px';
  const threshold = options.threshold ?? 0.04;
  const scrollTriggerConfig = options.scrollTrigger;
  const useScrollTrigger = options.useScrollTrigger ?? false;

  const ref = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<{ revert: () => void } | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const runAnimation = useCallback(
    async (gsap: typeof import('gsap')['gsap']) => {
      if (!ref.current) return;

      // Clean up previous context
      if (ctxRef.current) ctxRef.current.revert();

      ctxRef.current = gsap.context(() => {
        const targets = childSelector
          ? ref.current!.querySelectorAll(childSelector)
          : [ref.current!];

        if (targets.length === 0) return;

        const tl = gsap.timeline({ defaults });

        if (childSelector && stagger > 0) {
          tl.fromTo(targets, from, { ...to, stagger });
        } else {
          tl.fromTo(targets, from, to);
        }
      }, ref.current);
    },
    [childSelector, stagger, from, to, defaults],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion) {
      if (el) {
        el.style.cssText += 'opacity:1;';
        if (!childSelector) {
          el.style.cssText += 'transform:none;';
        } else {
          el.querySelectorAll<HTMLElement>(childSelector).forEach((child) => {
            child.style.cssText += 'opacity:1;transform:none;';
          });
        }
      }
      return;
    }

    let observer: IntersectionObserver | null = null;
    let cancelled = false;

    async function init() {
      const gsapModule = await import('gsap');
      const current = ref.current;
      if (cancelled || !current) return;
      const { gsap } = gsapModule;

      if (useScrollTrigger && scrollTriggerConfig) {
        const { ScrollTrigger } = await import('gsap/ScrollTrigger');
        gsap.registerPlugin(ScrollTrigger);

        const landingShell = document.querySelector('.landing-shell');
        const scroller = scrollTriggerConfig.scroller ?? (landingShell ? landingShell : undefined);

        // For ScrollTrigger, we animate immediately but let ScrollTrigger control playback
        const targets = childSelector
          ? current.querySelectorAll(childSelector)
          : [current];

        if (targets.length === 0) return;

        ctxRef.current = gsap.context(() => {
          const tl = gsap.timeline({
            defaults,
            scrollTrigger: {
              trigger: current,
              ...(scroller ? { scroller } : {}),
              start: scrollTriggerConfig.start ?? 'top 85%',
              end: scrollTriggerConfig.end ?? 'bottom top',
              scrub: scrollTriggerConfig.scrub ?? false,
              pin: scrollTriggerConfig.pin ?? false,
              toggleActions: 'play none none none',
            },
          });

          if (childSelector && stagger > 0) {
            tl.fromTo(targets, from, { ...to, stagger });
          } else {
            tl.fromTo(targets, from, to);
          }
        }, current);
      } else {
        // IntersectionObserver mode
        const runTween = () => runAnimation(gsap);

        if (typeof IntersectionObserver === 'undefined') {
          runTween();
          return;
        }

        observer = new IntersectionObserver(
          ([entry]) => {
            if (entry?.isIntersecting) {
              runTween();
              observer?.disconnect();
            }
          },
          { rootMargin, threshold },
        );
        observer.observe(current);
      }
    }

    init();

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (ctxRef.current) {
        ctxRef.current.revert();
        ctxRef.current = null;
      }
    };
  }, [
    prefersReducedMotion,
    rootMargin,
    threshold,
    useScrollTrigger,
    scrollTriggerConfig,
    runAnimation,
    childSelector,
    defaults,
    from,
    stagger,
    to,
  ]);

  return { ref, ctxRef };
}
