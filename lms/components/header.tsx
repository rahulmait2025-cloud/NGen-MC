'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenant } from '@/providers/tenant-provider';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useStudentAuth } from '@/providers/student-auth-provider';
import { lmsPageMeta, getLmsPageIdFromPath } from '@/data/page-meta';
import { useHeaderTitle } from '@/contexts/header-title';
import { UserProfileDropdown } from '@/components/user-profile-dropdown';

export function Header({
  sidebarOpen: _sidebarOpen = true,
  onSidebarToggle: _onSidebarToggle,
  hideControls = false,
  hideSidebarTrigger = false,
  backHref = '',
}: {
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
  hideControls?: boolean;
  hideSidebarTrigger?: boolean;
  backHref?: string;
}) {
  const { slug } = useTenant();
  const pathname = usePathname();
  const pageId = useMemo(() => getLmsPageIdFromPath(pathname), [pathname]);
  const meta = useMemo(
    () => lmsPageMeta[pageId] ?? { title: 'Student Portal', subtitle: '' },
    [pageId],
  );
  const user = useStudentAuth();
  const { title: customTitle } = useHeaderTitle();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const displayTitle = mounted ? (customTitle || meta.title) : meta.title;
  const displaySubtitle = mounted ? (!customTitle && meta.subtitle) : meta.subtitle;

  const studentDashboardPath = slug ? `/c/${slug}/student/dashboard` : '/dashboard';

  return (
    <header suppressHydrationWarning className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/40 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/40 px-4 lg:px-8">
      {!hideControls ? (
        <div className="flex items-center gap-3 min-w-0 flex-1 lg:flex-none lg:min-w-[200px]">
          {hideSidebarTrigger ? (
            <Button
              variant="ghost"
              asChild
              className="gap-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors duration-160 group"
            >
              <Link href={studentDashboardPath} prefetch={false}>
                <LayoutDashboard className="size-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline font-semibold text-sm">Dashboard</span>
              </Link>
            </Button>
          ) : (
            <SidebarTrigger className="shrink-0" />
          )}
          {/* Page title in header bar */}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold tracking-tight text-foreground leading-none truncate">
              {displayTitle}
            </span>
            {displaySubtitle && (
              <span className="text-xs text-muted-foreground truncate font-medium mt-0.5 hidden sm:inline">
                {displaySubtitle}
              </span>
            )}
          </div>
        </div>
      ) : backHref ? (
        <Button
          variant="ghost"
          asChild
          className="gap-2 -ml-2 text-muted-foreground hover:text-primary transition-colors duration-160 group"
        >
          <Link href={backHref} prefetch={false}>
            <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline font-semibold">Back to course</span>
          </Link>
        </Button>
      ) : null}

      <div className="flex items-center gap-0.5 ml-auto bg-muted p-1 rounded-2xl">
        <ThemeToggle className="rounded-xl size-8 text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-[background-color,color,transform] duration-160 active:scale-95" />

        <div className="h-4 w-px bg-border/30 mx-0.5" />

        <UserProfileDropdown user={user} collegeSlug={slug} triggerVariant="default" />
      </div>
    </header>
  );
}
