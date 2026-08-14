import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import type { ReactNode } from 'react';
import { EmailCenterShell } from '@/components/email-center/email-center-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { inspectEmailConfig } from '@/lib/email/config';
import { CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-card-foreground">{value}</span>
    </div>
  );
}

function BoolRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-sm font-medium',
          ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
        )}
      >
        {ok ? 'Configured' : 'Not set'}
      </span>
    </div>
  );
}

export default async function EmailCenterSettingsPage(): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  const config = inspectEmailConfig();

  return (
    <EmailCenterShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Email Settings</h1>
          <p className="text-muted-foreground">
            Provider configuration and safe email system details.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="size-5" />
              Provider status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <ConfigRow label="Provider" value={config.selectedProvider} />
            <ConfigRow label="From address source" value={config.fromSource} />
            <BoolRow label="Sender address" ok={config.hasEmailFrom} />
            <BoolRow label="Reply-to address" ok={config.hasReplyTo} />
            <BoolRow
              label={config.selectedProvider === 'resend' ? 'Resend API key' : 'SendGrid API key'}
              ok={config.selectedProvider === 'resend' ? config.hasResendKey : config.hasSendGridKey}
            />
            <ConfigRow label="Dry run mode" value={config.dryRun ? 'Enabled' : 'Disabled'} />
            <div className="flex items-center justify-between gap-4 pt-3">
              <span className="text-sm text-muted-foreground">System ready</span>
              <span
                className={cn(
                  'flex items-center gap-1.5 text-sm font-medium',
                  config.ready ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                )}
              >
                {config.ready ? (
                  <>
                    <CheckCircle className="size-4" />
                    Ready
                  </>
                ) : (
                  <>
                    <AlertCircle className="size-4" />
                    Not ready
                  </>
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        {config.issues.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-900">
            <CardHeader>
              <CardTitle className="text-base text-amber-800 dark:text-amber-200">
                Configuration notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {config.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground">
          API keys, webhook secrets, and other sensitive values are never shown in the admin UI.
        </p>
      </div>
    </EmailCenterShell>
  );
}
