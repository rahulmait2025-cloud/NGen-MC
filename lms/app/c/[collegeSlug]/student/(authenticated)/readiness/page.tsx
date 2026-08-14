import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * Readiness page — feature not yet implemented.
 * Shows a placeholder instead of silently rendering blank.
 */
export default function ReadinessPage(): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <ShieldCheck className="size-8 text-primary/60" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">Readiness Coming Soon</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        Your placement readiness score and recommendations will appear here once enabled.
      </p>
    </div>
  );
}
