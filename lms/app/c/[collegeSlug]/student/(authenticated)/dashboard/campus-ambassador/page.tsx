import { type ReactNode, Suspense } from 'react';
import { redirect } from 'next/navigation';
import { requireStudent } from '@/lib/auth/require-student';
import { getCampusAmbassadorPageState } from '@/lib/services/campus-ambassador';
import { AmbassadorDashboardState } from '@/components/campus-ambassador/ambassador-dashboard-state';
import { TooltipProvider } from '@/components/ui/tooltip';

// Do not set `export const dynamic` — incompatible with nextConfig.cacheComponents.
// This route stays request-dynamic via requireStudent() → headers().

export default async function CampusAmbassadorStudentPage({
  params,
}: {
  params: Promise<{ collegeSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug } = await params;

  return (
    <div className="space-y-6 min-w-0">
      <Suspense fallback={
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-primary/[0.06] rounded-lg w-80" />
          <div className="h-64 bg-primary/[0.04] rounded-xl" />
        </div>
      }>
        <CampusAmbassadorDataSection collegeSlug={collegeSlug} />
      </Suspense>
    </div>
  );
}

async function CampusAmbassadorDataSection({ collegeSlug }: { collegeSlug: string }) {
  const ctx = await requireStudent(collegeSlug);
  const state = await getCampusAmbassadorPageState(ctx.user.id);

  if (!state.isAmbassador) {
    redirect('/campus-ambassador');
  }

  return (
    <TooltipProvider>
      <div className="campus-campaign">
        <AmbassadorDashboardState
          state={state}
        />
      </div>
    </TooltipProvider>
  );
}
