import { Skeleton } from '@/components/ui/skeleton';

/**
 * Lightweight skeleton for login pages (~12 elements vs LandingPageSkeleton's ~50+).
 * Renders only the login form layout — no hero, course cards, benefits, or FAQ sections.
 */
export function LoginPageSkeleton() {
  return (
    <div className="flex h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / brand */}
        <div className="flex justify-center">
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/40 p-8 space-y-5">
          {/* Heading */}
          <div className="space-y-2 text-center">
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>

          {/* Button */}
          <Skeleton className="h-10 w-full rounded-lg" />

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/40" />
            <Skeleton className="h-3 w-16" />
            <div className="h-px flex-1 bg-border/40" />
          </div>

          {/* Google button */}
          <Skeleton className="h-10 w-full rounded-lg" />

          {/* Footer link */}
          <Skeleton className="h-4 w-40 mx-auto" />
        </div>
      </div>
    </div>
  );
}
