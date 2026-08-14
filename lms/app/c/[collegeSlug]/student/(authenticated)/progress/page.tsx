import { requireStudent } from '@/lib/auth/require-student';
import { loadProgressPageData } from './load-progress-data';
import { MyProgressContent } from './_components/my-progress-content';

export default async function StudentProgressPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;
  // Sequential: requireStudent provides studentId/isGlobal needed by loadProgressPageData
  const { studentId, isGlobal, membership } = await requireStudent(collegeSlug);
  const data = await loadProgressPageData(
    collegeSlug,
    studentId,
    isGlobal,
    membership?.collegeId ?? null,
  );

  return <MyProgressContent collegeSlug={collegeSlug} data={data} />;
}
