import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/shared/page-container';

export default function StudentsLoading() {
  return (
    <PageContainer>
      <div className="space-y-1 mb-6">
        <Skeleton className="h-8 w-[180px]" />
        <Skeleton className="h-4 w-[300px]" />
      </div>

      <div className="card-tier-1 rounded-xl overflow-hidden">
        <div className="hidden md:block">
          <div className="border-b border-border/40 p-5">
            <Skeleton className="h-3 w-[250px]" />
          </div>
          <div className="divide-y divide-border/20">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-5">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <Skeleton className="h-4 w-[140px]" />
                  <Skeleton className="h-4 w-[180px]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:hidden space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[140px]" />
                <Skeleton className="h-3 w-[200px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
