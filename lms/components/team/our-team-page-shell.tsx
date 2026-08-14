'use client';

import type { ReactNode } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ExploreStyleShell } from '@/app/c/[collegeSlug]/student/(authenticated)/home/_components/explore-style-shell';

export function OurTeamPageShell({
  collegeSlug,
  children,
}: {
  collegeSlug: string;
  children: ReactNode;
}) {
  return (
    <TooltipProvider>
      <ExploreStyleShell collegeSlug={collegeSlug}>{children}</ExploreStyleShell>
    </TooltipProvider>
  );
}
