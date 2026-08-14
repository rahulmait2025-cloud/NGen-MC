'use client';

import { useEffect } from 'react';
import { ShieldAlert, RefreshCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global-error]', error.message || error.digest || 'Unknown error');
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="size-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="size-10 text-destructive" />
          </div>
          <div className="space-y-2 max-w-md">
            <h1 className="text-2xl font-semibold tracking-tight">System Error</h1>
            <p className="text-muted-foreground text-sm">
              An unexpected error occurred in the admin panel. Please try refreshing the page or return to the dashboard.
            </p>
          </div>
          <div className="flex gap-3">
            <button type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              <RefreshCcw className="size-4" />
              Try again
            </button>
            <button type="button"
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Home className="size-4" />
              Go to Dashboard
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
