import { notFound, redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function LegacyCourseDetailPage({
  params,
}: {
  params: Promise<{ collegeSlug: string; courseId: string }>;
}) {
  const { collegeSlug, courseId } = await params;

  const sb = createAdminClient();

  const { data: course } = await sb
    .from('master_courses')
    .select('id, course_kind, pillar_id, master_course_pillars!master_courses_pillar_id_fkey(slug)')
    .eq('id', courseId)
    .single();

  if (!course) {
    notFound();
  }

  const pillar = Array.isArray(course?.master_course_pillars)
    ? course?.master_course_pillars[0]
    : course?.master_course_pillars;

  const pillarSlug = pillar?.slug
    || (course.course_kind === 'free_course' ? 'free-courses' : 'bootcamp');

  // Redirect to the pillar-based course detail route
  redirect(`/c/${collegeSlug}/student/pillars/${pillarSlug}/courses/${courseId}`);
}
