'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { isStudentExploreStyleRoute } from '@/lib/student/student-home-route';
import { ReactLenis, useLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';
import { usePathname } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function isStudentPlayerRoute(pathname: string | null): boolean {
  const path = pathname ?? '';
  return (
    /^\/c\/[^/]+\/student\/learn(?:\/|$)/.test(path) ||
    /^\/c\/[^/]+\/student\/courses\/youtube\/[^/?#]+$/.test(path) ||
    /^\/c\/[^/]+\/student\/excalidraw\/[^/?#]+$/.test(path) ||
    /^\/c\/[^/]+\/student\/sheets\/resource-frame\/[^/?#]+$/.test(path) ||
    /^\/c\/[^/]+\/student\/sheets\/problem-resource\/[^/?#]+$/.test(path)
  );
}

function GlobalLenisSync() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    let unsubscribeScroll: (() => void) | undefined;

    import('gsap/ScrollTrigger')
      .then(({ ScrollTrigger }) => {
        unsubscribeScroll = lenis.on('scroll', () => {
          ScrollTrigger.update();
        });
      })
      .catch(() => {});

    return () => {
      if (unsubscribeScroll) unsubscribeScroll();
    };
  }, [lenis]);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Suspense fallback={<ProviderFallback>{children}</ProviderFallback>}>
        <RouteAwareLenisProvider>{children}</RouteAwareLenisProvider>
      </Suspense>
    </ThemeProvider>
  );
}

function isCampusAmbassadorRoute(pathname: string | null): boolean {
  const path = pathname ?? '';
  return (
    path === '/campus-ambassador' ||
    path.startsWith('/campus-ambassador/') ||
    /\/student\/dashboard\/campus-ambassador(?:\/|$)/.test(path)
  );
}

function RouteAwareLenisProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasRouteScrollContainer =
    isStudentExploreStyleRoute(pathname) ||
    isStudentPlayerRoute(pathname) ||
    isCampusAmbassadorRoute(pathname);

  if (hasRouteScrollContainer) {
    return <ProviderFallback>{children}</ProviderFallback>;
  }

  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.5 }}>
      <GlobalLenisSync />
      {children}
      <Toaster />
    </ReactLenis>
  );
}

function ProviderFallback({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
