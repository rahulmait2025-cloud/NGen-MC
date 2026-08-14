'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function KpiCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('border-0 card-tier-1 relative overflow-hidden', className)}>
      <div className="absolute -top-6 -right-6 size-20 rounded-full blur-2xl opacity-60 bg-muted/20" />
      <CardHeader className="flex flex-row items-start justify-between pb-2 mb-1 px-5 pt-5">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded-md bg-muted animate-pulse" />
          <div className="h-2 w-16 rounded-md bg-muted/60 animate-pulse" />
        </div>
        <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="h-8 w-16 rounded-md bg-muted animate-pulse" />
        <div className="h-3 w-full rounded-md bg-muted/60 animate-pulse mt-3" />
      </CardContent>
    </Card>
  );
}

export function KpiGridSkeleton() {
  return (
    <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCardSkeleton />
      <KpiCardSkeleton />
      <KpiCardSkeleton />
      <KpiCardSkeleton />
    </div>
  );
}
