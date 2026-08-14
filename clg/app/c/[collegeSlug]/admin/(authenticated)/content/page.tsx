import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { requireCollegeAdmin } from '@/lib/auth/require-college-admin'
import { listAssignedCoursesForCollegeAdmin, listExpiredAssignmentsForCollegeAdmin } from '@/lib/services/assigned-courses'
import { AssignedCoursesDashboard } from '@/components/admin/assigned-courses-dashboard'

export default async function AssignedCoursesPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>
}): Promise<ReactNode> {
  // Sequential: each await depends on the previous result (collegeSlug → tenant)
  const { collegeSlug } = await params
  const { tenant } = await requireCollegeAdmin(collegeSlug)
  const [allGroups, expiredCourses] = await Promise.all([
    listAssignedCoursesForCollegeAdmin(tenant.id),
    listExpiredAssignmentsForCollegeAdmin(tenant.id),
  ])

  const pillarGroups = allGroups.reduce((acc, group) => {
    const filteredCourses = group.courses.filter((c) => c.assignment_state === 'assigned');
    if (filteredCourses.length > 0) {
      acc.push({
        ...group,
        courses: filteredCourses,
      });
    }
    return acc;
  }, [] as typeof allGroups);

  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
      <AssignedCoursesDashboard
        pillarGroups={pillarGroups}
        collegeSlug={collegeSlug}
        expiredCourses={expiredCourses}
      />
    </Suspense>
  )
}
