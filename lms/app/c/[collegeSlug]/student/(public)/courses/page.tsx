import type { ReactNode } from 'react';
import { CoursesHubStaticShell } from '../../(authenticated)/courses/_components/courses-hub-static-shell';
import { isJobReadyBootcampFeatureEnabled } from '@/lib/services/job-ready-bootcamp-feature';

export default async function FutureCoursesHubPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug } = await params;
  const showBootcamp = await isJobReadyBootcampFeatureEnabled();

  return (
    <main className="relative z-[1] flex flex-col">
      <CoursesHubStaticShell collegeSlug={collegeSlug} showBootcamp={showBootcamp} />
    </main>
  );
}
