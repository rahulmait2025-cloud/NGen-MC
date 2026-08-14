import { PageHeaderSkeleton, KpiCardSkeleton } from "@/components/ui/skeletons";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={`kpi-${i}`} />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-[400px] rounded-xl bg-muted/20 animate-pulse" />
        <div className="h-[400px] rounded-xl bg-muted/20 animate-pulse" />
      </div>
    </div>
  );
}