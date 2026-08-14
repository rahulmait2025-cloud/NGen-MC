'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
    const themeCtx = useTheme();
    const mounted = React.useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    );

    const isDark = mounted ? themeCtx.theme === 'dark' : false;

    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn(
                'size-9 rounded-full transition-[background-color,color,transform] duration-160 hover:bg-primary/10 hover:text-primary active:scale-95',
                className
            )}
            disabled={!mounted}
            onClick={() => themeCtx.setTheme(isDark ? 'light' : 'dark')}
        >
            <Sun className={`size-4 transition-transform duration-200 ${!mounted || isDark ? '' : 'hidden'}`} />
            <Moon className={`size-4 transition-transform duration-200 ${mounted && !isDark ? '' : 'hidden'}`} />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
