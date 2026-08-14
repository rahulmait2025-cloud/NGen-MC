'use client';

import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CampaignOperationalDiagnostics } from '@/lib/email-center/diagnostics';

interface CampaignOpsDiagnosticsProps {
  diagnostics: CampaignOperationalDiagnostics;
}

export function CampaignOpsDiagnostics({ diagnostics }: CampaignOpsDiagnosticsProps) {
  const outboxEntries = Object.entries(diagnostics.outboxByStatus).sort((a, b) => b[1] - a[1]);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-4" />
          Send Pipeline (live)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Campaign: {diagnostics.campaignStatus}</Badge>
          <Badge variant={diagnostics.outboxClaimable ? 'default' : 'outline'}>
            {diagnostics.outboxClaimable ? 'Pending rows' : 'Idle'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-xs">Queued count</p>
            <p className="font-semibold">{diagnostics.queuedCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Sent count</p>
            <p className="font-semibold text-green-600">{diagnostics.sentCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Failed count</p>
            <p className="font-semibold text-red-600">{diagnostics.failedCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Skipped count</p>
            <p className="font-semibold">{diagnostics.skippedCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs">DB now()</p>
            <p className="font-mono text-xs" suppressHydrationWarning>
              {diagnostics.dbNow}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">earliest next_attempt_at</p>
            <p className="font-mono text-xs" suppressHydrationWarning>
              {diagnostics.earliestOutboxNextAttemptAt ?? '—'}
            </p>
          </div>
        </div>

        <div className="rounded-md border p-3">
          <p className="text-xs font-medium">
            Outbox claimable:{' '}
            <span className={diagnostics.outboxClaimable ? 'text-green-600' : 'text-muted-foreground'}>
              {diagnostics.outboxClaimable ? 'yes' : 'no'}
            </span>
          </p>
          <p className="text-muted-foreground mt-1 text-xs">{diagnostics.outboxClaimReason}</p>
        </div>

        {outboxEntries.length > 0 && (
          <div className="rounded-md border p-3">
            <p className="mb-2 text-xs font-medium">Outbox by status</p>
            <div className="flex flex-wrap gap-2">
              {outboxEntries.map(([status, count]) => (
                <Badge key={status} variant="secondary" className="text-xs">
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {diagnostics.lastOutboxError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
            <p className="text-xs font-medium text-red-700 dark:text-red-300">Last outbox error</p>
            <p className="mt-1 font-mono text-xs text-red-600 dark:text-red-400">
              {diagnostics.lastOutboxError.email}: {diagnostics.lastOutboxError.error}
            </p>
          </div>
        )}

        {diagnostics.loadErrors.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Partial diagnostics: {diagnostics.loadErrors.join('; ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
