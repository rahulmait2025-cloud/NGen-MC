'use client';

import React, { useEffect, useContext, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthGateContext } from '@/components/auth/auth-gate-provider';
import { useStudentAuth } from '@/providers/student-auth-provider';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu';
import {
  normalizeStudentPathname,
  studentBasePath,
  studentDashboardHref,
} from '@/lib/student/student-home-route';
import { ExploreMenuButton } from './explore-menu-button';
import { NextGenLogo } from './nextgen-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserProfileDropdown } from '@/components/user-profile-dropdown';

interface StudentLandingNavbarCta {
  label: string;
  onClick: () => void;
}

interface StudentLandingNavbarProps {
  collegeSlug: string;
  showMenuButton?: boolean;
  cta?: StudentLandingNavbarCta | null;
}

export type { StudentLandingNavbarCta };

export function LandingNavbarSpacer() {
  return <div className="h-16 w-full shrink-0" aria-hidden />;
}

const ListItem = React.forwardRef<
  React.ElementRef<'a'>,
  React.ComponentPropsWithoutRef<'a'> & {
    title: string;
  }
>(({ className, title, children, href, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          ref={ref}
          href={href || '#'}
          className={`group block select-none space-y-1 rounded-xl p-3 leading-none no-underline outline-none transition-colors hover:bg-accent/80 hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground ${className || ''}`}
          {...props}
        >
          <div className="text-sm font-bold leading-none text-foreground group-hover:text-primary transition-colors">
            {title}
          </div>
          {children && (
            <p className="line-clamp-2 text-xs leading-snug text-muted-foreground font-normal mt-1">
              {children}
            </p>
          )}
        </Link>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = 'ListItem';

export function StudentLandingNavbar({
  collegeSlug,
  showMenuButton = true,
  cta = null,
}: StudentLandingNavbarProps) {
  const pathname = normalizeStudentPathname(usePathname());
  const user = useStudentAuth();
  const _authGate = useContext(AuthGateContext);
  const base = studentBasePath(collegeSlug);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const scrollContainer = document.querySelector('.landing-shell') as HTMLElement | null;

    const readScrollY = () =>
      scrollContainer ? scrollContainer.scrollTop : (window.scrollY || document.documentElement.scrollTop);

    const handleScroll = () => {
      const scrollY = readScrollY();
      setScrolled(scrollY > 15);
    };

    const target: HTMLElement | Window = scrollContainer ?? window;
    target.addEventListener('scroll', handleScroll as EventListener, { passive: true });
    handleScroll();

    return () => target.removeEventListener('scroll', handleScroll as EventListener);
  }, []);

  const coursesHref = `${base}/courses`;
  const sheetsHref = `${base}/sheets`;

  const dashboardHref = studentDashboardHref(collegeSlug);
  const jobsHref = `${base}/jobs`;
  const exploreHref = base;

  const isExploreActive = pathname === exploreHref;
  const isCoursesActive =
    pathname.includes('/courses') ||
    pathname.includes('/my-courses') ||
    pathname.includes('/free-courses') ||
    pathname.includes('/paid-courses');
  const isDashboardActive =
    pathname.includes('/dashboard') ||
    pathname.includes('/progress') ||
    pathname.includes('/analytics');
  const isPracticeActive =
    pathname.includes('/sheets') ||
    pathname.includes('/stats') ||
    pathname.includes('/assessments') ||
    pathname.includes('/notes');
  const isJobsActive =
    pathname.includes('/jobs') ||
    pathname.includes('/my-applications') ||
    pathname.includes('/mentorship');

  const activePillClasses =
    'bg-[#FFF0EB] text-[#1F1F1F] dark:bg-orange-950/40 dark:text-orange-100 shadow-xs font-bold';
  const inactivePillClasses =
    'text-[var(--landing-fg)]/70 hover:text-[var(--landing-fg)] hover:bg-primary/5 font-semibold';

  return (
    <div className="fixed inset-x-0 top-3 z-50 px-4 sm:px-6 lg:px-8 pointer-events-none">
      <header
        className={`mx-auto max-w-7xl w-full rounded-2xl sm:rounded-full transition-all duration-300 pointer-events-auto ${
          scrolled
            ? 'bg-[var(--landing-surface)]/92 backdrop-blur-xl border border-[var(--landing-border)]/70 shadow-xl py-2.5 px-4 sm:px-6'
            : 'bg-[var(--landing-surface)]/70 backdrop-blur-md border border-[var(--landing-border)]/35 shadow-sm py-3 px-4 sm:px-6'
        }`}
      >
        <nav className="flex items-center justify-between w-full">
          {/* Logo & Mobile Menu */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {showMenuButton ? <div className="lg:hidden"><ExploreMenuButton /></div> : null}
            <NextGenLogo href={base} size="sm" className="min-w-0" />
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden min-w-0 flex-1 items-center justify-center md:flex">
            <NavigationMenu>
              <NavigationMenuList className="gap-1.5">
                {/* 1. Explore */}
                <NavigationMenuItem>
                  <Link
                    href={exploreHref}
                    className={`inline-flex items-center justify-center px-4 py-2 rounded-full text-sm transition-colors ${
                      isExploreActive ? activePillClasses : inactivePillClasses
                    }`}
                  >
                    Explore
                  </Link>
                </NavigationMenuItem>

                {/* 2. Courses Dropdown */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    className={`inline-flex items-center justify-center px-4 py-2 h-9 rounded-full text-sm transition-colors bg-transparent hover:bg-primary/5 focus:bg-primary/5 data-[state=open]:bg-primary/10 ${
                      isCoursesActive ? activePillClasses : inactivePillClasses
                    }`}
                  >
                    Courses
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="p-2 bg-popover/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-xl">
                    <ul className="flex flex-col gap-1 w-[320px] sm:w-[360px] p-1">
                      <ListItem title="All Courses" href={coursesHref}>
                        Explore our complete course catalog & learning modules.
                      </ListItem>
                      <ListItem title="My Courses" href={`${base}/my-courses`}>
                        Access your active enrolled courses & learning.
                      </ListItem>
                      <ListItem title="Free Courses" href={`${base}/free-courses`}>
                        Free tutorials & open access learning tracks.
                      </ListItem>
                      <ListItem title="Paid Courses" href={`${base}/paid-courses`}>
                        Explore premium & structured course offerings.
                      </ListItem>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* 3. Dashboard (Direct Link - NO Dropdown) */}
                <NavigationMenuItem>
                  <Link
                    href={dashboardHref}
                    className={`inline-flex items-center justify-center px-4 py-2 rounded-full text-sm transition-colors ${
                      isDashboardActive ? activePillClasses : inactivePillClasses
                    }`}
                  >
                    Dashboard
                  </Link>
                </NavigationMenuItem>

                {/* 4. Practice Dropdown */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    className={`inline-flex items-center justify-center px-4 py-2 h-9 rounded-full text-sm transition-colors bg-transparent hover:bg-primary/5 focus:bg-primary/5 data-[state=open]:bg-primary/10 ${
                      isPracticeActive ? activePillClasses : inactivePillClasses
                    }`}
                  >
                    Practice
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="p-2 bg-popover/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-xl">
                    <ul className="flex flex-col gap-1 w-[320px] sm:w-[360px] p-1">
                      <ListItem title="DSA Sheets" href={sheetsHref}>
                        Track your DSA progress with structured sheets.
                      </ListItem>
                      <ListItem title="Code Pulse" href={`${base}/stats`}>
                        Coding streaks, git activity & heatmaps.
                      </ListItem>
                      <ListItem title="Assessments" href={`${base}/assessments`}>
                        Quizzes, mock tests & skill evaluations.
                      </ListItem>
                      <ListItem title="Notes" href={`${base}/notes`}>
                        Handwritten notes & study resources.
                      </ListItem>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* 5. Jobs Dropdown */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    className={`inline-flex items-center justify-center px-4 py-2 h-9 rounded-full text-sm transition-colors bg-transparent hover:bg-primary/5 focus:bg-primary/5 data-[state=open]:bg-primary/10 ${
                      isJobsActive ? activePillClasses : inactivePillClasses
                    }`}
                  >
                    Jobs
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="p-2 bg-popover/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-xl">
                    <ul className="flex flex-col gap-1 w-[320px] sm:w-[360px] p-1">
                      <ListItem title="Jobs & Internships" href={jobsHref}>
                        Explore active placement openings & job roles.
                      </ListItem>
                      <ListItem title="My Applications" href={`${base}/my-applications`}>
                        Track your submitted applications & status.
                      </ListItem>
                      <ListItem title="Mentorship" href={`${base}/mentorship`}>
                        Connect with industry experts & mentors.
                      </ListItem>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Right Actions */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle className="size-9 rounded-xl text-primary hover:bg-[color-mix(in_oklab,var(--landing-orange)_12%,transparent)]" />

            {cta ? (
              <Button
                size="sm"
                className="h-9 rounded-full px-5 text-sm font-semibold text-white shadow-[0_0_20px_color-mix(in_oklab,var(--landing-orange)_45%,transparent)]"
                style={{ backgroundColor: 'var(--landing-orange)' }}
                onClick={cta.onClick}
              >
                {cta.label}
              </Button>
            ) : null}

            {user ? (
              <UserProfileDropdown user={user} collegeSlug={collegeSlug} triggerVariant="landing" />
            ) : (
              <Button
                asChild
                size="sm"
                className="h-9 rounded-full px-5 text-sm font-semibold text-white shadow-[0_0_20px_color-mix(in_oklab,var(--landing-orange)_45%,transparent)] transition-all duration-200"
                style={{ backgroundColor: 'var(--landing-orange)' }}
              >
                <Link href="/login">
                  Sign In
                </Link>
              </Button>
            )}
          </div>
        </nav>
      </header>
    </div>
  );
}


