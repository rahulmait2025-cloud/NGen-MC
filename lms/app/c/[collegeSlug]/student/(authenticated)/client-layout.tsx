'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { LastViewedProvider } from '@/contexts/last-viewed';
import { HeaderTitleProvider } from '@/contexts/header-title';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { MasterCoursePillarsRow } from '@/types/database';
import { DailyStreakTracker } from '@/components/student/daily-streak-tracker';
import { isStudentExploreStyleRoute, isStudentPaymentSuccessRoute } from '@/lib/student/student-home-route';
import { ExploreStyleShell } from './home/_components/explore-style-shell';
import { useIsMobile } from '@/hooks/use-mobile';

const EMPTY_PILLARS: MasterCoursePillarsRow[] = [];

/** Course library listing and .../courses/[courseId]. */
function isStudentCoursesRoute(pathname: string | null): boolean {
  return /^\/c\/[^/]+\/student\/courses(?:\/|$)/.test(pathname ?? '');
}

/** Full-bleed YouTube theater (no padded main chrome). */
function isStudentYouTubeWatchRoute(pathname: string | null): boolean {
  return /^\/c\/[^/]+\/student\/courses\/youtube\/[^/?#]+$/.test(pathname ?? '');
}

/** In-player learn flow: .../learn/[courseId] and nested lesson URLs. */
function isStudentLearnRoute(pathname: string | null): boolean {
  return /^\/c\/[^/]+\/student\/learn(?:\/|$)/.test(pathname ?? '');
}

/** Excalidraw canvas page. */
function isStudentExcalidrawRoute(pathname: string | null): boolean {
  return /^\/c\/[^/]+\/student\/excalidraw\/[^/?#]+$/.test(pathname ?? '');
}

function shouldCollapseSidebarForCoursePages(pathname: string | null): boolean {
  return isStudentLearnRoute(pathname) || isStudentExcalidrawRoute(pathname);
}

/** Profile page: sidebar hidden only; header and breadcrumbs stay. */
function isStudentProfileRoute(pathname: string | null): boolean {
  return /^\/c\/[^/]+\/student\/profile\/?$/.test(pathname ?? '');
}

function ScrollableMain({
    onCoursesSection,
    youtubeWatch,
    hideSidebarForLecture,
    isLearnRoute,
    children,
    isAmbassadorDashboard,
}: {
    onCoursesSection: boolean;
    youtubeWatch: boolean;
    hideSidebarForLecture: boolean;
    isLearnRoute: boolean;
    children: React.ReactNode;
    isAmbassadorDashboard: boolean;
}) {
    const mainRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    React.useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTop = 0;
        }
    }, [pathname]);

    return (
        <main
            ref={mainRef}
            className={cn(
                'flex flex-1 flex-col min-h-0',
                (youtubeWatch || isLearnRoute)
                    ? 'flex min-h-0 flex-col overflow-hidden p-0'
                    : '',
                hideSidebarForLecture
                    ? 'bg-gradient-to-b from-background via-primary/[0.035] to-muted/50 p-0 dark:via-primary/[0.06] dark:to-background'
                    : youtubeWatch
                      ? 'bg-background'
                      : ''
            )}
        >
            <div
                className={cn(
                    'flex-1',
                    (youtubeWatch || isLearnRoute) && 'flex min-h-0 flex-1 flex-col overflow-hidden',
                    !(youtubeWatch || isLearnRoute) && 'min-h-[calc(100vh-20rem)]',
                    !(youtubeWatch || isLearnRoute) && !hideSidebarForLecture
                    ? isAmbassadorDashboard
                        ? 'p-0'
                        : onCoursesSection
                            ? 'px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12'
                            : 'p-4 lg:p-6'
                    : ''
            )}>
                {children}
            </div>
        </main>
    );
}

