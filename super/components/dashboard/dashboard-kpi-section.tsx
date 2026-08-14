import { Suspense } from 'react';
import { getSuperadminDashboardStats } from '@/lib/services/dashboard';
import { KpiGrid } from '@/components/dashboard/kpi-grid';
import { KpiGridSkeleton } from './kpi-grid-skeleton';

async function DashboardKpiContent() {
  const stats = await getSuperadminDashboardStats();
  return <KpiGrid stats={stats} />;
}

export function DashboardKpiSection() {
  return (
    <Suspense fallback={<KpiGridSkeleton />}>
      <DashboardKpiContent />
    </Suspense>
  );
}
