'use client';

import dynamic from 'next/dynamic';
import type { StudentListItem } from '@/lib/services/students';
import type { CollegeWithCounts } from '@/lib/services/colleges';

const StudentsPageClient = dynamic(
  () => import('@/components/pages/students').then((m) => ({ default: m.StudentsPage })),
  { ssr: false, loading: () => <div className="h-96 bg-muted/30 animate-pulse rounded-xl" /> }
);

export function StudentsPageWrapper({ initialStudents, colleges }: { initialStudents: StudentListItem[]; colleges: CollegeWithCounts[] }) {
  return <StudentsPageClient initialStudents={initialStudents} colleges={colleges} />;
}