import { Skeleton } from '@/components/ui/skeleton';

export default function CollegesLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96 cursor-wait" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Skeleton key="col-sk-1" className="h-24 rounded-2xl" />
        <Skeleton key="col-sk-2" className="h-24 rounded-2xl" />
        <Skeleton key="col-sk-3" className="h-24 rounded-2xl" />
        <Skeleton key="col-sk-4" className="h-24 rounded-2xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
