import { cn } from '@/lib/utils';
import type { BestCourseGradient } from './landing-content';

const GRADIENT_STYLES: Record<BestCourseGradient, string> = {
  orange:
    'from-primary/30 via-[var(--landing-device-bg)] to-[color-mix(in_oklab,var(--landing-device-bg)_75%,var(--landing-marquee-fade))]',
  purple:
    'from-[var(--landing-accent-teal)]/30 via-[var(--landing-device-bg)] to-[color-mix(in_oklab,var(--landing-device-bg)_75%,var(--landing-marquee-fade))]',
  blue:
    'from-accent/20 via-[var(--landing-device-bg)] to-[color-mix(in_oklab,var(--landing-device-bg)_75%,var(--landing-marquee-fade))]',
  emerald:
    'from-emerald-500/20 via-[var(--landing-device-bg)] to-[color-mix(in_oklab,var(--landing-device-bg)_75%,var(--landing-marquee-fade))]',
  amber:
    'from-amber-500/20 via-[var(--landing-device-bg)] to-[color-mix(in_oklab,var(--landing-device-bg)_75%,var(--landing-marquee-fade))]',
  rose:
    'from-rose-500/20 via-[var(--landing-device-bg)] to-[color-mix(in_oklab,var(--landing-device-bg)_75%,var(--landing-marquee-fade))]',
};

interface LandingCourseVisualProps {
  gradient: BestCourseGradient;
  title: string;
  className?: string;
}

export function LandingCourseVisual({ gradient, title, className }: LandingCourseVisualProps) {
  return (
    <div
      className={cn(
        'relative h-52 overflow-hidden bg-[var(--landing-surface)] sm:h-56',
        className,
      )}
    >
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-75',
          GRADIENT_STYLES[gradient],
        )}
      />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="landing-hero-device-panel w-full max-w-[280px] rounded-lg p-4 shadow-lg">
          <div className="mb-2 flex gap-1.5">
            <span className="size-2.5 rounded-full bg-primary/80" />
            <span className="size-2.5 rounded-full bg-[var(--landing-device-border)]" />
            <span className="size-2.5 rounded-full bg-[var(--landing-device-border)]" />
          </div>
          <div className="space-y-1.5 font-mono text-[10px] text-[var(--landing-device-text)]">
            <p>
              <span className="text-primary">{'// '}</span>
              {title}
            </p>
            <p className="text-[var(--landing-accent-teal)]">learn.build()</p>
          </div>
        </div>
      </div>
    </div>
  );
}
