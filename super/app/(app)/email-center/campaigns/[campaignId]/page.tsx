import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import type { ReactNode } from 'react';
import { getCampaignById } from '@/lib/email-center/campaigns';
import {
  getCampaignOperationalDiagnostics,
  getEmptyCampaignDiagnostics,
} from '@/lib/email-center/diagnostics';
import { CampaignOpsDiagnostics } from '@/components/email-center/campaign-ops-diagnostics';
import { listActiveTemplates } from '@/lib/email-center/templates';
import { getCampaignTests } from '@/lib/email-center/test-send';
import { getCampaignSendStats, type CampaignSendStats } from '@/lib/email-center/stats';
import { CampaignDetailClient } from '@/components/email-center/campaign-detail-client';
import { EmailCenterShell } from '@/components/email-center/email-center-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { campaignStatusLabels, campaignTypeLabels } from '@/lib/email-center/types';
import type { EmailCampaignTest, EmailTemplate } from '@/lib/email-center/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { cn } from '@/lib/utils';
import {
  getSupabaseErrorMessage,
  isTransientSupabaseFetchError,
} from '@/lib/supabase/fetch-resilience';

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  test_sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ready: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  sending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  sent: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

const EMPTY_STATS: CampaignSendStats = {
  totalRecipients: 0,
  snapshotted: 0,
  queued: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
  suppressed: 0,
  outboxQueued: 0,
  outboxProcessing: 0,
  outboxSent: 0,
  outboxFailed: 0,
  outboxSkipped: 0,
  outboxCancelled: 0,
  delivered: 0,
  opened: 0,
  clicked: 0,
  bounced: 0,
};

interface CampaignDetailPageProps {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function CampaignDetailPage({
  params,
  searchParams,
}: CampaignDetailPageProps): Promise<ReactNode> {
  const { campaignId } = await params;
  const { tab } = await searchParams;
  const _auth = await getSessionFromHeaders();
  if (!_auth) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  let campaign: Awaited<ReturnType<typeof getCampaignById>> = null;
  let loadError: string | null = null;

  try {
    campaign = await getCampaignById(campaignId);
  } catch (err) {
    const message = getSupabaseErrorMessage(err);
    if (isTransientSupabaseFetchError(message) || message.includes('Database connection failed')) {
      loadError = 'Could not reach the database. Please refresh and try again.';
    } else {
      throw err;
    }
  }

  if (loadError) {
    return (
      <EmailCenterShell>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="text-xl font-semibold">Unable to load campaign</h2>
          <p className="mt-2 max-w-md text-muted-foreground">{loadError}</p>
          <div className="mt-6 flex gap-3">
            <Button asChild variant="outline">
              <Link href="/email-center/campaigns">Back to Campaigns</Link>
            </Button>
            <Button asChild>
              <Link href={`/email-center/campaigns/${campaignId}`}>
                <RefreshCw className="mr-2 size-4" />
                Retry
              </Link>
            </Button>
          </div>
        </div>
      </EmailCenterShell>
    );
  }

  if (!campaign) {
    return (
      <EmailCenterShell>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold">Campaign not found</h2>
          <Button asChild className="mt-4">
            <Link href="/email-center/campaigns">Back to Campaigns</Link>
          </Button>
        </div>
      </EmailCenterShell>
    );
  }

  const [templatesSettled, testsSettled, statsSettled, diagnosticsSettled, eventsSettled, linksSettled] =
    await Promise.allSettled([
      listActiveTemplates(),
      getCampaignTests(campaignId),
      getCampaignSendStats(campaignId),
      getCampaignOperationalDiagnostics(campaignId),
      createAdminClient()
        .from('email_events')
        .select('event_type, email')
        .eq('campaign_id', campaignId)
        .order('event_timestamp', { ascending: false })
        .limit(50),
      createAdminClient()
        .from('email_click_links')
        .select('original_url, click_count')
        .eq('campaign_id', campaignId)
        .order('click_count', { ascending: false })
        .limit(10),
    ]);

  const templates: EmailTemplate[] =
    templatesSettled.status === 'fulfilled' ? templatesSettled.value : [];
  const tests: EmailCampaignTest[] =
    testsSettled.status === 'fulfilled' ? testsSettled.value : [];
  const stats: CampaignSendStats =
    statsSettled.status === 'fulfilled' ? statsSettled.value : EMPTY_STATS;
  const diagnostics =
    diagnosticsSettled.status === 'fulfilled'
      ? diagnosticsSettled.value
      : getEmptyCampaignDiagnostics(
          campaignId,
          `diagnostics: ${diagnosticsSettled.reason instanceof Error ? diagnosticsSettled.reason.message : 'failed'}`
        );

  const recentEvents =
    eventsSettled.status === 'fulfilled' && eventsSettled.value.data
      ? eventsSettled.value.data
      : [];
  const topLinks =
    linksSettled.status === 'fulfilled' && linksSettled.value.data
      ? linksSettled.value.data
      : [];

  return (
    <EmailCenterShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/email-center/campaigns">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-foreground">{campaign.name}</h1>
                <Badge className={cn('text-xs font-medium', statusColors[campaign.status])}>
                  {campaignStatusLabels[campaign.status] || campaign.status}
                </Badge>
                <Badge variant="outline" className="text-xs font-medium">
                  {campaignTypeLabels[campaign.campaign_type] || campaign.campaign_type}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                Manage campaign content, audience, approval, and view performance stats.
              </p>
            </div>
          </div>
        </div>

        <CampaignOpsDiagnostics diagnostics={diagnostics} />

        <CampaignDetailClient
          campaign={campaign}
          templates={templates}
          tests={tests}
          stats={stats}
          recentEvents={recentEvents}
          topLinks={topLinks}
          initialTab={tab}
        />
      </div>
    </EmailCenterShell>
  );
}
