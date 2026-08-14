import { Skeleton } from "@/components/ui/skeleton";

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2 mb-6">
      <Skeleton className="h-8 w-full max-w-[250px]" />
      <Skeleton className="h-4 w-full max-w-[400px]" />
    </div>
  );
}

export { KpiCardSkeleton } from './kpi-card-skeleton';
export { TableSkeleton } from './table-skeleton';


