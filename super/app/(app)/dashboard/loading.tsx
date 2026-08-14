import { DashboardPage } from '@/components/pages/dashboard';
import { cn } from '@/lib/utils';

function BoxSkeleton({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-muted/20 animate-pulse border border-border', className)} />;
}

export default function DashboardLoading() {
  return (
    <DashboardPage>
      <div className="space-y-8">
        <BoxSkeleton className="h-40" />
        <BoxSkeleton className="h-96" />
        <BoxSkeleton className="h-[480px]" />
      </div>
    </DashboardPage>
  );
}
