import { PageHeaderSkeleton, KpiCardSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={`kpi-${i}`} />
        ))}
      </div>
      <TableSkeleton rows={5} />
    </div>
  );
}
