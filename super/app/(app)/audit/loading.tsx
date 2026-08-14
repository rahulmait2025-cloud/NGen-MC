import { Skeleton } from '@/components/ui/skeleton';

export default function AuditLoading() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
