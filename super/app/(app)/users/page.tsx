import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { listUsers } from '@/lib/services/users';
import { UsersPageWrapper } from './_components/UsersPageWrapper';

function UsersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 rounded-lg bg-muted/20 animate-pulse" />
      <div className="h-12 w-full rounded-xl bg-muted/20 animate-pulse" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 w-full rounded-lg bg-muted/20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

async function UsersContent() {
  const initialUsers = await listUsers();
  return <UsersPageWrapper initialUsers={initialUsers} />;
}

export default async function UsersRoute(): Promise<ReactNode> {
  return (
    <Suspense fallback={<UsersSkeleton />}>
      <UsersContent />
    </Suspense>
  );
}