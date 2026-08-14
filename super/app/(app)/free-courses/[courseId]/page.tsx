import type { ReactNode } from 'react';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import {
  getFreeCourseBuilder,
  getFreeCourseThumbnailUrl,
} from '@/lib/free-courses/free-course-service';
import { getFreeCourseAnalytics } from '@/lib/free-courses/free-course-analytics';
import { FreeCourseAnalyticsSection } from '@/app/(app)/free-courses/free-course-analytics-section';
import { FreeCourseBuilderClient } from './free-course-builder-client';

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default async function FreeCourseBuilderPage({ params }: PageProps): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders();
  if (!_auth) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  const { courseId } = await params;
  const [builder, analytics] = await Promise.all([
    getFreeCourseBuilder(courseId),
    getFreeCourseAnalytics(courseId),
  ]);

  return (
    <div className="space-y-6">
      <FreeCourseBuilderClient
        course={builder.course}
        modules={builder.modules}
        items={builder.items}
        videoAssetsByItemId={builder.videoAssetsByItemId}
        stats={builder.stats}
        thumbnailUrl={getFreeCourseThumbnailUrl(builder.course, builder.items)}
      />
      <FreeCourseAnalyticsSection analytics={analytics} />
    </div>
  );
}
