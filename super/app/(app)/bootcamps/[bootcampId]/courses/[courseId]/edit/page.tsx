import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getBootcampById } from '@/lib/services/bootcamps';
import { getBootcampCourse } from '@/lib/services/bootcamp-courses';
import { EditBootcampCourseForm } from './edit-bootcamp-course-form';

export default async function EditBootcampCoursePage({
  params,
}: {
  params: Promise<{ bootcampId: string; courseId: string }>;
}): Promise<ReactNode> {
  const { bootcampId, courseId } = await params;

  const [_auth, bootcamp, course] = await Promise.all([
    getSessionFromHeaders(),
    getBootcampById(bootcampId),
    getBootcampCourse(bootcampId, courseId),
  ]);
  if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  if (!bootcamp || !course) {
    notFound();
  }

  if (course.catalog_type !== 'bootcamp' || course.bootcamp_id !== bootcampId) {
    notFound();
  }

  return (
    <EditBootcampCourseForm
      bootcampId={bootcampId}
      bootcampTitle={bootcamp.title}
      course={{
        id: course.id,
        title: course.title,
        code: course.code,
        slug: course.slug ?? '',
        description: course.description ?? '',
        short_description: course.short_description ?? '',
        program_tag: course.program_tag ?? '',
        publish_status: course.publish_status,
      }}
    />
  );
}
