'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Mail, FileText, Send, History, Settings } from 'lucide-react';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', href: '/email-center', icon: Mail },
  { id: 'campaigns', label: 'Campaigns', href: '/email-center/campaigns', icon: Send },
  { id: 'templates', label: 'Templates', href: '/email-center/templates', icon: FileText },
  { id: 'compose', label: 'Compose', href: '/email-center/compose', icon: FileText },
  { id: 'history', label: 'Send History', href: '/email-center/history', icon: History },
  { id: 'settings', label: 'Settings', href: '/email-center/settings', icon: Settings },
];

export function EmailCenterShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Mail className="size-4" />
        <span>Email Center</span>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border pb-px">
        {tabs.map((tab) => {
          const isActive =
            tab.id === 'dashboard'
              ? pathname === '/email-center'
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div>{children}</div>
    </div>
  );
}