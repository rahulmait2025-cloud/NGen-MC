'use client';

import Link from 'next/link';
import { Code2, PlayCircle, User } from 'lucide-react';
import type { JourneyCardIcon } from './landing-content';
import type { LandingJourneyCard } from './landing-data-types';
import { LandingSectionShell } from './landing-section-shell';
import { LandingReveal, LandingRevealItem } from './landing-motion';
import { cn } from '@/lib/utils';

const JOURNEY_ICON_MAP: Record<JourneyCardIcon, typeof Code2> = {
  code: Code2,
  play: PlayCircle,
  user: User,
};

interface StartJourneySectionProps {
  cards: LandingJourneyCard[];
}

export function StartJourneySection({ cards }: StartJourneySectionProps) {
  return (
    <LandingSectionShell className="pb-16 sm:pb-20 lg:pb-24">
      <div className="mb-8 flex flex-col gap-2 text-center sm:mb-10">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Start here
        </span>
        <h2 className="font-display text-2xl font-bold tracking-tight landing-heading sm:text-3xl text-balance">
          Start your journey
        </h2>
        <p className="mx-auto max-w-2xl text-sm landing-muted sm:text-base text-pretty">
          Pick a path that matches where you are today — all routes stay inside your college workspace.
        </p>
      </div>

      <LandingReveal staggerChildren={0.07}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {cards.map((card) => {
            const Icon = JOURNEY_ICON_MAP[card.icon];
            return (
              <LandingRevealItem key={card.title}>
                <Link
                  href={card.path}
                  className={cn(
                    'border-beam-card group flex flex-col gap-4 rounded-2xl bg-[var(--landing-card)] p-6',
                    'transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg',
                  )}
                >
                  <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 transition-transform duration-200 ease-out group-hover:scale-105">
                      <Icon className="size-6 text-primary" />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <h3 className="text-lg font-semibold landing-heading transition-colors duration-200 group-hover:text-primary">
                        {card.title}
                      </h3>
                      <p className="text-sm leading-relaxed landing-muted">{card.description}</p>
                    </div>
                  </div>
                </Link>
              </LandingRevealItem>
            );
          })}
        </div>
      </LandingReveal>
    </LandingSectionShell>
  );
}
