import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getMasterCourseById } from '@/lib/services/master-courses';
import { getCourseCurriculum } from '@/lib/services/master-course-structure';
import { listVideoAssetsByCourse } from '@/lib/services/video-assets';
import { VideoAssetsClient } from './video-assets-client';
import { SyncFolderButton } from './sync-folder-button';
import { CreateFolderButton } from './create-folder-button';

export default async function VideoAssetsPage({
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

  const [curriculum, videoAssets] = await Promise.all([
    getCourseCurriculum(courseId),
    listVideoAssetsByCourse(courseId, { include_removed: false }),
  ]);
  
  const modules = curriculum.modules;

  return (
    <VideoAssetsClient
      courseId={courseId}
      course={{
        id: course.id,
        title: course.title,
        code: course.code,
        tp_folder_uuid: course.tp_folder_uuid,
        pillar_id: course.pillar_id,
      }}
      modules={modules}
      initialVideoAssets={videoAssets}
      syncButton={
        course.tp_folder_uuid ? (
          <SyncFolderButton courseId={courseId} />
        ) : (
          <CreateFolderButton courseId={courseId} />
        )
      }
    />
  );
}
