import { redirect } from 'next/navigation';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BarChart3, Settings, ClipboardList } from 'lucide-react';
import { ApplicationsClient } from './applications-client';
import { AmbassadorsClient } from './ambassadors-client';
import { AnalyticsClient } from './analytics-client';
import { SettingsClient } from './settings-client';
import {
  fetchApplications,
  fetchAmbassadors,
  fetchAnalyticsOverview,
  fetchGlobalSettings,
} from '@/lib/services/campus-ambassador-admin';

const PAGE_SIZE = 20;

export default async function CampusAmbassadorsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; appStatus?: string; ambStatus?: string; page?: string }>;
}): Promise<React.ReactNode> {
  const auth = await getSessionFromHeaders();
  if (!auth) {
    redirect('/login');
  }

  const params = await searchParams;
  const activeTab = params?.tab ?? 'applications';
  const appPage = Math.max(1, parseInt(params?.page ?? '1', 10) || 1);
  const ambPage = Math.max(1, parseInt(params?.page ?? '1', 10) || 1);

  // Fetch data for all tabs (Radix Tabs needs all TabsContent in DOM)
  const [submittedApps, approvedApps, rejectedApps, activeAmbassadors, removedAmbassadors, analytics, settings] =
    await Promise.all([
      fetchApplications('submitted', PAGE_SIZE, 0),
      fetchApplications('approved', PAGE_SIZE, (appPage - 1) * PAGE_SIZE),
      fetchApplications('rejected', PAGE_SIZE, (appPage - 1) * PAGE_SIZE),
      fetchAmbassadors('active', PAGE_SIZE, (ambPage - 1) * PAGE_SIZE),
      fetchAmbassadors('removed', PAGE_SIZE, (ambPage - 1) * PAGE_SIZE),
      fetchAnalyticsOverview(),
      fetchGlobalSettings(),
    ]);

  return (
    <div className="pb-12">
      <Tabs defaultValue={activeTab}>
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground truncate">Campus Ambassadors</h1>
              <p className="text-sm text-muted-foreground truncate">
                Manage applications, track payouts and analytics
              </p>
            </div>
          </div>
          <TabsList className="shrink-0 bg-muted/50 border border-border/40 p-0.5 rounded-lg h-9">
            <TabsTrigger value="applications" className="text-xs font-medium px-3 py-1.5 rounded-md gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <ClipboardList className="size-3.5" />
              Applications
            </TabsTrigger>
            <TabsTrigger value="ambassadors" className="text-xs font-medium px-3 py-1.5 rounded-md gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Users className="size-3.5" />
              Ambassadors
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs font-medium px-3 py-1.5 rounded-md gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <BarChart3 className="size-3.5" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs font-medium px-3 py-1.5 rounded-md gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Settings className="size-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        {/* All TabsContent must be rendered for Radix Tabs to work */}
        <TabsContent value="applications" className="space-y-5 outline-none">
          <ApplicationsClient
            pendingApps={submittedApps.applications}
            pendingCount={submittedApps.total}
            approvedApps={approvedApps.applications}
            rejectedApps={rejectedApps.applications}
            totalApproved={approvedApps.total}
            totalRejected={rejectedApps.total}
          />
        </TabsContent>

        <TabsContent value="ambassadors" className="space-y-5 outline-none">
          <AmbassadorsClient
            active={activeAmbassadors.ambassadors}
            removed={removedAmbassadors.ambassadors}
            totalActive={activeAmbassadors.total}
            totalRemoved={removedAmbassadors.total}
            currentPage={ambPage}
            pageSize={PAGE_SIZE}
          />
        </TabsContent>

        <TabsContent value="analytics" className="outline-none">
          <AnalyticsClient analytics={analytics} />
        </TabsContent>

        <TabsContent value="settings" className="outline-none">
          <SettingsClient settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
