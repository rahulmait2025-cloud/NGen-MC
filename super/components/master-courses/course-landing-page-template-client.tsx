'use client';

import dynamic from 'next/dynamic';

const CourseLandingPageTemplate = dynamic(
  () => import('./course-landing-page-template'),
  { 
    ssr: false, 
    loading: () => <div className="min-h-screen bg-[#0A0A0A]" /> 
  }
);

interface CourseLandingPageTemplateClientProps {
  data: Record<string, unknown>;
  isDark?: boolean;
}

export default function CourseLandingPageTemplateClient({ data, isDark = true }: CourseLandingPageTemplateClientProps) {
  return <CourseLandingPageTemplate data={data} isDark={isDark} />;
}