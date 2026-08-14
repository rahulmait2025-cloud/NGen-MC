'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AuditError({
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
    <div className="flex flex-col items-center justify-center min-h-[240px] gap-4 rounded-xl border border-border bg-muted/20 p-8">
      <p className="text-sm font-medium text-destructive">Something went wrong loading audit logs.</p>
      <Button variant="outline" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
