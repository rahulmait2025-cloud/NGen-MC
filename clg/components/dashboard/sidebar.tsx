"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  getModuleRegistry,
  type ModuleId,
} from "@/lib/modules/module-registry";
import { useTenant } from "@/providers/tenant-provider";
import type { MasterCoursePillarsRow } from "@/types/database";

const EMPTY_PILLARS: MasterCoursePillarsRow[] = [];

import {
  LayoutDashboard,
  Layers,
  GraduationCap,
  BookOpen,
  BookOpenCheck,
  Activity,
  Video,
  ClipboardCheck,
} from "lucide-react";

interface NavItemDef {
  moduleId: ModuleId;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navGroups: { title: string; items: NavItemDef[] }[] = [
  {
    title: "Overview",
    items: [
      { moduleId: "dashboard", label: "Dashboard", sub: "Ops overview & KPIs", icon: LayoutDashboard },
    ],
  },
  {
    title: "Content",
    items: [
      { moduleId: "content_assignments", label: "Assigned Courses", sub: "Curriculum from SuperAdmin", icon: Layers },
    ],
  },
  {
    title: "Students",
    items: [
      { moduleId: "students", label: "My Students", sub: "Roster & cohort monitoring", icon: GraduationCap },
    ],
  },
  {
    title: "Sessions",
    items: [
      { moduleId: "mentorship_sessions", label: "Mentorship Sessions", sub: "Scheduled meets & history", icon: Video },
    ],
  },
  {
    title: "Reports",
    items: [
      { moduleId: "analytics", label: "Analytics", sub: "Performance & trends", icon: Activity },
      { moduleId: "activity", label: "Activity", sub: "Logs & video analytics", icon: Activity },
      { moduleId: "quizzes", label: "Quizzes", sub: "Quiz scores & analytics", icon: ClipboardCheck },
    ],
  },
  {
    title: "DSA",
    items: [
      { moduleId: "sheets", label: "Sheets", sub: "View sheet & student progress", icon: BookOpenCheck },
    ],
  },
];

const moduleRegistry = getModuleRegistry();

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function SidebarNavContent({
  assignedPillars = EMPTY_PILLARS,
}: {
  assignedPillars?: MasterCoursePillarsRow[];
}) {
  const pathname = usePathname();
  const { slug } = useTenant();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const basePath = slug ? `/c/${slug}/admin` : "";

  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <SidebarGroup className="p-0">
      <SidebarMenu className="gap-0.5" onClick={closeMobile}>
        {navGroups.map((group) => (
          <React.Fragment key={group.title}>
            {!isCollapsed && (
              <div className="flex h-6 shrink-0 items-center px-3 mb-0.5">
                <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-muted-foreground/50">
                  {group.title}
                </span>
              </div>
            )}
            {isCollapsed && (
              <div className="h-px bg-border/20 mx-2 my-1.5" />
            )}
            {group.items.map((item) => {
              const moduleDef = moduleRegistry[item.moduleId];
              if (!moduleDef) return null;

              const href = basePath ? `${basePath}${moduleDef.href}` : moduleDef.href;
              const isDashboard = item.moduleId === "dashboard";
              const isActive = isDashboard
                ? pathname === href
                : pathname === href || pathname.startsWith(href + "/");

              const Icon = item.icon;

              return (
                <SidebarMenuItem key={item.moduleId}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.label}
                    className={cn(
                      "w-full relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-[background-color,color,box-shadow] duration-200 cursor-pointer",
                      isActive
                        ? "bg-primary/10 text-primary font-medium shadow-sm shadow-primary/5"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                      isCollapsed && !isMobile && "justify-center px-0 size-10 mx-auto"
                    )}
                  >
                    <Link href={href}>
                      <div
                        className={cn(
                          "size-5 rounded-md flex items-center justify-center shrink-0 transition-[transform] duration-200",
                          isActive ? "text-primary scale-110" : "text-sidebar-foreground/60"
                        )}
                      >
                        <Icon className="size-[18px]" />
                      </div>
                      <span className={cn("text-[13px] font-medium truncate", isCollapsed && !isMobile && "hidden")}>
                        {item.label}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
            {group.title === "Overview" && assignedPillars.length > 0 && (
              <>
                {!isCollapsed && (
                  <div className="flex h-6 shrink-0 items-center px-3 mb-0.5 mt-1">
                    <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-muted-foreground/50">
                      Pillars
                    </span>
                  </div>
                )}
                {isCollapsed && (
                  <div className="h-px bg-border/20 mx-2 my-1.5" />
                )}
                {assignedPillars.map((pillar) => {
                  const href = basePath ? `${basePath}/pillars/${pillar.id}` : `/pillars/${pillar.id}`;
                  const isActive = pathname === href || pathname.startsWith(href + "/");

                  return (
                    <SidebarMenuItem key={pillar.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={pillar.title}
                        className={cn(
                          "w-full relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-[background-color,color,box-shadow] duration-200 cursor-pointer",
                          isActive
                            ? "bg-primary/10 text-primary font-medium shadow-sm shadow-primary/5"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                          isCollapsed && !isMobile && "justify-center px-0 size-10 mx-auto"
                        )}
                      >
                        <Link href={href}>
                          <div
                            className={cn(
                              "size-5 rounded-md flex items-center justify-center shrink-0 transition-[transform] duration-200",
                              isActive ? "text-primary scale-110" : "text-sidebar-foreground/60"
                            )}
                          >
                            <BookOpen className="size-[18px]" />
                          </div>
                          <span className={cn("text-[13px] font-medium truncate", isCollapsed && !isMobile && "hidden")}>
                            {pillar.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </>
            )}
          </React.Fragment>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function SidebarNav({ className, assignedPillars = EMPTY_PILLARS }: { className?: string; assignedPillars?: MasterCoursePillarsRow[] }) {
  const { branding } = useTenant();
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <ShadcnSidebar
      variant="floating"
      collapsible="icon"
      className={cn("floating-nav border-0 transition-[width] duration-200 p-2", className)}
    >
      <SidebarHeader className={cn(
        "border-b border-border/20 pb-3 transition-[padding] duration-200",
        isCollapsed ? "px-1 pt-1" : "px-2 pt-2"
      )}>
        <div className={cn(
          "flex items-center gap-2.5 transition-[opacity] duration-200",
          isCollapsed && !isMobile ? "justify-center gap-0" : "px-1"
        )}>
          <div className="size-9 rounded-xl flex items-center justify-center shrink-0 bg-primary text-primary-foreground font-bold text-[15px] shadow-sm">
            {getInitials(branding.name)}
          </div>
          <div className={cn(
            "transition-[opacity] duration-200",
            isCollapsed && !isMobile ? "opacity-0 w-0 overflow-hidden flex-none" : "min-w-0 flex-1 opacity-100"
          )}>
            <div className="font-semibold text-[13px] leading-tight tracking-tight truncate">{branding.name}</div>
            <div className="text-[10px] text-muted-foreground font-medium">College Admin</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className={cn(
        "py-2 scrollbar-hide",
        isCollapsed ? "px-1" : "px-1.5"
      )}>
        <SidebarNavContent assignedPillars={assignedPillars} />
      </SidebarContent>

      <SidebarFooter className={cn(
        "border-t border-border/20 pt-3 transition-[padding] duration-200",
        isCollapsed ? "px-1 pb-1" : "px-2 pb-2"
      )}>
        {isCollapsed && !isMobile ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative mx-auto cursor-pointer">
                <div className="size-9 rounded-full bg-primary/10 border border-border/30 flex items-center justify-center text-xs font-semibold text-primary">
                  {getInitials(branding.name)}
                </div>
                <div className="absolute -bottom-[1px] -right-[1px] size-[8px] bg-emerald-500 rounded-full border-2 border-background" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" align="center">
              <p className="text-xs font-medium">{branding.name}</p>
              <p className="text-[10px] text-muted-foreground">College Admin</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            <div className="relative shrink-0">
              <div className="size-9 rounded-full bg-primary/10 border border-border/30 flex items-center justify-center text-xs font-semibold text-primary">
                {getInitials(branding.name)}
              </div>
              <div className="absolute -bottom-[1px] -right-[1px] size-[8px] bg-emerald-500 rounded-full border-2 border-background" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate">{branding.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">College Admin</div>
            </div>
          </div>
        )}
      </SidebarFooter>

      <SidebarRail />
    </ShadcnSidebar>
  );
}

export function MobileSidebar({
  assignedPillars = EMPTY_PILLARS,
}: {
  assignedPillars?: MasterCoursePillarsRow[];
}) {
  const { branding } = useTenant();
  const { openMobile, setOpenMobile } = useSidebar();

  return (
    <Sheet open={openMobile} onOpenChange={setOpenMobile}>
      <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
          <div className="border-b border-sidebar-border py-4 px-5 flex items-center gap-3 shrink-0">
            <div className="size-9 rounded-xl flex items-center justify-center shrink-0 bg-primary text-primary-foreground font-bold text-[15px] shadow-sm">
              {getInitials(branding.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[13px] leading-tight truncate">{branding.name}</div>
              <div className="text-[10px] text-muted-foreground font-medium">College Admin</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-1.5">
            <SidebarNavContent assignedPillars={assignedPillars} />
          </div>
          <div className="border-t border-sidebar-border px-5 py-[14px] flex items-center gap-2.5 shrink-0">
            <div className="relative shrink-0">
              <div className="size-9 rounded-full bg-primary/10 border border-border/30 flex items-center justify-center text-xs font-semibold text-primary">
                {getInitials(branding.name)}
              </div>
              <div className="absolute -bottom-[1px] -right-[1px] size-[8px] bg-emerald-500 rounded-full border-2 border-background" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate">{branding.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">College Admin</div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Sidebar({ className, assignedPillars = EMPTY_PILLARS }: { className?: string; assignedPillars?: MasterCoursePillarsRow[] }) {
  return <SidebarNav className={className} assignedPillars={assignedPillars} />;
}

export default Sidebar;
