'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/shared/page-container';

export default function StudentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center py-24 px-6">
        <div className="size-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
          <AlertTriangle className="size-7 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Failed to load students
        </h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
          {error.message || 'Something went wrong while fetching student data. Please try again.'}
        </p>
        <Button onClick={reset} variant="default" size="sm">
          <RefreshCw className="size-3.5 mr-1.5" />
          Try again
        </Button>
      </div>
    </PageContainer>
  );
}
