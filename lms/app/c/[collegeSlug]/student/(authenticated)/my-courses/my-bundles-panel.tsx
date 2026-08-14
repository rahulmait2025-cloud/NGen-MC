'use client';

import Link from 'next/link';
import { Package, ArrowRight } from 'lucide-react';
import type { StudentPurchasedBundle } from '@/lib/services/student-purchased-bundles';

export function BundleCard({
  bundle,
}: {
  bundle: StudentPurchasedBundle;
}) {
  return (
    <Link
      href={bundle.continueHref}
      className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card hover:border-primary/25 hover:shadow-md transition-[box-shadow,border-color] duration-200"
    >
      <div className="relative aspect-[16/10] bg-primary/10 p-6 flex items-center justify-center">
        <div className="flex size-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/15 text-primary">
          <Package className="size-6" />
        </div>
      </div>

      <div className="p-5 flex flex-col justify-between flex-1">
        <div className="space-y-2">
          <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
            {bundle.cardTitle}
          </h3>
        </div>

        {bundle.progressPercentage > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground/50 font-medium">Progress</span>
              <span className="font-bold text-foreground tabular-nums">{bundle.progressPercentage}%</span>
            </div>
            <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-[width] duration-300 ease-out"
                style={{ width: `${bundle.progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function BundleCardsGrid({
  bundles,
}: {
  bundles: StudentPurchasedBundle[];
}) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {bundles.map((bundle) => (
        <BundleCard key={bundle.id} bundle={bundle} />
      ))}
    </div>
  );
}

interface MyBundlesPanelProps {
  bundles: StudentPurchasedBundle[];
  collegeSlug: string;
}

export function MyBundlesPanel({ bundles, collegeSlug }: MyBundlesPanelProps) {
  if (bundles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Package className="size-5 text-primary/60" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No bundles enrolled yet.</p>
        <Link
          href={`/c/${collegeSlug}/student/bundles`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Explore learning bundles
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    );
  }

  return <BundleCardsGrid bundles={bundles} />;
}
