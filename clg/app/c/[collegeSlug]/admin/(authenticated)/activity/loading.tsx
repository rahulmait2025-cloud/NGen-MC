import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityLoading() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-10 pb-16 xl:max-w-7xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-[1.25rem] border border-border bg-card p-4 shadow-sm">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
        <div className="rounded-[2.5rem] border border-border bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-40 mb-1" />
          <Skeleton className="h-3 w-64 mb-6" />
          <Skeleton className="h-[280px] w-full" />
        </div>
        <div className="rounded-[2.5rem] border border-border bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-40 mb-1" />
          <Skeleton className="h-3 w-64 mb-6" />
          <Skeleton className="h-[280px] w-full" />
        </div>
      </div>
    </div>
  );
}