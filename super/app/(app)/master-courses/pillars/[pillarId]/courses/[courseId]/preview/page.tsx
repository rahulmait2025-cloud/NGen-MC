import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getMasterCourseById } from '@/lib/services/master-courses';
import { Metadata } from 'next';
import CourseLandingPageTemplateClient from '@/components/master-courses/course-landing-page-template-client';

interface PreviewPageProps {
  params: Promise<{
    pillarId: string;
    courseId: string;
  }>;
}

export async function generateMetadata({ params }: PreviewPageProps): Promise<Metadata> {
  const { courseId } = await params;
  const course = await getMasterCourseById(courseId);
  return {
    title: `Preview: ${course?.title || 'Course'} | NextGen CTO`,
    description: 'Landing Page Preview',
  };
}

export default async function CoursePreviewPage({ params }: PreviewPageProps): Promise<ReactNode> {
  const { pillarId, courseId } = await params;

  const course = await getMasterCourseById(courseId);

  if (!course) {
    notFound();
  }

  if (course.pillar_id !== pillarId) {
    notFound();
  }

  const metadata = (course.metadata as Record<string, unknown>) || {};
  const landingPageData = (metadata.landing_page as Record<string, unknown>) || {};

  return (
    <div className="relative">
      <CourseLandingPageTemplateClient 
        data={landingPageData} 
        isDark={true}
      />
      <div className="fixed bottom-8 right-8 z-[100] pointer-events-none">
        <div className="bg-orange-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-black uppercase tracking-widest text-sm animate-pulse border-4 border-black">
          SUPERADMIN PREVIEW MODE
        </div>
      </div>
    </div>
  );
}
