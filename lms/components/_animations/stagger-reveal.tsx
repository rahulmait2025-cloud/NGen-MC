'use client';

import { useRef, useEffect, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

/**
 * StaggerReveal — pure CSS + IntersectionObserver version.
 *
 * Children fade in and slide up with staggered timing when the container
 * enters the viewport. Uses CSS animations for 60fps GPU-accelerated
 * performance with no JS animation library overhead.
 *
 * - will-change is applied only during animation, then cleaned up
 * - SSR-safe: content stays hidden until client hydration
 * - IntersectionObserver with fallback for older browsers
 * - Reduced motion: children appear instantly with no stagger or transform
 */
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
  /** Delay between each child's entrance (seconds) */
  stagger?: number;
  /** Initial delay before first child enters (seconds) */
  delay?: number;
  /** Vertical offset for slide-up (px) */
  y?: number;
  /** Animation duration (seconds) */
  duration?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Reduced motion: show everything instantly, no animation
    if (prefersReducedMotion) {
      el.style.opacity = '1';
      const childEls = el.querySelectorAll<HTMLElement>('[data-stagger-child]');
      const resetCss = 'opacity:1;transform:none;';
      childEls.forEach((child) => {
        child.style.cssText += resetCss;
      });
      return;
    }

    // Clamp props to safe ranges
    const safeDuration = Math.max(0.1, Math.min(duration, 2));
    const safeStagger = Math.max(0, Math.min(stagger, 0.5));
    const safeDelay = Math.max(0, Math.min(delay, 2));

    // Set CSS custom properties for animation timing
    el.style.cssText += `--stagger-duration:${safeDuration}s;--stagger-delay:${safeDelay}s;`;

    const childEls = el.querySelectorAll<HTMLElement>('[data-stagger-child]');
    childEls.forEach((child, i) => {
      child.style.cssText += `--stagger-index:${i};--stagger-child-delay:${safeStagger * i}s;`;
    });

    // IntersectionObserver with fallback
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: reveal immediately for browsers without IntersectionObserver
      el.classList.add('stagger-revealed');
      cleanupWillChange(el, childEls, safeDuration, safeDelay, safeStagger, childEls.length);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Apply will-change for GPU acceleration during animation
          childEls.forEach((child) => {
            child.style.cssText += 'will-change:transform, opacity;';
          });

          el.classList.add('stagger-revealed');
          observer.unobserve(el);

          // Clean up will-change after animation completes
          cleanupWillChange(el, childEls, safeDuration, safeDelay, safeStagger, childEls.length);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [stagger, delay, y, duration, prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      className={`stagger-container ${className ?? ''}`}
      style={{ '--stagger-y': `${y}px` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/**
 * Remove will-change after animation finishes to free GPU resources.
 * Timing: last child's delay + duration + small buffer.
 */
function cleanupWillChange(
  container: HTMLElement,
  children: NodeListOf<HTMLElement> | HTMLElement[],
  duration: number,
  delay: number,
  stagger: number,
  count: number
) {
  if (count === 0) return;
  const lastChildDelay = stagger * (count - 1);
  const totalMs = (delay + lastChildDelay + duration + 0.1) * 1000;

  setTimeout(() => {
    container.style.removeProperty('--stagger-duration');
    container.style.removeProperty('--stagger-delay');
    children.forEach((child) => {
      child.style.removeProperty('--stagger-index');
      child.style.removeProperty('--stagger-child-delay');
      child.style.removeProperty('will-change');
    });
  }, totalMs);
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
