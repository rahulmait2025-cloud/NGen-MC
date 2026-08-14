import { LandingNavbarSpacer } from '@/app/c/[collegeSlug]/student/(authenticated)/home/_components/student-landing-navbar';
import { Skeleton } from '@/components/ui/skeleton';

export function CampusAmbassadorPageSkeleton() {
  return (
    <div className="landing-shell campus-campaign relative isolate h-[100dvh] w-full overflow-x-clip overflow-y-auto">
      <LandingNavbarSpacer />

      <div className="mx-auto max-w-7xl px-5 py-14 md:px-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center">
          <div className="w-full space-y-6 lg:w-[44%]">
            <Skeleton className="h-6 w-56 rounded-full" />
            <Skeleton className="h-12 w-full max-w-xl" />
            <Skeleton className="h-12 w-full max-w-lg" />
            <Skeleton className="h-5 w-full max-w-2xl" />
            <Skeleton className="h-5 w-full max-w-xl" />
            <div className="flex gap-4 pt-2">
              <Skeleton className="h-14 w-36 rounded-full" />
              <Skeleton className="h-14 w-40 rounded-full" />
            </div>
          </div>
          <div className="w-full lg:w-[56%]">
            <Skeleton className="aspect-[3/2] w-full rounded-[2rem]" />
          </div>
        </div>
      </div>
    </div>
  );
}
