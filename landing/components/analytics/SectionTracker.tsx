'use client';

import { useSectionVisibility } from '@/hooks/useSectionVisibility';

interface SectionTrackerProps {
  sectionName: string;
  pageName?: string;
  children: React.ReactNode;
  enabled?: boolean;
}

export function SectionTracker({
  sectionName,
  pageName,
  children,
  enabled = true,
}: SectionTrackerProps) {
  const setRef = useSectionVisibility({ sectionName, pageName, enabled });
  return <div ref={setRef}>{children}</div>;
}
