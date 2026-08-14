'use client';

import { useRef, useCallback } from 'react';
import { trackSectionView, trackSectionEngaged } from '@/lib/analytics/track';

const ENGAGEMENT_DELAY_MS = 3000;

export interface UseSectionVisibilityOptions {
  sectionName: string;
  pageName?: string;
  enabled?: boolean;
}

export function useSectionVisibility({
  sectionName,
  pageName,
  enabled = true,
}: UseSectionVisibilityOptions): (node: HTMLElement | null) => void {
  const viewSent = useRef(false);
  const engagedSent = useRef(false);
  const engagementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (engagementTimer.current) {
        clearTimeout(engagementTimer.current);
        engagementTimer.current = null;
      }
      viewSent.current = false;
      engagedSent.current = false;

      if (!node || !enabled) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (!entry?.isIntersecting) return;

          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
          const referrer = typeof document !== 'undefined' ? document.referrer : '';
          const params = { section_name: sectionName, page_name: pageName, current_path: currentPath, referrer };

          if (!viewSent.current) {
            viewSent.current = true;
            trackSectionView(params);
          }

          if (!engagedSent.current && engagementTimer.current === null) {
            engagementTimer.current = setTimeout(() => {
              engagedSent.current = true;
              engagementTimer.current = null;
              trackSectionEngaged(params);
            }, ENGAGEMENT_DELAY_MS);
          }
        },
        { threshold: 0.5, rootMargin: '0px' },
      );

      observerRef.current = observer;
      observer.observe(node);
    },
    [sectionName, pageName, enabled],
  );

  return setRef;
}
