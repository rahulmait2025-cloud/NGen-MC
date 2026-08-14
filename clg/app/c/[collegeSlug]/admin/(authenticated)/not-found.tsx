'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthenticatedNotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 p-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-muted/30 border border-border">
        <Search className="size-10 text-muted-foreground/40" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Page Not Found</h1>
        <p className="text-muted-foreground text-sm">
          The admin page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
      </div>

      <div className="flex gap-3">
        <Button asChild variant="outline" className="gap-2">
          <Link href="./">
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
        </Button>
        <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
          Go Back
        </Button>
      </div>
    </div>
  );
}
