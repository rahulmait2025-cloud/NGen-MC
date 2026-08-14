'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { navigation, getPathFromPageId, type NavItem } from '@/data/navigation';
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
const DockItem = React.memo(function DockItem({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { isMobile } = useSidebar();
  const Icon = item.icon;
  const href = getPathFromPageId(item.id);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current || !collapsed || isMobile) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distX = (e.clientX - centerX) * 0.08;
    const distY = (e.clientY - centerY) * 0.08;
    ref.current.style.transform = `translate(${distX}px, ${distY}px) scale(1.08)`;
  }, [collapsed, isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = 'translate(0, 0) scale(1)';
  }, []);

  const button = (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      tooltip={item.label}
      className={cn(
        'w-full relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-[background-color,color,box-shadow] duration-200 cursor-pointer',
        isActive
          ? 'bg-primary/10 text-primary font-medium shadow-sm shadow-primary/5'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
        collapsed && !isMobile && 'justify-center px-0 size-10 mx-auto'
      )}
    >
      <Link href={href} prefetch={false}>
        <div
          className={cn(
            'size-5 rounded-md flex items-center justify-center shrink-0 transition-[color,transform] duration-200 ease-out',
            isActive
              ? 'text-primary scale-110'
              : 'text-sidebar-foreground/60'
          )}
        >
          <Icon className="size-[18px]" strokeWidth={isActive ? 2 : 1.5} />
        </div>
        <span className={cn('text-[13px] font-medium truncate', collapsed && !isMobile && 'hidden')}>
          {item.label}
        </span>
      </Link>
    </SidebarMenuButton>
  );

  return (
    <SidebarMenuItem>
      <div
        ref={ref}
        className={cn(
          'relative transition-transform duration-200 ease-out',
          collapsed && !isMobile && 'dock-item'
        )}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {button}
        {isActive && !collapsed && (
          <m.span
            layoutId="sidebar-active-indicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary"
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            aria-hidden
          />
        )}
      </div>
    </SidebarMenuItem>
  );
});

export function Sidebar() {
  const sidebarCtx = useSidebar();
  const { setOpenMobile, isMobile } = sidebarCtx;
  const pathname = usePathname();
  const collapsed = isMobile ? false : sidebarCtx.state === 'collapsed';

  useEffect(() => {
    if (isMobile && sidebarCtx.openMobile) {
      setOpenMobile(false);
    }
  }, [pathname, setOpenMobile, isMobile, sidebarCtx.openMobile]);

  return (
    <ShadcnSidebar
      variant="floating"
      collapsible="icon"
      className="floating-nav border-0 transition-[width,padding] duration-300 ease-out p-2"
    >
      <SidebarHeader className={cn(
        'border-b border-border/20 pb-3 transition-[padding] duration-200',
        collapsed ? 'px-1 pt-1' : 'px-2 pt-2'
      )}>
        <div className={cn(
          'flex items-center gap-2.5 transition-[padding,justify-content,gap] duration-200 ease-out',
          collapsed ? 'justify-center gap-0' : 'px-1'
        )}>
          <div className={cn(
            'rounded-xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden bg-zinc-900 border border-border/30 transition-[background-color,border-color] duration-200 ease-out',
            'size-9'
          )}>
            <Image src="/assets/brand-logo.png" alt="NG" width={36} height={36} loading="eager" priority className="w-full h-full object-contain p-1.5" />
          </div>
          <div className={cn(
            'transition-[opacity,width] duration-200 ease-out',
            collapsed ? 'opacity-0 w-0 overflow-hidden flex-none' : 'min-w-0 flex-1 opacity-100'
          )}>
            <div className="font-semibold text-[13px] leading-tight tracking-tight">NextGen CTO</div>
            <div className="text-[10px] text-muted-foreground font-medium">Super Admin</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className={cn(
        'py-2 scrollbar-hide',
        collapsed ? 'px-1' : 'px-1.5'
      )}>
        <LazyMotion features={domAnimation} strict>
          {navigation.map((group) => {
            return (
              <SidebarGroup key={group.title} className="mb-1 p-0">
                {!collapsed && (
                  <div className="flex h-6 shrink-0 items-center px-3 mb-0.5">
                    <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-muted-foreground/50">
                      {group.title}
                    </span>
                  </div>
                )}
                {collapsed && (
                  <div className="h-px bg-border/20 mx-2 my-1.5" />
                )}
                <SidebarMenu className="gap-0.5">
                  {group.items.map((item) => {
                    const isDashboard = item.id === 'dashboard';
                    const href = getPathFromPageId(item.id);
                    const isActive = isDashboard
                      ? pathname === href
                      : (pathname === href || pathname.startsWith(href + '/'));

                    return (
                      <DockItem
                        key={item.id}
                        item={item}
                        isActive={isActive}
                        collapsed={collapsed}
                      />
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            );
          })}
        </LazyMotion>
      </SidebarContent>

      <SidebarFooter className={cn(
        'border-t border-border/20 pt-3 transition-[padding] duration-200',
        collapsed ? 'px-1 pb-1' : 'px-2 pb-2'
      )}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative mx-auto cursor-pointer">
                <div className="size-9 rounded-full bg-primary/10 border border-border/30 flex items-center justify-center text-xs font-semibold text-primary">
                  SA
                </div>
                <div className="absolute -bottom-[1px] -right-[1px] size-[8px] bg-emerald-500 rounded-full border-2 border-background" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" align="center">
              <p className="text-xs font-medium">Super Admin</p>
              <p className="text-[10px] text-muted-foreground">Platform Administrator</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            <div className="relative shrink-0">
              <div className="size-9 rounded-full bg-primary/10 border border-border/30 flex items-center justify-center text-xs font-semibold text-primary">
                SA
              </div>
              <div className="absolute -bottom-[1px] -right-[1px] size-[8px] bg-emerald-500 rounded-full border-2 border-background" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate">Super Admin</div>
              <div className="text-[10px] text-muted-foreground truncate">Platform Administrator</div>
            </div>
          </div>
        )}
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
