import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { listStudents } from '@/lib/services/students';
import { listColleges } from '@/lib/services/colleges';
import { StudentsPageWrapper } from './_components/StudentsPageWrapper';

function StudentsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 rounded-lg bg-muted/20 animate-pulse" />
      <div className="h-12 w-full rounded-xl bg-muted/20 animate-pulse" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 w-full rounded-lg bg-muted/20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

async function StudentsContent() {
  const [initialStudents, colleges] = await Promise.all([listStudents(), listColleges()]);
  return <StudentsPageWrapper initialStudents={initialStudents} colleges={colleges} />;
}

export default async function StudentsRoute(): Promise<ReactNode> {
  return (
    <Suspense fallback={<StudentsSkeleton />}>
      <StudentsContent />
    </Suspense>
  );
}