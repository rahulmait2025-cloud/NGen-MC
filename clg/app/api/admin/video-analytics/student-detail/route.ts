import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-admin-action';
import { getCollegeStudentVideoDetailBundle } from '@/lib/services/college-video-analytics';
import { parseVideoAnalyticsFilters } from '@/lib/college-admin/analytics/parse-video-analytics-filters';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const collegeId = searchParams.get('collegeId');
    const studentId = searchParams.get('studentId');
    const courseId = searchParams.get('courseId');

    if (!collegeId || !studentId) {
      return NextResponse.json(
        { ok: false, error: 'collegeId and studentId are required.' },
        { status: 400 },
      );
    }

    const auth = await requireAuth(collegeId);
    if (!auth || auth.collegeId !== collegeId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 403 });
    }

    const filters = parseVideoAnalyticsFilters({
      q: searchParams.get('q') ?? undefined,
      course: searchParams.get('course') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
      dir: searchParams.get('dir') ?? undefined,
    });

    const bundle = await getCollegeStudentVideoDetailBundle(collegeId, studentId, {
      courseId: courseId || null,
      filters,
    });

    if (!bundle) {
      return NextResponse.json(
        { ok: false, error: 'Student not found in this college.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: bundle });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/video-analytics/student-detail]', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
