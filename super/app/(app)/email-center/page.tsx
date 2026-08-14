import Link from 'next/link';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listCampaigns } from '@/lib/email-center/campaigns';
import { listActiveTemplates } from '@/lib/email-center/templates';
import { getEmailCenterDashboardStats, getPendingApprovalCount } from '@/lib/email-center/stats';
import { EmailCenterShell } from '@/components/email-center/email-center-shell';
import { CampaignTable } from '@/components/email-center/campaign-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Send, Mail, AlertCircle, Loader2, Ban, Clock, RefreshCw } from 'lucide-react';
import {
  getSupabaseErrorMessage,
  isTransientSupabaseFetchError,
} from '@/lib/supabase/fetch-resilience';
import type { EmailCampaign, EmailTemplate } from '@/lib/email-center/types';
import type { EmailCenterDashboardStats } from '@/lib/email-center/stats';

function DashboardStatCards({
  dashboardStats,
  pendingApproval,
}: {
  dashboardStats: {
    totalDrafts: number;
    totalQueued: number;
    totalSent: number;
    totalFailed: number;
    totalTemplates: number;
    totalSuppressed: number;
  };
  pendingApproval: number;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
            <Send className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{dashboardStats.totalDrafts}</div>
            <p className="text-xs text-muted-foreground">Campaign drafts + test sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Queued</CardTitle>
            <Loader2 className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{dashboardStats.totalQueued}</div>
            <p className="text-xs text-muted-foreground">Emails queued for sending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent</CardTitle>
            <Mail className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{dashboardStats.totalSent}</div>
            <p className="text-xs text-muted-foreground">Total emails sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
            <AlertCircle className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{dashboardStats.totalFailed}</div>
            <p className="text-xs text-muted-foreground">Failed deliveries</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
            <Clock className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{pendingApproval}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Templates</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{dashboardStats.totalTemplates}</div>
            <p className="text-xs text-muted-foreground">Active templates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Suppressed</CardTitle>
            <Ban className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{dashboardStats.totalSuppressed}</div>
            <p className="text-xs text-muted-foreground">Unsubscribed emails</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function EmailCenterSkeleton() {
  return (
    <EmailCenterShell>
      <div className="space-y-8">
        <div className="h-8 w-48 rounded-lg bg-muted/20 animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/20 animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 w-full rounded-lg bg-muted/20 animate-pulse" />
          ))}
        </div>
      </div>
    </EmailCenterShell>
  );
}

async function EmailCenterContent() {
  const _auth = await getSessionFromHeaders();
  if (!_auth) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  let campaignsData: { campaigns: EmailCampaign[]; total: number } = { campaigns: [], total: 0 };
  let templates: EmailTemplate[] = [];
  let dashboardStats: EmailCenterDashboardStats = {
    totalDrafts: 0,
    testSent: 0,
    totalTemplates: 0,
    totalSuppressed: 0,
    totalQueued: 0,
    totalSent: 0,
    totalFailed: 0,
    totalSkipped: 0,
  };
  let pendingApproval = 0;
  let loadError: string | null = null;

  try {
    const settled = await Promise.allSettled([
      listCampaigns({ limit: 5 }),
      listActiveTemplates(),
      getEmailCenterDashboardStats(),
      getPendingApprovalCount(),
    ]);

    const [campaignsResult, templatesResult, statsResult, pendingResult] = settled;

    if (campaignsResult.status === 'fulfilled') {
      campaignsData = campaignsResult.value;
    } else {
      const message = getSupabaseErrorMessage(campaignsResult.reason);
      if (
        isTransientSupabaseFetchError(message)
        || message.includes('Database connection failed')
      ) {
        loadError = 'Could not reach the database. Please refresh and try again.';
      } else {
        throw campaignsResult.reason;
      }
    }

    if (templatesResult.status === 'fulfilled') {
      templates = templatesResult.value;
    } else {
      const message = getSupabaseErrorMessage(templatesResult.reason);
      if (
        !(
          isTransientSupabaseFetchError(message)
          || message.includes('Database connection failed')
        )
      ) {
        throw templatesResult.reason;
      }
      loadError ??= 'Could not reach the database. Please refresh and try again.';
    }

    if (statsResult.status === 'fulfilled') {
      dashboardStats = statsResult.value;
    }
    if (pendingResult.status === 'fulfilled') {
      pendingApproval = pendingResult.value;
    }
  } catch (err) {
    const message = getSupabaseErrorMessage(err);
    if (isTransientSupabaseFetchError(message) || message.includes('Database connection failed')) {
      loadError = 'Could not reach the database. Please refresh and try again.';
    } else {
      throw err;
    }
  }

  if (loadError && campaignsData.campaigns.length === 0 && templates.length === 0) {
    return (
      <EmailCenterShell>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="mb-4 size-10 text-amber-500" />
          <h1 className="text-2xl font-semibold text-foreground">Unable to load Email Center</h1>
          <p className="mt-2 max-w-md text-muted-foreground">{loadError}</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            This is usually a temporary network issue while the app is compiling or Supabase is cold-starting.
          </p>
          <div className="mt-6 flex gap-3">
            <Button asChild>
              <Link href="/email-center">
                <RefreshCw className="mr-2 size-4" />
                Retry
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/email-center/compose">Create Campaign</Link>
            </Button>
          </div>
        </div>
      </EmailCenterShell>
    );
  }

  return (
    <EmailCenterShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Email Center</h1>
          <p className="text-muted-foreground">
            Create and send email campaigns immediately — no scheduling required
          </p>
        </div>

        {loadError ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div className="flex-1">
              <p>{loadError}</p>
              <Button asChild variant="link" className="h-auto px-0 text-amber-900 dark:text-amber-100">
                <Link href="/email-center">
                  <RefreshCw className="mr-1 size-3" />
                  Retry
                </Link>
              </Button>
            </div>
          </div>
        ) : null}

        <DashboardStatCards
          dashboardStats={dashboardStats}
          pendingApproval={pendingApproval}
        />

        <div className="flex gap-3">
          <Button asChild>
            <Link href="/email-center/compose">Create Campaign</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/email-center/templates">Browse Templates</Link>
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Campaigns</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/email-center/campaigns">View All</Link>
            </Button>
          </div>

          <CampaignTable campaigns={campaignsData.campaigns} />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Template Shortcuts</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/email-center/templates">View All</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.slice(0, 6).map((template) => (
              <Link
                key={template.id}
                href={`/email-center/compose?template=${template.id}`}
                className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <FileText className="size-5 text-primary" />
                <div>
                  <p className="font-medium text-card-foreground">{template.name}</p>
                  <p className="text-xs text-muted-foreground">{template.category}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </EmailCenterShell>
  );
}

export default async function EmailCenterDashboardPage(): Promise<ReactNode> {
  return (
    <Suspense fallback={<EmailCenterSkeleton />}>
      <EmailCenterContent />
    </Suspense>
  );
}
