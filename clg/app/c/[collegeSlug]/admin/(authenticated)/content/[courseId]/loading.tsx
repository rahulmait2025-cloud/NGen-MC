import { PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function CourseDetailLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <div className="h-5 w-32 rounded bg-muted/40 animate-pulse" />
      <PageHeaderSkeleton />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/20 animate-pulse" />
        ))}
      </div>
      <div className="h-48 rounded-xl bg-muted/20 animate-pulse" />
      <div className="h-[400px] rounded-xl bg-muted/20 animate-pulse" />
    </div>
  );
}