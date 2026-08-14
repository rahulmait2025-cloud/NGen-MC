import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { TeamMemberForm } from '@/components/team/team-member-form';

export default async function NewTeamMemberPage(): Promise<ReactNode> {
  const session = await getSessionFromHeaders();
  if (!session) redirect('/login');

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Team Member</h1>
        <p className="text-sm text-muted-foreground">
          Create a profile for the public team page. You can upload a photo after saving.
        </p>
      </div>
      <TeamMemberForm mode="create" />
    </div>
  );
}
