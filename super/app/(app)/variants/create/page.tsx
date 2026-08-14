import type { ReactNode } from 'react';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listMasterCourses } from '@/lib/services/master-courses';
import { listMasterCoursePillars } from '@/lib/services/master-course-pillars';
import { getSimpleColleges } from '@/lib/services/colleges';
import { VariantForm } from './variant-form-client';

export default async function CreateVariantPage(): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  const [courses, pillars, colleges] = await Promise.all([
    listMasterCourses(),
    listMasterCoursePillars(),
    getSimpleColleges(),
  ]);

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <h2 className="text-xl font-semibold mb-2">No Master Courses Available</h2>
        <p className="text-muted-foreground">
          You need at least one Master Course to create a Variant.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create Course Variant</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Package a subset of a Master Course. Variants inherit TPStreams assets and metadata.
        </p>
      </div>

      <VariantForm
        masterCourses={courses.map((course) => ({
          id: course.id,
          title: course.title,
          code: course.code,
          publish_status: course.publish_status,
          pillar_id: course.pillar_id,
        }))}
        pillars={pillars.map((pillar) => ({
          id: pillar.pillar_id,
          title: pillar.title,
        }))}
        colleges={colleges}
      />
    </div>
  );
}
