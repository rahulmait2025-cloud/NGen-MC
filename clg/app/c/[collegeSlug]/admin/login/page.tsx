import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { CollegeAdminAuthScreen } from '@/components/auth/college-admin-auth-screen';

export default async function CollegeAdminLoginPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#030303]">
          <div className="size-8 animate-spin rounded-full border-2 border-[#E8541A] border-t-transparent" />
        </div>
      }
    >
      <CollegeAdminAuthScreen mode="tenant" collegeSlug={collegeSlug} />
    </Suspense>
  );
}
