import { KpiCardSkeleton } from '@/components/ui/skeletons';

export function DashboardContentSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={`kpi-${i}`} />
        ))}
      </div>
      <div className="h-28 rounded-2xl bg-muted/20 animate-pulse border border-border/50" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-56 rounded-2xl bg-muted/20 animate-pulse border border-border/50" />
        <div className="h-56 rounded-2xl bg-muted/20 animate-pulse border border-border/50" />
      </div>
      <div className="h-72 rounded-2xl bg-muted/20 animate-pulse border border-border/50" />
    </div>
  );
}
