import { Bot, Home, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { Button } from '@/components/ui/button';

export default async function TenantNotFound() {
  const headerStore = await headers();
  const collegeSlug = headerStore.get('x-route-college-slug');
  const studentHomeHref = collegeSlug
    ? `/c/${encodeURIComponent(collegeSlug)}/student`
    : '/c/direct-learners/student';

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-6 text-foreground">
      <div className="mx-auto flex max-w-md flex-col items-center justify-center text-center gap-8">
        <div className="relative">
          <div className="flex size-24 items-center justify-center rounded-3xl bg-primary/5 border border-primary/10 shadow-sm relative z-10">
            <Bot className="size-12 text-primary" />
          </div>
          <div className="absolute -top-2 -right-2 size-8 rounded-full bg-background border border-border shadow-sm flex items-center justify-center z-20">
            <AlertCircle className="size-4 text-destructive" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight font-heading">Resource Not Found</h1>
          <p className="text-muted-foreground font-medium leading-relaxed">
            We couldn&apos;t find the page or resource you were looking for. This might be because the URL is incorrect, the content is no longer available, or you don&apos;t have permission to view it.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <Button asChild variant="outline" className="rounded-2xl h-14 border-border hover:bg-muted font-bold">
            <Link href={studentHomeHref}>
              <Home className="size-4 mr-2" />
              Student Portal
            </Link>
          </Button>
          <Button
            asChild
            className="rounded-2xl h-14 bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/10 text-primary-foreground"
          >
            <Link href={`${studentHomeHref}/paid-courses`}>Browse Courses</Link>
          </Button>
        </div>

        <div className="pt-8 border-t border-border w-full">
          <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
