'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[error]', error.message || error.digest || 'Unknown error');
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] glass-card rounded-xl border border-destructive/20 p-8 text-center max-w-2xl mx-auto mt-8">
      <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <AlertCircle className="size-8 text-destructive" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-3">
        Something went wrong!
      </h2>
      <p className="text-muted-foreground mb-8 text-sm">
        We encountered an issue loading the dashboard. Please try to refresh.
        <br />
        If the problem persists, contact support.
      </p>
      <div className="flex gap-4">
         <Button onClick={() => reset()} className="gap-2 rounded-full">
            <RefreshCcw className="size-4" />
            Try again
         </Button>
      </div>
    </div>
  );
}
