'use client';

import Link from 'next/link';
import { Package, ArrowRight } from 'lucide-react';
import { StaggerReveal, StaggerChild } from '@/components/_animations/stagger-reveal';
import type { StudentPurchasedBundle } from '@/lib/services/student-purchased-bundles';

interface DashboardBundlesProps {
  bundles: StudentPurchasedBundle[];
  collegeSlug: string;
}

export function DashboardBundles({ bundles, collegeSlug }: DashboardBundlesProps) {
  if (bundles.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">My Bundles</h2>
        <Link
          href={`/c/${collegeSlug}/student/my-courses`}
          className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          View all →
        </Link>
      </div>

      <StaggerReveal className="space-y-2" stagger={0.05} delay={0.2}>
        {bundles.slice(0, 3).map((bundle) => (
          <StaggerChild key={bundle.id}>
            <Link
              href={bundle.continueHref}
              className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 dashboard-card-hover hover:border-primary/20"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Package className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {bundle.cardTitle}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {bundle.sourceLabel}
                </p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition shrink-0" />
            </Link>
          </StaggerChild>
        ))}
      </StaggerReveal>
    </div>
  );
}
