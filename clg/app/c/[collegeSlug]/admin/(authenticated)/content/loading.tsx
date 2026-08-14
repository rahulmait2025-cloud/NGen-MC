import { Skeleton } from "@/components/ui/skeleton"

export default function ContentLoading() {
  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[320px]" />
        </div>
        <Skeleton className="h-9 w-[160px] rounded-full" />
      </div>

      {/* Pillar Sections */}
      {Array.from({ length: 2 }).map((_, gi) => (
        <div key={gi} className="space-y-5">
          <div className="flex items-center gap-4">
            <Skeleton className="size-11 rounded-2xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-[180px]" />
              <Skeleton className="h-3.5 w-[240px]" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, ci) => (
              <div key={ci} className="rounded-2xl border border-border/40 bg-card shadow-sm p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[140px]" />
                    <Skeleton className="h-3 w-[80px]" />
                  </div>
                  <Skeleton className="size-9 rounded-xl shrink-0" />
                </div>
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-[80px] rounded-full" />
                  <Skeleton className="h-5 w-[60px] rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-[160px]" />
                <div className="flex gap-4">
                  <Skeleton className="h-3.5 w-[80px]" />
                  <Skeleton className="h-3.5 w-[80px]" />
                </div>
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