export function AuthenticatedClientLayout({
    children,
    footer,
    tenantName,
    visiblePillars = EMPTY_PILLARS,
    isGlobal = false,
    studentName,
    isAmbassador = false,
}: {
    children: React.ReactNode;
    /** Server-rendered footer passed from the async server layout. */
    footer?: React.ReactNode;
    tenantName?: string;
    visiblePillars?: MasterCoursePillarsRow[];
    isGlobal?: boolean;
    studentName?: string;
    isAmbassador?: boolean;
}) {
    const pathname = usePathname();
    const params = useParams();
    const isExploreStyle = useMemo(() => isStudentExploreStyleRoute(pathname), [pathname]);
    const isPaymentSuccess = useMemo(() => isStudentPaymentSuccessRoute(pathname), [pathname]);
    const onCoursesSection = useMemo(() => isStudentCoursesRoute(pathname), [pathname]);
    const youtubeWatch = useMemo(() => isStudentYouTubeWatchRoute(pathname), [pathname]);
    const collapsedByPath = useMemo(() => shouldCollapseSidebarForCoursePages(pathname), [pathname]);
    const isLearnRoute = useMemo(() => isStudentLearnRoute(pathname), [pathname]);
    const isExcalidrawRoute = useMemo(() => isStudentExcalidrawRoute(pathname), [pathname]);
    const isProfilePage = useMemo(() => isStudentProfileRoute(pathname), [pathname]);
    const isAmbassadorDashboard = useMemo(() => pathname?.endsWith('/campus-ambassador') ?? false, [pathname]);
    const hideSidebarForLecture = useMemo(
      () => pathname?.includes('/student/courses/') && pathname?.includes('/lectures/'),
      [pathname],
    );
    const backHref = useMemo(
      () => hideSidebarForLecture ? (pathname ?? '').replace(/\/lectures\/[^/]+$/, '') : '',
      [hideSidebarForLecture, pathname],
    );
    const [sidebarOpen, setSidebarOpen] = useState(!collapsedByPath);
    const collegeSlug = typeof params?.collegeSlug === 'string' ? params.collegeSlug : '';

    const isMobile = useIsMobile();
    const hideSidebar =
      isPaymentSuccess ||
      isProfilePage ||
      hideSidebarForLecture ||
      (isExploreStyle && !isMobile);

    // Keep the main app sidebar collapsed on course-player routes so the lesson playlist can be used.
    React.useEffect(() => {
      if (collapsedByPath) {
        setSidebarOpen(false);
      }
    }, [collapsedByPath]);

    // Payment / enrollment confirmation: fullscreen outside dashboard chrome (no sidebar/header).
    if (isPaymentSuccess) {
      return (
        <TooltipProvider>
          <HeaderTitleProvider>
            <LastViewedProvider>
              <DailyStreakTracker />
              <div className="flex min-h-dvh w-full flex-col bg-background">
                {children}
              </div>
            </LastViewedProvider>
          </HeaderTitleProvider>
        </TooltipProvider>
      );
    }

    return (
        <TooltipProvider>
            <HeaderTitleProvider>
                <LastViewedProvider>
                    <DailyStreakTracker />
                    <SidebarProvider
                        open={sidebarOpen}
                        onOpenChange={setSidebarOpen}
                        style={{ '--sidebar-width-icon': '4rem' } as React.CSSProperties}
                    >
                        {!hideSidebar && (
                            <SidebarWithMobileClose
                                tenantName={tenantName}
                                visiblePillars={visiblePillars}
                                isGlobal={isGlobal}
                                studentName={studentName}
                                isAmbassador={isAmbassador}
                                pathname={pathname}
                            />
                        )}
                        {isExploreStyle ? (
                            <ExploreStyleShell collegeSlug={collegeSlug} footer={footer}>
                                {children}
                            </ExploreStyleShell>
                        ) : (
                            <div className={cn('flex flex-col flex-1 min-w-0', (youtubeWatch || isLearnRoute || isExcalidrawRoute) ? 'h-[100dvh] overflow-hidden' : '')}>
                                <div className="flex min-h-0 flex-1">
                                    <SidebarInset className="flex min-h-0 flex-1 min-w-0 flex-col">
                                        <div
                                            className={cn(
                                                'flex min-h-0 flex-1 flex-col',
                                                (youtubeWatch || isLearnRoute || isExcalidrawRoute) ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : '',
                                            )}
                                        >
                                            {!hideSidebarForLecture && (
                                                <Header
                                                    sidebarOpen={sidebarOpen}
                                                    onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
                                                    hideControls={hideSidebarForLecture}
                                                    hideSidebarTrigger={isProfilePage}
                                                    backHref={backHref}
                                                />
                                            )}
                                            <ScrollableMain
                                                onCoursesSection={onCoursesSection}
                                                youtubeWatch={youtubeWatch}
                                                hideSidebarForLecture={hideSidebarForLecture}
                                                isLearnRoute={isLearnRoute || isExcalidrawRoute}
                                                isAmbassadorDashboard={isAmbassadorDashboard}
                                            >
                                                {children}
                                            </ScrollableMain>
                                        </div>
                                    </SidebarInset>
                                </div>
                            </div>
                        )}
                    </SidebarProvider>
                </LastViewedProvider>
            </HeaderTitleProvider>
        </TooltipProvider>
    );
}

/** Closes the mobile sheet on navigation so the drawer never stays half-open. */
function SidebarWithMobileClose({
    tenantName,
    visiblePillars,
    isGlobal,
    studentName,
    isAmbassador,
    pathname,
}: {
    tenantName?: string;
    visiblePillars?: MasterCoursePillarsRow[];
    isGlobal?: boolean;
    studentName?: string;
    isAmbassador?: boolean;
    pathname: string | null;
}) {
    const { setOpenMobile, isMobile } = useSidebar();

    React.useEffect(() => {
        if (isMobile) {
            setOpenMobile(false);
        }
    }, [pathname, isMobile, setOpenMobile]);

    return (
        <Sidebar
            tenantName={tenantName}
            visiblePillars={visiblePillars}
            isGlobal={isGlobal}
            studentName={studentName}
            isAmbassador={isAmbassador}
        />
    );
}
