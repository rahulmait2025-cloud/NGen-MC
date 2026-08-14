import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { listColleges } from '@/lib/services/colleges';
import { CollegesPageWrapper } from './_components/CollegesPageWrapper';

function CollegesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-48 bg-muted/50 animate-pulse rounded-lg" />
      <div className="h-96 w-full bg-muted/50 animate-pulse rounded-xl" />
    </div>
  );
}

async function CollegesListSection() {
  const colleges = await listColleges();
  return <CollegesPageWrapper initialColleges={colleges} />;
}

export default async function CollegesRoute(): Promise<ReactNode> {
  return (
    <Suspense fallback={<CollegesSkeleton />}>
      <CollegesListSection />
    </Suspense>
  );
}
