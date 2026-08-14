'use client';

import Link from 'next/link';
import { useContext } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { AuthGateContext } from '@/components/auth/auth-gate-provider';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  buildExploreIconNavItems,
  buildExploreMobileMenuGroups,
  isStudentNavItemActive,
} from '@/lib/student/student-navigation';
import { normalizeStudentPathname } from '@/lib/student/student-home-route';
import { useStudentAuth } from '@/providers/student-auth-provider';
import { useExploreNav } from './explore-nav-context';
import { cn } from '@/lib/utils';

interface ExploreIconSidebarProps {
  collegeSlug: string;
}

const DESKTOP_RAIL_TOP = 'top-[calc(var(--landing-announcement-h,2.75rem)+4.5rem)]';
const DESKTOP_RAIL_HEIGHT =
  'h-[calc(100dvh-var(--landing-announcement-h,2.75rem)-4.5rem)]';

function NavIconLink({
  item,
  active,
  onNavigate,
}: {
  item: ReturnType<typeof buildExploreIconNavItems>[number];
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const user = useStudentAuth();
  const authGate = useContext(AuthGateContext);
  const isProtected = !['explore', 'courses'].includes(item.id);

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
          prefetch={false}
          onClick={(event) => {
            if (!user && isProtected) {
              event.preventDefault();
              authGate?.requireAuth({ intent: item.label, returnTo: item.href });
              onNavigate?.();
              return;
            }
            onNavigate?.();
          }}
          aria-label={item.label}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex size-11 items-center justify-center rounded-xl border transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            active
              ? 'border-primary/50 bg-primary/15 text-primary'
              : 'border-[var(--landing-border)] bg-[color-mix(in_oklab,var(--landing-surface-elevated)_92%,transparent)] landing-muted hover:border-primary/40 hover:text-primary',
          )}
        >
          <Icon className="size-5" aria-hidden />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="landing-theme-portal text-xs font-semibold">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

function DesktopIconRail({
  collegeSlug,
  onClose,
}: {
  collegeSlug: string;
  onClose: () => void;
}) {
  const pathname = normalizeStudentPathname(usePathname());
  const items = buildExploreIconNavItems(collegeSlug);

  return (
    <aside
      id="explore-landing-nav"
      className={cn(
        'landing-theme-portal fixed left-3 z-40 flex w-[4.5rem] flex-col rounded-2xl border border-[var(--landing-border)]',
        'bg-[var(--landing-surface-elevated)] shadow-[0_12px_40px_color-mix(in_oklab,black_28%,transparent)]',
        DESKTOP_RAIL_TOP,
        DESKTOP_RAIL_HEIGHT,
      )}
      aria-label="Explore navigation"
    >
      <div className="flex items-center justify-center border-b border-[var(--landing-border)] py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 rounded-lg landing-muted hover:text-primary hover:bg-[color-mix(in_oklab,var(--landing-orange)_12%,var(--landing-surface))]"
          aria-label="Close navigation menu"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>
      <nav className="flex flex-1 flex-col items-center gap-2 overflow-y-auto px-2 py-3">
        {items.map((item, index) => (
          <div key={item.id} className="flex flex-col items-center gap-2">
            {index === 5 ? (
              <Separator className="my-1 w-8 bg-[var(--landing-border)]" />
            ) : null}
            <NavIconLink
              item={item}
              active={isStudentNavItemActive(pathname, item, collegeSlug)}
              onNavigate={onClose}
            />
          </div>
        ))}
      </nav>
    </aside>
  );
}

function MobileExploreSheet({
  collegeSlug,
  open,
  onOpenChange,
}: {
  collegeSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = normalizeStudentPathname(usePathname());
  const user = useStudentAuth();
  const authGate = useContext(AuthGateContext);
  const groups = buildExploreMobileMenuGroups(collegeSlug);

  const linkClass =
    'flex flex-col gap-0.5 rounded-xl px-3 py-2.5 text-sm font-semibold landing-heading transition-colors hover:bg-[color-mix(in_oklab,var(--landing-orange)_10%,var(--landing-surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="landing-theme-portal z-[100] flex w-[min(100vw,20rem)] flex-col gap-0 border-[var(--landing-border)] bg-[var(--landing-surface-elevated)] p-0 text-[var(--landing-fg)]"
      >
        <SheetHeader className="border-b border-[var(--landing-border)] px-5 py-4 text-left">
          <SheetTitle className="text-base font-semibold landing-heading">Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex max-h-[calc(100dvh-5rem)] flex-col gap-6 overflow-y-auto px-4 py-5">
          {groups.map((group) => (
            <div key={group.title} className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] landing-muted">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isStudentNavItemActive(pathname, item, collegeSlug);
                  const Icon = item.icon;
                  const isProtected = !['explore', 'courses'].includes(item.id);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        onClick={(event) => {
                          if (!user && isProtected) {
                            event.preventDefault();
                            authGate?.requireAuth({ intent: item.label, returnTo: item.href });
                          }
                          onOpenChange(false);
                        }}
                        className={cn(linkClass, active && 'bg-primary/10 text-primary')}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Icon className="size-4 shrink-0" aria-hidden />
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function ExploreIconSidebar({ collegeSlug }: ExploreIconSidebarProps) {
  const { open, setOpen } = useExploreNav();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileExploreSheet
        collegeSlug={collegeSlug}
        open={open}
        onOpenChange={setOpen}
      />
    );
  }

  const showDesktopRail = open;

  if (!open) {
    return null;
  }

  return (
    <>
      {showDesktopRail ? (
        <button
          type="button"
          className="fixed inset-0 z-[35] hidden bg-[color-mix(in_oklab,var(--landing-bg)_55%,transparent)] backdrop-blur-[2px] lg:block"
          aria-label="Close navigation menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {showDesktopRail ? (
        <DesktopIconRail collegeSlug={collegeSlug} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
