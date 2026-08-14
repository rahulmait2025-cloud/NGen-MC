'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import {
  BarChart3,
  HeartPulse,
  AlertTriangle,
  Webhook,
  Database,
  Activity,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

function TabSkeleton() {
  return (
    <div className="space-y-3 pt-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

const AnalyticsTab = dynamic(
  () => import('./analytics/analytics-client').then((m) => {
    const Component = m.TpAnalyticsClient;
    return { default: () => <Component initialSummary={null} /> };
  }),
  { loading: () => <TabSkeleton /> }
);

const HealthTab = dynamic(
  () => import('./health/health-client').then((m) => {
    const Component = m.TpHealthClient;
    return { default: () => <Component initialChecks={null} /> };
  }),
  { loading: () => <TabSkeleton /> }
);

const IssuesTab = dynamic(() => import('./issues/page'), { loading: () => <TabSkeleton /> });
const WebhooksTab = dynamic(() => import('./webhooks/page'), { loading: () => <TabSkeleton /> });
const SyncHistoryTab = dynamic(() => import('./sync-history/page'), { loading: () => <TabSkeleton /> });
const UsageTab = dynamic(() => import('./usage/page'), { loading: () => <TabSkeleton /> });

const TABS = [
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
  { value: 'health', label: 'Health', icon: HeartPulse },
  { value: 'issues', label: 'Issues', icon: AlertTriangle },
  { value: 'webhooks', label: 'Webhooks', icon: Webhook },
  { value: 'sync-history', label: 'Sync History', icon: Database },
  { value: 'usage', label: 'Usage', icon: Activity },
] as const;

export default function TpStreamsPage(): ReactNode {
  return (
    <div className="px-6 pt-4 pb-8 max-w-[1200px]">
      <Tabs defaultValue="analytics">
        <div className="flex items-end justify-between gap-4 mb-6">
          <TabsList variant="line" className="gap-0.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-1.5 px-3 py-1.5 text-[13px] font-medium"
                >
                  <Icon className="size-3.5" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
        <TabsContent value="health"><HealthTab /></TabsContent>
        <TabsContent value="issues"><IssuesTab /></TabsContent>
        <TabsContent value="webhooks"><WebhooksTab /></TabsContent>
        <TabsContent value="sync-history"><SyncHistoryTab /></TabsContent>
        <TabsContent value="usage"><UsageTab /></TabsContent>
      </Tabs>
    </div>
  );
}
