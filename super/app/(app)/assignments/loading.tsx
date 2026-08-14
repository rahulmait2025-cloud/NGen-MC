import { Skeleton } from "@/components/ui/skeleton";

export default function AssignmentsLoading() {
  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-card px-5 py-4">
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-16 mt-1.5" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
        <div className="space-y-0">
          <Skeleton className="h-11 w-full rounded-none" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-none border-b border-border/20" />
          ))}
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-border/30">
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-1.5">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
