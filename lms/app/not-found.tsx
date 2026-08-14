import Link from 'next/link';
import { BookOpen, Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="relative">
        <div className="flex size-24 items-center justify-center rounded-3xl bg-primary/5 border border-primary/10">
          <BookOpen className="size-12 text-primary" />
        </div>
        <div className="absolute -top-2 -right-2 size-10 rounded-full bg-background border border-border shadow-sm flex items-center justify-center">
          <Search className="size-5 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-3 max-w-md">
        <h1 className="text-4xl font-semibold tracking-tight">Page Not Found</h1>
        <p className="text-muted-foreground leading-relaxed">
          We couldn&apos;t find the learning resource you&apos;re looking for. It may have been moved or the URL might be incorrect.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild variant="outline" className="gap-2 rounded-2xl h-12">
          <Link href="/">
            <Home data-icon="inline-start" className="size-4" />
            Go Home
          </Link>
        </Button>
        <Button asChild className="gap-2 rounded-2xl h-12 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/10">
          <Link href="/c/direct-learners/student">
            <BookOpen data-icon="inline-start" className="size-4" />
            Browse Courses
          </Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground/60 pt-4">
        If you believe this is an error, please contact support.
      </p>
    </div>
  );
}
