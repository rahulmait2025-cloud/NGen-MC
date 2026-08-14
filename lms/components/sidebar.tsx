'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenant } from '@/providers/tenant-provider';
import { cn } from '@/lib/utils';
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import Image from 'next/image';
import {
  buildAppSidebarNavGroups,
  isStudentNavItemActive,
} from '@/lib/student/student-navigation';
import { normalizeStudentPathname } from '@/lib/student/student-home-route';
import { isDirectLearnerCollegeSlug } from '@/lib/tenant/direct-learner-slug';

const SIDEBAR_NAV_LABEL = 'Student navigation';
const WORD_SPLIT_RE = /\s+/;

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '??';

  const parts = trimmed.split(WORD_SPLIT_RE).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? '';
    const last = parts[parts.length - 1]?.[0] ?? '';
    const initials = `${first}${last}`.toUpperCase();
    return initials || '??';
  }

  const chars = [...trimmed];
  return chars.slice(0, 2).join('').toUpperCase() || '??';
}

function SidebarContentUnified({
  tenantName,
  isAmbassador = false,
}: {
  tenantName?: string;
  visiblePillars?: unknown;
  isGlobal?: boolean;
  studentName?: string;
  isAmbassador?: boolean;
}) {
  const pathname = normalizeStudentPathname(usePathname());
  const { branding, slug } = useTenant();
  const { state, isMobile, setOpenMobile, isHoverExpanded } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const collegeSlug = slug ?? '';

  const navGroups = useMemo(
    () => (collegeSlug ? buildAppSidebarNavGroups(collegeSlug, isAmbassador) : []),
    [collegeSlug, isAmbassador],
  );

  const activeStates = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const group of navGroups) {
      for (const item of group.items) {
        map.set(item.id, collegeSlug ? isStudentNavItemActive(pathname, item, collegeSlug) : false);
      }
    }
    return map;
  }, [navGroups, pathname, collegeSlug]);

  const displayTenantName = tenantName?.trim() || branding.name?.trim() || 'College';
  const isDirectLearner =
    isDirectLearnerCollegeSlug(collegeSlug) ||
    displayTenantName.toLowerCase().includes('direct-learner');
  const hasNavigation = navGroups.length > 0;

  // Icon rail on desktop/tablet; hover-expand and mobile sheet show full labels.
  const iconOnly = isCollapsed && !isMobile && !isHoverExpanded;

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <ShadcnSidebar
      variant="sidebar"
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar overflow-hidden"
    >
      <SidebarHeader className="gap-0 border-b border-sidebar-border px-4 py-3 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2.5">
        <div
          className={cn(
            'flex w-full min-w-0 items-center gap-2.5 overflow-hidden',
            iconOnly && 'justify-center gap-0',
          )}
        >
          {isDirectLearner ? (
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 dark:bg-zinc-800 border border-slate-700/50 p-1.5 shadow-2xs group-data-[collapsible=icon]:size-8"
              title="NextGen CTO"
            >
              <Image
                src="/assets/logo-icon.png"
                alt="NextGen CTO"
                width={26}
                height={26}
                className="size-6 object-contain"
              />
            </div>
          ) : (
            <div
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:text-xs"
              title={displayTenantName}
            >
              {getInitials(displayTenantName)}
            </div>
          )}
          <div
            className={cn(
              'sidebar-brand-copy min-w-0 flex-1 overflow-hidden',
              iconOnly && 'hidden',
            )}
            aria-hidden={iconOnly || undefined}
          >
            <div
              className="truncate text-sm font-bold leading-tight text-sidebar-foreground"
              title={isDirectLearner ? 'NextGen CTO' : displayTenantName}
            >
              {isDirectLearner ? 'NextGen CTO' : displayTenantName}
            </div>
            <div className="truncate text-xs font-semibold text-sidebar-foreground/80">
              {isDirectLearner ? 'Student Portal' : 'NextGen CTO'}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 overflow-y-auto overscroll-contain scroll-py-2 px-2 py-1 pb-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:px-1.5">
        <nav aria-label={SIDEBAR_NAV_LABEL}>
          {!hasNavigation ? (
            <p className={cn('px-2 py-3 text-sm text-sidebar-foreground/80', iconOnly && 'sr-only')}>
              Navigation unavailable.
            </p>
          ) : (
            navGroups.map((group, groupIndex) => (
              <React.Fragment key={group.title}>
                {groupIndex > 0 && iconOnly && (
                  <div
                    aria-hidden="true"
                    className="mx-auto my-1.5 h-px w-7 bg-sidebar-border/70"
                  />
                )}
                <SidebarGroup className={cn('p-0', groupIndex > 0 && !iconOnly && 'mt-3')}>
                  <SidebarGroupLabel
                    className={cn(
                      'h-7 px-2 text-base font-bold uppercase tracking-[0.08em] text-[var(--sidebar-section)]',
                      groupIndex === 0 && 'mt-1',
                      iconOnly && 'hidden',
                    )}
                  >
                    {group.title}
                  </SidebarGroupLabel>
                  <SidebarGroupContent className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                    <SidebarMenu className="gap-0 group-data-[collapsible=icon]:items-center">
                      {group.items.map((item) => {
                        const isActive = activeStates.get(item.id) ?? false;
                        const Icon = item.icon;

                        return (
                          <SidebarMenuItem
                            key={item.id}
                            className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
                          >
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={item.label}
                              className={cn(
                                'h-9 min-w-0 rounded-lg px-2.5 font-bold transition-[background-color,transform,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                                'focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
                                'group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:p-0',
                                'active:scale-[0.97] motion-reduce:active:scale-100',
                                'min-h-11 touch-manipulation md:min-h-9',
                                isActive
                                  ? 'bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground'
                                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                              )}
                            >
                              <Link
                                href={item.href}
                                prefetch={false}
                                aria-current={isActive ? 'page' : undefined}
                                aria-label={iconOnly ? item.label : undefined}
                                title={item.label}
                                onClick={handleNavClick}
                                className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                              >
                                <Icon
                                  aria-hidden="true"
                                  className={cn(
                                    'size-[18px]! shrink-0 transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                                    isActive ? 'text-primary' : 'text-sidebar-foreground',
                                  )}
                                  strokeWidth={isActive ? 2.75 : 2.35}
                                />
                                <span
                                  className={cn(
                                    'sidebar-nav-label min-w-0 overflow-hidden text-sm font-bold whitespace-nowrap',
                                    'text-sidebar-foreground',
                                    iconOnly && 'hidden',
                                  )}
                                >
                                  {item.label}
                                </span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </React.Fragment>
            ))
          )}
        </nav>
      </SidebarContent>

      <SidebarRail />
    </ShadcnSidebar>
  );
}

const EMPTY_VISIBLE_PILLARS: unknown[] = [];

export function Sidebar({
  tenantName,
  visiblePillars: _visiblePillars = EMPTY_VISIBLE_PILLARS,
  isGlobal: _isGlobal = false,
  studentName: _studentName,
  isAmbassador = false,
}: {
  tenantName?: string;
  visiblePillars?: unknown;
  isGlobal?: boolean;
  studentName?: string;
  isAmbassador?: boolean;
}) {
  return (
    <SidebarContentUnified
      tenantName={tenantName}
      isAmbassador={isAmbassador}
    />
  );
}
