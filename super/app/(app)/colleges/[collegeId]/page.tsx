import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

import { getCollegeById, type CollegeWithCounts } from '@/lib/services/colleges';
import { listUsers } from '@/lib/services/users';
import { isDirectLearnerCollegeSlug, listStudents } from '@/lib/services/students';
import { listCohorts } from '@/lib/services/cohorts';
import { CollegeAssignedContentSection } from '@/components/pages/college-assigned-content';
import { DirectLearnerAccessSection } from './_components/direct-learner-access-section';

import {
  CollegeDetailShell,
  CollegeAdminsCard,
  CollegeStudentsCard,
} from '@/components/pages/college-detail';

function CardSkeleton({ height = 'h-[300px]' }: { height?: string }) {
  return <Skeleton className={`w-full ${height} rounded-xl`} />;
}

async function AdminsSection({ college }: { college: Pick<CollegeWithCounts, 'id' | 'name' | 'slug'> }) {
  const admins = await listUsers({ role: 'college_admin', college_id: college.id, limit: 200, college });
  return <CollegeAdminsCard collegeId={college.id} admins={admins} />;
}

async function StudentsSection({ college }: { college: Pick<CollegeWithCounts, 'id' | 'name' | 'slug'> }) {
  const [students, cohorts] = await Promise.all([
    listStudents({ college_id: college.id, limit: 500, college }),
    listCohorts(college.id),
  ]);
  return <CollegeStudentsCard collegeId={college.id} students={students} cohorts={cohorts} />;
}

export default async function CollegeDetailRoute({
  params,
}: {
  params: Promise<{ collegeId: string }>;
}): Promise<ReactNode> {
  const { collegeId } = await params;
  const college = await getCollegeById(collegeId);

  if (!college) {
    notFound();
  }

  const isDirectLearnersCollege = isDirectLearnerCollegeSlug(college.slug);

  return (
    <div className="space-y-6">
      <CollegeDetailShell college={college} />

      <Suspense fallback={<CardSkeleton height="h-[250px]" />}>
        <AdminsSection college={college} />
      </Suspense>

      <Suspense fallback={<CardSkeleton height="h-[260px]" />}>
        <CollegeAssignedContentSection collegeId={college.id} />
      </Suspense>

      {isDirectLearnersCollege && (
        <Suspense fallback={<CardSkeleton height="h-[420px]" />}>
          <DirectLearnerAccessSection collegeId={college.id} />
        </Suspense>
      )}

      <Suspense fallback={<CardSkeleton height="h-[500px]" />}>
        <StudentsSection college={college} />
      </Suspense>
    </div>
  );
}
