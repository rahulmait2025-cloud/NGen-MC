import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DiscoverableBundleCard } from '@/lib/services/student-bundles';
import { buildBundleHref } from '@/lib/utils/bundle-routes';
import { StudentCtaButton } from '@/components/student/ui/student-cta-button';

type BundleAccessLabel = DiscoverableBundleCard['accessLabel'];

const BADGE_STYLES: Record<BundleAccessLabel, string> = {
  Free: 'border-success/30 dark:border-success/40 bg-success/10 dark:bg-success/15 text-success dark:text-success',
  Premium: 'border-primary/35 dark:border-primary/40 bg-primary/12 dark:bg-primary/15 text-primary dark:text-primary',
  Included: 'border-cyan-500/30 dark:border-cyan-500/40 bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-200',
  Assigned: 'border-blue-500/30 dark:border-blue-500/40 bg-blue-500/10 dark:bg-blue-500/15 text-blue-800 dark:text-blue-200',
};

const BUNDLE_CARD_SURFACE = cn(
  'group relative flex flex-col gap-6 overflow-hidden rounded-3xl border border-[var(--landing-border)]',
  'bg-[var(--landing-card)] p-7 shadow-sm sm:p-8',
);

const BUNDLE_CARD_DESCRIPTION =
  'relative z-10 text-sm font-medium leading-7 text-[color-mix(in_oklab,var(--landing-fg)_88%,var(--landing-muted))]';

const BUNDLE_CARD_LIST_ITEM =
  'flex items-center gap-3.5 rounded-xl border border-[var(--landing-border)] bg-[color-mix(in_oklab,var(--landing-fg)_5%,var(--landing-card))] px-4 py-3 text-sm font-medium leading-relaxed text-[var(--landing-fg)]';

interface PremiumBundleCardProps {
  collegeSlug: string;
  bundle: DiscoverableBundleCard;
  className?: string;
}

export function PremiumBundleCard({
  collegeSlug,
  bundle,
  className,
}: PremiumBundleCardProps) {
  const href = buildBundleHref(collegeSlug, bundle.slug);
  const badgeStyle = BADGE_STYLES[bundle.accessLabel] ?? BADGE_STYLES.Premium;

  return (
    <article
      className={cn(
        BUNDLE_CARD_SURFACE,
        bundle.featured && 'border-orange-500/35',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-orange-500/10 blur-3xl transition group-hover:bg-orange-500/16"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 h-52 w-52 rounded-full bg-cyan-500/8 blur-3xl transition group-hover:bg-cyan-500/14"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,122,0,0.07),transparent_40%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/40 to-transparent opacity-0 transition group-hover:opacity-100"
        aria-hidden
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-xl font-bold leading-snug landing-heading">{bundle.title}</h3>
        <span
          className={cn(
            'shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider',
            badgeStyle,
          )}
        >
          {bundle.accessLabel}
        </span>
      </div>

      <p className={BUNDLE_CARD_DESCRIPTION}>
        {bundle.description}
      </p>

      {bundle.courseCount > 0 ? (
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--landing-border)] bg-[color-mix(in_oklab,var(--landing-orange)_8%,var(--landing-card))] px-3 py-1.5 text-xs font-semibold text-[var(--landing-fg)]">
            <Check className="size-3.5 shrink-0 text-primary" />
            {bundle.courseCount} connected course{bundle.courseCount === 1 ? '' : 's'}
          </span>
        </div>
      ) : null}

      <div className="relative z-10 mt-auto pt-1">
        <StudentCtaButton
          href={href}
          variant="primary"
          className="w-full"
        >
          Explore Bundle
        </StudentCtaButton>
      </div>
    </article>
  );
}

/** Static curated bundle card for landing content (non-API bundles). */
export interface CuratedBundleCardData {
  id: string;
  title: string;
  description: string;
  badgeLabel: string;
  badgeVariant: 'free' | 'premium' | 'included' | 'assigned';
  includedItems: string[];
  availabilityNote?: string;
  featured?: boolean;
  href: string;
  ctaLabel?: string;
}

const CURATED_BADGE_STYLES: Record<CuratedBundleCardData['badgeVariant'], string> = {
  free: BADGE_STYLES.Free,
  premium: BADGE_STYLES.Premium,
  included: BADGE_STYLES.Included,
  assigned: BADGE_STYLES.Assigned,
};

export function PremiumCuratedBundleCard({
  bundle,
}: {
  bundle: CuratedBundleCardData;
}) {
  return (
    <article
      className={cn(
        BUNDLE_CARD_SURFACE,
        bundle.featured && 'border-orange-500/35',
      )}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-orange-500/10 blur-3xl transition group-hover:bg-orange-500/16"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 h-52 w-52 rounded-full bg-purple-500/8 blur-3xl transition group-hover:bg-purple-500/14"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,122,0,0.07),transparent_40%)]"
        aria-hidden
      />

      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        <h3 className="min-w-0 text-xl font-bold leading-snug landing-heading">{bundle.title}</h3>
        <span
          className={cn(
            'shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider',
            CURATED_BADGE_STYLES[bundle.badgeVariant],
          )}
        >
          {bundle.badgeLabel}
        </span>
      </div>

      <p className={BUNDLE_CARD_DESCRIPTION}>{bundle.description}</p>

      {bundle.includedItems.length > 0 ? (
        <ul className="relative z-10 flex flex-col gap-2">
          {bundle.includedItems.map((item) => (
            <li key={item} className={BUNDLE_CARD_LIST_ITEM}>
              <Check className="size-4 shrink-0 text-primary" />
              {item}
            </li>
          ))}
        </ul>
      ) : null}

      {bundle.availabilityNote ? (
        <p className="relative z-10 text-xs font-semibold text-[color-mix(in_oklab,var(--landing-fg)_75%,var(--landing-muted))]">
          {bundle.availabilityNote}
        </p>
      ) : null}

      <div className="relative z-10 mt-auto pt-1">
        <StudentCtaButton href={bundle.href} className="w-full">
          {bundle.ctaLabel ?? 'Explore Bundle'}
        </StudentCtaButton>
      </div>
    </article>
  );
}
