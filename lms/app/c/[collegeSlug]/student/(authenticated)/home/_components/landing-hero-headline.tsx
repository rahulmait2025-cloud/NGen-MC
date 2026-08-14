'use client';

import React, { forwardRef } from 'react';
import { Rocket, Sparkles } from 'lucide-react';
import { LANDING_HERO } from './landing-content';
export const LandingHeroHeadline = React.memo(forwardRef<HTMLDivElement>(function LandingHeroHeadline(
  _props,
  ref,
) {
  const beforeWords = LANDING_HERO.headingBefore.trim().split(/\s+/);

  return (
    <div ref={ref} className="flex flex-col gap-5 sm:gap-6">
      <div className="hero-badge group inline-flex w-max max-w-full items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary transition-all duration-300 hover:border-primary/50 hover:bg-primary/15 hover:shadow-[0_0_24px_color-mix(in_oklab,var(--primary)_35%,transparent)] animate-badge-shimmer animate-badge-pulse-glow">
        <span className="relative flex size-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex size-2 rounded-full bg-primary"></span>
        </span>
        <Rocket className="size-3.5 hero-rocket-icon shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" />
        <span className="hero-badge-text">{LANDING_HERO.badge}</span>
        <Sparkles className="size-3.5 hero-sparkle-icon shrink-0 text-primary/70 animate-pulse" />
      </div>

      <h1 className="hero-heading text-[var(--landing-h1-size)] font-bold leading-[var(--landing-h1-leading)] tracking-tight landing-heading text-balance">
        <span className="hero-line-before block sm:inline">
          {beforeWords.map((word, i) => (
            <span
              key={`${word}-${i}`}
              className="hero-word-wrap inline-block mr-[0.28em] overflow-hidden"
            >
              <span className="hero-word inline-block">{word}</span>
            </span>
          ))}
        </span>{' '}
        <span className="hero-highlight-wrap relative mt-2 inline-block sm:mt-0">
          <span className="hero-highlight hero-badge-motion landing-gradient-highlight-orange relative inline-block overflow-hidden">
            {LANDING_HERO.headingHighlight}
          </span>
          <span
            className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-[var(--landing-orange)] via-[var(--landing-orange-bright)] to-transparent opacity-60 hero-underline"
            aria-hidden="true"
          />
        </span>
      </h1>

      <p className="hero-sub max-w-xl text-base sm:text-[var(--landing-body-size)] font-medium leading-relaxed" style={{ color: 'var(--landing-heading)' }}>
        {LANDING_HERO.subheading}
      </p>
    </div>
  );
}));
