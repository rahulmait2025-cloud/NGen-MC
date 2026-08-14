'use client';

import { useState } from 'react';
import { Settings, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaidMentorshipAvailability } from './paid-mentorship-availability';
import { PaidMentorshipCategories } from './paid-mentorship-categories';
import { PaidMentorshipPricing } from './paid-mentorship-pricing';
import { PaidMentorshipBookingsTable } from './paid-mentorship-bookings-table';

const SUB_TABS = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'bookings', label: 'Bookings', icon: CalendarCheck },
] as const;

type SubTab = (typeof SUB_TABS)[number]['id'];

export function PaidMentorshipTab() {
  const [activeTab, setActiveTab] = useState<SubTab>('settings');

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1 w-fit">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-[background-color,color] ease-[var(--ease-out)]',
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <PaidMentorshipPricing />
          <PaidMentorshipAvailability />
          <PaidMentorshipCategories />
        </div>
      )}

      {activeTab === 'bookings' && <PaidMentorshipBookingsTable />}
    </div>
  );
}
