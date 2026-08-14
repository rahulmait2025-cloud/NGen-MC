import { notFound } from 'next/navigation';
import { requireStudent } from '@/lib/auth/require-student';
import { loadBundleLearningPageData } from '@/lib/services/bundle-learning';
import { BundleLearningClient } from './bundle-learning-client';

export default async function BundleLearningPage({
  params,
}: {
  params: Promise<{ collegeSlug: string; bundleSlug: string }>;
}) {
  const { collegeSlug, bundleSlug } = await params;
  const ctx = await requireStudent(collegeSlug);

  const data = await loadBundleLearningPageData(
    collegeSlug,
    bundleSlug,
    ctx.studentId,
    ctx.isGlobal ? null : ctx.tenant.id,
  );

  if (!data) {
    notFound();
  }

  return <BundleLearningClient collegeSlug={collegeSlug} data={data} />;
}
