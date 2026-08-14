import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { listColleges } from '@/lib/services/colleges';
import { CollegesTable } from '@/components/dashboard/colleges-table';
import { DashboardKpiSection } from '@/components/dashboard/dashboard-kpi-section';
import SuperAdminExtendedDashboard from './superadmin-extended-dashboard';
import { DashboardPage } from '@/components/pages/dashboard';
import { cn } from '@/lib/utils';

function BoxSkeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-xl bg-muted/20 animate-pulse border border-border", className)} />;
}

export default async function DashboardRoute(): Promise<ReactNode> {
  return (
    <DashboardPage>
      <div className="space-y-8">
        <DashboardKpiSection />

        <Suspense fallback={<BoxSkeleton className="h-[400px]" />}>
          <CollegesTableWrapper />
        </Suspense>

        <Suspense fallback={<BoxSkeleton className="h-[600px]" />}>
          <SuperAdminExtendedDashboard />
        </Suspense>
      </div>
    </DashboardPage>
  );
}

async function CollegesTableWrapper() {
  const colleges = await listColleges({ limit: 20, offset: 0 });
  return <CollegesTable initialColleges={colleges} />;
}