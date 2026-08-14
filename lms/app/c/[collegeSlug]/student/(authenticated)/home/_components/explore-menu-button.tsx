'use client';

import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export function ExploreMenuButton() {
  const { toggleSidebar, openMobile } = useSidebar();

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'size-9 shrink-0 rounded-xl border border-transparent landing-muted',
            'hover:border-primary/35 hover:bg-[color-mix(in_oklab,var(--landing-orange)_12%,var(--landing-surface))] hover:text-primary',
            openMobile && 'border-primary/40 bg-primary/10 text-primary',
          )}
          aria-label={openMobile ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={openMobile}
          aria-controls="explore-landing-nav"
          onClick={toggleSidebar}
        >
          {openMobile ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="landing-theme-portal text-xs font-semibold">
        {openMobile ? 'Close menu' : 'Open navigation menu'}
      </TooltipContent>
    </Tooltip>
  );
}
