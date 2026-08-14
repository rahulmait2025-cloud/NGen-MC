import { Skeleton } from '@/components/ui/skeleton';

export default function StudentActivityLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <Skeleton className="h-4 w-[140px]" />

      <div className="card-tier-1 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-[200px]" />
            <Skeleton className="h-4 w-[260px]" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-tier-1 rounded-xl p-4">
            <Skeleton className="h-3 w-[60px] mb-3" />
            <Skeleton className="h-7 w-[40px]" />
          </div>
        ))}
      </div>

      <div className="card-tier-1 rounded-xl p-6">
        <Skeleton className="h-4 w-[120px] mb-5" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <Skeleton className="h-4 w-[50%]" />
              <Skeleton className="h-3 w-[30px]" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full mb-1" />
            <Skeleton className="h-3 w-[180px]" />
          </div>
        ))}
      </div>

      <div className="card-tier-1 rounded-xl p-6">
        <Skeleton className="h-4 w-[120px] mb-5" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 py-3 border-b border-border/20 last:border-0">
            <Skeleton className="size-7 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-[70%]" />
              <Skeleton className="h-3 w-[120px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
