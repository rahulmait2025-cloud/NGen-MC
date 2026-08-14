import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getTeamPageSettings } from '@/lib/superadmin/team-page-settings/queries';
import { Button } from '@/components/ui/button';
import { TeamPageSettingsForm } from '@/components/team/team-page-settings-form';

export default async function TeamPageSettingsPage(): Promise<ReactNode> {
  const session = await getSessionFromHeaders();
  if (!session) redirect('/login');

  const settings = await getTeamPageSettings();

  return (
    <div className="space-y-6 pb-16">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href="/team">
            <ArrowLeft className="mr-1.5 size-4" />
            Back to Team
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Page Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure the hero content and group photo shown at the top of the
            public Our Team page.
          </p>
        </div>
      </div>

      <TeamPageSettingsForm settings={settings} />
    </div>
  );
}
