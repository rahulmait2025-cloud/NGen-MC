import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { getOptionalStudentContext } from '@/lib/auth/get-optional-student-context';
import { listDiscoverableBundles } from '@/lib/services/student-bundles';
import { BundleCardsSection } from './_components/bundle-cards-section';

function BundlesSkeleton() {
  return (
    <div className="min-h-screen pt-6">
      <div className="mx-auto max-w-6xl px-4 space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function BundlesContent({ collegeSlug, studentId, collegeId }: { collegeSlug: string; studentId: string | null; collegeId: string | null }) {
  const bundles = await listDiscoverableBundles(collegeSlug, studentId, collegeId, 'catalog');

  return (
    <BundleCardsSection
      collegeSlug={collegeSlug}
      bundles={bundles}
      title="All Learning Bundles"
      description="Browse every published bundle available in your workspace. Each path connects courses, practice, and outcomes into one guided journey."
      className="pt-6"
    />
  );
}

export default async function StudentBundlesCatalogPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug } = await params;
  const ctx = await getOptionalStudentContext(collegeSlug);
  const studentId = ctx?.studentId ?? null;
  const isGlobal = ctx?.isGlobal ?? ['direct-learners', 'direct-learner', 'unknown'].includes(collegeSlug.toLowerCase());
  const collegeId = isGlobal ? null : ctx?.tenant?.id ?? null;

  return (
    <div className="min-h-screen">
      <Suspense fallback={<BundlesSkeleton />}>
        <BundlesContent collegeSlug={collegeSlug} studentId={studentId} collegeId={collegeId} />
      </Suspense>
    </div>
  );
}
