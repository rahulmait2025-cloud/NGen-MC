import { PremiumBundleCard } from '@/components/student/landing/premium-bundle-card';
import { cn } from '@/lib/utils';
import type { DiscoverableBundleCard } from '@/lib/services/student-bundles';

interface BundleCardsSectionProps {
  collegeSlug: string;
  bundles: DiscoverableBundleCard[];
  title?: string;
  description?: string;
  className?: string;
  viewAllHref?: string;
  isPending?: boolean;
}

export function BundleCardsSection({
  collegeSlug,
  bundles,
  title = 'Premium Learning Bundles',
  description = 'Structured bundle paths that connect courses, practice, and outcomes in one focused journey.',
  className,
  viewAllHref,
  isPending = false,
}: BundleCardsSectionProps) {
  if (!isPending && bundles.length === 0) return null;

  return (
    <section className={cn('py-10 sm:py-14', className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Guided Paths</p>
            <h2 className="font-display text-2xl font-bold tracking-tight landing-heading sm:text-3xl">{title}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>
          </div>
          {viewAllHref ? (
            <a href={viewAllHref} className="text-sm font-semibold text-primary hover:underline shrink-0">
              View all bundles
            </a>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {isPending ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-3xl bg-muted/20 border border-border/40" />
            ))
          ) : (
            bundles.map((bundle) => (
              <PremiumBundleCard
                key={bundle.id}
                collegeSlug={collegeSlug}
                bundle={bundle}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
