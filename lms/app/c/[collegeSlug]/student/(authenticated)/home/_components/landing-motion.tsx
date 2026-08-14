'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { useGsapScrollReveal } from '@/hooks/use-gsap-scroll-reveal';

function subscribeReducedMotion(callback: () => void) {
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useLandingReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, () => false);
}

export function getLandingScroller(element: Element | null): HTMLElement | undefined {
  return (element?.closest('.landing-shell') as HTMLElement | null) ?? undefined;
}

interface LandingRevealProps {
  children: ReactNode;
  className?: string;
  staggerChildren?: number;
}

/**
 * GSAP-powered scroll reveal container. Children animate in with stagger
 * when the container enters the viewport. Replaces the old CSS-only wrapper.
 */
export function LandingReveal({
  children,
  className,
  staggerChildren = 0.06,
}: LandingRevealProps) {
  const { ref } = useGsapScrollReveal({
    children: ':scope > *',
    stagger: staggerChildren,
    from: { opacity: 0, y: 18 },
    to: { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' },
    rootMargin: '0px 0px -8% 0px',
    threshold: 0.02,
  });

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

interface LandingRevealItemProps {
  children: ReactNode;
  className?: string;
}

/**
 * Individual reveal item — just a styled wrapper since stagger
 * is handled by the parent LandingReveal container.
 */
export function LandingRevealItem({ children, className }: LandingRevealItemProps) {
  return <div className={className}>{children}</div>;
}
