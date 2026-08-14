import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getPlatformSettings } from '@/lib/services/platform-settings';
import { pageMeta } from '@/data/page-meta';
import { JobReadyBootcampToggle } from '@/components/settings/job-ready-bootcamp-toggle';

const meta = pageMeta['platform-settings'];

export default async function PlatformSettingsPage(): Promise<ReactNode> {
  const session = await getSessionFromHeaders();
  if (!session) redirect('/login');

  const settings = await getPlatformSettings();

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{meta.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{meta.subtitle}</p>
      </div>

      <div className="max-w-2xl">
        <JobReadyBootcampToggle initialEnabled={settings.job_ready_bootcamp_enabled} />
      </div>
    </div>
  );
}
