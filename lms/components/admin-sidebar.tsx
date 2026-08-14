"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  BookOpen,
  Settings,
  Video,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

const WORD_SPLIT_RE = /\s+/;

function getInitials(name: string): string {
  const parts = name.trim().split(WORD_SPLIT_RE);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function AdminSidebar({
  collegeSlug,
  tenantName,
}: {
  collegeSlug: string;
  tenantName?: string;
}) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const navItems = useMemo(
    () => [
      {
        name: "Dashboard",
        href: `/c/${collegeSlug}/admin/dashboard`,
        icon: LayoutDashboard,
      },
      {
        name: "Video Analytics",
        href: `/c/${collegeSlug}/admin/dashboard`,
        icon: Video,
      },
      {
        name: "Students",
        href: `/c/${collegeSlug}/admin/students`,
        icon: Users,
      },
      {
        name: "Courses",
        href: `/c/${collegeSlug}/admin/courses`,
        icon: BookOpen,
      },
      {
        name: "Settings",
        href: `/c/${collegeSlug}/admin/settings`,
        icon: Settings,
      },
    ],
    [collegeSlug],
  );

  const activeStates = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const item of navItems) {
      map.set(item.name, pathname === item.href || pathname.startsWith(item.href + "/"));
    }
    return map;
  }, [navItems, pathname]);

  return (
    <ShadcnSidebar
      collapsible="icon"
      className="[&_[data-slot=sidebar-inner]]:bg-transparent"
    >
      <SidebarHeader className="border-b border-sidebar-border py-4 px-3">
        <div className={cn("flex items-center gap-3 px-2", isCollapsed && "justify-center px-0")}>
          <div className="size-[34px] rounded-lg flex items-center justify-center shrink-0 bg-primary text-primary-foreground font-bold text-[15px] shadow-lg shadow-primary/25">
            {tenantName ? tenantName.charAt(0) : "C"}
          </div>
          <div className={cn("min-w-0 flex-1 transition-opacity duration-200", isCollapsed && "opacity-0 hidden")}>
            <div className="font-semibold text-sm leading-tight truncate text-sidebar-foreground/90">
              {tenantName || "College Admin"}
            </div>
            <div className="text-[11px] text-sidebar-foreground/40 truncate mt-[1px] tracking-wide">
              Admin Portal
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 sm:px-3 py-1.5 sm:py-2 scrollbar-hide">
        <SidebarGroup className="p-0">
          {!isCollapsed && (
            <SidebarGroupLabel className="flex h-6 shrink-0 items-center px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/40">
              Overview
            </SidebarGroupLabel>
          )}
          <SidebarMenu className="gap-0.5">
            {navItems.map((item) => {
              const active = activeStates.get(item.name) ?? false;
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={item.name}
                    className={cn(
                      "w-full relative flex items-center gap-2.5 rounded-lg px-3 py-2 transition-[background-color,color] duration-150 cursor-pointer",
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                      isCollapsed && "justify-center px-0"
                    )}
                  >
                    <Link href={item.href} prefetch={false}>
                      <div
                        className={cn(
                          "size-5 rounded flex items-center justify-center shrink-0",
                          active ? "text-primary" : "text-sidebar-foreground/60"
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <span className={cn("text-sm font-medium truncate", active && "text-primary", isCollapsed && "hidden")}>
                        {item.name}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn("border-t border-sidebar-border px-4 py-[14px] transition-[padding] duration-200", isCollapsed && "p-2 flex flex-col items-center justify-center")}>
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 w-full">
            <div className="relative shrink-0">
              <div className="size-[30px] rounded-full bg-sidebar-accent border border-sidebar-border flex items-center justify-center text-xs font-semibold text-sidebar-foreground/90">
                {getInitials(tenantName || "CA")}
              </div>
              <div className="absolute -bottom-[1px] -right-[1px] size-[8px] bg-success rounded-full border-2 border-sidebar" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-sidebar-foreground/90 truncate">{tenantName || "Admin"}</div>
              <div className="text-[10px] text-sidebar-foreground/40 truncate">College Admin</div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="size-[30px] rounded-full bg-sidebar-accent border border-sidebar-border flex items-center justify-center text-xs font-semibold text-sidebar-foreground/90">
              {getInitials(tenantName || "CA")}
            </div>
            <div className="absolute -bottom-[1px] -right-[1px] size-[8px] bg-success rounded-full border-2 border-sidebar" />
          </div>
        )}
      </SidebarFooter>

      <SidebarRail />
    </ShadcnSidebar>
  );
}