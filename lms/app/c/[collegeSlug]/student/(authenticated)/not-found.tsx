import Link from 'next/link';
import { headers } from 'next/headers';
import { BookOpen, Search, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function StudentNotFound() {
  const headerStore = await headers();
  const collegeSlug = headerStore.get('x-route-college-slug');
  const studentHomeHref = collegeSlug
    ? `/c/${encodeURIComponent(collegeSlug)}/student`
    : '/c/direct-learners/student';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 p-6 text-center">
      <div className="relative">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10">
          <Search className="size-10 text-primary" />
        </div>
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Page Not Found</h1>
        <p className="text-muted-foreground text-sm">
          The learning resource you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild variant="outline" className="gap-2 rounded-2xl">
          <Link href={studentHomeHref}>
            <Home className="size-4" />
            Explore Home
          </Link>
        </Button>
        <Button asChild className="gap-2 rounded-2xl bg-primary hover:bg-primary/90">
          <Link href={`${studentHomeHref}/paid-courses`}>
            <BookOpen className="size-4" />
            Browse Courses
          </Link>
        </Button>
      </div>
    </div>
  );
}
