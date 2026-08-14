'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="relative">
        <div className="flex size-24 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20">
          <GraduationCap className="size-12 text-primary" />
        </div>
        <div className="absolute -top-2 -right-2 size-10 rounded-full bg-background border border-border shadow-sm flex items-center justify-center">
          <span className="text-lg font-bold text-muted-foreground">?</span>
        </div>
      </div>

      <div className="space-y-3 max-w-md">
        <h1 className="text-4xl font-semibold tracking-tight">Page Not Found</h1>
        <p className="text-muted-foreground leading-relaxed">
          We couldn&apos;t find the page you&apos;re looking for. It may have been moved, deleted, or the URL might be incorrect.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild variant="outline" className="gap-2">
          <Link href="/">
            <Home className="size-4" />
            Go Home
          </Link>
        </Button>
        <Button className="gap-2" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
          Go Back
        </Button>
      </div>

      <p className="text-xs text-muted-foreground/60 pt-4">
        If you believe this is an error, please contact your administrator.
      </p>
    </div>
  );
}
