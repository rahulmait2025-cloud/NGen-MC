import { Skeleton } from '@/components/ui/skeleton';

export function LearningAnalyticsSkeleton({ metricCount = 6 }: { metricCount?: number }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-10 pb-16">
      <div>
        <Skeleton className="mb-2 h-10 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="flex gap-4">
        {Array.from({ length: metricCount }).map((_, i) => (
          <div
            key={`m-${i}`}
            className="shrink-0 rounded-[1.25rem] border border-border bg-card px-5 py-4 shadow-sm dark:shadow-none"
            style={{ width: 180 }}
          >
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`c-${i}`}
            className="rounded-[2.5rem] border border-border bg-card p-8 shadow-sm dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.35)]"
          >
            <Skeleton className="mb-2 h-3 w-32" />
            <Skeleton className="mb-6 h-3 w-24" />
            <Skeleton className="h-[200px] w-full rounded-xl" />
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-[2.5rem] border border-border bg-card p-8 shadow-sm dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.35)]">
          <Skeleton className="mb-2 h-3 w-32" />
          <Skeleton className="mb-6 h-3 w-24" />
          <Skeleton className="h-[240px] w-full rounded-xl" />
        </div>
        <div className="rounded-[2.5rem] border border-border bg-card p-8 shadow-sm dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.35)]">
          <Skeleton className="mb-2 h-3 w-32" />
          <Skeleton className="mb-6 h-3 w-24" />
          <Skeleton className="h-[240px] w-full rounded-xl" />
        </div>
      </div>

      <div className="rounded-[2.5rem] border border-border bg-card p-8 shadow-sm dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.35)]">
        <Skeleton className="mb-2 h-3 w-48" />
        <Skeleton className="mb-6 h-3 w-36" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </div>
    </div>
  );
}
