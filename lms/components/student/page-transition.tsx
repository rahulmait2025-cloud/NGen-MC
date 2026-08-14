'use client';

import { type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

export function PageTransition({ children, disabled = false }: { children: ReactNode; disabled?: boolean }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion || disabled) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        animation: 'pageFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      {children}
    </div>
  );
}

export function TransitionItem({
  children,
  index = 0,
}: {
  children: ReactNode;
  index?: number;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return <div>{children}</div>;
  }

  const delay = `${index * 0.05}s`;

  return (
    <div
      style={{
        opacity: 0,
        animation: 'itemFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        animationDelay: delay,
      }}
    >
      {children}
    </div>
  );
}
