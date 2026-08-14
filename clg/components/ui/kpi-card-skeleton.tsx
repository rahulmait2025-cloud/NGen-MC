import { Skeleton } from "@/components/ui/skeleton";

export function KpiCardSkeleton() {
  return (
    <div className="card-tier-1 rounded-xl p-6">
      <Skeleton className="h-4 w-[120px] mb-4" />
      <Skeleton className="h-8 w-[80px] mb-2" />
      <Skeleton className="h-3 w-[100px]" />
    </div>
  );
}
