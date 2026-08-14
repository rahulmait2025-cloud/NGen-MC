import type { ReactNode } from 'react';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getEmailSendHistory } from '@/lib/email-center/history';
import dynamic from 'next/dynamic';

const SendHistoryClient = dynamic(
  () => import('@/components/email-center/send-history-client').then((m) => ({ default: m.SendHistoryClient })),
  { ssr: true }
);

const PAGE_SIZE = 50;

export default async function EmailCenterHistoryPage(): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  const { rows, hasMore } = await getEmailSendHistory(PAGE_SIZE, 0);

  return <SendHistoryClient initialRows={rows} hasMore={hasMore} pageSize={PAGE_SIZE} />;
}
