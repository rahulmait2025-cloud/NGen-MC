'use client';

import dynamic from 'next/dynamic';
import type { CollegeWithCounts } from '@/lib/services/colleges';

const CollegesPageClient = dynamic(
  () => import('@/components/pages/colleges').then((m) => ({ default: m.CollegesPage })),
  { ssr: false, loading: () => <div className="h-96 bg-muted/30 animate-pulse rounded-xl" /> }
);

export function CollegesPageWrapper({ initialColleges }: { initialColleges: CollegeWithCounts[] }) {
  return <CollegesPageClient initialColleges={initialColleges} />;
}