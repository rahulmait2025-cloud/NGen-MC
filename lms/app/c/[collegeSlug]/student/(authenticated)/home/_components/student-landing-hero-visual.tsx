'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FounderAvatar } from '@/components/brand/founder-avatar';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

const HERO_VISUAL_HEIGHT = {
  default: 'h-[min(360px,45vh)] min-h-[280px] sm:min-h-[340px] sm:h-[380px] lg:h-[440px]',
  compact: 'h-[min(260px,32vh)] min-h-[200px] sm:min-h-[280px] lg:min-h-[320px]',
} as const;

interface StudentLandingHeroVisualProps {
  size?: keyof typeof HERO_VISUAL_HEIGHT;
}

export function StudentLandingHeroVisual({ size = 'default' }: StudentLandingHeroVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion || !containerRef.current) return;

    let ctx: { revert: () => void } | null = null;

    async function init() {
      const { gsap } = await import('gsap');
      if (!containerRef.current) return;

      ctx = gsap.context(() => {
        // Organic floating orbs behind the founder image
        gsap.to(orb1Ref.current, {
          y: -12,
          x: 8,
          rotation: 3,
          duration: 5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
        gsap.to(orb2Ref.current, {
          y: 10,
          x: -6,
          rotation: -2,
          duration: 6.5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 1.5,
        });
      }, containerRef);
    }

    init();
    return () => {
      if (ctx) ctx.revert();
    };
  }, [prefersReducedMotion]);

  return (
    <div ref={containerRef} className="relative">
      {/* Floating gradient orbs */}
      <div
        ref={orb1Ref}
        className="absolute -right-6 -top-6 size-32 rounded-full bg-gradient-to-br from-[var(--landing-orange)]/15 to-transparent blur-xl"
        aria-hidden="true"
      />
      <div
        ref={orb2Ref}
        className="absolute -bottom-4 -left-8 size-24 rounded-full bg-gradient-to-br from-[var(--landing-accent-teal)]/12 to-transparent blur-xl"
        aria-hidden="true"
      />

      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)]',
          HERO_VISUAL_HEIGHT[size],
        )}
      >
        <FounderAvatar
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          imageClassName="object-cover object-center transition-transform duration-700 ease-out hover:scale-[1.03]"
        />
      </div>
      
      <div className="absolute -bottom-3 -right-3 rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface)] px-4 py-2.5 shadow-lg" aria-hidden="true">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          <span className="text-xs font-medium landing-heading">Live Sessions</span>
        </div>
      </div>
      
      <div className="absolute -top-2 -left-2 rounded-lg border border-[var(--landing-border)] bg-[var(--landing-card)] px-3 py-1.5 shadow-md" aria-hidden="true">
        <span className="text-xs font-semibold text-[var(--landing-accent-teal)]">100K+ Students</span>
      </div>
    </div>
  );
}
