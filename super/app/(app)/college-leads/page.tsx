import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { listCollegeLeads, getLeadStats } from '@/lib/services/college-leads';

const CollegeLeadsPage = dynamic(
  () => import('@/components/pages/college-leads').then((m) => ({ default: m.CollegeLeadsPage })),
  { ssr: true }
);

export default async function LeadsRoute(): Promise<ReactNode> {
  const [leads, stats] = await Promise.all([
    listCollegeLeads(),
    getLeadStats(),
  ]);

  return <CollegeLeadsPage initialLeads={leads} initialStats={stats} />;
}
