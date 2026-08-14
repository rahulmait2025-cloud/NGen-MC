import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getFreeCourseBuilder } from '@/lib/free-courses/free-course-service';
import { YouTubeImportClient } from './youtube-import-client';

export const metadata: Metadata = {
  title: 'Import YouTube Playlist',
  description: 'Import lectures from a YouTube playlist into a free course',
};

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default async function YouTubeImportPage({ params }: PageProps): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders();
  if (!_auth) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  const { courseId } = await params;
  const builder = await getFreeCourseBuilder(courseId);

  return (
    <YouTubeImportClient
      courseId={courseId}
      courseTitle={builder.course.title}
      defaultModuleId={builder.modules[0]?.id ?? null}
    />
  );
}
