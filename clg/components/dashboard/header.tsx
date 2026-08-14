'use client';

import React, { useRef, useCallback, useSyncExternalStore } from 'react';
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings } from "lucide-react";
import { logout } from "@/lib/auth/logout";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

import { usePathname } from "next/navigation";
import { pageMeta, getPageIdFromPath } from "@/data/page-meta";

import { ThemeToggle } from '../theme-toggle';

export function Header() {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const pageId = getPageIdFromPath(pathname);
  const meta = pageMeta[pageId] ?? { title: 'College Admin', subtitle: '' };
  const avatarRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleAvatarEnter = useCallback(() => {
    if (prefersReducedMotion) return;
    import('gsap').then(({ gsap }) => {
      gsap.to(avatarRef.current, { scale: 1.03, duration: 0.2, ease: 'power1.out', transformOrigin: '50% 50%' });
    });
  }, [prefersReducedMotion]);

  const handleAvatarLeave = useCallback(() => {
    if (prefersReducedMotion) return;
    import('gsap').then(({ gsap }) => {
      gsap.to(avatarRef.current, { scale: 1, duration: 0.2, ease: 'power1.out', transformOrigin: '50% 50%' });
    });
  }, [prefersReducedMotion]);

  const handleAvatarDown = useCallback(() => {
    if (prefersReducedMotion) return;
    import('gsap').then(({ gsap }) => {
      gsap.to(avatarRef.current, { scale: 0.96, duration: 0.1, ease: 'power1.out', transformOrigin: '50% 50%' });
    });
  }, [prefersReducedMotion]);

  const handleAvatarUp = useCallback(() => {
    if (prefersReducedMotion) return;
    import('gsap').then(({ gsap }) => {
      gsap.to(avatarRef.current, { scale: 1, duration: 0.2, ease: 'back.out(1.4)', transformOrigin: '50% 50%' });
    });
  }, [prefersReducedMotion]);

  return (
    <div className="flex h-full w-full items-center justify-between min-w-0">
      <div className="flex items-center gap-4 sm:gap-6 min-w-0">
        <div className="flex flex-col min-w-0">
          <span className="text-sm sm:text-lg font-semibold tracking-tight text-foreground leading-none truncate">
            {meta.title}
          </span>
          {meta.subtitle && (
            <span className="text-xs text-muted-foreground truncate font-medium mt-0.5">
              {meta.subtitle}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 card-tier-1 rounded-2xl p-1">
          <ThemeToggle />
          <Separator orientation="vertical" className="h-4 bg-border/30 mx-0.5" />
          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  ref={avatarRef}
                  type="button"
                  onMouseEnter={handleAvatarEnter}
                  onMouseLeave={handleAvatarLeave}
                  onMouseDown={handleAvatarDown}
                  onMouseUp={handleAvatarUp}
                  className="h-8 rounded-xl hover:bg-primary/10 pl-1 pr-2.5 gap-2 transition-[background-color] duration-160 ease-[var(--ease-out)] flex items-center"
                >
                  <Avatar className="size-7 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      CA
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-semibold text-foreground hidden lg:inline">Admin</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 card-tier-1 rounded-xl border-border/30">
                <DropdownMenuItem className="gap-2 rounded-lg">
                  <User className="size-4 text-primary" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 rounded-lg">
                  <Settings className="size-4 text-primary" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/30" />
                <DropdownMenuItem
                  onClick={() => logout('/admin/login')}
                  className="text-destructive focus:text-destructive gap-2 rounded-lg"
                >
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              type="button"
              className="h-8 rounded-xl hover:bg-primary/10 pl-1 pr-2.5 gap-2 flex items-center"
              aria-hidden
              tabIndex={-1}
            >
              <Avatar className="size-7 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  CA
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-semibold text-foreground hidden lg:inline">Admin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
