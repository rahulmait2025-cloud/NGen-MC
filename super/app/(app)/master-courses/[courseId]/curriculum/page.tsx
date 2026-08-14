import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getMasterCourseById } from '@/lib/services/master-courses';
import { getCourseCurriculum } from '@/lib/services/master-course-structure';
import { listVideoAssetsByCourse } from '@/lib/services/video-assets';
import { CurriculumClient } from './curriculum-client';

export default async function CurriculumPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}): Promise<ReactNode> {
  const { courseId } = await params;
  const [_auth, course] = await Promise.all([
    getSessionFromHeaders(),
    getMasterCourseById(courseId),
  ]);
  if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  if (!course) {
    notFound();
  }

  const [curriculum, videos] = await Promise.all([
    getCourseCurriculum(courseId),
    listVideoAssetsByCourse(courseId),
  ]);

  return (
    <CurriculumClient
      course={{
        id: course.id,
        title: course.title,
        code: course.code,
      }}
      initialModules={curriculum.modules}
      videoAssets={videos}
    />
  );
}
