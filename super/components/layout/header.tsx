'use client';

import React, { useSyncExternalStore, useRef, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { pageMeta } from '@/data/page-meta';
import { getPageIdFromPath } from '@/data/navigation';
import { LogOut, User, Settings } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { logout } from '@/lib/auth/logout';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { cn } from '@/lib/utils';

export function Header() {
    const pathname = usePathname();
    const pageId = getPageIdFromPath(pathname);
    const meta = pageMeta[pageId] ?? { title: 'Super Admin', subtitle: '' };
    const barRef = useRef<HTMLElement>(null);
    const [scrolled, setScrolled] = useState(false);

    const mounted = useSyncExternalStore(
        () => () => { },
        () => true,
        () => false,
    );

    useEffect(() => {
        const onScroll = () => {
            setScrolled(window.scrollY > 8);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const profileTrigger = (
        <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-full hover:bg-primary/10 px-2 gap-1.5 transition-[background-color,transform] duration-160 ease-out active:scale-95"
        >
            <Avatar className="size-6 ring-1.5 ring-primary/25">
                <AvatarFallback className="bg-gradient-to-br from-primary/25 to-primary/10 text-primary text-[10px] font-bold">SA</AvatarFallback>
            </Avatar>
        </Button>
    );

    return (
        <>
            <header
                ref={barRef}
                className={cn(
                    'floating-bar sticky top-3 z-50 rounded-2xl px-3 py-2 mb-6 transition-[box-shadow] duration-200 ease-out',
                    scrolled && 'shadow-lg shadow-black/5 dark:shadow-black/20'
                )}
            >
                <div className="flex items-center justify-between gap-2">
                    {/* Left: Sidebar trigger + Page info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <SidebarTrigger className="shrink-0 size-8 rounded-xl hover:bg-primary/10 transition-[background-color,transform] duration-160 ease-out active:scale-95" />
                        <div className="h-5 w-px bg-border/30" />
                        <div className="min-w-0">
                            <h1 className="text-sm font-semibold tracking-tight leading-none truncate">
                                {meta.title}
                            </h1>
                            {meta.subtitle && (
                                <p className="text-[10px] text-muted-foreground font-medium truncate mt-0.5">
                                    {meta.subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right: Utilities */}
                    <div className="flex items-center gap-1 shrink-0">
                        <ThemeToggle />
                        <div className="h-5 w-px bg-border/20 mx-0.5" />
                        {mounted ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    {profileTrigger}
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-48 floating-nav rounded-xl border-border/20"
                                >
                                    <DropdownMenuItem className="gap-2 rounded-lg text-xs">
                                        <User className="size-3.5 text-primary" />
                                        Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 rounded-lg text-xs">
                                        <Settings className="size-3.5 text-primary" />
                                        Settings
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-border/20" />
                                    <form action={logout}>
                                        <DropdownMenuItem asChild>
                                            <button type="submit" className="w-full text-destructive focus:text-destructive gap-2 text-xs">
                                                <LogOut className="size-3.5" />
                                                Log out
                                            </button>
                                        </DropdownMenuItem>
                                    </form>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            profileTrigger
                        )}
                    </div>
                </div>
            </header>

            {/* Breadcrumbs below the floating bar */}
            <div className="px-1 mb-4 -mt-3">
                <Breadcrumbs />
            </div>
        </>
    );
}
