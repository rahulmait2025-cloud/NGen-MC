import { cn } from '@/lib/utils';
import { FounderAvatar } from './founder-avatar';

export const FOUNDER_MENTOR_CARD_DEFAULTS = {
  badgeText: 'Founder & Mentor',
  name: 'CTO Bhaiya',
  subtitle: 'Founder, NextGen CTO',
} as const;

export interface FounderMentorCardProps {
  className?: string;
  badgeText?: string;
  name?: string;
  subtitle?: string;
  priority?: boolean;
  sizes?: string;
  imageClassName?: string;
}

export function FounderMentorCard({
  className,
  badgeText = FOUNDER_MENTOR_CARD_DEFAULTS.badgeText,
  name = FOUNDER_MENTOR_CARD_DEFAULTS.name,
  subtitle = FOUNDER_MENTOR_CARD_DEFAULTS.subtitle,
  priority = false,
  sizes = '(max-width: 768px) 320px, 384px',
  imageClassName = 'object-cover object-top',
}: FounderMentorCardProps) {
  return (
    <div className={cn('relative w-[19rem] sm:w-80 lg:w-96 max-w-full', className)}>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)] shadow-[0_16px_40px_-24px_rgba(15,23,42,0.28)]">
        <div className="relative aspect-[4/5] w-full">
          <FounderAvatar
            fill
            priority={priority}
            sizes={sizes}
            imageClassName={imageClassName}
          />

          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[var(--landing-card)] to-transparent" />

          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-[var(--landing-border)] bg-[var(--landing-card)] px-3 py-1.5 shadow-sm">
            <span className="size-2 rounded-full bg-[var(--landing-orange)]" aria-hidden />
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--landing-fg)]">
              {badgeText}
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-16">
            <p className="text-lg font-bold leading-tight landing-heading sm:text-xl">{name}</p>
            <p className="mt-0.5 text-sm font-medium text-[color-mix(in_oklab,var(--landing-fg)_70%,var(--landing-muted))]">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
