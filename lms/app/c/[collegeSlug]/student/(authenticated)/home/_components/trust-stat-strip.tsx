'use client';

import { use, Suspense } from 'react';
import { Award, Brain, Rocket, Users, Youtube } from 'lucide-react';
import { LANDING_TRUST_STATS } from './landing-content';
import { LandingSectionShell } from './landing-section-shell';
import { AnimatedSubscriberCount } from './animated-subscriber-count';
import { cn } from '@/lib/utils';
import type { YouTubeChannelStats } from '@/lib/youtube/channel-stats';

const ICON_MAP = {
  users: Users,
  rocket: Rocket,
  brain: Brain,
  badge: Award,
} as const;

const ICON_BOX_STYLES = [
  'rounded-xl border border-[var(--landing-orange)]/20 bg-gradient-to-br from-[var(--landing-orange)]/10 to-[var(--landing-orange)]/5 text-[var(--landing-orange)]',
  'rounded-xl border border-[var(--landing-accent-teal)]/20 bg-gradient-to-br from-[var(--landing-accent-teal)]/10 to-[var(--landing-accent-teal)]/5 text-[var(--landing-accent-teal)]',
  'rounded-xl border border-[var(--landing-orange-bright)]/20 bg-gradient-to-br from-[var(--landing-orange-bright)]/10 to-[var(--landing-orange-bright)]/5 text-[var(--landing-orange-bright)]',
  'rounded-xl border border-[var(--landing-orange)]/20 bg-gradient-to-br from-[var(--landing-orange)]/10 to-[var(--landing-orange)]/5 text-[var(--landing-orange)]',
] as const;

interface TrustStatStripProps {
  youtubeStatsPromise: Promise<YouTubeChannelStats>;
}

function YouTubeCount({ promise }: { promise: Promise<YouTubeChannelStats> }) {
  const stats = use(promise);
  return (
    <AnimatedSubscriberCount
      targetCount={stats.subscriberCount}
      fallbackDisplay={stats.subscriberDisplay}
    />
  );
}

export function TrustStatStrip({
  youtubeStatsPromise,
}: TrustStatStripProps) {
  return (
    <LandingSectionShell className="py-8 sm:py-12">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        {LANDING_TRUST_STATS.map((stat, index) => {
          const Icon = ICON_MAP[stat.icon];
          const showAnimatedCount =
            'usesYoutubeCount' in stat && stat.usesYoutubeCount === true;

          return (
            <div key={stat.label} className="trust-stat-item group">
              <div
                className={cn(
                  'flex h-full items-center gap-3 rounded-2xl border bg-[var(--landing-surface)] p-4 transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-lg sm:gap-4 sm:p-5',
                )}
              >
                  <div
                    className={cn(
                      'flex size-11 shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-110 sm:size-12',
                      ICON_BOX_STYLES[index],
                    )}
                  >
                    {showAnimatedCount ? (
                      <Youtube className="size-5 sm:size-6" />
                    ) : (
                      <Icon className="size-5 sm:size-6" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold tracking-tight landing-heading sm:text-xl">
                      {showAnimatedCount ? (
                        <Suspense fallback={<span>100K+</span>}>
                          <YouTubeCount promise={youtubeStatsPromise} />
                        </Suspense>
                      ) : (
                        stat.title
                      )}
                    </h3>
                    <p className="text-xs sm:text-sm landing-muted">{stat.label}</p>
                  </div>
                </div>
            </div>
          );
        })}
      </div>
    </LandingSectionShell>
  );
}
