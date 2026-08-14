import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getTeamMemberById } from '@/lib/superadmin/team-members/queries';
import { TeamMemberForm } from '@/components/team/team-member-form';

export default async function EditTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ReactNode> {
  const session = await getSessionFromHeaders();
  if (!session) redirect('/login');

  const { id } = await params;
  const member = await getTeamMemberById(id);
  if (!member) notFound();

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Team Member</h1>
        <p className="text-sm text-muted-foreground">
          Update {member.name}&apos;s public profile, visibility, and ordering.
        </p>
      </div>
      <TeamMemberForm mode="edit" initialData={member} />
    </div>
  );
}
