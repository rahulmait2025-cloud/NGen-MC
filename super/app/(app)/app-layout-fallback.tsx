import { Skeleton } from '@/components/ui/skeleton';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

/**
 * Suspense fallback for the authenticated SuperAdmin layout shell.
 * Mirrors AppLayoutClient's structure so there is no layout shift
 * when the auth check + sidebar metrics resolve.
 */
export function AppLayoutFallback() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-svh w-full">
        {/* Sidebar skeleton */}
        <aside className="hidden md:flex w-64 shrink-0 border-r bg-background flex-col p-4 gap-3">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-2 mt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-md" />
            ))}
          </div>
        </aside>
        <SidebarInset className="min-h-0 min-w-0 flex-1 overflow-x-hidden">
          <div className="flex min-h-svh min-w-0 flex-col md:min-h-0">
            <div className="px-4 sm:px-5 md:px-6 pt-3">
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
            <div className="flex-1 min-w-0 w-full max-w-full px-4 sm:px-5 md:px-6 py-6 space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
              <div className="grid gap-4 md:grid-cols-3 mt-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
