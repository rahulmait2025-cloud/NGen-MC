'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const message = error?.message ?? error?.digest ?? 'Unknown error';
    console.error('[error]', message);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 rounded-xl border border-border bg-muted/20 p-8">
      <p className="text-sm font-medium text-destructive">Something went wrong loading this section.</p>
      <p className="text-xs text-muted-foreground">This might be a temporary issue. Try again, or check your connection if it persists.</p>
      <Button variant="outline" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
