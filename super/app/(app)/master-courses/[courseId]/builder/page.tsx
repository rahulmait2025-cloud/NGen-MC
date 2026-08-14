import { redirect, notFound } from 'next/navigation';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getMasterCourseById } from '@/lib/services/master-courses';

/**
 * Legacy URL: redirects to pillar course view when available.
 */
export default async function LegacyCourseBuilderRedirect({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const [_auth, course] = await Promise.all([
    getSessionFromHeaders(),
    getMasterCourseById(courseId),
  ]);
  if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  if (!course) notFound();
  if (course.pillar_id) {
    redirect(`/master-courses/pillars/${course.pillar_id}/courses/${courseId}`);
  }
  redirect(`/master-courses/${courseId}`);
}
