'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  ACTIVITY_SECTION_LINKS,
  resolveActiveActivitySection,
} from '@/lib/college-admin/activity/activity-section-links';

export function ActivitySectionNav({ adminBasePath }: { adminBasePath: string }) {
  const pathname = usePathname();
  const activeSection = resolveActiveActivitySection(pathname, adminBasePath);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4 mb-6">
      <nav
        className="flex flex-wrap gap-1 justify-start sm:justify-end"
        aria-label="Activity analytics sections"
      >
        {ACTIVITY_SECTION_LINKS.map((link) => {
          const href = `${adminBasePath}${link.path}`;
          const active = link.id === activeSection;

          return (
            <Link
              key={link.id}
              href={href}
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
