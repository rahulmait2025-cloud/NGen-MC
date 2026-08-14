import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6 sm:space-y-8 min-w-0 animate-pulse">
      {/* ProgressSummaryCards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border/60 bg-card/50 p-5 space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-6 w-12 rounded" />
          </div>
        ))}
      </div>

      {/* ProgressContinueCard Skeleton */}
      <div className="h-28 rounded-xl border border-border/60 bg-card/50 p-5 flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-6 w-48 rounded" />
        </div>
        <Skeleton className="h-10 w-24 rounded" />
      </div>

      {/* ProgressSuggestedGoals Skeleton */}
      <div className="border border-border/60 rounded-xl bg-card/50 p-6 space-y-4">
        <Skeleton className="h-5 w-40 rounded" />
        <Skeleton className="h-2 w-full rounded" />
      </div>

      {/* ProgressCourseList Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl border border-border/60 bg-card/50 p-5" />
          ))}
        </div>
      </div>
    </div>
  );
}
