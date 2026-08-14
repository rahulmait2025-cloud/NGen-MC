import { Suspense, type ReactNode } from 'react';
import { requireStudent } from '@/lib/auth/require-student';
import { listMyApplications } from '@/lib/services/student-jobs';
import MyApplicationsTable from './_components/my-applications-table';
import { Button } from '@/components/ui/button';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { StaggerReveal, StaggerChild } from '@/components/_animations/stagger-reveal';
import { Skeleton } from '@/components/ui/skeleton';

export default async function MyApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ collegeSlug: string }>;
  searchParams?: Promise<{ page?: string }>;
}): Promise<ReactNode> {
  const [{ collegeSlug }, sp] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as { page?: string }),
  ]);
  const page = Math.max(1, parseInt(sp?.page ?? '1', 10) || 1);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <Suspense fallback={<ApplicationsSkeleton />}>
        <ApplicationsList collegeSlug={collegeSlug} page={page} />
      </Suspense>
    </div>
  );
}

async function ApplicationsList({
  collegeSlug,
  page,
}: {
  collegeSlug: string;
  page: number;
}) {
  const { studentId } = await requireStudent(collegeSlug);

  const { applications, total, pageSize } = await listMyApplications({
    studentId,
    page,
    limit: 15, // Capping fetches to top 15 as requested
  });

  const activeApplications = applications.filter((app) => app.status !== 'withdrawn');
  const totalPages = Math.ceil(total / pageSize);

  if (activeApplications.length === 0) {
    return (
      <StaggerReveal stagger={0.06} delay={0.05}>
        <StaggerChild>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
              <FileText className="size-6 text-muted-foreground/60" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-1">
              No applications yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              When you apply to a job, your applications will appear here.
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href={`/c/${collegeSlug}/student/jobs`}>
                Browse jobs
              </Link>
            </Button>
          </div>
        </StaggerChild>
      </StaggerReveal>
    );
  }

  return (
    <StaggerReveal stagger={0.06} delay={0.05} className="space-y-6">
      <StaggerChild>
        <p className="text-sm text-muted-foreground">
          Showing {activeApplications.length} of {activeApplications.length} {activeApplications.length === 1 ? 'application' : 'applications'}
        </p>
      </StaggerChild>

      <StaggerChild>
        <MyApplicationsTable
          applications={activeApplications}
          collegeSlug={collegeSlug}
        />
      </StaggerChild>

      {totalPages > 1 && (
        <StaggerChild>
          <nav className="flex items-center justify-center gap-1.5 pt-2" aria-label="Pagination">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/c/${collegeSlug}/student/my-applications?page=${page - 1}`} aria-label="Previous page">
                  <ChevronLeft className="size-4 mr-1" />
                  Previous
                </Link>
              </Button>
            )}

            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="px-1 text-muted-foreground/50 text-sm">...</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'ghost'}
                      size="sm"
                      className="size-8 p-0 text-sm"
                      asChild
                    >
                      <Link href={`/c/${collegeSlug}/student/my-applications?page=${p}`}>
                        {p}
                      </Link>
                    </Button>
                  )
                )}
            </div>

            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/c/${collegeSlug}/student/my-applications?page=${page + 1}`} aria-label="Next page">
                  Next
                  <ChevronRight className="size-4 ml-1" />
                </Link>
              </Button>
            )}
          </nav>
        </StaggerChild>
      )}
    </StaggerReveal>
  );
}

function ApplicationsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/40 overflow-hidden bg-card/30">
        <div className="h-10 bg-muted/10 border-b border-border/40 animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-border/40 animate-pulse flex items-center justify-between px-4">
            <Skeleton className="h-4 w-1/4 animate-pulse" />
            <Skeleton className="h-4 w-1/6 animate-pulse" />
            <Skeleton className="h-4 w-12 animate-pulse" />
            <Skeleton className="h-4 w-12 animate-pulse" />
            <Skeleton className="h-4 w-20 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
