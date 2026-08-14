'use client';

import { type ReactNode, type RefObject, useRef, useEffect, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { isStudentBundleLandingRoute } from '@/lib/student/student-home-route';
import { cn } from '@/lib/utils';
import { ExploreNavProvider } from './explore-nav-context';
import { ExploreIconSidebar } from './explore-icon-sidebar';
import { LandingNavbarSpacer, StudentLandingNavbar } from './student-landing-navbar';
import type { StudentLandingNavbarCta } from './student-landing-navbar';
import { ReactLenis, useLenis } from 'lenis/react';
import type { LenisRef } from 'lenis/react';
import 'lenis/dist/lenis.css';

interface ExploreStyleShellProps {
  collegeSlug: string;
  children: ReactNode;
  /**
   * Footer to render at the bottom of the shell.
   * Must be provided by a Server Component caller (e.g. a layout or page) because
   * the footer is a server-only async component. Client-only callers omit this prop.
   */
  footer?: ReactNode;
  navbarCta?: StudentLandingNavbarCta | null;
  shellClassName?: string;
}

/**
 * Layout-level wrapper for all explore-style routes.
 *
 * Renders the persistent chrome (top navbar + landing-shell wrapper + footer)
 * ONCE at the layout level so it never unmounts during client-side navigation between
 * explore pages.
 */
export function ExploreStyleShell({
  collegeSlug,
  children,
  footer,
  navbarCta = null,
  shellClassName,
}: ExploreStyleShellProps) {
  const pathname = usePathname();
  const isBundleLanding = isStudentBundleLandingRoute(pathname);

  const lenisRef = useRef<LenisRef>(null);

  // Reset scroll to top on path transitions within the explore shell
  useEffect(() => {
    if (lenisRef.current?.lenis) {
      lenisRef.current.lenis.scrollTo(0, { immediate: true });
    }
  }, [pathname]);

  return (
    <ExploreNavProvider>
      <ReactLenis
        ref={lenisRef}
        root="asChild"
        options={{
          autoRaf: false,
          anchors: true,
          allowNestedScroll: true,
          lerp: 0.1,
        }}
        className={cn(
          'landing-shell relative isolate h-[100dvh] w-full max-w-none overflow-x-clip overflow-y-auto flex flex-col',
          shellClassName,
          isBundleLanding && 'bundle-landing-shell',
        )}
      >
        <LandingLenisGsapSync lenisRef={lenisRef} />
        <StudentLandingNavbar
          collegeSlug={collegeSlug}
          showMenuButton={true}
          cta={navbarCta}
        />
        <ExploreIconSidebar collegeSlug={collegeSlug} />
        <div className="flex min-h-full flex-col">
          <LandingNavbarSpacer />
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          {footer && <Suspense>{footer}</Suspense>}
        </div>
      </ReactLenis>
    </ExploreNavProvider>
  );
}

function LandingLenisGsapSync({ lenisRef }: { lenisRef: RefObject<LenisRef | null> }) {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    let active = true;
    let cleanup = () => {};

    Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]).then(([gsapModule, scrollTriggerModule]) => {
      if (!active) return;

      const { gsap } = gsapModule;
      const { ScrollTrigger } = scrollTriggerModule;
      const wrapper = lenisRef.current?.wrapper;

      if (!wrapper) return;

      gsap.registerPlugin(ScrollTrigger);

      let refreshFrame: number | null = null;
      const refresh = () => {
        if (refreshFrame != null) cancelAnimationFrame(refreshFrame);
        refreshFrame = requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          refreshFrame = null;
        });
      };

      const resizeObserver = new ResizeObserver(refresh);
      resizeObserver.observe(wrapper);
      if (lenisRef.current?.content) {
        resizeObserver.observe(lenisRef.current.content);
      }

      const update = (time: number) => {
        lenis.raf(time * 1000);
      };

      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(update);
      gsap.ticker.lagSmoothing(0);
      ScrollTrigger.refresh();

      cleanup = () => {
        if (refreshFrame != null) cancelAnimationFrame(refreshFrame);
        resizeObserver.disconnect();
        lenis.off('scroll', ScrollTrigger.update);
        gsap.ticker.remove(update);
      };
    }).catch((err) => {
      console.error('Failed to sync Lenis with ScrollTrigger:', err);
    });

    return () => {
      active = false;
      cleanup();
    };
  }, [lenis, lenisRef]);

  return null;
}
