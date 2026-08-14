'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/analytics/track';
import { useScrollDepth } from '@/hooks/useScrollDepth';

/**
 * Fires a page_view event on every client-side route change.
 * Mounted once in layout.tsx — no props needed.
 */
export function AnalyticsInit() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useScrollDepth();

  useEffect(() => {
    // Skip the very first render — the GA4 config already sent the initial
    // page_view via send_page_view:false + our manual call below.
    // Actually, since send_page_view is false, we need to send it ourselves.
    // We'll fire on every pathname change including the first.

    // Small delay to let gtag.js finish loading on first render
    const delay = isFirstRender.current ? 500 : 0;
    isFirstRender.current = false;

    const timer = setTimeout(() => {
      const title = typeof document !== 'undefined' ? document.title : '';
      trackPageView(pathname, title);
    }, delay);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
