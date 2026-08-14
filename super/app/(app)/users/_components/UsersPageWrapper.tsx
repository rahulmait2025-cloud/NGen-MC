'use client';

import dynamic from 'next/dynamic';
import type { UserListItem } from '@/lib/services/users';

const UsersPageClient = dynamic(
  () => import('@/components/pages/users').then((m) => ({ default: m.UsersPage })),
  { ssr: false, loading: () => <div className="h-96 bg-muted/30 animate-pulse rounded-xl" /> }
);

export function UsersPageWrapper({ initialUsers }: { initialUsers: UserListItem[] }) {
  return <UsersPageClient initialUsers={initialUsers} />;
}