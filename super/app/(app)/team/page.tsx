import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Settings } from 'lucide-react';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listTeamMembers } from '@/lib/superadmin/team-members/queries';
import { Button } from '@/components/ui/button';
import { TeamListClient } from '@/components/team/team-list-client';

export default async function TeamPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; published?: string; featured?: string }>;
}): Promise<ReactNode> {
  const session = await getSessionFromHeaders();
  if (!session) redirect('/login');

  const params = await searchParams;
  const search = params?.search ?? '';
  const publishedFilter = params?.published ?? 'all';
  const featuredFilter = params?.featured ?? 'all';

  const { members, summary } = await listTeamMembers({
    search,
    published: publishedFilter as 'all' | 'published' | 'draft',
    featured: featuredFilter as 'all' | 'featured' | 'not_featured',
  });

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">
            Manage the people displayed on the public NextGen CTO team page.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/team/settings">
              <Settings className="mr-1.5 size-4" />
              Page Settings
            </Link>
          </Button>
          <Button asChild>
            <Link href="/team/new">
              <Plus className="mr-1.5 size-4" />
              Add Team Member
            </Link>
          </Button>
        </div>
      </div>

      <TeamListClient
        members={members}
        summary={summary}
        publishedFilter={publishedFilter}
        featuredFilter={featuredFilter}
        search={search}
      />
    </div>
  );
}
