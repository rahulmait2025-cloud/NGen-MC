import type { ReactNode } from 'react';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listCampaigns } from '@/lib/email-center/campaigns';
import dynamic from 'next/dynamic';

const CampaignsClient = dynamic(
  () => import('@/components/email-center/campaigns-client').then((m) => ({ default: m.CampaignsClient })),
  { ssr: true }
);

export default async function EmailCenterCampaignsPage(): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  const { campaigns } = await listCampaigns({ limit: 50 });

  return <CampaignsClient initialCampaigns={campaigns} />;
}