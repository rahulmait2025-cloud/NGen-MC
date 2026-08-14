'use client';

import React from 'react';
import Link from 'next/link';
import {
  User,
  TrendingUp,
  Code2,
  ClipboardList,
  StickyNote,
  CreditCard,
  LogOut,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitials } from '@/lib/utils/get-initials';
import { logout } from '@/lib/auth/logout';
import { studentBasePath } from '@/lib/student/student-home-route';

export interface UserProfileDropdownProps {
  user: {
    id?: string;
    fullName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  collegeSlug?: string | null;
  triggerVariant?: 'default' | 'landing';
}

export function UserProfileDropdown({
  user,
  collegeSlug,
  triggerVariant = 'default',
}: UserProfileDropdownProps) {
  const [landingMenuOpen, setLandingMenuOpen] = React.useState(false);
  const landingCloseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const slugStr = collegeSlug || '';
  const base = slugStr ? studentBasePath(slugStr) : '';
  const profileHref = base ? `${base}/profile` : '/profile';
  const statsHref = base ? `${base}/stats` : '/stats';
  const sheetsHref = base ? `${base}/sheets` : '/sheets';
  const applicationsHref = base ? `${base}/my-applications` : '/my-applications';
  const notesHref = base ? `${base}/notes` : '/notes';
  const paymentsHref = base ? `${base}/payment-history` : '/payment-history';
  const loginHref = '/login';

  const isLanding = triggerVariant === 'landing';

  React.useEffect(() => {
    return () => {
      if (landingCloseTimer.current) {
        clearTimeout(landingCloseTimer.current);
      }
    };
  }, []);

  function openLandingMenu() {
    if (!isLanding) return;

    if (landingCloseTimer.current) {
      clearTimeout(landingCloseTimer.current);
      landingCloseTimer.current = null;
    }

    setLandingMenuOpen(true);
  }

  function scheduleLandingMenuClose() {
    if (!isLanding) return;

    if (landingCloseTimer.current) {
      clearTimeout(landingCloseTimer.current);
    }

    landingCloseTimer.current = setTimeout(() => {
      setLandingMenuOpen(false);
    }, 120);
  }

  return (
    <DropdownMenu
      open={isLanding ? landingMenuOpen : undefined}
      onOpenChange={isLanding ? setLandingMenuOpen : undefined}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') openLandingMenu();
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') scheduleLandingMenuClose();
          }}
          className={
            isLanding
              ? 'h-9 gap-2 rounded-xl border border-transparent pl-1 pr-2 hover:border-[var(--landing-border)] hover:bg-[color-mix(in_oklab,var(--landing-surface)_90%,var(--landing-orange)_10%)] cursor-pointer'
              : 'rounded-xl h-8 hover:bg-primary/10 pl-1 pr-2.5 gap-2 transition-[background-color,transform] duration-160 active:scale-95 focus-visible:ring-0 cursor-pointer'
          }
        >
          <Avatar className={isLanding ? 'size-8 border border-[var(--landing-border)] ring-2 ring-primary/15' : 'size-7 ring-2 ring-primary/20'}>
            {user?.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.fullName || 'User'} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">
              {user ? getInitials(user.fullName ?? null, user.email ?? null) : '?'}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-semibold text-foreground hidden lg:inline max-w-[7rem] truncate">
            {user?.fullName?.split(' ')[0] || 'Student'}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') openLandingMenu();
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') scheduleLandingMenuClose();
        }}
        className={`w-64 rounded-2xl border border-border/60 bg-popover/98 p-2 text-popover-foreground shadow-2xl backdrop-blur-2xl z-[100] ${isLanding ? 'landing-profile-dropdown' : ''}`}
      >
        {/* User Identity Header */}
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="size-9 border border-border/60 shadow-xs shrink-0 ring-2 ring-primary/15">
            {user?.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.fullName || 'User'} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
              {user ? getInitials(user.fullName ?? null, user.email ?? null) : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5 min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">
              {user?.fullName || 'Student'}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user?.email || ''}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator className="my-1.5 bg-border/50" />

        {/* Non-redundant Personal Quick Actions */}
        <div className="space-y-0.5">
          <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer text-foreground/80 hover:text-[var(--landing-orange)] focus:text-[var(--landing-orange)] focus:bg-[color-mix(in_oklab,var(--landing-orange)_10%,transparent)] hover:bg-[color-mix(in_oklab,var(--landing-orange)_10%,transparent)] transition-colors">
            <Link href={profileHref} className="group flex items-center gap-2.5 w-full">
              <User className="size-4 text-muted-foreground group-hover:text-[var(--landing-orange)] group-focus:text-[var(--landing-orange)] transition-colors" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer text-foreground/80 hover:text-[var(--landing-orange)] focus:text-[var(--landing-orange)] focus:bg-[color-mix(in_oklab,var(--landing-orange)_10%,transparent)] hover:bg-[color-mix(in_oklab,var(--landing-orange)_10%,transparent)] transition-colors">
            <Link href={statsHref} className="group flex items-center gap-2.5 w-full">
              <TrendingUp className="size-4 text-muted-foreground group-hover:text-[var(--landing-orange)] group-focus:text-[var(--landing-orange)] transition-colors" />
              <span>Coding Stats</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer text-foreground/80 hover:text-[var(--landing-orange)] focus:text-[var(--landing-orange)] focus:bg-[color-mix(in_oklab,var(--landing-orange)_10%,transparent)] hover:bg-[color-mix(in_oklab,var(--landing-orange)_10%,transparent)] transition-colors">
            <Link href={sheetsHref} className="group flex items-center gap-2.5 w-full">
              <Code2 className="size-4 text-muted-foreground group-hover:text-[var(--landing-orange)] group-focus:text-[var(--landing-orange)] transition-colors" />
              <span>DSA Sheets</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer text-foreground/80 hover:text-[var(--landing-orange)] focus:text-[var(--landing-orange)] focus:bg-[color-mix(in_oklab,var(--landing-orange)_10%,transparent)] hover:bg-[color-mix(in_oklab,var(--landing-orange)_10%,transparent)] transition-colors">
            <Link href={applicationsHref} className="group flex items-center gap-2.5 w-full">
              <ClipboardList className="size-4 text-muted-foreground group-hover:text-[var(--landing-orange)] group-focus:text-[var(--landing-orange)] transition-colors" />
              <span>Job Applications</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer text-foreground/80 hover:text-[var(--landing-orange)] focus:text-[var(--landing-orange)] focus:bg-[color-mix(in_oklab,var(--landing-orange)_10%,transparent)] hover:bg-[color-mix(in_oklab,var(--landing-orange)_10%,transparent)] transition-colors">
            <Link href={notesHref} className="group flex items-center gap-2.5 w-full">
              <StickyNote className="size-4 text-muted-foreground group-hover:text-[var(--landing-orange)] group-focus:text-[var(--landing-orange)] transition-colors" />
              <span>My Notes</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer text-foreground/80 hover:text-[var(--landing-orange)] focus:text-[var(--landing-orange)] focus:bg-[color-mix(in_oklab,var(--landing-orange)_10%,transparent)] hover:bg-[color-mix(in_oklab,var(--landing-orange)_10%,transparent)] transition-colors">
            <Link href={paymentsHref} className="group flex items-center gap-2.5 w-full">
              <CreditCard className="size-4 text-muted-foreground group-hover:text-[var(--landing-orange)] group-focus:text-[var(--landing-orange)] transition-colors" />
              <span>Billing & Payments</span>
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="my-1.5 bg-border/50" />

        {/* Account Actions */}
        <DropdownMenuItem
          variant="destructive"
          onClick={async () => await logout(loginHref)}
          className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer"
        >
          <LogOut className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
