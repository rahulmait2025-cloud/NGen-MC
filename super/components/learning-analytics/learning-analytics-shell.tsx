import type { ReactNode } from 'react';

/** Constrains learning analytics pages to the main column width (no horizontal bleed). */
export function LearningAnalyticsShell({ children }: { children: ReactNode }) {
  return <div className="w-full min-w-0 max-w-full overflow-x-hidden">{children}</div>;
}
